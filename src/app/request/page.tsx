import React from 'react';
import Link from 'next/link';
import { Navbar } from '../../components/layout/Navbar';
import { Footer } from '../../components/layout/Footer';
import { BloodRequestForm } from '../../components/forms/BloodRequestForm';
import { ArrowLeft } from 'lucide-react';

export const metadata = {
  title: 'Request Blood | REDLINK',
  description:
    'Submit an urgent blood request on REDLINK. Directly matches with eligible nearby donors without broadcasting to social media.',
};

export default async function RequestPage({
  searchParams,
}: {
  searchParams?: Promise<{ requestId?: string; token?: string }>;
}) {
  const resolvedParams = searchParams ? await searchParams : undefined;

  return (
    <div className="min-h-screen bg-[#030304] text-white flex flex-col justify-between">
      <Navbar />

      <main className="flex-1 flex flex-col items-center justify-center py-12 sm:py-16 px-4">
        <div className="w-full max-w-xl mb-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-xs font-mono uppercase tracking-wider text-white/60 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </Link>
        </div>

        <div className="w-full max-w-xl">
          <BloodRequestForm
            initialRequestId={resolvedParams?.requestId}
            initialToken={resolvedParams?.token}
          />
        </div>
      </main>

      <Footer />
    </div>
  );
}
