import { useEffect, useState } from 'react';
import {
  Bell,
  Check,
  Copy,
  Eye,
  EyeOff,
  Globe,
  MessageSquare,
  RefreshCw,
  Send,
} from 'lucide-react';
import { sendAdminTestNotification, updateAdminNotifications } from '../api';
import type { SaleNotificationSummary } from '../types';

interface SaleNotificationsCardProps {
  adminToken: string | null;
  initialConfig: SaleNotificationSummary;
  onSaved: (next: SaleNotificationSummary) => void;
  onFeedback: (feedback: { type: 'success' | 'error'; text: string }) => void;
}

export function SaleNotificationsCard({
  adminToken,
  initialConfig,
  onSaved,
  onFeedback,
}: SaleNotificationsCardProps) {
  const [config, setConfig] = useState<SaleNotificationSummary>(initialConfig);

  // Telegram fields
  const [telegramEnabled, setTelegramEnabled] = useState(initialConfig.telegramEnabled);
  const [telegramBotTokenInput, setTelegramBotTokenInput] = useState('');
  const [showTelegramToken, setShowTelegramToken] = useState(false);
  const [telegramChatId, setTelegramChatId] = useState(initialConfig.telegramChatId);

  // Discord fields
  const [discordEnabled, setDiscordEnabled] = useState(initialConfig.discordEnabled);
  const [discordWebhookInput, setDiscordWebhookInput] = useState('');
  const [showDiscordUrl, setShowDiscordUrl] = useState(false);

  // Generic Outbound Webhook fields
  const [webhookEnabled, setWebhookEnabled] = useState(initialConfig.webhookEnabled);
  const [webhookUrl, setWebhookUrl] = useState(initialConfig.webhookUrl);
  const [webhookSecretInput, setWebhookSecretInput] = useState('');
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const [copiedWebhookSecret, setCopiedWebhookSecret] = useState(false);

  // Options & status
  const [includeSandboxSales, setIncludeSandboxSales] = useState(initialConfig.includeSandboxSales);
  const [isSaving, setIsSaving] = useState(false);
  const [testingChannel, setTestingChannel] = useState<'telegram' | 'discord' | 'webhook' | null>(
    null
  );
  const [testResults, setTestResults] = useState<
    Partial<Record<'telegram' | 'discord' | 'webhook', { ok: boolean; text: string }>>
  >({});

  useEffect(() => {
    setConfig(initialConfig);
    setTelegramEnabled(initialConfig.telegramEnabled);
    setTelegramChatId(initialConfig.telegramChatId);
    setDiscordEnabled(initialConfig.discordEnabled);
    setWebhookEnabled(initialConfig.webhookEnabled);
    setWebhookUrl(initialConfig.webhookUrl);
    setIncludeSandboxSales(initialConfig.includeSandboxSales);
  }, [initialConfig]);

  const activeCount = [telegramEnabled, discordEnabled, webhookEnabled].filter(Boolean).length;

  const handleGenerateOutboundSecret = () => {
    const bytes = new Uint8Array(32);
    window.crypto.getRandomValues(bytes);
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    setWebhookSecretInput(hex);
    setShowWebhookSecret(true);
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const { saleNotifications } = await updateAdminNotifications(adminToken, {
        telegramEnabled,
        telegramBotToken: telegramBotTokenInput.trim() || undefined,
        telegramChatId: telegramChatId.trim(),
        discordEnabled,
        discordWebhookUrl: discordWebhookInput.trim() || undefined,
        webhookEnabled,
        webhookUrl: webhookUrl.trim(),
        webhookSigningSecret: webhookSecretInput.trim() || undefined,
        includeSandboxSales,
      });
      setConfig(saleNotifications);
      setTelegramBotTokenInput('');
      setShowTelegramToken(false);
      setDiscordWebhookInput('');
      setShowDiscordUrl(false);
      setWebhookSecretInput('');
      setShowWebhookSecret(false);
      onSaved(saleNotifications);
      onFeedback({
        type: 'success',
        text: 'Sale notification channels saved.',
      });
    } catch (err) {
      onFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Could not save notification settings.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearSecret = async (
    target: 'telegram' | 'discord' | 'webhookSecret'
  ) => {
    setIsSaving(true);
    try {
      const payload =
        target === 'telegram'
          ? { clearTelegramBotToken: true, telegramEnabled: false }
          : target === 'discord'
            ? { clearDiscordWebhookUrl: true, discordEnabled: false }
            : { clearWebhookSigningSecret: true };
      const { saleNotifications } = await updateAdminNotifications(adminToken, payload);
      setConfig(saleNotifications);
      setTelegramEnabled(saleNotifications.telegramEnabled);
      setDiscordEnabled(saleNotifications.discordEnabled);
      onSaved(saleNotifications);
      onFeedback({
        type: 'success',
        text:
          target === 'telegram'
            ? 'Telegram bot token removed and channel deactivated.'
            : target === 'discord'
              ? 'Discord webhook URL removed and channel deactivated.'
              : 'Outbound webhook signing secret removed.',
      });
    } catch (err) {
      onFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Could not remove credential.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleSendTest = async (channel: 'telegram' | 'discord' | 'webhook') => {
    setTestingChannel(channel);
    setTestResults((prev) => ({ ...prev, [channel]: undefined }));
    try {
      const res = await sendAdminTestNotification(adminToken, channel);
      setTestResults((prev) => ({
        ...prev,
        [channel]: { ok: true, text: res.result.message },
      }));
    } catch (err) {
      setTestResults((prev) => ({
        ...prev,
        [channel]: {
          ok: false,
          text: err instanceof Error ? err.message : 'Test delivery failed.',
        },
      }));
    } finally {
      setTestingChannel(null);
    }
  };

  return (
    <form
      onSubmit={handleSave}
      className="bg-white border border-[#E6E2DA] rounded-xl p-6 space-y-6"
    >
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-[#181614]" />
            <h2 className="font-titr text-xl font-bold text-[#181614]">
              Sale Notifications (Telegram, Discord &amp; Webhook)
            </h2>
          </div>
          <p className="text-xs text-[#6B655E] mt-1">
            Receive instant alerts whenever an order is confirmed and a digital book code is
            delivered. Customer book codes are never included in alerts.
          </p>
        </div>
        <span
          className={`px-2.5 py-1 text-[11px] font-medium rounded-md border ${
            activeCount > 0
              ? 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]'
              : 'bg-[#F3F1EC] text-[#6B655E] border-[#E6E2DA]'
          }`}
        >
          {activeCount > 0
            ? `${activeCount} channel${activeCount === 1 ? '' : 's'} active`
            : 'All deactivated'}
        </span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Channel 1: Telegram Bot */}
        <div className="border border-[#E6E2DA] rounded-xl p-4 bg-[#FAF9F6]/60 flex flex-col justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Send className="w-3.5 h-3.5 text-[#1E40AF]" />
                <h3 className="text-sm font-semibold text-[#181614]">Telegram Bot</h3>
              </div>
              <label className="inline-flex items-center gap-1.5 text-xs font-medium text-[#181614] cursor-pointer">
                <input
                  type="checkbox"
                  checked={telegramEnabled}
                  onChange={(e) => setTelegramEnabled(e.target.checked)}
                  className="rounded border-[#DBD5CA]"
                />
                <span>Active</span>
              </label>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-medium text-[#6B655E]">Bot Token</label>
                {config.telegramBotTokenConfigured && (
                  <span className="text-[10px] font-mono text-[#047857]">
                    Saved ({config.telegramBotTokenHint})
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type={showTelegramToken ? 'text' : 'password'}
                  dir="ltr"
                  value={telegramBotTokenInput}
                  onChange={(e) => setTelegramBotTokenInput(e.target.value)}
                  placeholder={
                    config.telegramBotTokenConfigured
                      ? 'Leave blank to keep saved token'
                      : '123456789:AAH...'
                  }
                  className="w-full pl-3 pr-8 py-2 text-xs font-mono bg-white border border-[#DBD5CA] rounded-lg focus:outline-none focus:border-[#1E40AF]"
                />
                <button
                  type="button"
                  onClick={() => setShowTelegramToken((p) => !p)}
                  aria-label={showTelegramToken ? 'Hide bot token' : 'Show bot token'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#857E75] hover:text-[#181614] cursor-pointer"
                >
                  {showTelegramToken ? (
                    <EyeOff className="w-3.5 h-3.5" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-[#6B655E]">Chat or Channel ID</label>
              <input
                type="text"
                dir="ltr"
                value={telegramChatId}
                onChange={(e) => setTelegramChatId(e.target.value)}
                placeholder="-1001234567890 or @mychannel"
                className="w-full px-3 py-2 text-xs font-mono bg-white border border-[#DBD5CA] rounded-lg focus:outline-none focus:border-[#1E40AF]"
              />
              <p className="text-[11px] text-[#857E75]">
                Create a bot via @BotFather, add it to your chat, and paste the token + chat ID.
              </p>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-[#E6E2DA]">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={
                  testingChannel !== null ||
                  !config.telegramBotTokenConfigured ||
                  !config.telegramChatId
                }
                onClick={() => handleSendTest('telegram')}
                className="px-3 py-1.5 text-xs font-medium text-[#181614] bg-white hover:bg-[#EFECE6] border border-[#DBD5CA] rounded-lg transition-colors cursor-pointer disabled:opacity-45"
              >
                {testingChannel === 'telegram' ? 'Sending...' : 'Send Test'}
              </button>
              {config.telegramBotTokenConfigured && (
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => handleClearSecret('telegram')}
                  className="px-2.5 py-1.5 text-xs font-medium text-[#B91C1C] hover:bg-[#FEF2F2] rounded-lg transition-colors cursor-pointer disabled:opacity-45"
                >
                  Clear Token
                </button>
              )}
            </div>
            {testResults.telegram && (
              <p
                className={`text-[11px] leading-snug ${
                  testResults.telegram.ok ? 'text-[#047857]' : 'text-[#B91C1C]'
                }`}
              >
                {testResults.telegram.text}
              </p>
            )}
          </div>
        </div>

        {/* Channel 2: Discord Webhook */}
        <div className="border border-[#E6E2DA] rounded-xl p-4 bg-[#FAF9F6]/60 flex flex-col justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <MessageSquare className="w-3.5 h-3.5 text-[#4F46E5]" />
                <h3 className="text-sm font-semibold text-[#181614]">Discord Webhook</h3>
              </div>
              <label className="inline-flex items-center gap-1.5 text-xs font-medium text-[#181614] cursor-pointer">
                <input
                  type="checkbox"
                  checked={discordEnabled}
                  onChange={(e) => setDiscordEnabled(e.target.checked)}
                  className="rounded border-[#DBD5CA]"
                />
                <span>Active</span>
              </label>
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-medium text-[#6B655E]">Webhook URL</label>
                {config.discordWebhookConfigured && (
                  <span className="text-[10px] font-mono text-[#047857]">
                    Saved ({config.discordWebhookHint})
                  </span>
                )}
              </div>
              <div className="relative">
                <input
                  type={showDiscordUrl ? 'text' : 'password'}
                  dir="ltr"
                  value={discordWebhookInput}
                  onChange={(e) => setDiscordWebhookInput(e.target.value)}
                  placeholder={
                    config.discordWebhookConfigured
                      ? 'Leave blank to keep saved URL'
                      : 'https://discord.com/api/webhooks/...'
                  }
                  className="w-full pl-3 pr-8 py-2 text-xs font-mono bg-white border border-[#DBD5CA] rounded-lg focus:outline-none focus:border-[#1E40AF]"
                />
                <button
                  type="button"
                  onClick={() => setShowDiscordUrl((p) => !p)}
                  aria-label={showDiscordUrl ? 'Hide Discord URL' : 'Show Discord URL'}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#857E75] hover:text-[#181614] cursor-pointer"
                >
                  {showDiscordUrl ? (
                    <EyeOff className="w-3.5 h-3.5" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
              <p className="text-[11px] text-[#857E75]">
                In Discord: Channel Settings → Integrations → Webhooks → Copy Webhook URL. Posts a
                rich sale embed with amount, promo, and remaining stock.
              </p>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-[#E6E2DA]">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={testingChannel !== null || !config.discordWebhookConfigured}
                onClick={() => handleSendTest('discord')}
                className="px-3 py-1.5 text-xs font-medium text-[#181614] bg-white hover:bg-[#EFECE6] border border-[#DBD5CA] rounded-lg transition-colors cursor-pointer disabled:opacity-45"
              >
                {testingChannel === 'discord' ? 'Sending...' : 'Send Test'}
              </button>
              {config.discordWebhookConfigured && (
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => handleClearSecret('discord')}
                  className="px-2.5 py-1.5 text-xs font-medium text-[#B91C1C] hover:bg-[#FEF2F2] rounded-lg transition-colors cursor-pointer disabled:opacity-45"
                >
                  Clear URL
                </button>
              )}
            </div>
            {testResults.discord && (
              <p
                className={`text-[11px] leading-snug ${
                  testResults.discord.ok ? 'text-[#047857]' : 'text-[#B91C1C]'
                }`}
              >
                {testResults.discord.text}
              </p>
            )}
          </div>
        </div>

        {/* Channel 3: Outbound JSON Webhook */}
        <div className="border border-[#E6E2DA] rounded-xl p-4 bg-[#FAF9F6]/60 flex flex-col justify-between gap-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <Globe className="w-3.5 h-3.5 text-[#0F766E]" />
                <h3 className="text-sm font-semibold text-[#181614]">Outbound Webhook</h3>
              </div>
              <label className="inline-flex items-center gap-1.5 text-xs font-medium text-[#181614] cursor-pointer">
                <input
                  type="checkbox"
                  checked={webhookEnabled}
                  onChange={(e) => setWebhookEnabled(e.target.checked)}
                  className="rounded border-[#DBD5CA]"
                />
                <span>Active</span>
              </label>
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-medium text-[#6B655E]">HTTPS Endpoint URL</label>
              <input
                type="url"
                dir="ltr"
                value={webhookUrl}
                onChange={(e) => setWebhookUrl(e.target.value)}
                placeholder="https://hooks.example.com/sales"
                className="w-full px-3 py-2 text-xs font-mono bg-white border border-[#DBD5CA] rounded-lg focus:outline-none focus:border-[#1E40AF]"
              />
            </div>

            <div className="space-y-1">
              <div className="flex items-center justify-between gap-2">
                <label className="text-xs font-medium text-[#6B655E]">
                  Signing Secret (optional)
                </label>
                {config.webhookSigningSecretConfigured && (
                  <span className="text-[10px] font-mono text-[#047857]">
                    Saved ({config.webhookSigningSecretHint})
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5">
                <div className="relative flex-1">
                  <input
                    type={showWebhookSecret ? 'text' : 'password'}
                    dir="ltr"
                    value={webhookSecretInput}
                    onChange={(e) => setWebhookSecretInput(e.target.value)}
                    placeholder={
                      config.webhookSigningSecretConfigured
                        ? 'Leave blank to keep'
                        : 'Optional HMAC-SHA256'
                    }
                    className="w-full pl-3 pr-8 py-2 text-xs font-mono bg-white border border-[#DBD5CA] rounded-lg focus:outline-none focus:border-[#1E40AF]"
                  />
                  <button
                    type="button"
                    onClick={() => setShowWebhookSecret((p) => !p)}
                    aria-label={showWebhookSecret ? 'Hide signing secret' : 'Show signing secret'}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-[#857E75] hover:text-[#181614] cursor-pointer"
                  >
                    {showWebhookSecret ? (
                      <EyeOff className="w-3.5 h-3.5" />
                    ) : (
                      <Eye className="w-3.5 h-3.5" />
                    )}
                  </button>
                </div>
                <button
                  type="button"
                  onClick={handleGenerateOutboundSecret}
                  title="Generate random signing secret"
                  className="p-2 text-[#181614] bg-white hover:bg-[#EFECE6] border border-[#DBD5CA] rounded-lg transition-colors cursor-pointer shrink-0"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                </button>
                {webhookSecretInput.trim() && (
                  <button
                    type="button"
                    onClick={async () => {
                      await navigator.clipboard.writeText(webhookSecretInput.trim());
                      setCopiedWebhookSecret(true);
                      window.setTimeout(() => setCopiedWebhookSecret(false), 2000);
                    }}
                    title="Copy generated secret"
                    className="p-2 text-[#181614] bg-white hover:bg-[#EFECE6] border border-[#DBD5CA] rounded-lg transition-colors cursor-pointer shrink-0"
                  >
                    {copiedWebhookSecret ? (
                      <Check className="w-3.5 h-3.5 text-[#0F766E]" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
              </div>
              <p className="text-[11px] text-[#857E75]">
                POSTs JSON with <span className="font-mono">X-dipi-Event</span> &amp;{' '}
                <span className="font-mono">X-dipi-Signature</span> (public HTTPS only).
              </p>
            </div>
          </div>

          <div className="space-y-2 pt-2 border-t border-[#E6E2DA]">
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={testingChannel !== null || !config.webhookUrl}
                onClick={() => handleSendTest('webhook')}
                className="px-3 py-1.5 text-xs font-medium text-[#181614] bg-white hover:bg-[#EFECE6] border border-[#DBD5CA] rounded-lg transition-colors cursor-pointer disabled:opacity-45"
              >
                {testingChannel === 'webhook' ? 'Sending...' : 'Send Test'}
              </button>
              {config.webhookSigningSecretConfigured && (
                <button
                  type="button"
                  disabled={isSaving}
                  onClick={() => handleClearSecret('webhookSecret')}
                  className="px-2.5 py-1.5 text-xs font-medium text-[#B91C1C] hover:bg-[#FEF2F2] rounded-lg transition-colors cursor-pointer disabled:opacity-45"
                >
                  Clear Secret
                </button>
              )}
            </div>
            {testResults.webhook && (
              <p
                className={`text-[11px] leading-snug ${
                  testResults.webhook.ok ? 'text-[#047857]' : 'text-[#B91C1C]'
                }`}
              >
                {testResults.webhook.text}
              </p>
            )}
          </div>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-[#EFECE6]">
        <label className="flex items-center gap-2.5 cursor-pointer">
          <input
            type="checkbox"
            checked={includeSandboxSales}
            onChange={(e) => setIncludeSandboxSales(e.target.checked)}
            className="rounded border-[#DBD5CA]"
          />
          <span className="text-xs text-[#6B655E]">
            <strong className="text-[#181614]">Include Sandbox Test Sales</strong> — uncheck to
            notify only on real on-chain, webhook, or admin-confirmed orders.
          </span>
        </label>

        <button
          type="submit"
          disabled={isSaving}
          className="px-4 py-2.5 text-sm font-medium text-white bg-[#1E40AF] hover:bg-[#1D4ED8] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
        >
          {isSaving ? 'Saving Notifications...' : 'Save Notification Settings'}
        </button>
      </div>
    </form>
  );
}
