import { BloodGroup, UrgencyLevel } from './types';

// REDLINK prototype rule: a donor must be at least 120 days from their
// previous whole-blood donation to be considered eligible.
// ANAVANDI SC-12 requires donation interval rules but does not mandate
// a specific number; 120 days is the chosen prototype value.
export const DONATION_INTERVAL_DAYS = 120;

export const BLOOD_GROUPS: readonly BloodGroup[] = [
  'A+',
  'A-',
  'B+',
  'B-',
  'AB+',
  'AB-',
  'O+',
  'O-',
] as const;

export const URGENCY_LEVELS = [
  'urgent',
  'normal',
] as const;

export const DISCLAIMER_TEXT =
  'REDLINK is a donor matching prototype designed for private notifications. It does not perform blood testing, cross-matching, or medical screening. Verification by licensed blood bank personnel remains mandatory.';
