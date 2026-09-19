'use client';

import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { Input } from '../ui/Input';
import { Select } from '../ui/Select';
import { BLOOD_GROUPS } from '../../lib/constants';
import { submitBloodRequestAction } from '../../app/actions/requests';
import { findMatchesAction } from '../../app/actions/matching';
import { bloodRequestSchema } from '../../lib/validation/schemas';
import { CheckCircle2, AlertCircle, ShieldCheck, Search } from 'lucide-react';
import { MatchResults } from '../matching/MatchResults';
import { MatchEvaluationResult } from '../../lib/matching/matchingEngine';

interface FormState {
  requester_name: string;
  blood_group: string;
  locality: string;
  pincode: string;
  hospital: string;
  urgency: string;
  phone: string;
}

const initialFormState: FormState = {
  requester_name: '',
  blood_group: '',
  locality: '',
  pincode: '',
  hospital: '',
  urgency: 'urgent',
  phone: '',
};

const urgencyOptions = [
  { value: 'urgent', label: 'Urgent — Required within 24 hours' },
  { value: 'normal', label: 'Normal — Scheduled requirement' },
];

export const BloodRequestForm: React.FC = () => {
  const [formData, setFormData] = useState<FormState>(initialFormState);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [globalError, setGlobalError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  
  // Matching Engine State
  const [requestId, setRequestId] = useState<string | null>(null);
  const [isMatching, setIsMatching] = useState(false);
  const [matchResults, setMatchResults] = useState<MatchEvaluationResult[] | null>(null);

  const handleChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (fieldErrors[name]) {
      setFieldErrors((prev) => {
        const next = { ...prev };
        delete next[name];
        return next;
      });
    }
    if (globalError) setGlobalError(null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setGlobalError(null);
    setFieldErrors({});

    // Client-side validation
    const validationResult = bloodRequestSchema.safeParse(formData);
    if (!validationResult.success) {
      const errors: Record<string, string> = {};
      for (const issue of validationResult.error.issues) {
        const field = issue.path[0];
        if (typeof field === 'string' && !errors[field]) {
          errors[field] = issue.message;
        }
      }
      setFieldErrors(errors);
      return;
    }

    setIsSubmitting(true);

    try {
      const response = await submitBloodRequestAction(formData);

      if (!response.success) {
        if (response.fieldErrors) {
          setFieldErrors(response.fieldErrors);
        }
        setGlobalError(
          response.error || response.message || 'Validation failed. Please check the form fields.'
        );
      } else {
        setIsSuccess(true);
        if (response.request_id) {
          setRequestId(response.request_id);
          
          // Automatically trigger the matching engine
          setIsMatching(true);
          try {
            const matchResponse = await findMatchesAction(response.request_id);
            if (matchResponse.success) {
              setMatchResults(matchResponse.results);
            } else {
              setGlobalError(matchResponse.message || 'Failed to find matches.');
            }
          } catch {
            setGlobalError('Something went wrong while finding matches.');
          } finally {
            setIsMatching(false);
          }
        }
      }
    } catch {
      setGlobalError('Something went wrong while submitting. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReset = () => {
    setIsSuccess(false);
    setFormData(initialFormState);
    setFieldErrors({});
    setGlobalError(null);
    setRequestId(null);
    setMatchResults(null);
  };


  if (isSuccess) {
    return (
      <div className="bg-[#111111] border border-white/[0.08] p-8 rounded-xl space-y-6 text-center max-w-lg mx-auto">
        <div className="flex justify-center">
          {isMatching ? (
            <div className="w-16 h-16 rounded-full bg-white/[0.04] flex items-center justify-center animate-pulse">
              <Search className="w-8 h-8 text-white/40" />
            </div>
          ) : (
            <div className="w-16 h-16 rounded-full bg-[#df2531]/10 flex items-center justify-center">
              <CheckCircle2 className="w-8 h-8 text-[#df2531]" />
            </div>
          )}
        </div>
        
        {isMatching ? (
          <div className="space-y-2">
            <h3 className="font-display font-bold text-2xl text-white">MATCHING DONORS...</h3>
            <p className="text-white/60">Searching for eligible donors nearby.</p>
          </div>
        ) : matchResults ? (
          <div className="w-full text-left">
            <MatchResults results={matchResults} />
          </div>
        ) : (
          <div className="space-y-2">
            <h3 className="font-display font-bold text-2xl text-white">Request Recorded</h3>
            <p className="text-white/60">An error occurred while finding matches.</p>
          </div>
        )}

        {(!isMatching && (!matchResults || matchResults.length === 0)) && (
          <div className="pt-6">
            <Button variant="secondary" size="md" onClick={handleReset} fullWidth>
              Submit Another Request
            </Button>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/[0.08] bg-[#07070a] p-6 sm:p-9 max-w-xl mx-auto">
      <div className="mb-6 space-y-1.5">
        <span className="text-[10px] font-mono tracking-widest text-[#df2531] uppercase">
          REQUEST BLOOD
        </span>
        <h2 className="font-display font-bold text-2xl text-white">
          Submit Blood Request
        </h2>
        <p className="text-sm text-white/60 font-normal leading-relaxed">
          Enter blood requirement details. Your contact information is never broadcast publicly.
        </p>
      </div>

      {globalError && (
        <div className="mb-6 rounded-lg border border-[#df2531]/30 bg-[#df2531]/10 p-3.5 text-xs text-[#df2531] flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <span>{globalError}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>
        {/* SECTION 1: REQUEST DETAILS */}
        <div className="space-y-3.5">
          <div className="text-[11px] font-mono tracking-wider text-[#df2531] uppercase pb-1.5 border-b border-white/[0.06]">
            Request Details
          </div>

          <Input
            id="requester_name"
            name="requester_name"
            label="Patient or Requester Name"
            placeholder="e.g. Dr. Anita / Patient Attendant"
            value={formData.requester_name}
            onChange={handleChange}
            error={fieldErrors.requester_name}
            required
            disabled={isSubmitting}
            autoComplete="name"
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Select
              id="blood_group"
              name="blood_group"
              label="Blood Group Required"
              placeholder="Select blood group"
              options={BLOOD_GROUPS}
              value={formData.blood_group}
              onChange={handleChange}
              error={fieldErrors.blood_group}
              required
              disabled={isSubmitting}
            />

            <Select
              id="urgency"
              name="urgency"
              label="Urgency Level"
              options={urgencyOptions}
              value={formData.urgency}
              onChange={handleChange}
              error={fieldErrors.urgency}
              required
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* SECTION 2: HOSPITAL */}
        <div className="space-y-3.5">
          <div className="text-[11px] font-mono tracking-wider text-[#df2531] uppercase pb-1.5 border-b border-white/[0.06]">
            Hospital & Location
          </div>

          <Input
            id="hospital"
            name="hospital"
            label="Hospital or Medical Center"
            placeholder="e.g. City General Hospital"
            value={formData.hospital}
            onChange={handleChange}
            error={fieldErrors.hospital}
            required
            disabled={isSubmitting}
          />

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            <Input
              id="locality"
              name="locality"
              label="Locality or City"
              placeholder="e.g. Koratty"
              value={formData.locality}
              onChange={handleChange}
              error={fieldErrors.locality}
              required
              disabled={isSubmitting}
            />

            <Input
              id="pincode"
              name="pincode"
              label="Pincode"
              placeholder="e.g. 680308"
              maxLength={6}
              value={formData.pincode}
              onChange={handleChange}
              error={fieldErrors.pincode}
              required
              disabled={isSubmitting}
            />
          </div>
        </div>

        {/* SECTION 3: CONTACT */}
        <div className="space-y-3.5">
          <div className="text-[11px] font-mono tracking-wider text-[#df2531] uppercase pb-1.5 border-b border-white/[0.06]">
            Contact & Privacy
          </div>

          <Input
            id="phone"
            name="phone"
            type="tel"
            label="Contact Phone Number"
            placeholder="e.g. 9876543210"
            value={formData.phone}
            onChange={handleChange}
            error={fieldErrors.phone}
            helperText="Stored securely. Never displayed publicly or shared without verified donor acceptance."
            required
            disabled={isSubmitting}
            autoComplete="tel"
          />
        </div>

        {/* Submit CTA */}
        <div className="pt-2">
          <Button
            type="submit"
            variant="primary"
            size="lg"
            fullWidth
            disabled={isSubmitting}
          >
            {isSubmitting ? 'Submitting...' : 'Submit Blood Request'}
          </Button>
        </div>
      </form>
    </div>
  );
};
