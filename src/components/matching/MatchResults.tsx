import React from 'react';
import type { MatchEvaluationResult } from '../../lib/types';
import { ShieldCheck, UserCircle, Droplet, MapPin, XCircle, CheckCircle2 } from 'lucide-react';

interface MatchResultsProps {
  results: MatchEvaluationResult[];
}

export const MatchResults: React.FC<MatchResultsProps> = ({ results }) => {
  const eligibleMatches = results.filter((r) => r.isEligible);
  const ineligibleMatches = results.filter((r) => !r.isEligible);

  return (
    <div className="space-y-8 mt-8 border-t border-white/[0.08] pt-8">
      <div className="text-center space-y-3">
        <div className="inline-flex items-center justify-center px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[10px] font-mono tracking-widest text-white/60 mb-2">
          NOTIFICATION
        </div>
        <h3 className="font-display font-bold text-3xl text-white">
          {eligibleMatches.length > 0 ? 'MATCH FOUND' : 'NO ELIGIBLE MATCH FOUND'}
        </h3>
        {eligibleMatches.length > 0 ? (
          <p className="text-sm text-white/60">
            Your request has been matched with eligible nearby donors.
          </p>
        ) : (
          <p className="text-sm text-white/60 leading-relaxed max-w-sm mx-auto">
            No eligible donor was found for this request based on the current blood-group, locality, and donation-interval rules.
          </p>
        )}
      </div>

      {eligibleMatches.length > 0 && (
        <div className="space-y-4">
          <h4 className="text-xs font-mono tracking-wider text-[#df2531] uppercase text-center mb-6">
            {eligibleMatches.length} eligible donor{eligibleMatches.length === 1 ? '' : 's'} found
          </h4>
          <div className="grid gap-4">
            {eligibleMatches.map((match, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-[#df2531]/30 bg-white/[0.02] p-5 flex flex-col gap-4 relative overflow-hidden"
              >
                {/* Accent line on left */}
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#df2531]"></div>
                
                <div className="pl-2 space-y-4">
                  <div>
                    <h5 className="font-mono text-sm tracking-widest text-white font-medium uppercase">
                      {match.donorName}
                    </h5>
                    <div className="flex items-center gap-2 mt-1 text-xs text-white/60">
                      <span className="text-white font-medium">{match.bloodGroup}</span>
                      <span>·</span>
                      <span>{match.locality}</span>
                    </div>
                  </div>

                  <div className="inline-flex items-center gap-1.5 text-xs text-[#df2531] font-medium bg-[#df2531]/10 px-2.5 py-1 rounded w-fit">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Eligible</span>
                  </div>

                  <div className="pt-3 border-t border-white/[0.06] mt-4 flex items-center gap-2 text-xs text-white/40">
                    <ShieldCheck className="w-3.5 h-3.5" />
                    <span>Contact private until acceptance</span>
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
