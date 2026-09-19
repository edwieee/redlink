import { describe, it, expect, vi, beforeEach } from 'vitest';
import { getDonorNotificationsAction } from '../app/actions/notifications';
import { supabaseServer } from '../lib/supabaseServer';

// Mock server-only
vi.mock('server-only', () => ({}));

// Mock the server client
vi.mock('../lib/supabaseServer', () => {
  return {
    supabaseServer: {
      from: vi.fn(),
    },
  };
});

describe('Step 6 — Donor Notifications', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  const mockDonor = {
    id: 'donor-1',
    name: 'Rahul Sharma',
  };

  const mockMatches = [
    {
      id: 'match-1',
      match_type: 'exact',
      matched_at: '2026-09-19T10:00:00Z',
      request_id: 'req-1',
      requests: {
        blood_group: 'O+',
        locality: 'Koratty',
        urgency: 'urgent',
        // Phone intentionally absent from the joined data
      },
    },
  ];

  const createMockDb = (donorData: any, matchData: any) => {
    const fromMock = vi.fn((table: string) => {
      if (table === 'donors') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          single: vi.fn().mockResolvedValue({ data: donorData, error: null }),
        };
      }
      if (table === 'matches') {
        return {
          select: vi.fn().mockReturnThis(),
          eq: vi.fn().mockReturnThis(),
          order: vi.fn().mockResolvedValue({ data: matchData, error: null }),
        };
      }
      return {};
    });
    
    (supabaseServer.from as any) = fromMock;
    return fromMock;
  };

  it('should successfully fetch notifications for a valid donor', async () => {
    createMockDb(mockDonor, mockMatches);

    const result = await getDonorNotificationsAction('donor-1');
    expect(result.success).toBe(true);
    expect(result.donorName).toBe('Rahul Sharma');
    expect(result.notifications).toHaveLength(1);
    
    const notification = result.notifications[0];
    expect(notification.bloodGroup).toBe('O+');
    expect(notification.locality).toBe('Koratty');
    expect(notification.urgency).toBe('urgent');
    expect(notification.matchType).toBe('exact');
  });

  it('should NOT leak the requester phone number in the notification payload', async () => {
    // Add a phone number to the mock request data to ensure it gets stripped/ignored
    const leakyMatches = [
      {
        ...mockMatches[0],
        requests: {
          ...mockMatches[0].requests,
          phone: '9999999999',
        }
      }
    ];
    
    createMockDb(mockDonor, leakyMatches);

    const result = await getDonorNotificationsAction('donor-1');
    expect(result.success).toBe(true);
    
    const notification = result.notifications[0] as any;
    expect(notification.phone).toBeUndefined();
    expect(notification.requests).toBeUndefined();
  });

  it('should return empty notifications if no matches found', async () => {
    createMockDb(mockDonor, []);

    const result = await getDonorNotificationsAction('donor-1');
    expect(result.success).toBe(true);
    expect(result.notifications).toHaveLength(0);
  });
});
