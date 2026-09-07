"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";

export type TabItem = {
  id: string;
  label: string;
  hint?: React.ReactNode;
  content: React.ReactNode;
  /** Keep this panel in the printout even when another tab is the open one. */
  printable?: boolean;
};

export function Tabs({
  tabs,
  storageKey,
}: {
  tabs: TabItem[];
  storageKey?: string;
}) {
  const pathname = usePathname();
  const key = `tabs:${storageKey ?? pathname}`;
  const [active, setActive] = useState(tabs[0].id);
  const ids = tabs.map((tab) => tab.id).join(",");

  // Every form here posts to a server action that redirects back to the page,
  // so the open tab is kept in sessionStorage to survive that round trip. The
  // server cannot know it, so it can only be applied after hydration.
  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(key);
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (saved && ids.split(",").includes(saved)) setActive(saved);
    } catch {
      // Private-mode browsers can throw on access; the default tab is fine.
    }
  }, [key, ids]);

  const select = (id: string) => {
    setActive(id);
    try {
      sessionStorage.setItem(key, id);
    } catch {
      // Persisting the tab is a convenience, never required.
    }
  };

  return (
    <div className="space-y-4">
      <div className="no-print -mx-1 overflow-x-auto px-1">
        <div
          role="tablist"
          className="inline-flex gap-1 rounded-lg bg-gray-100 p-1 dark:bg-gray-800"
        >
          {tabs.map((tab) => {
            const isActive = tab.id === active;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                aria-controls={`tabpanel-${tab.id}`}
                onClick={() => select(tab.id)}
                className={cn(
                  "whitespace-nowrap rounded-md px-3 py-2 text-theme-sm font-medium transition-colors",
                  isActive
                    ? "bg-white text-gray-900 shadow-theme-xs dark:bg-white/10 dark:text-white"
                    : "text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-300",
                )}
              >
                {tab.label}
                {tab.hint ? (
                  <span className="ml-1.5 font-normal text-gray-400">{tab.hint}</span>
                ) : null}
              </button>
            );
          })}
        </div>
      </div>

      {tabs.map((tab) => (
        <div
          key={tab.id}
          id={`tabpanel-${tab.id}`}
          role="tabpanel"
          className={cn(
            tab.id === active ? undefined : "hidden",
            tab.printable ? "print-always" : "no-print",
          )}
        >
          {tab.content}
        </div>
      ))}
    </div>
  );
}
