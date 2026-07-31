import { verifySession } from "@/lib/dal";

export default async function AppLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  await verifySession();

  return <div className="stage flex flex-1 flex-col">{children}</div>;
}
