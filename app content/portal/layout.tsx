export default function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="portal-desktop-zoom">
      {children}
    </div>
  );
}
