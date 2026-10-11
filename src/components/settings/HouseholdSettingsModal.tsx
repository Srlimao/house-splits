import React, { useState } from 'react';
import { useHousehold } from '../../context/HouseholdContext';
import { getStoredGeminiKey, setStoredGeminiKey } from '../../lib/gemini';
import { sendDiscordWebhook } from '../../lib/webhooks';
import {
  X,
  Sparkles,
  CreditCard,
  Bell,
  Check,
  Building,
  Key,
  HelpCircle,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Smartphone,
  BellRing,
} from 'lucide-react';
import confetti from 'canvas-confetti';
import {
  isPushNotificationSupported,
  getExistingPushSubscription,
  subscribeToPushNotifications,
  unsubscribeFromPushNotifications,
  sendTestPushNotification,
} from '../../lib/pushNotifications';

interface HouseholdSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const HouseholdSettingsModal: React.FC<HouseholdSettingsModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { household, updateHousehold, activeProfile } = useHousehold();

  // Gemini Key State
  const [geminiKey, setGeminiKey] = useState<string>(getStoredGeminiKey());
  const [keySaved, setKeySaved] = useState(false);

  // Household & Payment Info
  const [houseName, setHouseName] = useState(household.name);
  const [currency, setCurrency] = useState(household.currency);
  const [iban, setIban] = useState(household.adminPaymentInfo.iban);
  const [revolut, setRevolut] = useState(household.adminPaymentInfo.revolut);
  const [bizum, setBizum] = useState(household.adminPaymentInfo.bizum);
  const [notes, setNotes] = useState(household.adminPaymentInfo.notes);

  // Webhook State
  const [discordUrl, setDiscordUrl] = useState(household.webhookSettings.discordUrl);
  const [webhookTesting, setWebhookTesting] = useState(false);
  const [webhookStatus, setWebhookStatus] = useState<'success' | 'error' | null>(null);

  // Push Notifications State
  const [isPushSupported] = useState<boolean>(isPushNotificationSupported());
  const [isPushSubscribed, setIsPushSubscribed] = useState<boolean>(false);
  const [pushLoading, setPushLoading] = useState<boolean>(false);
  const [pushStatusMsg, setPushStatusMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  React.useEffect(() => {
    if (isOpen && isPushSupported) {
      getExistingPushSubscription().then((sub) => {
        setIsPushSubscribed(Boolean(sub));
      });
    }
  }, [isOpen, isPushSupported]);

  const handleTogglePush = async () => {
    setPushLoading(true);
    setPushStatusMsg(null);
    try {
      if (isPushSubscribed) {
        await unsubscribeFromPushNotifications(activeProfile.id);
        setIsPushSubscribed(false);
        setPushStatusMsg({ type: 'success', text: 'Push reminders disabled on this device.' });
      } else {
        await subscribeToPushNotifications(activeProfile.id, household.id);
        setIsPushSubscribed(true);
        setPushStatusMsg({
          type: 'success',
          text: '✅ Active! Reminders will be sent 5 days and 1 day before due dates.',
        });
        confetti({ particleCount: 35, spread: 60 });
      }
    } catch (err: any) {
      setPushStatusMsg({ type: 'error', text: err.message || 'Failed to toggle notifications.' });
    } finally {
      setPushLoading(false);
    }
  };

  const handleSendTestPush = async () => {
    setPushLoading(true);
    setPushStatusMsg(null);
    try {
      await sendTestPushNotification(activeProfile.id);
      setPushStatusMsg({ type: 'success', text: 'Test notification sent to your Android device!' });
    } catch (err: any) {
      setPushStatusMsg({ type: 'error', text: err.message || 'Failed to send test notification.' });
    } finally {
      setPushLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleSaveGeminiKey = () => {
    setStoredGeminiKey(geminiKey);
    setKeySaved(true);
    setTimeout(() => setKeySaved(false), 2500);
  };

  const handleTestWebhook = async () => {
    if (!discordUrl) return;
    setWebhookTesting(true);
    setWebhookStatus(null);
    const ok = await sendDiscordWebhook(discordUrl, {
      username: 'HouseSplits Bot',
      embeds: [
        {
          title: '✅ HouseSplits Test Notification',
          description: `Webhook connected successfully to **${houseName}**!`,
          color: 1095905,
          timestamp: new Date().toISOString(),
        },
      ],
    });
    setWebhookTesting(false);
    setWebhookStatus(ok ? 'success' : 'error');
  };

  const handleSaveAll = () => {
    setStoredGeminiKey(geminiKey);
    updateHousehold({
      name: houseName,
      currency,
      adminPaymentInfo: {
        iban,
        revolut,
        bizum,
        notes,
      },
      webhookSettings: {
        ...household.webhookSettings,
        discordUrl,
      },
    });

    confetti({ particleCount: 30, spread: 60, origin: { y: 0.7 } });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="relative w-full max-w-xl bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl p-6 overflow-hidden my-8 space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-bold text-white">House & Integration Settings</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-zinc-400 hover:text-white hover:bg-zinc-800">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Section 1: Google Gemini API Key */}
        <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                <Sparkles className="w-4 h-4" />
              </span>
              <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
                Google Gemini API Key
              </span>
            </div>
            <a
              href="https://aistudio.google.com/app/apikey"
              target="_blank"
              rel="noreferrer"
              className="text-xs text-brand-400 hover:underline flex items-center gap-1"
            >
              <span>Get API Key</span>
              <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          <p className="text-xs text-zinc-400">
            Used to scan PDF & image utility bills and auto-detect providers, amounts, and due dates.
          </p>

          <div className="flex items-center gap-2">
            <div className="relative flex-1">
              <Key className="w-4 h-4 text-zinc-500 absolute left-3 top-2.5" />
              <input
                type="password"
                value={geminiKey}
                onChange={(e) => setGeminiKey(e.target.value)}
                placeholder="AIzaSy..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl pl-9 pr-3 py-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-brand-500"
              />
            </div>
            <button
              type="button"
              onClick={handleSaveGeminiKey}
              className="px-3 py-2 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-semibold border border-zinc-700 transition-colors"
            >
              {keySaved ? <Check className="w-4 h-4 text-emerald-400" /> : 'Save Key'}
            </button>
          </div>
        </div>

        {/* Section 2: Admin Payment Accounts */}
        <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800 space-y-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-blue-500/10 text-blue-400 border border-blue-500/20">
              <CreditCard className="w-4 h-4" />
            </span>
            <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider">
              Admin Payer Bank & Transfer Details
            </span>
          </div>

          <p className="text-xs text-zinc-400">
            Roommates will see these transfer details when reimbursing you for paid bills.
          </p>

          <div className="space-y-3">
            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                IBAN / Account Number
              </label>
              <input
                type="text"
                value={iban}
                onChange={(e) => setIban(e.target.value)}
                placeholder="PT50 0033..."
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-brand-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                  Revolut Username / Tag
                </label>
                <input
                  type="text"
                  value={revolut}
                  onChange={(e) => setRevolut(e.target.value)}
                  placeholder="@your_tag"
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-brand-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                  Bizum / Mobile Number
                </label>
                <input
                  type="text"
                  value={bizum}
                  onChange={(e) => setBizum(e.target.value)}
                  placeholder="+351 912..."
                  className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold text-zinc-400 mb-1">
                Payment Instructions Note
              </label>
              <input
                type="text"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                placeholder="e.g. Include your name and bill month in description"
                className="w-full bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs text-zinc-200 focus:outline-none focus:border-brand-500"
              />
            </div>
          </div>
        </div>

        {/* Section 3: Android & Device Push Reminders (5 Days & 1 Day Before) */}
        <div className="p-4 rounded-xl bg-zinc-950/60 border border-zinc-800 space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="p-1.5 rounded-lg bg-brand-500/10 text-brand-400 border border-brand-500/20">
                <Smartphone className="w-4 h-4" />
              </span>
              <div>
                <span className="text-xs font-bold text-zinc-200 uppercase tracking-wider block">
                  Android & Device Push Reminders
                </span>
                <span className="text-[11px] text-zinc-400">
                  Alerts you 5 days and 1 day before utility & rent bills are due
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
                  onClick={handleTogglePush}
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
                    onClick={handleSendTestPush}
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

        {/* Section 4: Discord Chat Webhook */}
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
              onChange={(e) => setDiscordUrl(e.target.value)}
              placeholder="https://discord.com/api/webhooks/..."
              className="flex-1 bg-zinc-900 border border-zinc-800 rounded-xl px-3 py-2 text-xs font-mono text-zinc-200 focus:outline-none focus:border-brand-500"
            />
            <button
              type="button"
              onClick={handleTestWebhook}
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

        {/* Actions */}
        <div className="flex items-center justify-end gap-3 pt-3 border-t border-zinc-800">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-xl text-zinc-400 hover:text-white text-xs font-semibold"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSaveAll}
            className="px-5 py-2.5 rounded-xl bg-brand-500 hover:bg-brand-400 text-black font-bold text-xs shadow-glow transition-all"
          >
            Save All Settings
          </button>
        </div>
      </div>
    </div>
  );
};
