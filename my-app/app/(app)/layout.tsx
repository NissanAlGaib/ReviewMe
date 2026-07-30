import Link from "next/link";

import { getUser } from "@/lib/dal";
import { logout } from "@/actions/auth";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getUser();

  return (
    <div className="flex min-h-full flex-1 flex-col">
      <header className="border-b border-black/[.08] dark:border-white/[.145]">
        <div className="mx-auto flex w-full max-w-4xl items-center justify-between px-4 py-4">
          <nav className="flex items-center gap-6 text-sm font-medium">
            <Link href="/dashboard" className="text-zinc-950 dark:text-zinc-50">
              ReviewMe
            </Link>
            <Link
              href="/dashboard"
              className="text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
            >
              Dashboard
            </Link>
            <Link
              href="/history"
              className="text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
            >
              History
            </Link>
          </nav>
          <div className="flex items-center gap-4 text-sm">
            <span className="text-zinc-600 dark:text-zinc-400">{user.email}</span>
            <form action={logout}>
              <button
                type="submit"
                className="text-zinc-600 hover:text-zinc-950 dark:text-zinc-400 dark:hover:text-zinc-50"
              >
                Log out
              </button>
            </form>
          </div>
        </div>
      </header>
      <main className="mx-auto w-full max-w-4xl flex-1 px-4 py-8">{children}</main>
    </div>
  );
}
