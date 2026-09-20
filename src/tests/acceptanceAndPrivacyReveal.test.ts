import { describe, it, expect, vi, beforeEach } from 'vitest';
import { acceptMatchAction } from '../app/actions/acceptance';
import { getRequestMatchesAction } from '../app/actions/requesterMatches';
import { createRequesterToken, verifyRequesterToken } from '../lib/auth/tokens';
import { supabaseServer } from '../lib/supabaseServer';

// Mock server-only
vi.mock('server-only', () => ({}));

// Mock supabaseServer
vi.mock('../lib/supabaseServer', () => {
  return {
    supabaseServer: {
      from: vi.fn(),
    },
  };
});

describe('Step 7 — Donor Acceptance & Privacy-Controlled Contact Reveal', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockRequestId = 'req-uuid-111';
  const mockRequesterPhone = '9000000099';
  const mockDonorAId = 'donor-uuid-aaa';
  const mockDonorBId = 'donor-uuid-bbb';
  const mockMatchId = 'match-uuid-mmm';
  const validToken = createRequesterToken(mockRequestId, mockRequesterPhone);

  const mockDonorA = {
    id: mockDonorAId,
    name: 'Demo Donor A',
    blood_group: 'O+',
    locality: 'Koratty',
    pincode: '680308',
    phone: '9000000001', // SENSITIVE
  };

  const mockRequest = {
    id: mockRequestId,
    requester_name: 'Demo Requester',
    blood_group: 'O+',
    locality: 'Koratty',
    pincode: '680308',
    hospital: 'Demo General Hospital',
    urgency: 'urgent',
    phone: mockRequesterPhone,
    status: 'matched',
    created_at: '2026-09-20T00:00:00Z',
  };

  // -------------------------------------------------------------------------
  // 1. ACCEPTANCE ACTION & STATE MACHINE TESTS
  // -------------------------------------------------------------------------
  describe('Donor Acceptance Workflow', () => {
    it('allows the correct matched donor to accept their pending match', async () => {
      const pendingMatch = {
        id: mockMatchId,
        request_id: mockRequestId,
        donor_id: mockDonorAId,
        match_status: 'pending',
        accepted_at: null,
      };

      const updateMatchMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({ error: null }),
        }),
      });

      const updateReqMock = vi.fn().mockReturnValue({
        eq: vi.fn().mockResolvedValue({ error: null }),
      });

      const fromMock = vi.fn((table: string) => {
        if (table === 'matches') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: pendingMatch, error: null }),
              }),
            }),
            update: updateMatchMock,
          };
        }
        if (table === 'requests') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockRequest, error: null }),
              }),
            }),
            update: updateReqMock,
          };
        }
        return {};
      });

      (supabaseServer.from as any) = fromMock;

      const result = await acceptMatchAction({
        matchId: mockMatchId,
        donorId: mockDonorAId,
      });

      expect(result.success).toBe(true);
      expect(result.matchId).toBe(mockMatchId);
      expect(result.accepted_at).toBeDefined();

      // Verified state changes: matches -> accepted, requests -> accepted
      expect(updateMatchMock).toHaveBeenCalledWith(
        expect.objectContaining({
          match_status: 'accepted',
          accepted_at: expect.any(String),
        })
      );
      expect(updateReqMock).toHaveBeenCalledWith({
        status: 'accepted',
      });
    });

    it('TEST D: rejects if donor tries to accept another donor’s match (DENIED)', async () => {
      const matchForDonorA = {
        id: mockMatchId,
        request_id: mockRequestId,
        donor_id: mockDonorAId, // Owned by Donor A
        match_status: 'pending',
        accepted_at: null,
      };

      const fromMock = vi.fn((table: string) => {
        if (table === 'matches') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: matchForDonorA, error: null }),
              }),
            }),
          };
        }
        return {};
      });

      (supabaseServer.from as any) = fromMock;

      // Donor B attempts to accept Donor A's match
      const result = await acceptMatchAction({
        matchId: mockMatchId,
        donorId: mockDonorBId,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('Unauthorized');
    });

    it('idempotency: repeated acceptance is safe and returns success without duplicate writes', async () => {
      const alreadyAcceptedMatch = {
        id: mockMatchId,
        request_id: mockRequestId,
        donor_id: mockDonorAId,
        match_status: 'accepted',
        accepted_at: '2026-09-20T05:00:00Z',
      };

      const updateMock = vi.fn();

      const fromMock = vi.fn((table: string) => {
        if (table === 'matches') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: alreadyAcceptedMatch, error: null }),
              }),
            }),
            update: updateMock,
          };
        }
        return {};
      });

      (supabaseServer.from as any) = fromMock;

      const result = await acceptMatchAction({
        matchId: mockMatchId,
        donorId: mockDonorAId,
      });

      expect(result.success).toBe(true);
      expect(result.message).toContain('already accepted');
      expect(result.accepted_at).toBe('2026-09-20T05:00:00Z');
      // No duplicate database update triggered
      expect(updateMock).not.toHaveBeenCalled();
    });

    it('rejects acceptance for a non-existent match', async () => {
      const fromMock = vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: null, error: { message: 'Not found' } }),
          }),
        }),
      }));

      (supabaseServer.from as any) = fromMock;

      const result = await acceptMatchAction({
        matchId: 'non-existent-match',
        donorId: mockDonorAId,
      });

      expect(result.success).toBe(false);
      expect(result.error).toContain('no longer available');
    });
  });

  // -------------------------------------------------------------------------
  // 2. PRIVACY & CONTACT REVEAL BOUNDARY TESTS
  // -------------------------------------------------------------------------
  describe('Privacy & Contact Reveal Boundary', () => {
    it('TEST A: BEFORE donor accepts, requester API response has phone STRICTLY ABSENT/NULL', async () => {
      const pendingMatchRow = {
        id: mockMatchId,
        match_type: 'exact',
        match_status: 'pending',
        matched_at: '2026-09-20T01:00:00Z',
        accepted_at: null,
        donor_id: mockDonorAId,
        donors: mockDonorA,
      };

      const fromMock = vi.fn((table: string) => {
        if (table === 'requests') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockRequest, error: null }),
              }),
            }),
          };
        }
        if (table === 'matches') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: [pendingMatchRow], error: null }),
              }),
            }),
          };
        }
        return {};
      });

      (supabaseServer.from as any) = fromMock;

      const response = await getRequestMatchesAction({
        requestId: mockRequestId,
        token: validToken,
      });

      expect(response.success).toBe(true);
      expect(response.matches).toHaveLength(1);

      const match = response.matches![0];
      // CRITICAL: Phone number MUST NOT be leaked in pending state
      expect(match.phone).toBeNull();
      expect(match.isPhoneRevealed).toBe(false);
      expect(match.matchStatus).toBe('pending');
      expect(match.donorName).toBe('Demo Donor A');
    });

    it('TEST B: AFTER donor accepts, authorized requester receives the revealed contact', async () => {
      const acceptedMatchRow = {
        id: mockMatchId,
        match_type: 'exact',
        match_status: 'accepted',
        matched_at: '2026-09-20T01:00:00Z',
        accepted_at: '2026-09-20T02:00:00Z',
        donor_id: mockDonorAId,
        donors: mockDonorA, // Contains phone: '9000000001'
      };

      const fromMock = vi.fn((table: string) => {
        if (table === 'requests') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockRequest, error: null }),
              }),
            }),
          };
        }
        if (table === 'matches') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({ data: [acceptedMatchRow], error: null }),
              }),
            }),
          };
        }
        return {};
      });

      (supabaseServer.from as any) = fromMock;

      const response = await getRequestMatchesAction({
        requestId: mockRequestId,
        token: validToken,
      });

      expect(response.success).toBe(true);
      expect(response.matches).toHaveLength(1);

      const match = response.matches![0];
      // Authorized contact revealed upon valid acceptance
      expect(match.phone).toBe('9000000001');
      expect(match.isPhoneRevealed).toBe(true);
      expect(match.matchStatus).toBe('accepted');
      expect(match.acceptedAt).toBe('2026-09-20T02:00:00Z');
    });

    it('TEST C: Unauthorized user without token is DENIED access to contact info', async () => {
      const fromMock = vi.fn((table: string) => {
        if (table === 'requests') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockRequest, error: null }),
              }),
            }),
          };
        }
        return {};
      });

      (supabaseServer.from as any) = fromMock;

      // Caller attempts to access matches without token
      const response = await getRequestMatchesAction({
        requestId: mockRequestId,
        token: null,
      });

      expect(response.success).toBe(false);
      expect(response.error).toContain('Unauthorized');
      expect(response.matches).toBeUndefined();
    });

    it('TEST E: Parameter tampering with invalid token or changed requestId is DENIED', async () => {
      const fromMock = vi.fn((table: string) => {
        if (table === 'requests') {
          return {
            select: vi.fn().mockReturnValue({
              eq: vi.fn().mockReturnValue({
                single: vi.fn().mockResolvedValue({ data: mockRequest, error: null }),
              }),
            }),
          };
        }
        return {};
      });

      (supabaseServer.from as any) = fromMock;

      // Tampered: user supplies a forged or wrong token
      const forgedToken = '0000111122223333444455556666777788889999aaaabbbbccccddddeeeeffff';
      const response = await getRequestMatchesAction({
        requestId: mockRequestId,
        token: forgedToken,
      });

      expect(response.success).toBe(false);
      expect(response.error).toContain('Unauthorized');
      expect(response.matches).toBeUndefined();
    });
  });

  // -------------------------------------------------------------------------
  // 3. CRYPTOGRAPHIC TOKEN VERIFICATION TESTS
  // -------------------------------------------------------------------------
  describe('Cryptographic Token Security', () => {
    it('verifies valid requester token matching requestId and phone', async () => {
      const fromMock = vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: mockRequestId, phone: mockRequesterPhone }, error: null }),
          }),
        }),
      }));

      (supabaseServer.from as any) = fromMock;

      const isValid = await verifyRequesterToken(mockRequestId, validToken);
      expect(isValid).toBe(true);
    });

    it('rejects token if requestId does not match database record', async () => {
      const fromMock = vi.fn(() => ({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            single: vi.fn().mockResolvedValue({ data: { id: 'other-req', phone: '9888888888' }, error: null }),
          }),
        }),
      }));

      (supabaseServer.from as any) = fromMock;

      const isValid = await verifyRequesterToken('other-req', validToken);
      expect(isValid).toBe(false);
    });

    it('rejects empty, null, or malformed tokens safely', async () => {
      expect(await verifyRequesterToken('', '')).toBe(false);
      expect(await verifyRequesterToken(mockRequestId, null)).toBe(false);
      expect(await verifyRequesterToken(mockRequestId, 'not-a-hex-token')).toBe(false);
    });
  });
});
