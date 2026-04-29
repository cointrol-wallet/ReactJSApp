import { describe, it, expect } from "vitest";
import { readFileSync, readdirSync } from "fs";
import { join } from "path";

const pagesDir = join(__dirname, "..");
const pageFiles = readdirSync(pagesDir)
  .filter(f => f.endsWith(".tsx"))
  .map(f => ({ name: f, src: readFileSync(join(pagesDir, f), "utf8") }));

describe("dark mode consistency", () => {
  it("no page file uses hardcoded background:#fff in inline styles", () => {
    for (const { name, src } of pageFiles) {
      expect(src, `${name} has hardcoded background:#fff`).not.toMatch(/background:\s*["']#fff["']/i);
    }
  });

  it("no page file uses hardcoded color:#111 in inline styles", () => {
    for (const { name, src } of pageFiles) {
      expect(src, `${name} has hardcoded color:#111`).not.toMatch(/color:\s*["']#111["']/);
    }
  });

  it("all <select> elements with rounded-md include a bg- token", () => {
    // Native <select> elements don't inherit CSS custom properties like block elements do,
    // so they must explicitly declare bg-background or bg-card to respond to dark mode.
    const selectPattern = /<select\b[^>]*className="([^"]*rounded-md[^"]*)"[^>]*>/g;
    for (const { name, src } of pageFiles) {
      const matches = [...src.matchAll(selectPattern)];
      for (const [, cls] of matches) {
        const hasBg = /\bbg-(?:background|card|muted)\b/.test(cls);
        expect(hasBg, `${name}: <select> with rounded-md missing bg- token — class="${cls.slice(0, 120)}"`).toBe(true);
      }
    }
  });
});
