import { describe, it, expect } from 'vitest';
import { checkDonationEligibility } from '../lib/matching/interval';
import { DONATION_INTERVAL_DAYS } from '../lib/constants';

describe('Donation Interval Module', () => {
  const referenceDate = new Date('2026-09-19T00:00:00Z');

  it('should mark first-time donors (null last donation date) as eligible immediately', () => {
    const result = checkDonationEligibility(null, DONATION_INTERVAL_DAYS, referenceDate);
    expect(result.isEligible).toBe(true);
    expect(result.daysRemaining).toBe(0);
    expect(result.statusLabel).toContain('Eligible now');
  });

  it('should mark donor who donated 180 days ago as eligible', () => {
    // 180 days before 2026-09-19 is 2026-03-23
    const result = checkDonationEligibility('2026-03-23', DONATION_INTERVAL_DAYS, referenceDate);
    expect(result.isEligible).toBe(true);
    expect(result.daysRemaining).toBe(0);
    expect(result.daysElapsed).toBeGreaterThanOrEqual(179);
    expect(result.statusLabel).toBe('Eligible now');
  });

  it('should mark donor who donated exactly 120 days ago as eligible (boundary test)', () => {
    // 120 days before 2026-09-19 is 2026-05-22
    const result = checkDonationEligibility('2026-05-22', 120, referenceDate);
    expect(result.isEligible).toBe(true);
    expect(result.daysRemaining).toBe(0);
    expect(result.statusLabel).toBe('Eligible now');
  });

  it('should mark donor who donated 119 days ago as ineligible (boundary test)', () => {
    // 119 days before 2026-09-19 is 2026-05-23
    const result = checkDonationEligibility('2026-05-23', 120, referenceDate);
    expect(result.isEligible).toBe(false);
    expect(result.daysRemaining).toBe(1);
    expect(result.statusLabel).toBe('Eligible in 1 day');
  });

  it('should mark donor who donated 30 days ago as ineligible and provide exact remaining days', () => {
    // 30 days before 2026-09-19 is 2026-08-20
    const result = checkDonationEligibility('2026-08-20', 120, referenceDate);
    expect(result.isEligible).toBe(false);
    expect(result.daysRemaining).toBe(90);
    expect(result.statusLabel).toBe('Eligible in 90 days');
  });
});
