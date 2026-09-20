'use client';

import React, { useState } from 'react';
import { Button } from '../ui/Button';
import { acceptMatchAction } from '../../app/actions/acceptance';
import { Check, Loader2, AlertCircle } from 'lucide-react';

interface AcceptRequestButtonProps {
  matchId: string;
  donorId: string;
  initialStatus?: 'pending' | 'accepted' | 'declined';
  onAccepted?: (acceptedAt: string | null) => void;
}

export const AcceptRequestButton: React.FC<AcceptRequestButtonProps> = ({
  matchId,
  donorId,
  initialStatus = 'pending',
  onAccepted,
}) => {
  const isInitiallyAccepted = initialStatus === 'accepted';
  const [status, setStatus] = useState<'idle' | 'accepting' | 'accepted'>(
    isInitiallyAccepted ? 'accepted' : 'idle'
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleAccept = async () => {
    if (status === 'accepting' || status === 'accepted') return;

    setStatus('accepting');
    setErrorMessage(null);

    try {
      const res = await acceptMatchAction({ matchId, donorId });

      if (res.success) {
        setStatus('accepted');
        if (onAccepted) {
          onAccepted(res.accepted_at || new Date().toISOString());
        }
      } else {
        setStatus('idle');
        setErrorMessage(res.error || 'Unable to accept this request. Please try again.');
      }
    } catch {
      setStatus('idle');
      setErrorMessage('Unable to accept this request. Please try again.');
    }
  };

  if (status === 'accepted') {
    return (
      <div className="space-y-2 w-full sm:w-auto">
        <Button
          variant="secondary"
          size="md"
          disabled
          className="w-full sm:w-auto border-emerald-500/30 text-emerald-400 bg-emerald-950/20 font-mono tracking-wider text-xs"
        >
          <Check className="w-4 h-4 mr-1.5 text-emerald-400" />
          <span>ACCEPTED</span>
        </Button>
        <p className="text-[11px] text-emerald-400/90 font-sans mt-1.5">
          REQUEST ACCEPTED. The requester can now receive your contact information.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2 w-full sm:w-auto">
      <Button
        variant="primary"
        size="md"
        onClick={handleAccept}
        disabled={status === 'accepting'}
        className="w-full sm:w-auto font-mono tracking-wider text-xs uppercase"
      >
        {status === 'accepting' ? (
          <>
            <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin text-white/70" />
            <span>ACCEPTING...</span>
          </>
        ) : (
          <span>ACCEPT REQUEST</span>
        )}
      </Button>

      {errorMessage && (
        <div className="flex items-start gap-1.5 text-xs text-[#df2531] mt-1.5">
          <AlertCircle className="w-3.5 h-3.5 shrink-0 mt-0.5" />
          <span>{errorMessage}</span>
        </div>
      )}
    </div>
  );
};
