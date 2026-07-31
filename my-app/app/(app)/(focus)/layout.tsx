export default function FocusLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <div className="flex flex-1 items-center justify-center px-4 py-7 pb-14">
      <div className="w-full max-w-[440px]">{children}</div>
    </div>
  );
}
