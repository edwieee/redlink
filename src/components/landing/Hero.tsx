'use client';

import React from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { Button } from '../ui/Button';

export const Hero: React.FC = () => {
  return (
    <section className="relative min-h-[calc(100vh-5rem)] flex items-center py-12 sm:py-0 tech-grid overflow-hidden">
      <div className="w-full max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-[62%_38%] gap-10 lg:gap-8 items-center">

          {/* Left Side — Text Content */}
          <div className="flex flex-col items-start text-left order-1">
            {/* HEADLINE — unified size, color-only differentiation */}
            <h1 className="font-display font-bold text-4xl sm:text-5xl lg:text-[50px] xl:text-[56px] tracking-tight leading-[1.08]">
              <span className="block text-white">Find the right donor.</span>
              <span className="block text-white/55">Without the broadcast.</span>
            </h1>

            {/* DESCRIPTION — intentional break after "with" on desktop */}
            <p className="mt-6 lg:mt-8 text-base sm:text-lg text-white/70 font-normal leading-relaxed max-w-[540px]">
              Connect urgent blood requests with<br className="hidden lg:inline" />{' '}
              eligible nearby donors privately.
            </p>

            {/* CTA BUTTONS */}
            <div className="flex flex-col sm:flex-row items-center justify-start gap-4 mt-10 w-full sm:w-auto">
              <Link href="/request" className="w-full sm:w-auto">
                <Button variant="primary" size="lg" className="w-full sm:w-auto px-6 sm:px-7 py-3 text-sm sm:text-base">
                  Request Blood
                </Button>
              </Link>
              <Link href="/donor" className="w-full sm:w-auto">
                <Button variant="secondary" size="lg" className="w-full sm:w-auto px-6 sm:px-7 py-3 text-sm sm:text-base">
                  Become a Donor
                </Button>
              </Link>
            </div>
          </div>

          {/* Right Side — Hero Image */}
          <div className="relative flex items-center justify-center order-2 w-full h-[340px] sm:h-[440px] lg:h-[560px]">
            <div className="relative w-full h-full lg:scale-[1.49] lg:-translate-x-6">
              <Image
                src="/hero-image.png"
                alt="Redlink connectivity visualization"
                fill
                className="object-contain object-center"
                priority
                quality={100}
                sizes="(max-width: 1024px) 100vw, 45vw"
                unoptimized
              />
            </div>
          </div>

        </div>
      </div>
    </section>
  );
};
