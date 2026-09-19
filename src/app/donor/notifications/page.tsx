import React from 'react';
import { getDonorNotificationsAction } from '../../actions/notifications';
import { Button } from '../../../components/ui/Button';
import { Droplet, MapPin, AlertCircle, Bell, ArrowRight } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Donor Notifications (Demo) — REDLINK',
  description: 'Prototype view of donor notifications.',
};

export default async function DonorNotificationsPage({
  searchParams,
}: {
  searchParams: Promise<{ donorId?: string }>;
}) {
  const { donorId } = await searchParams;

  if (!donorId) {
    return (
      <main className="min-h-screen bg-black pt-32 pb-20 px-6 sm:px-12 selection:bg-[#df2531]/30">
        <div className="max-w-xl mx-auto space-y-6 text-center">
          <h1 className="font-display font-bold text-3xl text-white">Donor Dashboard (Demo)</h1>
          <p className="text-white/60">
            Provide a <code>?donorId=</code> query parameter to view a specific donor's notifications.
          </p>
          <div className="pt-4">
            <Link href="/donor">
              <Button variant="secondary">Go back to Donor Registration</Button>
            </Link>
          </div>
        </div>
      </main>
    );
  }

  const { success, notifications, donorName, message } = await getDonorNotificationsAction(donorId);

  return (
    <main className="min-h-screen bg-black pt-32 pb-20 px-6 sm:px-12 selection:bg-[#df2531]/30">
      <div className="max-w-2xl mx-auto space-y-8">
        
        {/* Header */}
        <div className="border-b border-white/[0.08] pb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/[0.04] border border-white/[0.08] text-[10px] font-mono tracking-widest text-white/60 mb-4">
            <Bell className="w-3.5 h-3.5" />
            <span>NOTIFICATIONS DASHBOARD</span>
          </div>
          <h1 className="font-display font-bold text-4xl text-white tracking-tight">
            Welcome back, {donorName || 'Donor'}
          </h1>
          <p className="text-sm text-white/60 mt-2">
            This is a prototype view of how donors are notified when matched.
          </p>
        </div>

        {/* Error State */}
        {!success && (
          <div className="rounded-lg border border-[#df2531]/30 bg-[#df2531]/10 p-4 flex items-start gap-3">
            <AlertCircle className="w-5 h-5 text-[#df2531] shrink-0 mt-0.5" />
            <div>
              <h4 className="text-[#df2531] font-medium text-sm">Failed to load notifications</h4>
              <p className="text-xs text-[#df2531]/70 mt-1">{message}</p>
            </div>
          </div>
        )}

        {/* Notifications List */}
        {success && notifications.length === 0 ? (
          <div className="rounded-xl border border-white/[0.08] bg-white/[0.02] p-12 text-center">
            <div className="w-12 h-12 rounded-full bg-white/[0.04] flex items-center justify-center mx-auto mb-4">
              <Bell className="w-5 h-5 text-white/30" />
            </div>
            <h3 className="font-display font-medium text-lg text-white">No pending requests</h3>
            <p className="text-sm text-white/50 mt-2">
              You'll be notified here when someone in your area urgently needs blood.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {notifications.map((notification) => (
              <div 
                key={notification.matchId}
                className="rounded-xl border border-[#df2531]/30 bg-[#111111] p-6 relative overflow-hidden"
              >
                {/* Accent line */}
                <div className="absolute left-0 top-0 bottom-0 w-1 bg-[#df2531]"></div>
                
                <div className="flex flex-col sm:flex-row gap-6 justify-between items-start">
                  <div className="space-y-4 pl-2">
                    <div>
                      <h3 className="font-mono text-sm tracking-widest text-white font-medium uppercase mb-1 flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-[#df2531] animate-pulse"></span>
                        NEW BLOOD REQUEST
                      </h3>
                      <p className="text-sm text-white/70">
                        You are eligible for this request.
                      </p>
                    </div>

                    <div className="flex flex-wrap items-center gap-4 text-xs text-white/60">
                      <div className="flex items-center gap-1.5">
                        <Droplet className="w-4 h-4 text-[#df2531]" />
                        <span className="font-medium text-white">{notification.bloodGroup}</span>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-white/40" />
                        <span>{notification.locality}</span>
                      </div>
                      {notification.urgency === 'urgent' && (
                        <div className="flex items-center gap-1.5 text-[#df2531] bg-[#df2531]/10 px-2 py-0.5 rounded">
                          <AlertCircle className="w-3.5 h-3.5" />
                          <span className="uppercase text-[10px] font-bold tracking-wider">Urgent</span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="pl-2 sm:pl-0 pt-4 sm:pt-0 border-t border-white/[0.08] sm:border-0 w-full sm:w-auto">
                    {/* Placeholder for Step 7 */}
                    <Button variant="primary" disabled className="w-full sm:w-auto group">
                      <span>Review Request</span>
                      <ArrowRight className="w-4 h-4 ml-2 opacity-50" />
                    </Button>
                    <p className="text-[10px] text-white/40 text-center sm:text-right mt-2">
                      (Acceptance enabled in Step 7)
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
