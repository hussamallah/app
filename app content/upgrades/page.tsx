'use client';
import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';

function UpgradesContent() {
  const searchParams = useSearchParams();
  const rid = searchParams.get('rid');

  const upgrades = [
    {
      title: 'Conflict Patterns',
      description: 'Unlock a detailed analysis of your core conflict patterns. Understand how you behave under pressure and learn to navigate tension more effectively.',
      price: 1.49,
      href: `/conflict-patterns${rid ? `?rid=${rid}` : ''}`,
      cta: 'View Conflict Patterns'
    },
    {
      title: 'Existential Circuits',
      description: 'Unlock your core psychological wiring. This report reveals your fundamental drivers, fears, and the internal \'circuits\' that dictate how you manage energy, clarity, structure, and relationships.',
      price: 3.00,
      href: `/existential-circuits${rid ? `?rid=${rid}` : ''}`,
      cta: 'View Existential Circuits'
    },
    {
      title: 'Operating Manual',
      description: 'Get a personalized playbook for your life. This manual translates your personality results into actionable advice for your career, decisions, and routines, including your ideal roles, burnout triggers, and communication style.',
      price: 10.00,
      href: `/results/operation-of-life-report${rid ? `?rid=${rid}` : ''}`,
      cta: 'View Operating Manual'
    },
    {
      title: 'Compatibility Report',
      description: 'How do you relate to others? This report reveals the precise points of harmony and friction between you and another person, creating a playbook for better communication.',
      price: 3.00,
      href: `/compatibility${rid ? `?ridA=${rid}` : ''}`,
      cta: 'View Compatibility Report'
    }
  ];

  const bundles = [
    {
      title: 'Starter Bundle',
      description: 'Includes: Conflict Patterns & Compatibility Report',
      useCase: 'Unlock a detailed analysis of your core conflict patterns and see how you relate to others. This bundle provides a playbook for navigating tension and improving communication.',
      originalPrice: 4.49,
      discountedPrice: 3.59,
      discount: '20% off',
      href: '#'
    },
    {
      title: 'Insight Bundle',
      description: 'Includes: Conflict Patterns & Existential Circuits',
      useCase: 'Discover your core psychological wiring and connect it to your behavior under pressure. This bundle links your fundamental motivations and fears to your conflict style.',
      originalPrice: 4.49,
      discountedPrice: 3.59,
      discount: '20% off',
      href: '#'
    },
    {
      title: 'Pro Bundle',
      description: 'Includes: Operating Manual & Existential Circuits',
      useCase: 'Get a full playbook for your life, from core drivers to daily routines. This bundle provides actionable advice for your career and decisions, grounded in your deepest psychological wiring.',
      originalPrice: 13.00,
      discountedPrice: 9.75,
      discount: '25% off',
      href: '#'
    },
    {
      title: 'Ultimate Bundle',
      description: 'Includes: All 4 Reports',
      useCase: 'The complete package. Get a comprehensive understanding of your inner wiring, your actionable life playbook, how you handle conflict, and how you relate to others.',
      originalPrice: 17.49,
      discountedPrice: 13.12,
      discount: '25% off',
      href: '#'
    }
  ];

  return (
    <div className="min-h-screen bg-black text-white flex flex-col items-center py-12 px-4">
      <h1 className="text-4xl font-bold text-yellow-400 mb-4">Upgrades</h1>
      <p className="text-white/80 mb-12 max-w-2xl text-center">
        Enhance your self-understanding with these detailed reports. Each upgrade provides a deeper layer of insight into your personality and how you interact with the world.
      </p>

      <h2 className="text-3xl font-bold text-yellow-300 mb-8">Recommended Bundles</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl w-full mb-16">
        {bundles.map((bundle) => (
          <div key={bundle.title} className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-6 flex flex-col shadow-lg">
            <h3 className="text-2xl font-bold text-yellow-300">{bundle.title}</h3>
            <p className="text-white/90 font-semibold mt-2">{bundle.description}</p>
            <p className="text-white/70 text-sm mt-2 flex-grow">{bundle.useCase}</p>
            <div className="mt-6">
              <div className="flex items-baseline justify-center gap-2">
                <p className="text-lg font-semibold text-white/60 line-through">${bundle.originalPrice.toFixed(2)}</p>
                <p className="text-2xl font-bold text-green-400">${bundle.discountedPrice.toFixed(2)}</p>
              </div>
              <p className="text-sm font-semibold text-green-300">{bundle.discount}</p>
              <Link href={bundle.href} className="mt-4 inline-block bg-green-500 text-black font-bold py-2 px-4 rounded hover:bg-green-400 transition-colors">
                Purchase Bundle
              </Link>
            </div>
          </div>
        ))}
      </div>

      <h2 className="text-3xl font-bold text-yellow-300 mb-8">Individual Reports</h2>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 max-w-7xl w-full">
        {upgrades.map((upgrade) => (
          <div key={upgrade.title} className="bg-white/5 border border-white/10 rounded-lg p-6 flex flex-col">
            <h2 className="text-2xl font-bold text-yellow-300">{upgrade.title}</h2>
            <p className="text-white/70 mt-4 flex-grow">{upgrade.description}</p>
            <div className="mt-6">
              <p className="text-lg font-semibold text-white">${upgrade.price.toFixed(2)}</p>
              <Link href={upgrade.href} className="mt-4 inline-block bg-yellow-500 text-black font-bold py-2 px-4 rounded hover:bg-yellow-400 transition-colors">
                {upgrade.cta}
              </Link>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default function UpgradesPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-black text-white flex items-center justify-center">Loading...</div>}>
      <UpgradesContent />
    </Suspense>
  );
}
