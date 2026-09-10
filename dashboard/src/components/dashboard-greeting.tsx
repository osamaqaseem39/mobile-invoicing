"use client";

import { useEffect, useState } from "react";

function greetingFor(hour: number) {
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

/** Client-only so Hostinger's server timezone cannot disagree with the browser. */
export function DashboardGreeting({ firstName }: { firstName: string }) {
  const [greeting, setGreeting] = useState("Hello");

  useEffect(() => {
    // Client clock only — Hostinger's server TZ must not affect the greeting.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setGreeting(greetingFor(new Date().getHours()));
  }, []);

  return (
    <>
      {greeting}, <span className="text-brand-500 dark:text-brand-400">{firstName}</span>
    </>
  );
}
