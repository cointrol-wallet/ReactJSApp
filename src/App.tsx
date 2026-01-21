import React from "react";
import { BrowserRouter, Routes, Route, Link, NavLink } from "react-router-dom";
import { Button } from "./components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "./components/ui/card";
import { Badge } from "./components/ui/badge";
import { Label } from "./components/ui/label";
import { Switch } from "./components/ui/switch";
import './index.css'
import { AddressBook } from "./pages/addressBook";
import { Contracts } from "./pages/contracts";
import { Contacts } from "./pages/contacts";
import { Coins } from "./pages/coinManagement";
import { Folios } from "./pages/portfolio";
import { Privacy, Terms } from "./pages/legal";
import { Transactions } from "./pages/transaction";
import { initWallet } from "./lib/wallets";

/**
 * QuantumAccount React Skeleton v2 — wired to Bundler/Paymaster APIs
 *
 * ENV (vite):
 *  - VITE_BUNDLER_URL=https://localhost:3001
 *  - VITE_PAYMASTER_URL=https://localhost:3002
 *  - VITE_RPC_URL=https://eth-sepolia.g.alchemy.com/v2/XXXXX (optional if bundler needs it)
 *
 * NOTE: Endpoints are placeholders; adjust paths to match your servers.
 */


// --- UI Shell & Navigation ---
function AppShell({ children, address, domain }: {
  children: React.ReactNode,
  address: string,
  domain: string
}) {
  return (
    <div className="min-h-screen bg-neutral-50 text-neutral-900">
      <header className="sticky top-0 z-30 border-b bg-white/70 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <Link to="/dashboard" className="font-semibold">QuantumAccount</Link>
          <div className="flex items-center gap-2">
            <NetworkPill address={address} />
            <WalletSwitcher domain={domain} />
            <Link to="/settings" className="text-sm underline">Settings</Link>
          </div>
        </div>
      </header>
      <main className="mx-auto grid max-w-6xl gap-6 px-4 py-6 pb-16 lg:pb-0 lg:grid-cols-[220px_1fr]">
        <nav className="hidden lg:block">
          <ul className="space-y-1">
            <li><Nav to="/dashboard" label="Home" /></li>
            <li><Nav to="/transactions" label="Transactions" /></li>
            <li><Nav to="/addressbook" label="Address Book" /></li>
            <li><Nav to="/contacts" label="Contacts" /></li>
            <li><Nav to="/contracts" label="Smart Contracts" /></li>
            <li><Nav to="/coins" label="Coins" /></li>

          </ul>
        </nav>
        <section className="min-h-[60vh]">{children}</section>
      </main>
      <BottomNav />
    </div>
  );
}

function AppContainer() {
  const [address, setAddress] = React.useState<string | null>(null);
  const [domain, setDomain] = React.useState<string>("LOCAL"); // needs to be changed to a selector
  const [error, setError] = React.useState<string | null>(null);


  React.useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        console.log("[Wallet] Initialising…");
        const addr = await initWallet();
        console.log("[Wallet] Ready with address:", addr);
        if (!cancelled) {
          setAddress(addr);
        }
      } catch (e: any) {
        console.error("[Wallet] Init failed:", e);
        if (!cancelled) {
          setError(e?.message ?? "Unknown wallet init error");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  if (error) {
    return (
      <div className="p-6 text-red-700">
        <h1 className="text-lg font-semibold mb-2">Wallet initialisation failed</h1>
        <p className="mb-2">{error}</p>
        <p className="text-sm text-neutral-600">
          Check the console for details.
        </p>
      </div>
    );
  }

  if (!address) {
    return (
      <div className="p-6">
        Initialising QuantumAccount wallet…
      </div>
    );
  }
  // salt set in initWallet manually as well as below
  return (
    <AppShell address={address} domain={domain}>
      <Routes>
          <Route path="/" element={<Folios />} />
          <Route path="/login" element={<Login />} />
          <Route path="/dashboard" element={<Folios />} />
          <Route path="/transactions" element={<Transactions />} />
          <Route path="/contacts" element={<Contacts />} />
          <Route path="/contracts" element={<Contracts />} />
          <Route path="/coins" element={<Coins />} />
          <Route path="/addressbook" element={<AddressBook />} />
          {/*<Route path="/wallets" element={<Wallets sender={address as Address} domain={domain} salt={`default`} />} /> */}
          <Route path="/legal/terms" element={<Terms />} />
          <Route path="/legal/privacy" element={<Privacy />} />
        </Routes>
    </AppShell>
  );
}


function Nav({ to, label }: { to: string; label: string }) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) => `block rounded-xl px-3 py-2 text-sm ${isActive ? "bg-neutral-900 text-white" : "hover:bg-neutral-100"}`}
    >
      {label}
    </NavLink>
  );
}

function BottomNav() {
  return (
    <div className="fixed inset-x-0 bottom-0 z-20 h-14 border-t bg-white p-2 lg:hidden pb-[env(safe-area-inset-bottom)]">
      <div className="mx-auto grid max-w-md grid-cols-5 gap-2 text-center text-xs">
        <NavLink to="/dashboard">Home</NavLink>
        <NavLink to="/transactions">Transactions</NavLink>
        <NavLink to="/addressbook">Address Book</NavLink>
        <NavLink to="/contacts">Contacts</NavLink>
        <NavLink to="/contracts">Smart Contracts</NavLink>
        <NavLink to="/coins">Coins</NavLink>
        <NavLink to="/legal/terms">T&C</NavLink>
        <NavLink to="/legal/privacy">Privacy</NavLink>
      </div>
    </div>
  );
}

function NetworkPill({ address }: { address: string }) {  // either delete to switch to show network name
  return (
    <Badge variant="secondary" className="rounded-full">{address}</Badge>
  );
}

function WalletSwitcher({ domain }: { domain: string }) { // need to add function to switch domains
  return (
    <Button size="sm" variant="outline">{domain}</Button>
  );
}



// --- Screens ---
export function Login() {
  return (
    <div className="mx-auto max-w-md">
      <Card className="rounded-2xl shadow-sm">
        <CardHeader>
          <CardTitle>Welcome to QuantumAccount</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Button className="w-full">Sign in with Google</Button>
          <Button className="w-full" variant="secondary">Sign in with Apple</Button>
          <Button className="w-full" variant="outline">Use existing wallet</Button>
          <Button className="w-full">Create new wallet</Button>
          <div className="flex items-center justify-between pt-2">
            <Label htmlFor="terms">Accept Terms & Privacy</Label>
            <Switch id="terms" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// --- Root App + Routes ---
export default function App() {
  return (
    <BrowserRouter>
      <AppContainer />
    </BrowserRouter>
  );
}
