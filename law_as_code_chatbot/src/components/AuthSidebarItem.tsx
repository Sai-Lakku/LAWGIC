"use client";

import { useSession, signOut } from "next-auth/react";
import Link from "next/link";
import { LogOut, LogIn, User } from "lucide-react"; 

export function AuthSidebarItem() {
  const { data: session, status } = useSession();

  if (status === "loading") {
    return <div className="h-10 w-full animate-pulse bg-gray-200 rounded-md"></div>;
  }

  // Scenario 1: User is Logged In
  if (session?.user) {
    return (
      <div className="border-t border-gray-200 pt-4 mt-auto w-full">
        <div className="flex items-center gap-3 px-2 py-2 mb-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-blue-600 text-white font-bold shadow-sm">
            {session.user.email?.charAt(0).toUpperCase()}
          </div>
          <div className="flex flex-col overflow-hidden">
            <span className="truncate text-xs font-medium text-gray-700 max-w-[120px]">
              {session.user.email}
            </span>
            <span className="text-[10px] text-gray-500">Free Plan</span>
          </div>
        </div>
        <button
          onClick={() => signOut()}
          className="flex w-full items-center justify-center gap-2 rounded-md bg-white border border-gray-300 px-3 py-2 text-xs font-medium text-gray-700 hover:bg-gray-50 hover:text-red-600 transition-all"
        >
          <LogOut size={14} />
          Sign Out
        </button>
      </div>
    );
  }

  // Scenario 2: User is Guest (Logged Out)
  return (
    <div className="border-t border-gray-200 pt-4 mt-auto w-full flex flex-col gap-2">
      <Link 
        href="/login"
        className="flex w-full items-center justify-center gap-2 rounded-md bg-white border border-gray-300 px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors"
      >
        <LogIn size={16} />
        Log in
      </Link>
      <Link 
        href="/register"
        className="flex w-full items-center justify-center gap-2 rounded-md bg-blue-600 px-3 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors shadow-sm"
      >
        Sign up
      </Link>
    </div>
  );
}