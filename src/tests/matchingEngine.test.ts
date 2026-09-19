import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { findMatchesForRequest } from '../lib/matching/matchingEngine';
import { supabaseServer } from '../lib/supabaseServer';

// Mock server-only to allow tests to run
vi.mock('server-only', () => ({}));

// Mock the server client to prevent real database calls during unit tests
vi.mock('../lib/supabaseServer', () => {
  return {
    supabaseServer: {
      from: vi.fn(),
    },
  };
});

describe('Matching Engine Orchestrator', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-09-19T00:00:00Z'));
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  const mockRequest = {
    id: 'req-123',
    requester_name: 'Test Requester',
    blood_group: 'O+',
    locality: 'Koratty',
    pincode: '680308',
    status: 'pending',
  };

  const createMockDb = (donors: any[], existingMatches: any[] = []) => {
    const fromMock = vi.fn((table: string) => {
      if (table === 'requests') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: mockRequest, error: null }),
          update: vi.fn().mockReturnThis(),
        };
      }
      if (table === 'donors') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: donors, error: null }),
        };
      }
      if (table === 'matches') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockResolvedValue({ data: existingMatches, error: null }),
          insert: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: { id: 'match-123' }, error: null }),
        };
      }
      return {};
    });
    
    (supabaseServer.from as any) = fromMock;
    return fromMock;
  };

  it('should successfully match an eligible O+ donor with an O+ request', async () => {
    const eligibleDonor = {
      id: 'donor-1',
      name: 'Donor A',
      blood_group: 'O+',
      locality: 'Koratty',
      pincode: '680308',
      last_donation_date: '2026-03-23', // 180 days ago
      phone: '9000000001',
    };
    
    createMockDb([eligibleDonor]);

    const result = await findMatchesForRequest('req-123');

    expect(result.success).toBe(true);
    expect(result.results).toHaveLength(1);
    
    const match = result.results[0];
    expect(match.isEligible).toBe(true);
    expect(match.donorName).toBe('Donor A');
    
    // Privacy: Match Evaluation Result MUST NOT contain the phone number
    expect(match).not.toHaveProperty('phone');
  });

  it('should exclude donor if donation interval is exactly 119 days (needs 120)', async () => {
    const ineligibleDonor = {
      id: 'donor-2',
      name: 'Donor B',
      blood_group: 'O+',
      locality: 'Koratty',
      pincode: '680308',
      last_donation_date: '2026-05-23', // 119 days ago
      phone: '9000000002',
    };
    
    createMockDb([ineligibleDonor]);

    const result = await findMatchesForRequest('req-123');

    expect(result.success).toBe(true);
    expect(result.results[0].isEligible).toBe(false);
    expect(result.results[0].exclusionReason).toContain('Donation interval not met');
  });

  it('should exclude donor with incompatible blood group (A+ donor for O+ request)', async () => {
    const incompatibleDonor = {
      id: 'donor-3',
      name: 'Donor C',
      blood_group: 'A+',
      locality: 'Koratty',
      pincode: '680308',
      last_donation_date: '2026-03-23', // 180 days ago (eligible interval)
      phone: '9000000003',
    };
    
    createMockDb([incompatibleDonor]);

    const result = await findMatchesForRequest('req-123');

    expect(result.success).toBe(true);
    expect(result.results[0].isEligible).toBe(false);
    expect(result.results[0].exclusionReason).toContain('Incompatible blood group');
  });

  it('should prevent duplicate matches if match already exists', async () => {
    const eligibleDonor = {
      id: 'donor-1',
      name: 'Donor A',
      blood_group: 'O+',
      locality: 'Koratty',
      pincode: '680308',
      last_donation_date: '2026-03-23', // 180 days ago
    };
    
    // Pass existing match with donor-1
    createMockDb([eligibleDonor], [{ donor_id: 'donor-1' }]);

    const result = await findMatchesForRequest('req-123');

    expect(result.success).toBe(true);
    // Should be excluded due to existing match
    expect(result.results[0].isEligible).toBe(false);
    expect(result.results[0].exclusionReason).toBe('Already matched');
  });
});
