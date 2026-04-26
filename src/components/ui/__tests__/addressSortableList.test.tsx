// @vitest-environment jsdom
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import React from "react";
import { render, screen, fireEvent, cleanup } from "@testing-library/react";
import type { Address } from "@/storage/addressStore";

// ---------------------------------------------------------------------------
// Capture the onDragEnd handler passed to DndContext so we can fire it directly
// ---------------------------------------------------------------------------
const { captureRef } = vi.hoisted(() => ({
  captureRef: { onDragEnd: null as ((e: any) => void) | null },
}));

vi.mock("@dnd-kit/core", () => ({
  DndContext: ({ children, onDragEnd }: any) => {
    captureRef.onDragEnd = onDragEnd;
    return React.createElement(React.Fragment, null, children);
  },
  closestCenter: vi.fn(),
  PointerSensor: vi.fn(),
  useSensor: vi.fn(),
  useSensors: vi.fn(() => []),
}));

vi.mock("@dnd-kit/sortable", () => ({
  SortableContext: ({ children }: any) => React.createElement(React.Fragment, null, children),
  useSortable: vi.fn(() => ({
    attributes: {},
    listeners: {},
    setNodeRef: vi.fn(),
    transform: null,
    transition: undefined,
    isDragging: false,
  })),
  arrayMove: (arr: any[], from: number, to: number) => {
    const copy = [...arr];
    const [item] = copy.splice(from, 1);
    copy.splice(to, 0, item);
    return copy;
  },
  verticalListSortingStrategy: undefined,
}));

vi.mock("@dnd-kit/utilities", () => ({
  CSS: { Transform: { toString: () => "" } },
}));

vi.mock("@/lib/abiTypes", () => ({
  extractAbi: vi.fn(() => null),
  getFunctions: vi.fn(() => []),
}));

import { AddressSortableList } from "../addressSortableList";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function addr(id: string, name: string, indexOrder: number): Address {
  return {
    id,
    name,
    indexOrder,
    isVisible: true,
    isContact: false,
    createdAt: 0,
    updatedAt: 0,
  } as Address;
}

const ITEMS = [addr("a1", "Alice", 0), addr("a2", "Bob", 1), addr("a3", "Charlie", 2)];

const DEFAULT_PROPS = {
  items: ITEMS,
  sortMode: "custom" as const,
  onReorder: vi.fn(),
  onHide: vi.fn(),
  onMoveToTop: vi.fn(),
  isFilterActive: false,
  coins: [],
  contacts: [],
  contracts: [],
  onSendCoins: vi.fn(),
  onApproveCoins: vi.fn(),
  onUseContract: vi.fn(),
};

beforeEach(() => {
  vi.clearAllMocks();
  captureRef.onDragEnd = null;
});

afterEach(cleanup);

// ---------------------------------------------------------------------------

describe("drag handle disabled state", () => {
  it("custom mode, no filter — ☰ button is NOT disabled", () => {
    render(<AddressSortableList {...DEFAULT_PROPS} sortMode="custom" isFilterActive={false} />);
    screen.getAllByRole("button", { name: "☰" }).forEach((h) =>
      expect((h as HTMLButtonElement).disabled).toBe(false)
    );
  });

  it("custom mode, filter active — ☰ button IS disabled", () => {
    render(<AddressSortableList {...DEFAULT_PROPS} sortMode="custom" isFilterActive={true} />);
    screen.getAllByRole("button", { name: "☰" }).forEach((h) =>
      expect((h as HTMLButtonElement).disabled).toBe(true)
    );
  });

  it("non-custom sort mode — ☰ button is always disabled", () => {
    render(<AddressSortableList {...DEFAULT_PROPS} sortMode="nameAsc" isFilterActive={false} />);
    screen.getAllByRole("button", { name: "☰" }).forEach((h) =>
      expect((h as HTMLButtonElement).disabled).toBe(true)
    );
  });
});

describe("action dropdown — Move to top visibility", () => {
  it("custom mode — ↑ Move to top appears after opening action menu", () => {
    render(<AddressSortableList {...DEFAULT_PROPS} sortMode="custom" isFilterActive={false} />);
    fireEvent.click(screen.getAllByRole("button", { name: "···" })[0]);
    expect(screen.getByText("↑ Move to top")).toBeTruthy();
  });

  it("custom mode with filter active — ↑ Move to top still appears", () => {
    render(<AddressSortableList {...DEFAULT_PROPS} sortMode="custom" isFilterActive={true} />);
    fireEvent.click(screen.getAllByRole("button", { name: "···" })[0]);
    expect(screen.getByText("↑ Move to top")).toBeTruthy();
  });

  it("non-custom mode — ↑ Move to top absent from action menu", () => {
    render(<AddressSortableList {...DEFAULT_PROPS} sortMode="nameAsc" />);
    fireEvent.click(screen.getAllByRole("button", { name: "···" })[0]);
    expect(screen.queryByText("↑ Move to top")).toBeNull();
  });
});

describe("action dropdown — Hide always present", () => {
  it("Hide appears in action menu regardless of sortMode", () => {
    render(<AddressSortableList {...DEFAULT_PROPS} sortMode="nameAsc" />);
    fireEvent.click(screen.getAllByRole("button", { name: "···" })[0]);
    expect(screen.getByText("Hide")).toBeTruthy();
  });
});

describe("item rendering", () => {
  it("renders all items without re-filtering by isVisible (B3 fix)", () => {
    render(<AddressSortableList {...DEFAULT_PROPS} />);
    expect(screen.getByText("Alice")).toBeTruthy();
    expect(screen.getByText("Bob")).toBeTruthy();
    expect(screen.getByText("Charlie")).toBeTruthy();
  });

  it("items appear in indexOrder order when sortMode='custom'", () => {
    const shuffled = [addr("a3", "Charlie", 2), addr("a1", "Alice", 0), addr("a2", "Bob", 1)];
    const { container } = render(
      <AddressSortableList {...DEFAULT_PROPS} items={shuffled} sortMode="custom" />
    );
    // Query the font-medium name divs directly to get precise card order
    const nameDivs = container.querySelectorAll(".font-medium");
    expect(Array.from(nameDivs).map((el) => el.textContent)).toEqual(["Alice", "Bob", "Charlie"]);
  });
});

describe("onReorder callback", () => {
  it("fires onReorder with reassigned indexOrder after drag event", () => {
    const onReorder = vi.fn();
    render(<AddressSortableList {...DEFAULT_PROPS} onReorder={onReorder} sortMode="custom" isFilterActive={false} />);
    // Drag Bob (a2, index 1) to Alice's position (a1, index 0)
    captureRef.onDragEnd!({ active: { id: "a2" }, over: { id: "a1" } });
    expect(onReorder).toHaveBeenCalledOnce();
    const result: Address[] = onReorder.mock.calls[0][0];
    expect(result[0].id).toBe("a2");
    expect(result[1].id).toBe("a1");
    expect(result.map((r) => r.indexOrder)).toEqual([0, 1, 2]);
  });

  it("does NOT fire onReorder when sortMode is not custom", () => {
    const onReorder = vi.fn();
    render(<AddressSortableList {...DEFAULT_PROPS} onReorder={onReorder} sortMode="nameAsc" isFilterActive={false} />);
    captureRef.onDragEnd!({ active: { id: "a2" }, over: { id: "a1" } });
    expect(onReorder).not.toHaveBeenCalled();
  });

  it("does NOT fire onReorder when filter is active", () => {
    const onReorder = vi.fn();
    render(<AddressSortableList {...DEFAULT_PROPS} onReorder={onReorder} sortMode="custom" isFilterActive={true} />);
    captureRef.onDragEnd!({ active: { id: "a2" }, over: { id: "a1" } });
    expect(onReorder).not.toHaveBeenCalled();
  });
});

describe("onMoveToTop callback", () => {
  it("clicking ↑ Move to top calls onMoveToTop with the correct item id", () => {
    const onMoveToTop = vi.fn();
    render(<AddressSortableList {...DEFAULT_PROPS} onMoveToTop={onMoveToTop} sortMode="custom" />);
    // Open Bob's (a2) action menu — it is the second card
    fireEvent.click(screen.getAllByRole("button", { name: "···" })[1]);
    fireEvent.click(screen.getByText("↑ Move to top"));
    expect(onMoveToTop).toHaveBeenCalledWith("a2");
  });

  it("↑ Move to top button absent when sortMode is not custom", () => {
    render(<AddressSortableList {...DEFAULT_PROPS} sortMode="nameAsc" />);
    fireEvent.click(screen.getAllByRole("button", { name: "···" })[0]);
    expect(screen.queryByText("↑ Move to top")).toBeNull();
  });
});
