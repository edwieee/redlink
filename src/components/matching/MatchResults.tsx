'use client';

import React, { useState, useEffect, useCallback } from 'react';
import type { MatchEvaluationResult } from '../../lib/types';
import {
  ShieldCheck,
  UserCircle,
  XCircle,
  CheckCircle2,
  Phone,
  RefreshCw,
  Clock,
} from 'lucide-react';
import {
  getRequestMatchesAction,
  SanitizedMatchForRequester,
} from '../../app/actions/requesterMatches';
import { Button } from '../ui/Button';

interface MatchResultsProps {
  results?: MatchEvaluationResult[];
  requestId?: string | null;
  token?: string | null;
}

export const MatchResults: React.FC<MatchResultsProps> = ({
  results = [],
  requestId,
  token,
}) => {
  const [matches, setMatches] = useState<SanitizedMatchForRequester[]>([]);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const fetchLiveMatches = useCallback(async () => {
    if (!requestId || !token) return;

    setIsRefreshing(true);
    setFetchError(null);

    try {
      const res = await getRequestMatchesAction({ requestId, token });
      if (res.success && res.matches) {
        setMatches(res.matches);
        setLastRefreshed(new Date());
      } else if (res.error) {
        setFetchError(res.error);
      }
    } catch {
      setFetchError('Failed to refresh match status.');
    } finally {
      setIsRefreshing(false);
    }
  }, [requestId, token]);

  useEffect(() => {
    if (requestId && token) {
      fetchLiveMatches();
    }
  }, [requestId, token, fetchLiveMatches]);

  const hasLiveMatches = matches.length > 0;
  const anyAccepted = matches.some((m) => m.matchStatus === 'accepted');

  const eligibleFallback = results.filter((r) => r.isEligible);
  const ineligibleMatches = results.filter((r) => !r.isEligible);
  const hasEligible = hasLiveMatches || eligibleFallback.length > 0;

  return (
    <div className="space-y-8 mt-8 border-t border-white/[0.08] pt-8">
      {/* Header State */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[10px] font-mono tracking-widest text-white/60 mb-2">
          NOTIFICATION
        </div>

        <h3 className="font-display font-bold text-3xl text-white tracking-tight">
          {anyAccepted
            ? 'DONOR ACCEPTED'
            : hasEligible
            ? 'MATCH FOUND'
            : 'NO ELIGIBLE MATCH FOUND'}
        </h3>

        {anyAccepted ? (
          <p className="text-sm text-emerald-400 font-medium">
            Donor accepted. Contact details are now available.
          </p>
        ) : hasEligible ? (
          <p className="text-sm text-white/60">
            Contact details remain private until the donor accepts.
          </p>
        ) : (
          <p className="text-sm text-white/60 leading-relaxed max-w-sm mx-auto">
            No eligible donor was found for this request based on the current
            blood-group, locality, and donation-interval rules.
          </p>
        )}

        {/* Refresh Action */}
        {requestId && token && hasEligible && (
          <div className="pt-2 flex items-center justify-center gap-3">
            <button
              onClick={fetchLiveMatches}
              disabled={isRefreshing}
              type="button"
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-white/10 bg-white/[0.03] hover:bg-white/[0.06] text-xs font-mono text-white/70 hover:text-white transition-colors disabled:opacity-50"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin' : ''}`}
              />
              <span>{isRefreshing ? 'Checking Status...' : 'Check for Acceptance'}</span>
            </button>
            {lastRefreshed && (
              <span className="text-[10px] font-mono text-white/30">
                Updated {lastRefreshed.toLocaleTimeString()}
              </span>
            )}
          </div>
        )}

        {fetchError && (
          <p className="text-xs text-[#df2531] mt-1">{fetchError}</p>
        )}
      </div>

      {/* Eligible / Matched Donors */}
      {hasEligible && (
        <div className="space-y-4">
          <h4 className="text-xs font-mono tracking-wider text-[#df2531] uppercase text-center mb-6">
            {hasLiveMatches
              ? `${matches.length} matched donor${matches.length === 1 ? '' : 's'}`
              : `${eligibleFallback.length} eligible donor${
                  eligibleFallback.length === 1 ? '' : 's'
                } found`}
          </h4>

          <div className="grid gap-4">
            {hasLiveMatches
              ? matches.map((match) => {
                  const isAccepted = match.matchStatus === 'accepted';

                  return (
                    <div
                      key={match.matchId}
                      className={`rounded-lg border ${
                        isAccepted
                          ? 'border-emerald-500/40 bg-[#08130c]'
                          : 'border-[#df2531]/30 bg-white/[0.02]'
                      } p-5 flex flex-col gap-4 relative overflow-hidden transition-all`}
                    >
                      {/* Accent line on left */}
                      <div
                        className={`absolute left-0 top-0 bottom-0 w-1 ${
                          isAccepted ? 'bg-emerald-500' : 'bg-[#df2531]'
                        }`}
                      ></div>

                      <div className="pl-2 space-y-4">
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div>
                            <div className="text-[10px] font-mono uppercase tracking-widest text-white/40 mb-0.5">
                              Donor
                            </div>
                            <h5 className="font-mono text-sm tracking-widest text-white font-medium uppercase">
                              {match.donorName}
                            </h5>
                            <div className="flex items-center gap-2 mt-1 text-xs text-white/60">
                              <span className="text-white font-medium">
                                {match.bloodGroup}
                              </span>
                              <span>·</span>
                              <span>{match.locality}</span>
                              {match.pincode && <span>({match.pincode})</span>}
                            </div>
                          </div>

                          {/* Status Badge */}
                          <div className="mt-2 sm:mt-0">
                            {isAccepted ? (
                              <div className="inline-flex items-center gap-1.5 text-xs text-emerald-400 font-medium bg-emerald-950/40 border border-emerald-500/30 px-2.5 py-1 rounded">
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                                <span>Accepted</span>
                              </div>
                            ) : (
                              <div className="inline-flex items-center gap-1.5 text-xs text-amber-300 font-medium bg-amber-950/30 border border-amber-500/20 px-2.5 py-1 rounded">
                                <Clock className="w-3.5 h-3.5 text-amber-400" />
                                <span>Waiting for acceptance</span>
                              </div>
                            )}
                          </div>
                        </div>

                        {/* Contact Details Transition */}
                        <div className="pt-3 border-t border-white/[0.06] mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                          <div className="text-xs">
                            <span className="text-white/40 block sm:inline mr-2 font-mono">
                              Contact:
                            </span>
                            {isAccepted && match.phone ? (
                              <a
                                href={`tel:${match.phone}`}
                                className="inline-flex items-center gap-1.5 font-mono text-sm font-semibold text-emerald-400 hover:text-emerald-300 transition-colors"
                              >
                                <Phone className="w-3.5 h-3.5" />
                                <span>+91 {match.phone}</span>
                              </a>
                            ) : (
                              <span className="text-white/60 font-mono text-xs">
                                Private until donor accepts
                              </span>
                            )}
                          </div>

                          <div className="flex items-center gap-1.5 text-[11px] text-white/40">
                            <ShieldCheck className="w-3.5 h-3.5 text-white/30" />
                            <span>
                              {isAccepted
                                ? 'Verified authorization'
                                : 'Contact details remain private until the donor accepts.'}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })
              : eligibleFallback.map((match, idx) => (
                  <div
                    key={idx}
                    className="rounded-lg border border-[#df2531]/30 bg-white/[0.02] p-5 flex flex-col gap-4 relative overflow-hidden"
                  >
                    <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#df2531]"></div>
                    <div className="pl-2 space-y-4">
                      <div>
                        <div className="text-[10px] font-mono uppercase tracking-widest text-white/40 mb-0.5">
                          Donor
                        </div>
                        <h5 className="font-mono text-sm tracking-widest text-white font-medium uppercase">
                          {match.donorName}
                        </h5>
                        <div className="flex items-center gap-2 mt-1 text-xs text-white/60">
                          <span className="text-white font-medium">
                            {match.bloodGroup}
                          </span>
                          <span>·</span>
                          <span>{match.locality}</span>
                        </div>
                      </div>

                      <div className="inline-flex items-center gap-1.5 text-xs text-amber-300 font-medium bg-amber-950/30 border border-amber-500/20 px-2.5 py-1 rounded w-fit">
                        <Clock className="w-3.5 h-3.5 text-amber-400" />
                        <span>Waiting for acceptance</span>
                      </div>

                      <div className="pt-3 border-t border-white/[0.06] mt-4 flex items-center justify-between text-xs text-white/40">
                        <div>
                          <span className="text-white/40 mr-2 font-mono">Contact:</span>
                          <span className="text-white/60 font-mono text-xs">
                            Private until donor accepts
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <ShieldCheck className="w-3.5 h-3.5 text-white/30" />
                          <span>Contact details remain private until the donor accepts.</span>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
          </div>
        </div>
      )}

      {/* Demo transparency: show why other donors were excluded */}
      {ineligibleMatches.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-[10px] font-mono tracking-widest text-white/40 uppercase">
            Excluded Donors (Demo View)
          </h4>
          <div className="grid gap-3">
            {ineligibleMatches.map((match, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-white/[0.04] bg-white/[0.01] p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 opacity-60 grayscale"
              >
                <div className="flex items-center gap-2">
                  <UserCircle className="w-4 h-4 text-white/30" />
                  <span className="font-medium text-white/70">{match.donorName}</span>
                  <span className="text-xs text-white/40 mx-2">•</span>
                  <span className="text-xs text-white/50">{match.bloodGroup}</span>
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-white/40 bg-white/5 px-2 py-1 rounded">
                  <XCircle className="w-3 h-3" />
                  <span>{match.exclusionReason}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
