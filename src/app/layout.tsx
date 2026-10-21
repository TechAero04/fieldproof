import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FieldProof — Field Inspection & Compliance SaaS',
  description: 'Autonomous field inspection, digital checklists, photo evidence, GPS verification, and certified PDF compliance reporting.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
