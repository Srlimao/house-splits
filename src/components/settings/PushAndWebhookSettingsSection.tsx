import React from 'react';
import {
  Bell,
  CheckCircle2,
  AlertCircle,
  Smartphone,
  BellRing,
} from 'lucide-react';

interface PushAndWebhookSettingsSectionProps {
  isPushSupported: boolean;
  isPushSubscribed: boolean;
  pushLoading: boolean;
  pushStatusMsg: { type: 'success' | 'error'; text: string } | null;
  onTogglePush: () => void;
  onSendTestPush: () => void;
  discordUrl: string;
  onDiscordUrlChange: (val: string) => void;
  webhookTesting: boolean;
  webhookStatus: 'success' | 'error' | null;
  onTestWebhook: () => void;
}

export const PushAndWebhookSettingsSection: React.FC<PushAndWebhookSettingsSectionProps> = ({
  isPushSupported,
  isPushSubscribed,
  pushLoading,
  pushStatusMsg,
  onTogglePush,
  onSendTestPush,
  discordUrl,
  onDiscordUrlChange,
  webhookTesting,
  webhookStatus,
  onTestWebhook,
}) => {
  return (
    <>
      <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-brand-500/10 text-brand-400 border border-brand-500/20">
              <Smartphone className="w-4 h-4" />
            </span>
            <div>
              <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider block">
                Android &amp; Device Push Reminders
              </span>
              <span className="text-[11px] text-zinc-400">
                Alerts you 5 days and 1 day before utility &amp; rent bills are due
              </span>
            </div>
          </div>

          {isPushSupported && (
            <span
              className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-semibold ${
                isPushSubscribed
                  ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                  : 'bg-zinc-800 text-zinc-400 border border-zinc-700'
              }`}
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isPushSubscribed ? 'bg-emerald-400 animate-pulse' : 'bg-zinc-500'
                }`}
              />
              <span>{isPushSubscribed ? 'Active' : 'Disabled'}</span>
            </span>
          )}
        </div>

        {!isPushSupported ? (
          <p className="text-xs text-zinc-500">
            Web Push is supported on Android (Chrome, Edge, Samsung Internet, installed PWA) and modern desktop browsers.
          </p>
        ) : (
          <div className="space-y-2 pt-1">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={onTogglePush}
                disabled={pushLoading}
                className={`px-3 py-2 rounded-xl text-xs font-bold transition-colors flex items-center gap-1.5 ${
                  isPushSubscribed
                    ? 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300 border border-zinc-700'
                    : 'bg-brand-500 hover:bg-brand-400 text-black shadow-glow'
                }`}
              >
                <Bell className="w-3.5 h-3.5" />
                <span>
                  {pushLoading
                    ? 'Updating...'
                    : isPushSubscribed
                    ? 'Disable on this Device'
                    : 'Enable Android Push Reminders'}
                </span>
              </button>

              {isPushSubscribed && (
                <button
                  type="button"
                  onClick={onSendTestPush}
                  disabled={pushLoading}
                  className="px-3 py-2 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-zinc-300 text-xs font-semibold border border-zinc-700 transition-colors flex items-center gap-1.5"
                >
                  <BellRing className="w-3.5 h-3.5 text-brand-400" />
                  <span>Send Test Alert to Phone</span>
                </button>
              )}
            </div>

            {pushStatusMsg && (
              <p
                className={`text-xs flex items-center gap-1.5 pt-1 ${
                  pushStatusMsg.type === 'success' ? 'text-emerald-400' : 'text-rose-400'
                }`}
              >
                {pushStatusMsg.type === 'success' ? (
                  <CheckCircle2 className="w-3.5 h-3.5 shrink-0" />
                ) : (
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                )}
                <span>{pushStatusMsg.text}</span>
              </p>
            )}
          </div>
        )}
      </div>

      <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800 space-y-3">
        <div className="flex items-center gap-2">
          <span className="p-1.5 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Bell className="w-4 h-4" />
          </span>
          <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
            Chat Notification Webhook
          </span>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="url"
            value={discordUrl}
            onChange={(e) => onDiscordUrlChange(e.target.value)}
            placeholder="https://discord.com/api/webhooks/..."
            className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-brand-500"
          />
          <button
            type="button"
            onClick={onTestWebhook}
            disabled={webhookTesting || !discordUrl}
            className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-zinc-200 text-xs font-semibold border border-zinc-700 transition-colors"
          >
            {webhookTesting ? 'Testing...' : 'Test Webhook'}
          </button>
        </div>

        {webhookStatus === 'success' && (
          <p className="text-xs text-emerald-400 flex items-center gap-1 font-semibold">
            <CheckCircle2 className="w-3.5 h-3.5" />
            <span>Test notification posted to Discord!</span>
          </p>
        )}
        {webhookStatus === 'error' && (
          <p className="text-xs text-rose-400 flex items-center gap-1">
            <AlertCircle className="w-3.5 h-3.5" />
            <span>Could not send notification. Check the URL.</span>
          </p>
        )}
      </div>
    </>
  );
};
