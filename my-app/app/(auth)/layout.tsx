import { ThemeToggle } from "@/app/_components/theme-toggle";

export default function AuthLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="stage relative flex flex-1 items-center justify-center px-4 py-8">
      <div className="absolute top-4 right-4">
        <ThemeToggle className="border-ink/25 text-ink" />
      </div>
      <div className="w-full max-w-sm">{children}</div>
    </div>
  );
}
