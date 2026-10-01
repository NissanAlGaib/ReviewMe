import { getUser } from "@/lib/dal";
import { logout } from "@/actions/auth";
import { NavTabs } from "./_components/nav-tabs";
import { MobileNav } from "./_components/mobile-nav";
import { ThemeToggle } from "@/app/_components/theme-toggle";

export default async function ShellLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getUser();

  return (
    <div className="flex flex-1 justify-center px-0 py-0 sm:px-4 sm:py-7 sm:pb-14">
      <div className="w-full max-w-[960px]">
        <div className="ticket flex flex-col sm:rounded-[18px]">
          <div className="flex items-center justify-between gap-3 rounded-t-[18px] bg-chrome px-4 py-3.5 text-chrome-foreground sm:flex-wrap sm:px-[26px] sm:py-4">
            <div className="flex items-center gap-[9px] sm:gap-[26px]">
              <div className="flex items-center gap-[9px]">
                <div className="font-mono flex h-[26px] w-[26px] items-center justify-center rounded-full border-[1.5px] border-dashed border-chrome-foreground/50 text-[10px] font-bold">
                  RM
                </div>
                <div className="font-sans text-[15px] font-extrabold tracking-tight">
                  ReviewMe
                </div>
              </div>
              <div className="hidden sm:flex sm:items-center sm:gap-[26px]">
                <NavTabs />
              </div>
            </div>
            <div className="hidden items-center gap-4 font-sans text-[13px] opacity-85 sm:flex">
              <span>{user.email}</span>
              <form action={logout}>
                <button type="submit" className="cursor-pointer underline">
                  Log out
                </button>
              </form>
              <ThemeToggle className="border-chrome-foreground/40 text-chrome-foreground opacity-85 hover:opacity-100" />
            </div>
            <div className="flex items-center gap-2 sm:hidden">
              <ThemeToggle className="border-chrome-foreground/40 text-chrome-foreground" />
              <MobileNav email={user.email} logout={logout} />
            </div>
          </div>
          <div className="perf" />
          <div className="flex flex-col gap-[18px] px-4 py-6 sm:gap-[22px] sm:px-7 sm:py-9">
            {children}
          </div>
        </div>
      </div>
    </div>
  );
}
