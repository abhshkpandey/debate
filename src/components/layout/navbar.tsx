"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { logoutAction } from "@/app/actions/auth";
import { Button } from "@/components/ui/button";
import {
  Menu,
  X,
  PlusCircle,
  Bell,
  Shield,
  LogOut,
} from "lucide-react";

interface NavbarProps {
  currentUser?: {
    id: string;
    username: string;
    display_name: string;
    is_admin: boolean;
  } | null;
  unreadCount?: number;
}

export function Navbar({ currentUser, unreadCount = 0 }: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const pathname = usePathname();

  const isActive = (path: string) => {
    if (path === "/") return pathname === "/";
    return pathname.startsWith(path);
  };

  return (
    <header className="sticky top-0 z-40 border-b border-[#E4E0D8] bg-[#FFFFFF]/95 backdrop-blur-xs">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Brand */}
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-1.5 font-black text-xl tracking-tight text-[#0B0D10]">
            <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-[#0B0D10] text-[#C7F36B] font-mono text-base font-extrabold">
              D
            </span>
            <span>DEBATE</span>
            <span className="h-2 w-2 rounded-full bg-[#C7F36B] inline-block" />
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex md:items-center md:gap-6 text-sm font-medium text-[#5B6472]">
            <Link
              href="/explore"
              className={`transition-colors hover:text-[#0B0D10] ${
                isActive("/explore") ? "font-bold text-[#0B0D10]" : ""
              }`}
            >
              Explore
            </Link>
            <Link
              href="/how-it-works"
              className={`transition-colors hover:text-[#0B0D10] ${
                isActive("/how-it-works") ? "font-bold text-[#0B0D10]" : ""
              }`}
            >
              How it works
            </Link>
            {currentUser && (
              <>
                <Link
                  href="/dashboard"
                  className={`transition-colors hover:text-[#0B0D10] ${
                    isActive("/dashboard") ? "font-bold text-[#0B0D10]" : ""
                  }`}
                >
                  Dashboard
                </Link>
                <Link
                  href="/matches"
                  className={`transition-colors hover:text-[#0B0D10] ${
                    isActive("/matches") ? "font-bold text-[#0B0D10]" : ""
                  }`}
                >
                  Matches
                </Link>
                <Link
                  href="/calendar"
                  className={`transition-colors hover:text-[#0B0D10] ${
                    isActive("/calendar") ? "font-bold text-[#0B0D10]" : ""
                  }`}
                >
                  Calendar
                </Link>
                {currentUser.is_admin && (
                  <Link
                    href="/admin"
                    className={`flex items-center gap-1 transition-colors hover:text-[#6B5CE6] ${
                      isActive("/admin") ? "font-bold text-[#6B5CE6]" : ""
                    }`}
                  >
                    <Shield className="h-3.5 w-3.5" />
                    Admin
                  </Link>
                )}
              </>
            )}
          </nav>
        </div>

        {/* Right side controls */}
        <div className="hidden md:flex md:items-center md:gap-3">
          <Link href="/challenges/new">
            <Button variant="primary" size="sm" className="gap-1.5 font-bold">
              <PlusCircle className="h-4 w-4" />
              Start a Challenge
            </Button>
          </Link>

          {currentUser ? (
            <div className="flex items-center gap-2">
              <Link href="/notifications" className="relative p-2 text-[#5B6472] hover:text-[#0B0D10]">
                <Bell className="h-5 w-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-1.5 right-1.5 flex h-4 w-4 items-center justify-center rounded-full bg-[#D93A47] text-[10px] font-bold text-white">
                    {unreadCount > 9 ? "9+" : unreadCount}
                  </span>
                )}
              </Link>

              <div className="flex items-center gap-2 pl-2 border-l border-[#E4E0D8]">
                <Link
                  href={`/u/${currentUser.username}`}
                  className="flex items-center gap-2 text-sm font-semibold text-[#0B0D10] hover:text-[#5B6472]"
                >
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-[#F1EEE8] text-xs font-bold text-[#0B0D10] border border-[#E4E0D8]">
                    {currentUser.display_name.charAt(0).toUpperCase()}
                  </div>
                  <span className="hidden lg:inline">{currentUser.display_name}</span>
                </Link>

                <form action={logoutAction}>
                  <button
                    type="submit"
                    title="Log out"
                    className="p-2 text-[#5B6472] hover:text-[#D93A47] cursor-pointer"
                  >
                    <LogOut className="h-4 w-4" />
                  </button>
                </form>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link href="/login">
                <Button variant="ghost" size="sm">
                  Log in
                </Button>
              </Link>
              <Link href="/signup">
                <Button variant="secondary" size="sm">
                  Sign up
                </Button>
              </Link>
            </div>
          )}
        </div>

        {/* Mobile menu button */}
        <div className="flex md:hidden items-center gap-2">
          {currentUser && (
            <Link href="/notifications" className="relative p-2 text-[#5B6472]">
              <Bell className="h-5 w-5" />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-[#D93A47] text-[10px] font-bold text-white">
                  {unreadCount}
                </span>
              )}
            </Link>
          )}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-[#0B0D10] hover:bg-[#F1EEE8] rounded-md cursor-pointer"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </button>
        </div>
      </div>

      {/* Mobile menu dropdown */}
      {mobileMenuOpen && (
        <div className="border-t border-[#E4E0D8] bg-[#FFFFFF] px-4 pt-3 pb-6 md:hidden">
          <div className="flex flex-col space-y-2">
            <Link
              href="/challenges/new"
              onClick={() => setMobileMenuOpen(false)}
              className="w-full"
            >
              <Button variant="primary" className="w-full justify-center gap-2">
                <PlusCircle className="h-4 w-4" />
                Start a Challenge
              </Button>
            </Link>

            <Link
              href="/explore"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-md px-3 py-2 text-sm font-medium text-[#0B0D10] hover:bg-[#F1EEE8]"
            >
              Explore Debates
            </Link>
            <Link
              href="/how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="rounded-md px-3 py-2 text-sm font-medium text-[#0B0D10] hover:bg-[#F1EEE8]"
            >
              How it Works
            </Link>

            {currentUser ? (
              <>
                <Link
                  href="/dashboard"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-md px-3 py-2 text-sm font-medium text-[#0B0D10] hover:bg-[#F1EEE8]"
                >
                  Dashboard
                </Link>
                <Link
                  href="/matches"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-md px-3 py-2 text-sm font-medium text-[#0B0D10] hover:bg-[#F1EEE8]"
                >
                  My Matches
                </Link>
                <Link
                  href="/calendar"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-md px-3 py-2 text-sm font-medium text-[#0B0D10] hover:bg-[#F1EEE8]"
                >
                  Schedule & Calendar
                </Link>
                <Link
                  href={`/u/${currentUser.username}`}
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-md px-3 py-2 text-sm font-medium text-[#0B0D10] hover:bg-[#F1EEE8]"
                >
                  Profile (@{currentUser.username})
                </Link>
                <Link
                  href="/settings/profile"
                  onClick={() => setMobileMenuOpen(false)}
                  className="rounded-md px-3 py-2 text-sm font-medium text-[#0B0D10] hover:bg-[#F1EEE8]"
                >
                  Settings
                </Link>
                {currentUser.is_admin && (
                  <Link
                    href="/admin"
                    onClick={() => setMobileMenuOpen(false)}
                    className="rounded-md px-3 py-2 text-sm font-medium text-[#6B5CE6] hover:bg-[#F1EEE8]"
                  >
                    Admin Panel
                  </Link>
                )}
                <div className="pt-2 border-t border-[#E4E0D8]">
                  <form action={logoutAction}>
                    <Button
                      type="submit"
                      variant="outline"
                      className="w-full justify-center text-[#D93A47]"
                    >
                      <LogOut className="h-4 w-4 mr-2" />
                      Log out
                    </Button>
                  </form>
                </div>
              </>
            ) : (
              <div className="pt-2 border-t border-[#E4E0D8] flex flex-col gap-2">
                <Link href="/login" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="outline" className="w-full">
                    Log in
                  </Button>
                </Link>
                <Link href="/signup" onClick={() => setMobileMenuOpen(false)}>
                  <Button variant="secondary" className="w-full">
                    Sign up
                  </Button>
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
