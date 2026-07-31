import { getUser } from "@/lib/dal";
import { logout } from "@/actions/auth";
import { NavTabs } from "./_components/nav-tabs";

export default async function ShellLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const user = await getUser();

  return (
    <div className="flex flex-1 justify-center px-4 py-7 pb-14">
      <div className="w-full max-w-[960px]">
        <div className="ticket flex flex-col">
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-t-[18px] bg-ink px-[26px] py-4 text-cream">
            <div className="flex flex-wrap items-center gap-[26px]">
              <div className="flex items-center gap-[9px]">
                <div className="font-mono flex h-[26px] w-[26px] items-center justify-center rounded-full border-[1.5px] border-dashed border-cream/50 text-[10px] font-bold">
                  RM
                </div>
                <div className="font-sans text-[15px] font-extrabold tracking-tight">
                  ReviewMe
                </div>
              </div>
              <NavTabs />
            </div>
            <div className="flex items-center gap-4 font-sans text-[13px] opacity-85">
              <span>{user.email}</span>
              <form action={logout}>
                <button type="submit" className="cursor-pointer underline">
                  Log out
                </button>
              </form>
            </div>
          </div>
          <div className="perf" />
          <div className="flex flex-col gap-[22px] px-7 py-9">{children}</div>
        </div>
      </div>
    </div>
  );
}
