import { describe, it, expect, vi, beforeEach } from 'vitest';

// Mock server-only to allow tests to run in Node
vi.mock('server-only', () => ({}));

// Mock the Supabase client for unit testing actions without requiring live network/env
const mockInsert = vi.fn().mockReturnValue({
  select: vi.fn().mockReturnValue({
    single: vi.fn().mockResolvedValue({ error: null, data: { id: 'req-123' }, status: 201 })
  })
});

// Mock for simple inserts that don't chain select
const mockSimpleInsert = vi.fn().mockResolvedValue({ error: null, data: null, status: 201 });

const mockFrom = vi.fn().mockImplementation((table: string) => {
  return { insert: mockInsert };
});

vi.mock('../lib/supabase', () => ({
  supabase: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

vi.mock('../lib/supabaseServer', () => ({
  supabaseServer: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}));

import {
  donorRegistrationSchema,
  bloodRequestSchema,
  normalizePhone,
  isValidIndianPhone,
  isValidIndianPincode,
} from '../lib/validation/schemas';
import { registerDonorAction } from '../app/actions/donors';
import { submitBloodRequestAction } from '../app/actions/requests';

describe('Step 4 — Donor Registration Form & Validation', () => {
  const validDonor = {
    name: 'Rahul Sharma',
    blood_group: 'O+',
    locality: 'Koratty',
    pincode: '680308',
    last_donation_date: '2026-01-15',
    phone: '9876543210',
  };

  it('valid donor data passes validation', () => {
    const result = donorRegistrationSchema.safeParse(validDonor);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.name).toBe('Rahul Sharma');
      expect(result.data.blood_group).toBe('O+');
      expect(result.data.locality).toBe('Koratty');
      expect(result.data.pincode).toBe('680308');
      expect(result.data.last_donation_date).toBe('2026-01-15');
      expect(result.data.phone).toBe('9876543210');
    }
  });

  it('invalid blood group rejected', () => {
    const result = donorRegistrationSchema.safeParse({
      ...validDonor,
      blood_group: 'XYZ',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('blood_group'))).toBe(true);
    }
  });

  it('invalid pincode rejected', () => {
    const invalidPincodes = ['68030', '6803088', 'abcdef', '012345', ''];
    for (const pincode of invalidPincodes) {
      const result = donorRegistrationSchema.safeParse({
        ...validDonor,
        pincode,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes('pincode'))).toBe(true);
      }
    }
  });

  it('missing or whitespace-only name rejected', () => {
    const invalidNames = ['', '   ', 'A'];
    for (const name of invalidNames) {
      const result = donorRegistrationSchema.safeParse({
        ...validDonor,
        name,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes('name'))).toBe(true);
      }
    }
  });

  it('future donation date rejected', () => {
    const futureDate = new Date();
    futureDate.setFullYear(futureDate.getFullYear() + 1);
    const futureDateStr = futureDate.toISOString().split('T')[0];

    const result = donorRegistrationSchema.safeParse({
      ...validDonor,
      last_donation_date: futureDateStr,
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('last_donation_date'))).toBe(true);
      expect(result.error.issues[0].message).toContain('future');
    }
  });

  it('invalid phone rejected', () => {
    const invalidPhones = ['12345', '0000000000', '1234567890', 'abcdefghij', '5555555555'];
    for (const phone of invalidPhones) {
      const result = donorRegistrationSchema.safeParse({
        ...validDonor,
        phone,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes('phone'))).toBe(true);
      }
    }
  });

  it('normalizes phone number with +91 or spaces to clean 10-digit number', () => {
    const donorWithPrefix = {
      ...validDonor,
      phone: '+91 98765 43210',
    };
    const result = donorRegistrationSchema.safeParse(donorWithPrefix);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.phone).toBe('9876543210');
    }
  });
});

describe('Step 4 — Blood Request Form & Validation', () => {
  const validRequest = {
    requester_name: 'Dr. Anita Nair',
    blood_group: 'AB-',
    locality: 'Ernakulam',
    pincode: '682001',
    hospital: 'City General Hospital',
    urgency: 'urgent',
    phone: '9840198401',
  };

  it('valid request passes validation', () => {
    const result = bloodRequestSchema.safeParse(validRequest);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.requester_name).toBe('Dr. Anita Nair');
      expect(result.data.blood_group).toBe('AB-');
      expect(result.data.locality).toBe('Ernakulam');
      expect(result.data.pincode).toBe('682001');
      expect(result.data.hospital).toBe('City General Hospital');
      expect(result.data.urgency).toBe('urgent');
      expect(result.data.phone).toBe('9840198401');
    }
  });

  it('invalid blood group rejected', () => {
    const result = bloodRequestSchema.safeParse({
      ...validRequest,
      blood_group: 'C+',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('blood_group'))).toBe(true);
    }
  });

  it('invalid pincode rejected', () => {
    const invalidPincodes = ['123', '000000', '68200A'];
    for (const pincode of invalidPincodes) {
      const result = bloodRequestSchema.safeParse({
        ...validRequest,
        pincode,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes('pincode'))).toBe(true);
      }
    }
  });

  it('missing hospital rejected', () => {
    const invalidHospitals = ['', '   '];
    for (const hospital of invalidHospitals) {
      const result = bloodRequestSchema.safeParse({
        ...validRequest,
        hospital,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes('hospital'))).toBe(true);
      }
    }
  });

  it('invalid urgency rejected (only urgent and normal allowed)', () => {
    const invalidUrgencies = ['CRITICAL', 'HIGH', 'LOW', 'STANDARD', 'moderate'];
    for (const urgency of invalidUrgencies) {
      const result = bloodRequestSchema.safeParse({
        ...validRequest,
        urgency,
      });
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some((i) => i.path.includes('urgency'))).toBe(true);
      }
    }

    // Both 'urgent' and 'normal' must pass
    expect(bloodRequestSchema.safeParse({ ...validRequest, urgency: 'urgent' }).success).toBe(true);
    expect(bloodRequestSchema.safeParse({ ...validRequest, urgency: 'normal' }).success).toBe(true);
  });

  it('invalid phone rejected', () => {
    const result = bloodRequestSchema.safeParse({
      ...validRequest,
      phone: '0123456789',
    });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some((i) => i.path.includes('phone'))).toBe(true);
    }
  });
});

describe('Step 4 — Database Payload Fields & Status', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('donor insert uses exact database columns (name, blood_group, locality, pincode, last_donation_date, phone)', async () => {
    const donorInput = {
      name: '  Vikram Seth  ',
      blood_group: 'B+',
      locality: '  Aluva  ',
      pincode: '683101',
      last_donation_date: '2025-11-20',
      phone: '  +91-9876543210  ',
    };

    const res = await registerDonorAction(donorInput);
    expect(res.success).toBe(true);
    expect(mockFrom).toHaveBeenCalledWith('donors');
    expect(mockInsert).toHaveBeenCalledTimes(1);

    const insertedPayload = mockInsert.mock.calls[0][0][0];
    const expectedKeys = ['name', 'blood_group', 'locality', 'pincode', 'last_donation_date', 'phone'];
    expect(Object.keys(insertedPayload).sort()).toEqual(expectedKeys.sort());

    // Check normalization
    expect(insertedPayload.name).toBe('Vikram Seth');
    expect(insertedPayload.locality).toBe('Aluva');
    expect(insertedPayload.phone).toBe('9876543210');
  });

  it('request insert uses exact database columns with status = pending', async () => {
    const requestInput = {
      requester_name: '  St. Mary Hospital  ',
      blood_group: 'O-',
      locality: '  Kaloor  ',
      pincode: '682017',
      hospital: '  St. Mary Clinic  ',
      urgency: 'urgent',
      phone: '9840198401',
    };

    const res = await submitBloodRequestAction(requestInput);
    expect(res.success).toBe(true);
    expect(mockFrom).toHaveBeenCalledWith('requests');
    expect(mockInsert).toHaveBeenCalledTimes(1);

    const insertedPayload = mockInsert.mock.calls[0][0][0];
    const expectedKeys = [
      'requester_name',
      'blood_group',
      'locality',
      'pincode',
      'hospital',
      'urgency',
      'phone',
      'status',
    ];
    expect(Object.keys(insertedPayload).sort()).toEqual(expectedKeys.sort());
    expect(insertedPayload.status).toBe('pending');
    expect(insertedPayload.requester_name).toBe('St. Mary Hospital');
    expect(insertedPayload.hospital).toBe('St. Mary Clinic');
  });
});

describe('Step 4 — Privacy & Non-Leakage of Phone Numbers', () => {
  it('donor registration response does NOT echo phone number or private data on validation failure', async () => {
    const invalidDonorData = {
      name: '',
      phone: '9876543210',
    };

    const actionResponse = await registerDonorAction(invalidDonorData);
    expect(actionResponse.success).toBe(false);

    // Assert that phone number is NEVER echoed in response
    const responseString = JSON.stringify(actionResponse);
    expect(responseString).not.toContain('9876543210');
  });

  it('donor registration response does NOT echo phone number on success', async () => {
    const validDonor = {
      name: 'Rahul Sharma',
      blood_group: 'O+',
      locality: 'Koratty',
      pincode: '680308',
      last_donation_date: '2026-01-15',
      phone: '9876543210',
    };

    const actionResponse = await registerDonorAction(validDonor);
    expect(actionResponse.success).toBe(true);

    const responseString = JSON.stringify(actionResponse);
    expect(responseString).not.toContain('9876543210');
    expect(actionResponse.message).toBe('Your donor information has been securely saved.');
  });

  it('blood request response does NOT echo phone number or private data on validation failure', async () => {
    const invalidRequestData = {
      requester_name: '',
      phone: '9840198401',
    };

    const actionResponse = await submitBloodRequestAction(invalidRequestData);
    expect(actionResponse.success).toBe(false);

    // Assert that phone number is NEVER echoed in response
    const responseString = JSON.stringify(actionResponse);
    expect(responseString).not.toContain('9840198401');
  });

  it('blood request response does NOT echo phone number on success', async () => {
    const validRequest = {
      requester_name: 'Dr. Anita Nair',
      blood_group: 'AB-',
      locality: 'Ernakulam',
      pincode: '682001',
      hospital: 'City General Hospital',
      urgency: 'urgent',
      phone: '9840198401',
    };

    const actionResponse = await submitBloodRequestAction(validRequest);
    expect(actionResponse.success).toBe(true);

    const responseString = JSON.stringify(actionResponse);
    expect(responseString).not.toContain('9840198401');
    expect(actionResponse.message).toBe('Your blood request has been recorded.');
  });

  it('success messages accurately state data was saved/recorded without premature notification claims', () => {
    const donorSuccessMessage = 'Your donor information has been securely saved.';
    const requestSuccessMessage = 'Your blood request has been recorded.';

    // Check donor message
    expect(donorSuccessMessage).toContain('securely saved');
    expect(donorSuccessMessage.toLowerCase()).not.toContain('notified');
    expect(donorSuccessMessage.toLowerCase()).not.toContain('match found');

    // Check request message
    expect(requestSuccessMessage).toContain('recorded');
    expect(requestSuccessMessage.toLowerCase()).not.toContain('notified');
    expect(requestSuccessMessage.toLowerCase()).not.toContain('donors notified');
    expect(requestSuccessMessage.toLowerCase()).not.toContain('match found');
  });
});
