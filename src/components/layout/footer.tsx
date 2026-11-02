import React from "react";
import Link from "next/link";

export function Footer() {
  return (
    <footer className="border-t border-[#E4E0D8] bg-[#FAF8F4] py-12 text-sm text-[#5B6472]">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-3">
            <div className="flex items-center gap-1.5 font-black text-lg tracking-tight text-[#0B0D10]">
              <span className="flex h-6 w-6 items-center justify-center rounded bg-[#0B0D10] text-[#C7F36B] font-mono text-sm font-extrabold">
                D
              </span>
              <span>DEBATE</span>
            </div>
            <p className="text-xs text-[#5B6472] leading-relaxed">
              A competitive debate platform where people pick a side, challenge an opponent, book a time, show up, and let an audience vote.
            </p>
          </div>

          <div>
            <h4 className="font-bold text-[#0B0D10] uppercase tracking-wider text-xs mb-3">
              Platform
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/explore" className="hover:text-[#0B0D10] transition-colors">
                  Explore Debates
                </Link>
              </li>
              <li>
                <Link href="/challenges/new" className="hover:text-[#0B0D10] transition-colors">
                  Create Challenge
                </Link>
              </li>
              <li>
                <Link href="/how-it-works" className="hover:text-[#0B0D10] transition-colors">
                  How It Works
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-[#0B0D10] uppercase tracking-wider text-xs mb-3">
              Account
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/dashboard" className="hover:text-[#0B0D10] transition-colors">
                  Dashboard
                </Link>
              </li>
              <li>
                <Link href="/calendar" className="hover:text-[#0B0D10] transition-colors">
                  Debate Calendar
                </Link>
              </li>
              <li>
                <Link href="/settings/profile" className="hover:text-[#0B0D10] transition-colors">
                  Profile & Settings
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-[#0B0D10] uppercase tracking-wider text-xs mb-3">
              Safety & Legal
            </h4>
            <ul className="space-y-2 text-xs">
              <li>
                <Link href="/guidelines" className="hover:text-[#0B0D10] transition-colors">
                  Community Guidelines
                </Link>
              </li>
              <li>
                <Link href="/terms" className="hover:text-[#0B0D10] transition-colors">
                  Terms of Service (Requires Legal Review)
                </Link>
              </li>
              <li>
                <Link href="/privacy" className="hover:text-[#0B0D10] transition-colors">
                  Privacy Policy (Requires Legal Review)
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 border-t border-[#E4E0D8] pt-6 flex flex-col sm:flex-row items-center justify-between text-xs text-[#5B6472] gap-4">
          <p>© 2026 Debate. All rights reserved. Age 18+ required.</p>
          <p>You talk. They talk. The internet decides.</p>
        </div>
      </div>
    </footer>
  );
}
