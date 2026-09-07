"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { searchCustomers } from "@/actions/customers";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export type CustomerHit = {
  id: string;
  clientId: string;
  name: string;
  businessName: string | null;
  phone: string | null;
  email: string | null;
  vatNumber: string | null;
  address: string | null;
};

export function CustomerPicker({
  name = "customerId",
  initial,
  returnTo,
  onSelect,
}: {
  name?: string;
  initial?: CustomerHit | null;
  returnTo?: string;
  onSelect?: (customer: CustomerHit) => void;
}) {
  const [query, setQuery] = useState(initial?.name ?? "");
  const [hits, setHits] = useState<CustomerHit[]>([]);
  const [selected, setSelected] = useState<CustomerHit | null>(initial ?? null);
  const [open, setOpen] = useState(false);
  const searchRef = useRef<HTMLInputElement>(null);

  // The customer id lives in a hidden input, and hidden inputs are barred from
  // constraint validation — so marking that one required did nothing, and
  // submitting without a customer only failed at the API, whose error redirect
  // discards everything already typed into the form. Carry the requirement on
  // the visible box instead, so the browser stops the submit.
  useEffect(() => {
    searchRef.current?.setCustomValidity(
      selected ? "" : "Pick a customer from the search results.",
    );
  }, [selected]);

  useEffect(() => {
    if (initial) onSelect?.(initial);
    // Only fire for the initial customer supplied on mount, not on every rerender.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (selected && query === selected.name) return;
    const term = query.trim();
    if (term.length < 1) return;

    let cancelled = false;
    const handle = setTimeout(async () => {
      const results = await searchCustomers(term);
      if (cancelled) return;
      setHits(results);
      setOpen(true);
    }, 200);

    return () => {
      cancelled = true;
      clearTimeout(handle);
    };
  }, [query, selected]);

  return (
    <div className="space-y-3">
      <input type="hidden" name={name} value={selected?.id ?? ""} />
      <div className="relative">
        <Label htmlFor="customer-search">Customer name</Label>
        <Input
          ref={searchRef}
          id="customer-search"
          value={query}
          autoComplete="off"
          placeholder="Type a name to auto-fetch client details"
          onChange={(event) => {
            const value = event.target.value;
            setSelected(null);
            setQuery(value);
            if (!value.trim()) {
              setHits([]);
              setOpen(false);
            }
          }}
          onFocus={() => hits.length && setOpen(true)}
        />
        {open && (hits.length > 0 || query.trim()) ? (
          <ul className="absolute z-20 mt-1 w-full overflow-hidden rounded-lg border border-slate-200 bg-white shadow-lg dark:border-slate-700 dark:bg-slate-800">
            {hits.map((hit) => (
              <li key={hit.id}>
                <button
                  type="button"
                  className="w-full px-3 py-2 text-left text-sm hover:bg-slate-50 dark:hover:bg-slate-700"
                  onClick={() => {
                    setSelected(hit);
                    setQuery(hit.name);
                    setOpen(false);
                    setHits([]);
                    onSelect?.(hit);
                  }}
                >
                  <div className="font-medium dark:text-slate-100">{hit.name}</div>
                  <div className="text-xs text-slate-500 dark:text-slate-400">
                    {hit.clientId}
                    {hit.businessName ? ` · ${hit.businessName}` : ""}
                    {hit.phone ? ` · ${hit.phone}` : ""}
                  </div>
                </button>
              </li>
            ))}
            {hits.length === 0 && query.trim() ? (
              <li className="border-t border-slate-100 dark:border-slate-700">
                <Link
                  href={`/customers/new?name=${encodeURIComponent(query.trim())}${
                    returnTo ? `&returnTo=${encodeURIComponent(returnTo)}` : ""
                  }`}
                  className="block px-3 py-2 text-sm font-medium text-brand-500 hover:bg-slate-50 dark:text-sky-400 dark:hover:bg-slate-700"
                >
                  No match — add &ldquo;{query.trim()}&rdquo; as a new customer
                </Link>
              </li>
            ) : null}
          </ul>
        ) : null}
      </div>
      {selected ? (
        <div className="grid gap-2 rounded-lg bg-slate-50 p-3 text-sm text-slate-700 sm:grid-cols-2 dark:bg-slate-800/50 dark:text-slate-300">
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400">Client ID</span>
            <div className="font-medium">{selected.clientId}</div>
          </div>
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400">Phone</span>
            <div>{selected.phone || "—"}</div>
          </div>
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400">Email</span>
            <div>{selected.email || "—"}</div>
          </div>
          <div>
            <span className="text-xs text-slate-500 dark:text-slate-400">VAT</span>
            <div>{selected.vatNumber || "—"}</div>
          </div>
          <div className="sm:col-span-2">
            <span className="text-xs text-slate-500 dark:text-slate-400">Address</span>
            <div>{selected.address || "—"}</div>
          </div>
        </div>
      ) : (
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Start typing to fetch an existing customer. New clients can be added
          under Customers.
        </p>
      )}
    </div>
  );
}
