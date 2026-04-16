// Mobile zoom-out for results page only
export const viewport = {
  width: 'device-width',
  initialScale: 0.75,
  maximumScale: 1,
  userScalable: true,
};

export default function ResultsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
