import { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Bell,
  BookOpen,
  Check,
  CheckCircle2,
  ChevronDown,
  Coins,
  Copy,
  Eye,
  EyeOff,
  FastForward,
  HelpCircle,
  KeyRound,
  LayoutGrid,
  Lock,
  RefreshCw,
  Send,
  ShieldCheck,
  SkipForward,
  Store,
  Upload,
  Wallet,
  X,
} from 'lucide-react';
import {
  addAdminCodes,
  bootstrapAdmin,
  completeAdminSetup,
  createAdminBook,
  fetchAdminOverview,
  sendAdminTestNotification,
  updateAdminNotifications,
  updateAdminPreferences,
  updateAdminSecurity,
  updateAdminSettings,
  uploadAdminCover,
  uploadAdminLogo,
} from '../api';
import { DEFAULT_PREFERENCES, isSafeSupportLinkUrl, THEME_PRESETS } from '../theme';
import type {
  AdminAuthStatus,
  AdminOverviewResponse,
  BookDescriptionMode,
  CardRadiusChoice,
  LogoDisplayMode,
  LtcRateMode,
  MobileCardStyle,
  StorefrontPreferences,
} from '../types';

interface FirstTimeSetupWizardProps {
  authStatus: AdminAuthStatus;
  adminToken: string | null;
  initialOverview: AdminOverviewResponse | null;
  isRerunMode: boolean;
  onAdminTokenChange: (token: string | null) => void;
  onAuthStatusChange: (status: AdminAuthStatus) => void;
  onCatalogMutated: () => void;
  onAdminPathChanged?: (nextPath: string) => void;
  onComplete: (message?: string) => void;
}

type StepId = 1 | 2 | 3 | 4 | 5 | 6 | 7;
type StepState = 'pending' | 'saved' | 'skipped';

interface StepMeta {
  id: StepId;
  code: string;
  title: string;
  shortTitle: string;
  stationLabel: string;
  required: boolean;
  subtitle: string;
  icon: typeof Lock;
}

const STEPS: StepMeta[] = [
  {
    id: 1,
    code: '01',
    title: 'Admin Account',
    shortTitle: 'Admin Account',
    stationLabel: 'Account',
    required: true,
    subtitle: 'Create your Admin Vault username and password (required before skipping or continuing).',
    icon: Lock,
  },
  {
    id: 2,
    code: '02',
    title: 'Store Identity & Language',
    shortTitle: 'Identity & Language',
    stationLabel: 'Identity',
    required: false,
    subtitle: 'Store name, browser title, English/Persian direction, logo, description mode, and support link.',
    icon: Store,
  },
  {
    id: 3,
    code: '03',
    title: 'Litecoin Wallet & Network',
    shortTitle: 'Litecoin Wallet',
    stationLabel: 'Wallet',
    required: false,
    subtitle: 'Where customer LTC payments arrive, Mainnet vs Testnet, confirmations, and Sandbox testing.',
    icon: Wallet,
  },
  {
    id: 4,
    code: '04',
    title: 'Quotes, Pricing & Expiry',
    shortTitle: 'Quotes & Expiry',
    stationLabel: 'Pricing',
    required: false,
    subtitle: 'Order reservation timer, live vs manual LTC/USD rate, volatility spread, and rate caching.',
    icon: Coins,
  },
  {
    id: 5,
    code: '05',
    title: 'Sale Alerts & Webhooks',
    shortTitle: 'Alerts & Webhooks',
    stationLabel: 'Alerts',
    required: false,
    subtitle: 'Instant Telegram, Discord, and outbound sale webhooks plus optional inbound LTC node webhooks.',
    icon: Bell,
  },
  {
    id: 6,
    code: '06',
    title: 'Storefront Look & Controls',
    shortTitle: 'Look & Controls',
    stationLabel: 'Look',
    required: false,
    subtitle: 'Color preset, desktop & mobile book grid layout, and search/category/sort visibility.',
    icon: LayoutGrid,
  },
  {
    id: 7,
    code: '07',
    title: 'Books, codes.json & Launch',
    shortTitle: 'Books & Launch',
    stationLabel: 'Launch',
    required: false,
    subtitle: 'Understand single-use digital codes, optionally add your first book, and launch your store.',
    icon: BookOpen,
  },
];

const PRESET_SWATCHES: Record<string, { bg: string; surface: string; accent: string }> = {
  'warm-paper': { bg: 'bg-[#FAF9F6]', surface: 'bg-[#FFFFFF]', accent: 'bg-[#1E40AF]' },
  'pure-gallery': { bg: 'bg-[#FFFFFF]', surface: 'bg-[#F8F8F7]', accent: 'bg-[#0F766E]' },
  parchment: { bg: 'bg-[#F3ECE0]', surface: 'bg-[#FBF7F0]', accent: 'bg-[#9A3412]' },
  'midnight-ink': { bg: 'bg-[#111317]', surface: 'bg-[#1A1E25]', accent: 'bg-[#60A5FA]' },
  'forest-archive': { bg: 'bg-[#131C18]', surface: 'bg-[#1B2722]', accent: 'bg-[#34D399]' },
  'royal-cobalt': { bg: 'bg-[#0F172A]', surface: 'bg-[#1E293B]', accent: 'bg-[#38BDF8]' },
};

function GuideDisclosure({
  title,
  defaultOpen = false,
  children,
}: {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-t border-[#EFECE6] first:border-t-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="w-full py-3 flex items-center justify-between gap-3 text-left text-xs font-semibold text-[#181614] hover:text-[#1E40AF] transition-colors cursor-pointer"
      >
        <span className="inline-flex items-center gap-2 min-w-0">
          <HelpCircle className="w-3.5 h-3.5 text-[#6B655E] shrink-0" aria-hidden="true" />
          <span>{title}</span>
        </span>
        <ChevronDown
          className={`w-4 h-4 text-[#6B655E] shrink-0 transition-transform ${
            open ? 'rotate-180' : ''
          }`}
        />
      </button>
      {open && (
        <div className="pb-3.5 text-xs text-[#4A453F] leading-relaxed space-y-2">{children}</div>
      )}
    </div>
  );
}

export function FirstTimeSetupWizard({
  authStatus,
  adminToken,
  initialOverview,
  isRerunMode,
  onAdminTokenChange,
  onAuthStatusChange,
  onCatalogMutated,
  onAdminPathChanged,
  onComplete,
}: FirstTimeSetupWizardProps) {
  const accountAlreadyClaimed = !authStatus.needsSetup || authStatus.managedByEnv;
  const [activeStep, setActiveStep] = useState<StepId>(1);
  const [stepStates, setStepStates] = useState<Record<StepId, StepState>>({
    1: accountAlreadyClaimed ? 'saved' : 'pending',
    2: 'pending',
    3: 'pending',
    4: 'pending',
    5: 'pending',
    6: 'pending',
    7: 'pending',
  });

  const [sessionToken, setSessionToken] = useState<string | null>(adminToken);
  const [overview, setOverview] = useState<AdminOverviewResponse | null>(initialOverview);
  const [stepError, setStepError] = useState<string | null>(null);
  const [stepNotice, setStepNotice] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);

  // Step 1: Admin Account & Secret URL Path
  const [username, setUsername] = useState(initialOverview?.adminUsername || '');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [requirePasscode, setRequirePasscode] = useState(true);
  const [adminPath, setAdminPath] = useState(() => {
    if (initialOverview?.adminPath) return initialOverview.adminPath;
    const slug = window.location.pathname.replace(/^\/+|\/+$/g, '').toLowerCase();
    return slug && !slug.includes('/') ? slug : 'admin';
  });

  // Step 2 & 6: Preferences draft
  const [prefs, setPrefs] = useState<StorefrontPreferences>(
    initialOverview?.settings.preferences || DEFAULT_PREFERENCES
  );
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  // Step 3: Litecoin Wallet & Network
  const [receivingAddress, setReceivingAddress] = useState(
    initialOverview?.settings.receivingAddress || ''
  );
  const [network, setNetwork] = useState<'mainnet' | 'testnet'>(
    initialOverview?.settings.network || 'mainnet'
  );
  const [minConfirmations, setMinConfirmations] = useState(
    String(initialOverview?.settings.minConfirmations ?? 1)
  );
  const [allowSandbox, setAllowSandbox] = useState(
    initialOverview?.settings.allowSandbox ?? false
  );
  const [autoDownloadReceipt, setAutoDownloadReceipt] = useState(
    initialOverview?.settings.autoDownloadReceipt ?? false
  );

  // Step 4: Pricing & Quotes
  const [orderExpiryMinutes, setOrderExpiryMinutes] = useState(
    String(initialOverview?.settings.orderExpiryMinutes ?? 20)
  );
  const [ltcRateMode, setLtcRateMode] = useState<LtcRateMode>(
    initialOverview?.settings.ltcRateMode === 'manual' ? 'manual' : 'live'
  );
  const [manualLtcRateUsd, setManualLtcRateUsd] = useState(
    String(initialOverview?.settings.manualLtcRateUsd ?? 88.5)
  );
  const [quoteSpreadPercent, setQuoteSpreadPercent] = useState(
    String(initialOverview?.settings.quoteSpreadPercent ?? 0)
  );
  const [quoteCacheSeconds, setQuoteCacheSeconds] = useState(
    String(initialOverview?.settings.quoteCacheSeconds ?? 60)
  );

  // Step 5: Sale Notifications & Webhooks
  const [telegramEnabled, setTelegramEnabled] = useState(
    initialOverview?.saleNotifications.telegramEnabled ?? false
  );
  const [telegramBotToken, setTelegramBotToken] = useState('');
  const [telegramChatId, setTelegramChatId] = useState(
    initialOverview?.saleNotifications.telegramChatId || ''
  );
  const [discordEnabled, setDiscordEnabled] = useState(
    initialOverview?.saleNotifications.discordEnabled ?? false
  );
  const [discordWebhookUrl, setDiscordWebhookUrl] = useState('');
  const [outboundWebhookEnabled, setOutboundWebhookEnabled] = useState(
    initialOverview?.saleNotifications.webhookEnabled ?? false
  );
  const [outboundWebhookUrl, setOutboundWebhookUrl] = useState(
    initialOverview?.saleNotifications.webhookUrl || ''
  );
  const [outboundWebhookSecret, setOutboundWebhookSecret] = useState('');
  const [includeSandboxSales, setIncludeSandboxSales] = useState(
    initialOverview?.saleNotifications.includeSandboxSales ?? true
  );
  const [inboundWebhookSecret, setInboundWebhookSecret] = useState('');
  const [copiedSecretField, setCopiedSecretField] = useState<string | null>(null);
  const [testingChannel, setTestingChannel] = useState<'telegram' | 'discord' | 'webhook' | null>(
    null
  );

  // Step 7: Optional First Book & Codes
  const [showAddBookForm, setShowAddBookForm] = useState(false);
  const [bookTitle, setBookTitle] = useState('');
  const [bookSubject, setBookSubject] = useState('');
  const [bookWriter, setBookWriter] = useState('');
  const [bookTranslator, setBookTranslator] = useState('');
  const [bookPublication, setBookPublication] = useState('');
  const [bookPrice, setBookPrice] = useState('12.00');
  const [bookDescription, setBookDescription] = useState('');
  const [bookCover, setBookCover] = useState('');
  const [bookCodesText, setBookCodesText] = useState('');
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [addedBooksCount, setAddedBooksCount] = useState(0);
  const coverInputRef = useRef<HTMLInputElement | null>(null);

  const hydrateFromOverview = (data: AdminOverviewResponse) => {
    setOverview(data);
    if (data.adminUsername) {
      setUsername((prev) => prev || data.adminUsername || '');
    }
    if (data.adminPath) {
      setAdminPath(data.adminPath);
    }
    setPrefs(data.settings.preferences);
    setReceivingAddress(data.settings.receivingAddress);
    setNetwork(data.settings.network);
    setMinConfirmations(String(data.settings.minConfirmations));
    setAllowSandbox(data.settings.allowSandbox);
    setAutoDownloadReceipt(Boolean(data.settings.autoDownloadReceipt));
    setOrderExpiryMinutes(String(data.settings.orderExpiryMinutes ?? 20));
    setLtcRateMode(data.settings.ltcRateMode === 'manual' ? 'manual' : 'live');
    setManualLtcRateUsd(String(data.settings.manualLtcRateUsd ?? 88.5));
    setQuoteSpreadPercent(String(data.settings.quoteSpreadPercent ?? 0));
    setQuoteCacheSeconds(String(data.settings.quoteCacheSeconds ?? 60));
    setTelegramEnabled(data.saleNotifications.telegramEnabled);
    setTelegramChatId(data.saleNotifications.telegramChatId);
    setDiscordEnabled(data.saleNotifications.discordEnabled);
    setOutboundWebhookEnabled(data.saleNotifications.webhookEnabled);
    setOutboundWebhookUrl(data.saleNotifications.webhookUrl);
    setIncludeSandboxSales(data.saleNotifications.includeSandboxSales);
    setRequirePasscode(data.settings.adminOpenAccess === false);
  };

  useEffect(() => {
    setSessionToken(adminToken);
  }, [adminToken]);

  useEffect(() => {
    if (initialOverview) {
      hydrateFromOverview(initialOverview);
    }
  }, [initialOverview]);

  const loadWizardOverview = async (tokenOverride?: string | null) => {
    const activeTok = tokenOverride !== undefined ? tokenOverride : sessionToken;
    try {
      const data = await fetchAdminOverview(activeTok);
      hydrateFromOverview(data);
    } catch {
      // Non-blocking: defaults remain editable
    }
  };

  const normalizeAdminPathInput = (raw: string): string =>
    raw
      .trim()
      .replace(/^\/+|\/+$/g, '')
      .toLowerCase();

  const generateRandomAdminPath = (): string => {
    const bytes = new Uint8Array(4);
    window.crypto.getRandomValues(bytes);
    const suffix = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    return `vault-${suffix}`;
  };

  const generateHexSecret = (): string => {
    const bytes = new Uint8Array(32);
    window.crypto.getRandomValues(bytes);
    return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
  };

  const copyToClipboard = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedSecretField(key);
      window.setTimeout(() => setCopiedSecretField((prev) => (prev === key ? null : prev)), 2000);
    } catch {
      // ignore clipboard restrictions
    }
  };

  const accountReady = stepStates[1] === 'saved' || accountAlreadyClaimed;
  const normalizedAdminPathPreview = normalizeAdminPathInput(adminPath) || 'admin';
  const fullAdminUrlPreview = `${window.location.origin}/${normalizedAdminPathPreview}`;

  const validateAdminPathInput = (): string | null => {
    const cleanPath = normalizeAdminPathInput(adminPath);
    if (!/^[a-z0-9][a-z0-9_-]{2,47}$/.test(cleanPath)) {
      return 'Secret Admin URL path must be 3–48 lowercase letters, numbers, dashes, or underscores (no slashes or spaces).';
    }
    return null;
  };

  const validateStep1Inputs = (requirePasswordValue: boolean): string | null => {
    const cleanUser = username.trim();
    if (!/^[a-zA-Z0-9._-]{3,32}$/.test(cleanUser)) {
      return 'Username must be 3–32 characters using letters, numbers, dots, dashes, or underscores.';
    }
    if (requirePasswordValue || password.length > 0 || confirmPassword.length > 0) {
      if (password.trim().length < 8) {
        return 'Password must be at least 8 characters long.';
      }
      if (password !== confirmPassword) {
        return 'Passwords do not match.';
      }
    }
    return validateAdminPathInput();
  };

  const handleStep1Submit = async (skipRemainingWithDefaults: boolean) => {
    setStepError(null);
    setStepNotice(null);

    const cleanAdminPath = normalizeAdminPathInput(adminPath);

    if (authStatus.managedByEnv) {
      const pathError = validateAdminPathInput();
      if (pathError) {
        setStepError(pathError);
        return;
      }
      setIsBusy(true);
      try {
        if (sessionToken || authStatus.debugOpenAccess) {
          const updated = await updateAdminSecurity(sessionToken, { adminPath: cleanAdminPath });
          setAdminPath(updated.adminPath);
          onAdminPathChanged?.(updated.adminPath);
        }
        setStepStates((prev) => ({ ...prev, 1: 'saved' }));
        if (skipRemainingWithDefaults) {
          await handleSkipAllRemaining();
        } else {
          setActiveStep(2);
        }
      } catch (err) {
        setStepError(err instanceof Error ? err.message : 'Could not save secret admin URL path.');
      } finally {
        setIsBusy(false);
      }
      return;
    }

    const isInitialBootstrap = authStatus.needsSetup;
    const validationError = validateStep1Inputs(isInitialBootstrap);
    if (validationError) {
      setStepError(validationError);
      return;
    }

    setIsBusy(true);
    try {
      if (isInitialBootstrap) {
        const result = await bootstrapAdmin({
          username: username.trim(),
          password: password.trim(),
          requirePasscode,
          adminPath: cleanAdminPath,
          completeSetupNow: skipRemainingWithDefaults,
        });
        setSessionToken(result.token);
        onAdminTokenChange(result.token);
        onAuthStatusChange(result.authStatus);
        setAdminPath(result.adminPath);
        onAdminPathChanged?.(result.adminPath);
        setPassword('');
        setConfirmPassword('');
        setStepStates((prev) => ({ ...prev, 1: 'saved' }));

        if (skipRemainingWithDefaults) {
          onCatalogMutated();
          onComplete(
            `Admin account "${username.trim()}" created and setup completed with default settings. Bookmark ${window.location.origin}/${result.adminPath} to access Admin Vault.`
          );
          return;
        }

        await loadWizardOverview(result.token);
        setActiveStep(2);
      } else {
        const result = await updateAdminSecurity(sessionToken, {
          username: username.trim(),
          password: password.trim() || undefined,
          requirePasscode,
          adminPath: cleanAdminPath,
        });
        const nextToken = result.token || sessionToken;
        if (result.token) {
          setSessionToken(result.token);
          onAdminTokenChange(result.token);
        }
        onAuthStatusChange(result.authStatus);
        setAdminPath(result.adminPath);
        onAdminPathChanged?.(result.adminPath);
        setPassword('');
        setConfirmPassword('');
        setStepStates((prev) => ({ ...prev, 1: 'saved' }));

        if (skipRemainingWithDefaults) {
          const done = await completeAdminSetup(nextToken);
          onAuthStatusChange(done.authStatus);
          onCatalogMutated();
          onComplete(
            `Admin credentials saved and setup completed with default settings. Bookmark ${window.location.origin}/${result.adminPath} to access Admin Vault.`
          );
          return;
        }

        await loadWizardOverview(nextToken);
        setActiveStep(2);
      }
    } catch (err) {
      setStepError(err instanceof Error ? err.message : 'Could not save admin account.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleSkipAllRemaining = async () => {
    if (!accountReady) {
      setStepError('Please define your Admin Username and Password first before skipping.');
      setActiveStep(1);
      return;
    }
    setStepError(null);
    setStepNotice(null);
    setIsBusy(true);
    try {
      const done = await completeAdminSetup(sessionToken);
      onAuthStatusChange(done.authStatus);
      onCatalogMutated();
      onComplete(
        'Setup finished using default values for skipped steps. You can adjust any setting later in Admin Vault.'
      );
    } catch (err) {
      setStepError(err instanceof Error ? err.message : 'Could not finalize setup.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleSkipStep = (step: StepId) => {
    if (step === 1) return;
    setStepError(null);
    setStepNotice(null);
    setStepStates((prev) => ({
      ...prev,
      [step]: prev[step] === 'saved' ? 'saved' : 'skipped',
    }));
    if (step < 7) {
      setActiveStep((step + 1) as StepId);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } else {
      void handleSkipAllRemaining();
    }
  };

  const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStepError(null);
    setIsUploadingLogo(true);
    try {
      const { logoUrl } = await uploadAdminLogo(sessionToken, file);
      setPrefs((prev) => ({ ...prev, logoUrl }));
    } catch (err) {
      setStepError(err instanceof Error ? err.message : 'Logo upload failed.');
    } finally {
      setIsUploadingLogo(false);
      if (logoInputRef.current) logoInputRef.current.value = '';
    }
  };

  const handleSaveStep2 = async () => {
    setStepError(null);
    setStepNotice(null);
    if (prefs.supportLinkEnabled) {
      if (!prefs.supportLinkTitle.trim() || !isSafeSupportLinkUrl(prefs.supportLinkUrl)) {
        setStepError(
          'Enter both a Support Link Title and a valid URL (https://, http://, mailto:, or tg:), or disable the support link.'
        );
        return;
      }
    }
    setIsBusy(true);
    try {
      const { preferences } = await updateAdminPreferences(sessionToken, prefs);
      setPrefs(preferences);
      setStepStates((prev) => ({ ...prev, 2: 'saved' }));
      onCatalogMutated();
      setActiveStep(3);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setStepError(err instanceof Error ? err.message : 'Could not save store identity.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleSaveStep3 = async () => {
    setStepError(null);
    setStepNotice(null);
    const parsedConf = Number.parseInt(minConfirmations, 10);
    if (!receivingAddress.trim()) {
      setStepError('Enter a valid Litecoin receiving address or click "Skip this step".');
      return;
    }
    if (!Number.isFinite(parsedConf) || parsedConf < 0 || parsedConf > 12) {
      setStepError('Required confirmations must be between 0 and 12.');
      return;
    }
    setIsBusy(true);
    try {
      await updateAdminSettings(sessionToken, {
        receivingAddress: receivingAddress.trim(),
        network,
        minConfirmations: parsedConf,
        allowSandbox,
        autoDownloadReceipt,
      });
      setStepStates((prev) => ({ ...prev, 3: 'saved' }));
      onCatalogMutated();
      setActiveStep(4);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setStepError(err instanceof Error ? err.message : 'Could not save Litecoin wallet settings.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleSaveStep4 = async () => {
    setStepError(null);
    setStepNotice(null);
    const parsedExpiry = Number.parseInt(orderExpiryMinutes, 10);
    const parsedManualRate = Number.parseFloat(manualLtcRateUsd);
    const parsedSpread = Number.parseFloat(quoteSpreadPercent);
    const parsedCache = Number.parseInt(quoteCacheSeconds, 10);

    if (!Number.isFinite(parsedExpiry) || parsedExpiry < 5 || parsedExpiry > 120) {
      setStepError('Order expiry window must be between 5 and 120 minutes.');
      return;
    }
    if (!Number.isFinite(parsedManualRate) || parsedManualRate < 1 || parsedManualRate > 100000) {
      setStepError('Manual LTC/USD rate must be between $1 and $100,000.');
      return;
    }
    if (!Number.isFinite(parsedSpread) || parsedSpread < 0 || parsedSpread > 25) {
      setStepError('Volatility spread buffer must be between 0% and 25%.');
      return;
    }
    if (!Number.isFinite(parsedCache) || parsedCache < 15 || parsedCache > 600) {
      setStepError('Spot rate cache interval must be between 15 and 600 seconds.');
      return;
    }

    setIsBusy(true);
    try {
      await updateAdminSettings(sessionToken, {
        orderExpiryMinutes: parsedExpiry,
        ltcRateMode,
        manualLtcRateUsd: parsedManualRate,
        quoteSpreadPercent: parsedSpread,
        quoteCacheSeconds: parsedCache,
      });
      setStepStates((prev) => ({ ...prev, 4: 'saved' }));
      onCatalogMutated();
      setActiveStep(5);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setStepError(err instanceof Error ? err.message : 'Could not save pricing & quote settings.');
    } finally {
      setIsBusy(false);
    }
  };

  const saveStep5NotificationsOnly = async (): Promise<boolean> => {
    setStepError(null);
    setStepNotice(null);
    try {
      const { saleNotifications } = await updateAdminNotifications(sessionToken, {
        telegramEnabled,
        telegramBotToken: telegramBotToken.trim() || undefined,
        telegramChatId: telegramChatId.trim(),
        discordEnabled,
        discordWebhookUrl: discordWebhookUrl.trim() || undefined,
        webhookEnabled: outboundWebhookEnabled,
        webhookUrl: outboundWebhookUrl.trim(),
        webhookSigningSecret: outboundWebhookSecret.trim() || undefined,
        includeSandboxSales,
      });
      setOverview((prev) => (prev ? { ...prev, saleNotifications } : prev));
      setTelegramBotToken('');
      setDiscordWebhookUrl('');
      setOutboundWebhookSecret('');

      if (inboundWebhookSecret.trim()) {
        await updateAdminSettings(sessionToken, {
          webhookSecret: inboundWebhookSecret.trim(),
        });
        setInboundWebhookSecret('');
      }
      return true;
    } catch (err) {
      setStepError(
        err instanceof Error ? err.message : 'Could not save notification or webhook settings.'
      );
      return false;
    }
  };

  const handleSaveStep5 = async () => {
    setIsBusy(true);
    try {
      const ok = await saveStep5NotificationsOnly();
      if (!ok) return;
      setStepStates((prev) => ({ ...prev, 5: 'saved' }));
      setActiveStep(6);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setIsBusy(false);
    }
  };

  const handleTestNotification = async (channel: 'telegram' | 'discord' | 'webhook') => {
    setStepError(null);
    setStepNotice(null);
    setTestingChannel(channel);
    try {
      const saved = await saveStep5NotificationsOnly();
      if (!saved) return;
      const res = await sendAdminTestNotification(sessionToken, channel);
      setStepNotice(res.result.message || `Test ${channel} alert sent successfully.`);
    } catch (err) {
      setStepError(err instanceof Error ? err.message : `Could not send ${channel} test alert.`);
    } finally {
      setTestingChannel(null);
    }
  };

  const handleSaveStep6 = async () => {
    setStepError(null);
    setStepNotice(null);
    setIsBusy(true);
    try {
      const { preferences } = await updateAdminPreferences(sessionToken, prefs);
      setPrefs(preferences);
      setStepStates((prev) => ({ ...prev, 6: 'saved' }));
      onCatalogMutated();
      setActiveStep(7);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      setStepError(err instanceof Error ? err.message : 'Could not save storefront appearance.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleBookCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setStepError(null);
    setIsUploadingCover(true);
    try {
      const { coverUrl } = await uploadAdminCover(sessionToken, file);
      setBookCover(coverUrl);
    } catch (err) {
      setStepError(err instanceof Error ? err.message : 'Cover upload failed.');
    } finally {
      setIsUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = '';
    }
  };

  const handleAddFirstBook = async (e: React.FormEvent) => {
    e.preventDefault();
    setStepError(null);
    setStepNotice(null);
    const parsedPrice = Number.parseFloat(bookPrice);
    if (
      !bookTitle.trim() ||
      !bookWriter.trim() ||
      !bookPublication.trim() ||
      !Number.isFinite(parsedPrice) ||
      parsedPrice <= 0
    ) {
      setStepError('Fill in Book Title, Writer, Publication, and a valid USD price.');
      return;
    }
    if (!bookCover) {
      setStepError('Upload an A4 cover image before adding the book.');
      return;
    }

    setIsBusy(true);
    try {
      const { book } = await createAdminBook(sessionToken, {
        title: bookTitle.trim(),
        subject: bookSubject.trim(),
        description: bookDescription.trim(),
        writer: bookWriter.trim(),
        translator: bookTranslator.trim() || 'Original Edition',
        publication: bookPublication.trim(),
        priceUsd: parsedPrice,
        coverUrl: bookCover,
      });

      const codeLines = bookCodesText
        .split(/\r?\n/)
        .map((s) => s.trim())
        .filter(Boolean);
      let importedCount = 0;
      if (codeLines.length > 0) {
        const res = await addAdminCodes(sessionToken, book.id, codeLines);
        importedCount = res.addedCount;
      }

      setAddedBooksCount((c) => c + 1);
      setBookTitle('');
      setBookSubject('');
      setBookWriter('');
      setBookTranslator('');
      setBookPublication('');
      setBookDescription('');
      setBookCover('');
      setBookCodesText('');
      setShowAddBookForm(false);
      setStepStates((prev) => ({ ...prev, 7: 'saved' }));
      setStepNotice(
        `Added "${book.title}" to codes.json${
          importedCount > 0 ? ` with ${importedCount} unused digital code(s).` : '.'
        }`
      );
      await loadWizardOverview();
      onCatalogMutated();
    } catch (err) {
      setStepError(err instanceof Error ? err.message : 'Could not add book.');
    } finally {
      setIsBusy(false);
    }
  };

  const handleFinishSetup = async () => {
    setStepError(null);
    setIsBusy(true);
    try {
      const done = await completeAdminSetup(sessionToken);
      onAuthStatusChange(done.authStatus);
      onCatalogMutated();
      onComplete('First-time setup completed. Welcome to Admin Vault.');
    } catch (err) {
      setStepError(err instanceof Error ? err.message : 'Could not complete setup.');
    } finally {
      setIsBusy(false);
    }
  };

  const currentMeta = STEPS[activeStep - 1];
  const completedCount = Object.values(stepStates).filter((s) => s !== 'pending').length;

  const getTrackSegmentStatus = (segmentIndex: number): 'active' | 'visited' | 'empty' => {
    // segmentIndex 0 connects Station 1 -> Station 2, ..., segmentIndex 5 connects Station 6 -> Station 7
    const leftStepId = (segmentIndex + 1) as StepId;
    const rightStepId = (segmentIndex + 2) as StepId;
    if (activeStep > leftStepId) {
      return 'active';
    }
    if (stepStates[leftStepId] !== 'pending' && stepStates[rightStepId] !== 'pending') {
      return 'visited';
    }
    return 'empty';
  };

  return (
    <main className="max-w-4xl mx-auto px-4 sm:px-6 py-6 sm:py-8 space-y-5">
      {/* Compact Top Header Strip */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0">
          <div className="text-[11px] font-medium text-[#6B655E]">
            {isRerunMode ? 'Guided Store Setup Reference' : 'First-Time Guided Setup'}
          </div>
          <h1 className="font-titr text-xl sm:text-2xl font-bold text-[#181614] leading-tight">
            Configure Your dipi Litecoin Bookstore
          </h1>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {isRerunMode && (
            <button
              type="button"
              onClick={() => onComplete()}
              className="px-3 py-1.5 text-xs font-medium text-[#6B655E] hover:text-[#181614] bg-white border border-[#DBD5CA] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Return to Admin Vault
            </button>
          )}
          {accountReady && (
            <button
              type="button"
              disabled={isBusy}
              onClick={handleSkipAllRemaining}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#181614] bg-white hover:bg-[#EFECE6] border border-[#DBD5CA] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer disabled:opacity-50"
            >
              <FastForward className="w-3.5 h-3.5 text-[#6B655E]" />
              <span>Skip Rest (Use Defaults)</span>
            </button>
          )}
        </div>
      </div>

      {/* Compact Train-Station Route Map */}
      <nav
        aria-label="Setup route"
        className="bg-white border border-[#E6E2DA] rounded-xl px-3 sm:px-5 py-3.5 space-y-3"
      >
        <div className="flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-2 min-w-0">
            <span className="w-2 h-2 rounded-full bg-[#1E40AF] shrink-0" aria-hidden="true" />
            <span className="font-mono font-semibold text-[#1E40AF] tabular-nums shrink-0">
              {currentMeta.code}/{STEPS.length.toString().padStart(2, '0')}
            </span>
            <span className="font-semibold text-[#181614] truncate">{currentMeta.title}</span>
            <span className="hidden sm:inline text-[#857E75] shrink-0">
              · {currentMeta.required ? 'Required' : 'Optional'}
            </span>
          </div>
          <span className="font-mono text-[11px] text-[#857E75] tabular-nums shrink-0">
            {completedCount}/{STEPS.length} done
          </span>
        </div>

        {/* 7-Station Continuous Track */}
        <ol className="grid grid-cols-7 items-start">
          {STEPS.map((step, index) => {
            const state = stepStates[step.id];
            const isActive = activeStep === step.id;
            const locked = step.id > 1 && !accountReady;
            const leftStatus = index > 0 ? getTrackSegmentStatus(index - 1) : null;
            const rightStatus = index < STEPS.length - 1 ? getTrackSegmentStatus(index) : null;

            return (
              <li key={step.id} className="flex flex-col items-center min-w-0">
                <div className="relative flex items-center justify-center w-full h-8">
                  {/* Left half of track connecting previous station into this station */}
                  {leftStatus !== null && (
                    <span
                      aria-hidden="true"
                      className="absolute left-0 right-1/2 top-1/2 -translate-y-1/2 h-[3px] bg-[#E6E2DA] overflow-hidden"
                    >
                      <span
                        className={`block h-full transition-all duration-300 ease-out ${
                          leftStatus === 'active'
                            ? 'w-full bg-[#1E40AF]'
                            : leftStatus === 'visited'
                              ? 'w-full bg-[#93C5FD]'
                              : 'w-0 bg-[#1E40AF]'
                        }`}
                      />
                    </span>
                  )}

                  {/* Right half of track connecting this station to next station */}
                  {rightStatus !== null && (
                    <span
                      aria-hidden="true"
                      className="absolute left-1/2 right-0 top-1/2 -translate-y-1/2 h-[3px] bg-[#E6E2DA] overflow-hidden"
                    >
                      <span
                        className={`block h-full transition-all duration-300 ease-out ${
                          rightStatus === 'active'
                            ? 'w-full bg-[#1E40AF]'
                            : rightStatus === 'visited'
                              ? 'w-full bg-[#93C5FD]'
                              : 'w-0 bg-[#1E40AF]'
                        }`}
                      />
                    </span>
                  )}

                  {/* Station Stop Node */}
                  <button
                    type="button"
                    disabled={locked || isBusy}
                    aria-current={isActive ? 'step' : undefined}
                    title={`${step.code}. ${step.title}${
                      state === 'saved'
                        ? ' (Saved)'
                        : state === 'skipped'
                          ? ' (Skipped · Defaults)'
                          : locked
                            ? ' (Complete Step 1 first)'
                            : ''
                    }`}
                    onClick={() => {
                      setStepError(null);
                      setStepNotice(null);
                      setActiveStep(step.id);
                    }}
                    className={`relative z-10 w-7 h-7 sm:w-8 sm:h-8 rounded-full flex items-center justify-center text-[11px] font-mono font-semibold tabular-nums transition-all duration-200 ${
                      isActive
                        ? 'bg-[#1E40AF] text-white border-2 border-[#1E40AF] ring-4 ring-[#DBEAFE] cursor-pointer'
                        : state === 'saved'
                          ? 'bg-[#047857] text-white border-2 border-[#047857] hover:bg-[#065F46] cursor-pointer'
                          : state === 'skipped'
                            ? 'bg-[#EFF6FF] text-[#1E40AF] border-2 border-[#1E40AF] hover:bg-[#DBEAFE] cursor-pointer'
                            : locked
                              ? 'bg-[#FAF9F6] text-[#B8B1A7] border-2 border-[#E6E2DA] cursor-not-allowed'
                              : 'bg-white text-[#6B655E] border-2 border-[#CFC8BC] hover:border-[#1E40AF] hover:text-[#1E40AF] cursor-pointer'
                    }`}
                  >
                    {state === 'saved' && !isActive ? (
                      <Check className="w-3.5 h-3.5 stroke-[2.5]" />
                    ) : state === 'skipped' && !isActive ? (
                      <SkipForward className="w-3 h-3" />
                    ) : (
                      <span>{step.id}</span>
                    )}
                  </button>
                </div>

                {/* Desktop Station Name */}
                <span
                  className={`hidden sm:block mt-1.5 text-[11px] text-center leading-tight truncate max-w-full px-0.5 ${
                    isActive
                      ? 'font-semibold text-[#1E40AF]'
                      : state === 'saved'
                        ? 'font-medium text-[#047857]'
                        : state === 'skipped'
                          ? 'font-medium text-[#1E40AF]'
                          : locked
                            ? 'text-[#B8B1A7]'
                            : 'text-[#6B655E]'
                  }`}
                >
                  {step.stationLabel}
                </span>

                {/* Mobile Active Stop Indicator Dot */}
                <span
                  aria-hidden="true"
                  className={`sm:hidden mt-1 w-1 h-1 rounded-full transition-colors ${
                    isActive ? 'bg-[#1E40AF]' : 'bg-transparent'
                  }`}
                />
              </li>
            );
          })}
        </ol>
      </nav>

      {/* Active Step Panel */}
      <section className="bg-white border border-[#E6E2DA] rounded-xl overflow-hidden">
          {/* Step Header */}
          <div className="px-6 py-5 border-b border-[#EFECE6] bg-[#FAF9F6] flex flex-wrap items-start justify-between gap-3">
            <div className="space-y-1 min-w-0">
              <div className="text-xs text-[#6B655E] flex items-center gap-2">
                <span className="font-mono font-semibold text-[#1E40AF] tabular-nums">
                  {currentMeta.code}.
                </span>
                <span>{currentMeta.required ? 'Required step' : 'Optional step · Skippable'}</span>
              </div>
              <h2 className="font-titr text-xl sm:text-2xl font-bold text-[#181614]">
                {currentMeta.title}
              </h2>
              <p className="text-xs sm:text-sm text-[#6B655E] leading-relaxed">
                {currentMeta.subtitle}
              </p>
            </div>
          </div>

          {/* Alerts */}
          {stepError && (
            <div className="mx-6 mt-5 px-4 py-3 bg-[#FEF2F2] border border-[#FECACA] rounded-lg flex items-start gap-2.5 text-xs sm:text-sm text-[#991B1B]">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{stepError}</span>
            </div>
          )}
          {stepNotice && (
            <div className="mx-6 mt-5 px-4 py-3 bg-[#F0FDF9] border border-[#99F6E4] rounded-lg flex items-start gap-2.5 text-xs sm:text-sm text-[#115E59]">
              <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5" />
              <span>{stepNotice}</span>
            </div>
          )}

          {/* Step Body */}
          <div className="p-6 space-y-6">
            {/* ==================== STEP 1: ADMIN ACCOUNT (REQUIRED) ==================== */}
            {activeStep === 1 && (
              <div className="space-y-6">
                {authStatus.managedByEnv ? (
                  <div className="p-4 bg-[#F0FDF9] border border-[#99F6E4] rounded-lg text-xs text-[#115E59] leading-relaxed space-y-1">
                    <div className="font-semibold">
                      Admin credentials are managed by server environment variables
                    </div>
                    <p>
                      <span className="font-mono">ADMIN_PASSCODE</span> is already set in your
                      server environment, which automatically protects Admin Vault. You can continue
                      to Step 2 or skip the rest to use default store settings.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div className="space-y-1.5 sm:col-span-2">
                        <label
                          htmlFor="setup-admin-username"
                          className="block text-xs font-semibold text-[#181614]"
                        >
                          Admin Username <span className="text-[#B91C1C]">*</span>
                        </label>
                        <input
                          id="setup-admin-username"
                          type="text"
                          dir="ltr"
                          value={username}
                          onChange={(e) => setUsername(e.target.value)}
                          autoComplete="username"
                          placeholder="e.g. owner or bookshop_admin"
                          className="w-full px-3.5 py-2.5 text-sm bg-[#FAF9F6] border border-[#DBD5CA] rounded-lg text-[#181614] focus:outline-none focus:border-[#1E40AF]"
                        />
                        <p className="text-[11px] text-[#6B655E]">
                          3–32 characters. Letters, numbers, dots (<span className="font-mono">.</span>),
                          underscores (<span className="font-mono">_</span>), or dashes (
                          <span className="font-mono">-</span>). Case-insensitive at sign-in.
                        </p>
                      </div>

                      <div className="space-y-1.5">
                        <label
                          htmlFor="setup-admin-password"
                          className="block text-xs font-semibold text-[#181614]"
                        >
                          {authStatus.needsSetup ? 'Admin Password' : 'New Password (optional)'}{' '}
                          {authStatus.needsSetup && <span className="text-[#B91C1C]">*</span>}
                        </label>
                        <div className="relative">
                          <input
                            id="setup-admin-password"
                            type={showPassword ? 'text' : 'password'}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            autoComplete="new-password"
                            placeholder={
                              authStatus.needsSetup
                                ? 'Minimum 8 characters'
                                : 'Leave blank to keep existing'
                            }
                            className="w-full pl-3.5 pr-10 py-2.5 text-sm bg-[#FAF9F6] border border-[#DBD5CA] rounded-lg text-[#181614] focus:outline-none focus:border-[#1E40AF]"
                          />
                          <button
                            type="button"
                            onClick={() => setShowPassword((v) => !v)}
                            aria-label={showPassword ? 'Hide password' : 'Show password'}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-[#857E75] hover:text-[#181614] cursor-pointer"
                          >
                            {showPassword ? (
                              <EyeOff className="w-4 h-4" />
                            ) : (
                              <Eye className="w-4 h-4" />
                            )}
                          </button>
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <label
                          htmlFor="setup-admin-confirm"
                          className="block text-xs font-semibold text-[#181614]"
                        >
                          Confirm Password{' '}
                          {authStatus.needsSetup && <span className="text-[#B91C1C]">*</span>}
                        </label>
                        <input
                          id="setup-admin-confirm"
                          type={showPassword ? 'text' : 'password'}
                          value={confirmPassword}
                          onChange={(e) => setConfirmPassword(e.target.value)}
                          autoComplete="new-password"
                          placeholder="Repeat your password"
                          className="w-full px-3.5 py-2.5 text-sm bg-[#FAF9F6] border border-[#DBD5CA] rounded-lg text-[#181614] focus:outline-none focus:border-[#1E40AF]"
                        />
                      </div>
                    </div>

                    <label className="flex items-start gap-3 pt-1 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={requirePasscode}
                        onChange={(e) => setRequirePasscode(e.target.checked)}
                        className="mt-0.5 rounded border-[#DBD5CA]"
                      />
                      <span className="text-xs text-[#6B655E] leading-relaxed">
                        <strong className="text-[#181614] block">
                          Lock Admin Vault immediately (recommended)
                        </strong>
                        Require your username and password whenever someone opens Admin Vault.
                        Unchecking only works in local development mode; production always requires
                        sign-in.
                      </span>
                    </label>
                  </div>
                )}

                {/* Secret Admin URL Path (always editable so admin stays hidden from main page) */}
                <div className="p-4 bg-[#FAF9F6] border border-[#E6E2DA] rounded-xl space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <label
                      htmlFor="setup-admin-path"
                      className="text-xs font-semibold text-[#181614]"
                    >
                      Secret Admin URL Path
                    </label>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setAdminPath(generateRandomAdminPath())}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-[#181614] bg-white hover:bg-[#EFECE6] border border-[#DBD5CA] rounded-md transition-colors cursor-pointer"
                      >
                        <RefreshCw className="w-3 h-3 text-[#6B655E]" />
                        <span>Randomize</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => copyToClipboard('setup-admin-url', fullAdminUrlPreview)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-medium text-[#181614] bg-white hover:bg-[#EFECE6] border border-[#DBD5CA] rounded-md transition-colors cursor-pointer"
                      >
                        {copiedSecretField === 'setup-admin-url' ? (
                          <Check className="w-3 h-3 text-[#047857]" />
                        ) : (
                          <Copy className="w-3 h-3 text-[#6B655E]" />
                        )}
                        <span>
                          {copiedSecretField === 'setup-admin-url' ? 'Copied URL' : 'Copy URL'}
                        </span>
                      </button>
                    </div>
                  </div>

                  <div className="flex items-center bg-white border border-[#DBD5CA] rounded-lg overflow-hidden focus-within:border-[#1E40AF]">
                    <span className="px-3 py-2.5 text-xs font-mono text-[#857E75] bg-[#F3F1EC] border-r border-[#E6E2DA] select-none shrink-0">
                      /
                    </span>
                    <input
                      id="setup-admin-path"
                      type="text"
                      dir="ltr"
                      maxLength={48}
                      value={adminPath}
                      onChange={(e) => setAdminPath(e.target.value.replace(/\s+/g, ''))}
                      placeholder="admin or vault-a3f89b12"
                      className="w-full px-3 py-2.5 text-sm font-mono bg-white text-[#181614] focus:outline-none"
                    />
                  </div>

                  <div className="text-[11px] text-[#6B655E] leading-relaxed space-y-1">
                    <p>
                      Admin Vault is hidden from shoppers on the main page. Bookmark your private
                      login URL:{' '}
                      <span className="font-mono text-[#181614] break-all">
                        {fullAdminUrlPreview}
                      </span>
                    </p>
                    <p>
                      Use 3–48 lowercase letters, numbers, dashes, or underscores. Anyone visiting
                      the wrong path silently sees the normal bookstore.
                    </p>
                  </div>
                </div>

                {/* Deep Explanation Panel */}
                <div className="pt-4 border-t border-[#EFECE6]">
                  <div className="text-xs font-semibold text-[#181614] mb-1">
                    Deep Parameter Guide — What This Does &amp; Security Details
                  </div>
                  <GuideDisclosure title="What does Admin Vault control?" defaultOpen>
                    <p>
                      Admin Vault is your merchant back-office. Anyone with access can view and
                      export unused digital book codes in{' '}
                      <span className="font-mono text-[#181614]">data/codes.json</span>, change the
                      Litecoin receiving address, create discount promo codes, pause checkout, or
                      customize your storefront design.
                    </p>
                  </GuideDisclosure>
                  <GuideDisclosure title="How does the Secret Admin URL Path hide Admin Vault?">
                    <p>
                      Shoppers browsing your storefront never see an Admin Vault link in the top
                      navigation bar. To open Admin Vault, you visit your private URL directly (by
                      default <span className="font-mono text-[#181614]">/admin</span>, or any
                      custom slug you set above such as{' '}
                      <span className="font-mono text-[#181614]">/vault-a3f89b12</span>).
                    </p>
                    <p>
                      The server verifies the URL slug securely and returns no hint when a visitor
                      enters an incorrect path—even{' '}
                      <span className="font-mono text-[#181614]">/admin</span> simply shows your
                      normal storefront once you rename it. Always bookmark your custom URL!
                    </p>
                  </GuideDisclosure>
                  <GuideDisclosure title="How are my username and password stored?">
                    <p>
                      Your password is never stored in plain text. The server generates a random
                      16-byte cryptographic salt and hashes your password using Node.js{' '}
                      <span className="font-mono text-[#181614]">crypto.scrypt</span>, saving the
                      username and salted hash in{' '}
                      <span className="font-mono text-[#181614]">data/admin.json</span> with
                      restricted file permissions (<span className="font-mono">0600</span>).
                    </p>
                    <p>
                      When you sign in, the server issues a 256-bit Bearer session token kept only
                      in browser memory (never in <span className="font-mono">localStorage</span>)
                      that expires automatically after 8 hours.
                    </p>
                  </GuideDisclosure>
                  <GuideDisclosure title="How to override credentials via server environment variables">
                    <p>
                      If you host dipi on a VPS or cloud container, you can optionally set{' '}
                      <span className="font-mono text-[#181614]">ADMIN_USERNAME</span> and{' '}
                      <span className="font-mono text-[#181614]">ADMIN_PASSCODE</span> in your
                      server secrets. Server environment credentials always take precedence over{' '}
                      <span className="font-mono">data/admin.json</span>.
                    </p>
                  </GuideDisclosure>
                </div>

                {/* Step 1 Footer Actions (NO Skip This Step — includes Default Skip-Rest Button!) */}
                <div className="pt-4 border-t border-[#EFECE6] flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleStep1Submit(true)}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-xs sm:text-sm font-medium text-[#181614] bg-[#FAF9F6] hover:bg-[#EFECE6] border border-[#DBD5CA] rounded-lg transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50"
                  >
                    <FastForward className="w-4 h-4 text-[#6B655E]" />
                    <span>
                      {authStatus.managedByEnv
                        ? 'Skip Setup & Use Defaults'
                        : 'Save Account & Skip Rest (Use Defaults)'}
                    </span>
                  </button>

                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => handleStep1Submit(false)}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-medium text-white bg-[#1E40AF] hover:bg-[#1D4ED8] rounded-lg transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50"
                  >
                    <KeyRound className="w-4 h-4" />
                    <span>
                      {isBusy
                        ? 'Saving Account...'
                        : authStatus.needsSetup
                          ? 'Create Account & Continue'
                          : 'Save & Continue'}
                    </span>
                    <ArrowRight className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}

            {/* ==================== STEP 2: STORE IDENTITY & LANGUAGE ==================== */}
            {activeStep === 2 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-[#181614]">Store Name</label>
                    <input
                      type="text"
                      dir="auto"
                      maxLength={40}
                      value={prefs.storeName}
                      onChange={(e) => setPrefs((p) => ({ ...p, storeName: e.target.value }))}
                      placeholder="dipi"
                      className="w-full px-3.5 py-2 text-sm bg-[#FAF9F6] border border-[#DBD5CA] rounded-lg focus:outline-none focus:border-[#1E40AF]"
                    />
                  </div>
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-[#181614]">
                      Browser Page Title
                    </label>
                    <input
                      type="text"
                      dir="auto"
                      maxLength={90}
                      value={prefs.pageTitle}
                      onChange={(e) => setPrefs((p) => ({ ...p, pageTitle: e.target.value }))}
                      placeholder="dipi — Digital Bookstore Settled in Litecoin"
                      className="w-full px-3.5 py-2 text-sm bg-[#FAF9F6] border border-[#DBD5CA] rounded-lg focus:outline-none focus:border-[#1E40AF]"
                    />
                  </div>
                </div>

                {/* Language */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-[#181614]">
                    Storefront Language &amp; Reading Direction
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {(
                      [
                        {
                          value: 'en',
                          label: 'English (LTR)',
                          desc: 'Left-to-right catalog, checkout, and receipts.',
                        },
                        {
                          value: 'fa',
                          label: 'Persian / فارسی (RTL)',
                          desc: 'Right-to-left shopper storefront with Vazirmatn & B Titr typography.',
                        },
                      ] as const
                    ).map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => setPrefs((p) => ({ ...p, language: opt.value }))}
                        className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                          prefs.language === opt.value
                            ? 'bg-[#EFF6FF] border-[#1E40AF]'
                            : 'bg-[#FAF9F6] border-[#E6E2DA] hover:border-[#BDB5A8]'
                        }`}
                      >
                        <div className="text-xs font-semibold text-[#181614]">{opt.label}</div>
                        <div className="text-[11px] text-[#6B655E] mt-0.5">{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Logo Upload */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-[#181614]">
                    Store Logo <span className="font-normal text-[#857E75]">(optional)</span>
                  </div>
                  <input
                    ref={logoInputRef}
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={handleLogoUpload}
                    className="hidden"
                  />
                  <div className="flex flex-wrap items-center gap-3">
                    {prefs.logoUrl && (
                      <img
                        src={prefs.logoUrl}
                        alt="Store logo preview"
                        className="h-9 w-auto max-w-[120px] object-contain border border-[#E6E2DA] rounded-md p-1 bg-[#FAF9F6]"
                      />
                    )}
                    <button
                      type="button"
                      disabled={isUploadingLogo}
                      onClick={() => logoInputRef.current?.click()}
                      className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-[#181614] bg-[#FAF9F6] hover:bg-[#EFECE6] border border-[#DBD5CA] rounded-lg cursor-pointer disabled:opacity-50"
                    >
                      <Upload className="w-3.5 h-3.5" />
                      <span>
                        {isUploadingLogo
                          ? 'Uploading...'
                          : prefs.logoUrl
                            ? 'Replace Logo'
                            : 'Upload Logo (PNG/JPG/WebP)'}
                      </span>
                    </button>
                    {prefs.logoUrl && (
                      <>
                        <select
                          aria-label="Logo display mode"
                          value={prefs.logoDisplayMode}
                          onChange={(e) =>
                            setPrefs((p) => ({
                              ...p,
                              logoDisplayMode: e.target.value as LogoDisplayMode,
                            }))
                          }
                          className="px-3 py-2 text-xs bg-white border border-[#DBD5CA] rounded-lg text-[#181614]"
                        >
                          <option value="logo-and-text">Logo + Store Name</option>
                          <option value="logo-only">Logo Only</option>
                          <option value="text-only">Store Name Only</option>
                        </select>
                        <button
                          type="button"
                          onClick={() => setPrefs((p) => ({ ...p, logoUrl: '' }))}
                          className="text-xs text-[#B91C1C] hover:underline cursor-pointer"
                        >
                          Remove
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Book Description Mode (4 mutually exclusive choices) */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-[#181614]">
                    Book Description Display Mode{' '}
                    <span className="font-normal text-[#857E75]">(choose strictly 1 of 4)</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                    {(
                      [
                        {
                          value: 'detail-modal',
                          label: 'Book Detail Sheet (Default)',
                          desc: 'Tap cover/title for description modal; Buy jumps straight to checkout.',
                        },
                        {
                          value: 'cover-flip',
                          label: 'Back-of-Book Cover Flip',
                          desc: 'Flip the A4 cover in-place to read blurb with zero height shift.',
                        },
                        {
                          value: 'checkout-accordion',
                          label: 'Checkout Accordion',
                          desc: 'Cards stay 1-tap buy; collapsed "About this book" toggle inside checkout.',
                        },
                        {
                          value: 'none',
                          label: 'No Description',
                          desc: 'Hide descriptions everywhere for pure 1-tap buying.',
                        },
                      ] as Array<{ value: BookDescriptionMode; label: string; desc: string }>
                    ).map((opt) => (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() =>
                          setPrefs((p) => ({ ...p, descriptionDisplayMode: opt.value }))
                        }
                        className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                          prefs.descriptionDisplayMode === opt.value
                            ? 'bg-[#EFF6FF] border-[#1E40AF]'
                            : 'bg-[#FAF9F6] border-[#E6E2DA] hover:border-[#BDB5A8]'
                        }`}
                      >
                        <div className="text-xs font-semibold text-[#181614]">{opt.label}</div>
                        <div className="text-[11px] text-[#6B655E] mt-0.5">{opt.desc}</div>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Optional Footer Support Link */}
                <div className="space-y-2.5 pt-2 border-t border-[#EFECE6]">
                  <label className="flex items-start gap-2.5 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={prefs.supportLinkEnabled}
                      onChange={(e) =>
                        setPrefs((p) => ({ ...p, supportLinkEnabled: e.target.checked }))
                      }
                      className="mt-0.5 rounded border-[#DBD5CA]"
                    />
                    <span className="text-xs text-[#6B655E]">
                      <strong className="text-[#181614]">Show Customer Support Link in Footer</strong>{' '}
                      — lets buyers reach you on Telegram, email, or a help page if they lose an
                      order key.
                    </span>
                  </label>
                  {prefs.supportLinkEnabled && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        dir="auto"
                        maxLength={60}
                        value={prefs.supportLinkTitle}
                        onChange={(e) =>
                          setPrefs((p) => ({ ...p, supportLinkTitle: e.target.value }))
                        }
                        placeholder="Link Title (e.g. Support on Telegram)"
                        className="w-full px-3 py-2 text-sm bg-[#FAF9F6] border border-[#DBD5CA] rounded-lg focus:outline-none focus:border-[#1E40AF]"
                      />
                      <input
                        type="text"
                        dir="ltr"
                        maxLength={300}
                        value={prefs.supportLinkUrl}
                        onChange={(e) =>
                          setPrefs((p) => ({ ...p, supportLinkUrl: e.target.value }))
                        }
                        placeholder="https://t.me/yourhandle or mailto:help@domain.com"
                        className="w-full px-3 py-2 text-sm font-mono bg-[#FAF9F6] border border-[#DBD5CA] rounded-lg focus:outline-none focus:border-[#1E40AF]"
                      />
                    </div>
                  )}
                </div>

                {/* Deep Guide */}
                <div className="pt-4 border-t border-[#EFECE6]">
                  <div className="text-xs font-semibold text-[#181614] mb-1">
                    Deep Parameter Guide — What Everything Does &amp; How to Format It
                  </div>
                  <GuideDisclosure title="Store Name, Browser Title & Storefront Language" defaultOpen>
                    <p>
                      <strong>Store Name</strong> appears in the top navigation bar, sale
                      notification alerts, and downloadable receipts.{' '}
                      <strong>Browser Page Title</strong> sets the browser tab label and bookmark
                      title.
                    </p>
                    <p>
                      Switching <strong>Storefront Language</strong> to Persian automatically
                      enables full right-to-left (RTL) layout and translates all buyer-facing UI
                      labels (catalog, checkout, Order Lookup) while keeping{' '}
                      <strong>Admin Vault</strong> permanently English LTR for consistent
                      administration.
                    </p>
                  </GuideDisclosure>
                  <GuideDisclosure title="How to create a valid Support Link URL">
                    <ul className="list-disc pl-4 space-y-1">
                      <li>
                        <strong>Telegram</strong>: Open Telegram → Settings → Username, then enter{' '}
                        <span className="font-mono text-[#181614]">https://t.me/yourusername</span>.
                      </li>
                      <li>
                        <strong>Email</strong>: Enter{' '}
                        <span className="font-mono text-[#181614]">
                          mailto:support@yourstore.com
                        </span>
                        .
                      </li>
                      <li>
                        <strong>Web page / Helpdesk</strong>: Any valid{' '}
                        <span className="font-mono text-[#181614]">https://...</span> link.
                      </li>
                    </ul>
                  </GuideDisclosure>
                </div>

                {/* Step 2 Footer */}
                <div className="pt-4 border-t border-[#EFECE6] flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => setActiveStep(1)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#6B655E] hover:text-[#181614] bg-white border border-[#DBD5CA] rounded-lg cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleSkipStep(2)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#6B655E] hover:text-[#181614] bg-[#FAF9F6] hover:bg-[#EFECE6] border border-[#DBD5CA] rounded-lg cursor-pointer"
                    >
                      <SkipForward className="w-3.5 h-3.5" />
                      <span>Skip this step</span>
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={handleSaveStep2}
                      className="inline-flex items-center gap-2 px-5 py-2 text-xs sm:text-sm font-medium text-white bg-[#1E40AF] hover:bg-[#1D4ED8] rounded-lg cursor-pointer disabled:opacity-50"
                    >
                      <span>{isBusy ? 'Saving...' : 'Save & Continue'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ==================== STEP 3: LITECOIN WALLET & NETWORK ==================== */}
            {activeStep === 3 && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-[#181614]">
                      Litecoin Receiving Address (Watch-Only Public Address)
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={receivingAddress}
                      onChange={(e) => setReceivingAddress(e.target.value)}
                      placeholder={
                        network === 'testnet'
                          ? 'tltc1q... (or m.../n.../Q...)'
                          : 'ltc1q... (or L.../M...)'
                      }
                      className="w-full px-3.5 py-2.5 text-sm font-mono bg-[#FAF9F6] border border-[#DBD5CA] rounded-lg text-[#181614] focus:outline-none focus:border-[#1E40AF]"
                    />
                    <p className="text-[11px] text-[#6B655E]">
                      All customer payments are sent directly from the buyer&apos;s wallet to this
                      address. dipi never holds private keys or takes custody of funds.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-[#181614]">
                        Litecoin Network
                      </label>
                      <select
                        value={network}
                        onChange={(e) =>
                          setNetwork(e.target.value === 'testnet' ? 'testnet' : 'mainnet')
                        }
                        className="w-full px-3.5 py-2.5 text-sm bg-[#FAF9F6] border border-[#DBD5CA] rounded-lg text-[#181614]"
                      >
                        <option value="mainnet">Mainnet — Real Litecoin (ltc1 / L / M)</option>
                        <option value="testnet">Testnet — Free Test Coins (tltc1 / m / n)</option>
                      </select>
                    </div>

                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-[#181614]">
                        Minimum On-Chain Confirmations
                      </label>
                      <select
                        value={minConfirmations}
                        onChange={(e) => setMinConfirmations(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-sm bg-[#FAF9F6] border border-[#DBD5CA] rounded-lg text-[#181614]"
                      >
                        <option value="0">0 confirmations — Instant mempool (~5–15 sec)</option>
                        <option value="1">1 confirmation — Recommended (~2.5 min)</option>
                        <option value="2">2 confirmations (~5 min)</option>
                        <option value="3">3 confirmations — High certainty (~7.5 min)</option>
                        <option value="6">6 confirmations — Maximum finality (~15 min)</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-3 pt-1">
                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={allowSandbox}
                        disabled={overview?.sandboxLockedOffByEnv}
                        onChange={(e) => setAllowSandbox(e.target.checked)}
                        className="mt-0.5 rounded border-[#DBD5CA]"
                      />
                      <span className="text-xs text-[#6B655E] leading-relaxed">
                        <strong className="text-[#181614] block">
                          Enable Sandbox Payment Simulation (for testing before launch)
                        </strong>
                        Shows a &quot;Simulate Payment&quot; button inside checkout so you can test
                        code delivery and receipts without sending real LTC.{' '}
                        <strong className="text-[#B45309]">
                          Turn this OFF in Settings before accepting real buyers.
                        </strong>
                      </span>
                    </label>

                    <label className="flex items-start gap-3 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={autoDownloadReceipt}
                        onChange={(e) => setAutoDownloadReceipt(e.target.checked)}
                        className="mt-0.5 rounded border-[#DBD5CA]"
                      />
                      <span className="text-xs text-[#6B655E] leading-relaxed">
                        <strong className="text-[#181614] block">
                          Auto-Download Receipt (.txt) on Confirmation
                        </strong>
                        Automatically downloads the buyer&apos;s certificate containing their
                        unlocked book code and TXID as soon as payment verifies.
                      </span>
                    </label>
                  </div>
                </div>

                {/* Deep Guide: How to get a Litecoin address & understand confirmations */}
                <div className="pt-4 border-t border-[#EFECE6]">
                  <div className="text-xs font-semibold text-[#181614] mb-1">
                    Deep Parameter Guide — How to Get Your Litecoin Address &amp; Pick Settings
                  </div>
                  <GuideDisclosure title="How do I get a Litecoin Receiving Address? (Step-by-step)" defaultOpen>
                    <ol className="list-decimal pl-4 space-y-1.5">
                      <li>
                        Install a non-custodial Litecoin wallet such as{' '}
                        <strong>Electrum-LTC</strong> (desktop), <strong>Cake Wallet</strong> or{' '}
                        <strong>Litewallet</strong> (iOS/Android), or a hardware wallet (
                        <strong>Ledger / Trezor</strong>).
                      </li>
                      <li>
                        Create a new wallet and safely write down your 12/24-word recovery seed
                        offline. <strong>Never enter your seed phrase into any website.</strong>
                      </li>
                      <li>
                        Open the <strong>Receive</strong> tab and copy your public address. Prefer a{' '}
                        <strong>Native SegWit (Bech32)</strong> address starting with{' '}
                        <span className="font-mono text-[#181614]">ltc1...</span> for the lowest
                        buyer network fees. Standard <span className="font-mono">L...</span> and{' '}
                        <span className="font-mono">M...</span> addresses also work.
                      </li>
                      <li>
                        Paste that public address above. dipi only watches public blockchain
                        explorers (<span className="font-mono">litecoinspace.org</span>) to verify
                        incoming payments.
                      </li>
                    </ol>
                  </GuideDisclosure>
                  <GuideDisclosure title="Mainnet vs Testnet — which should I choose?">
                    <p>
                      Choose <strong>Mainnet</strong> for real sales. Choose{' '}
                      <strong>Testnet</strong> if you want to test real blockchain polling and
                      TXID verification with free valueless coins: launch Electrum-LTC with{' '}
                      <span className="font-mono">--testnet</span> to get a{' '}
                      <span className="font-mono text-[#181614]">tltc1...</span> address, then
                      request free coins from a public Litecoin Testnet faucet.
                    </p>
                  </GuideDisclosure>
                  <GuideDisclosure title="How do Confirmations work on Litecoin?">
                    <p>
                      Litecoin mines a new block roughly every <strong>2.5 minutes</strong>.
                      Setting <strong>1 confirmation</strong> means the buyer waits ~2.5 minutes and
                      the payment is permanently recorded in a block (ideal for digital books).{' '}
                      <strong>0 confirmations</strong> unlocks the code seconds after broadcast
                      (fastest UX, slight double-spend risk).
                    </p>
                  </GuideDisclosure>
                </div>

                {/* Step 3 Footer */}
                <div className="pt-4 border-t border-[#EFECE6] flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => setActiveStep(2)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#6B655E] hover:text-[#181614] bg-white border border-[#DBD5CA] rounded-lg cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleSkipStep(3)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#6B655E] hover:text-[#181614] bg-[#FAF9F6] hover:bg-[#EFECE6] border border-[#DBD5CA] rounded-lg cursor-pointer"
                    >
                      <SkipForward className="w-3.5 h-3.5" />
                      <span>Skip this step</span>
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={handleSaveStep3}
                      className="inline-flex items-center gap-2 px-5 py-2 text-xs sm:text-sm font-medium text-white bg-[#1E40AF] hover:bg-[#1D4ED8] rounded-lg cursor-pointer disabled:opacity-50"
                    >
                      <span>{isBusy ? 'Saving...' : 'Save & Continue'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ==================== STEP 4: PRICING, EXPIRY & LTC QUOTES ==================== */}
            {activeStep === 4 && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-[#181614]">
                      Order Expiry Window (minutes)
                    </label>
                    <input
                      type="number"
                      min={5}
                      max={120}
                      value={orderExpiryMinutes}
                      onChange={(e) => setOrderExpiryMinutes(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm font-mono tabular-nums bg-[#FAF9F6] border border-[#DBD5CA] rounded-lg focus:outline-none focus:border-[#1E40AF]"
                    />
                    <p className="text-[11px] text-[#6B655E]">
                      Default: 20 minutes (allowed range: 5–120 min).
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-[#181614]">
                      LTC / USD Pricing Source
                    </label>
                    <select
                      value={ltcRateMode}
                      onChange={(e) =>
                        setLtcRateMode(e.target.value === 'manual' ? 'manual' : 'live')
                      }
                      className="w-full px-3.5 py-2 text-sm bg-[#FAF9F6] border border-[#DBD5CA] rounded-lg text-[#181614]"
                    >
                      <option value="live">Live Market Spot Rate (Automatic)</option>
                      <option value="manual">Manual Fixed LTC/USD Rate</option>
                    </select>
                  </div>

                  {ltcRateMode === 'manual' && (
                    <div className="space-y-1.5">
                      <label className="block text-xs font-semibold text-[#181614]">
                        Manual Fixed Rate ($ per 1 LTC)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        min={1}
                        max={100000}
                        value={manualLtcRateUsd}
                        onChange={(e) => setManualLtcRateUsd(e.target.value)}
                        className="w-full px-3.5 py-2 text-sm font-mono tabular-nums bg-[#FAF9F6] border border-[#DBD5CA] rounded-lg focus:outline-none focus:border-[#1E40AF]"
                      />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-[#181614]">
                      Quote Volatility Spread Buffer (%)
                    </label>
                    <input
                      type="number"
                      step="0.1"
                      min={0}
                      max={25}
                      value={quoteSpreadPercent}
                      onChange={(e) => setQuoteSpreadPercent(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm font-mono tabular-nums bg-[#FAF9F6] border border-[#DBD5CA] rounded-lg focus:outline-none focus:border-[#1E40AF]"
                    />
                    <p className="text-[11px] text-[#6B655E]">
                      0% = exact spot conversion; 1–2% cushions short-term LTC price drops.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-[#181614]">
                      Live Rate Cache Interval (seconds)
                    </label>
                    <input
                      type="number"
                      min={15}
                      max={600}
                      value={quoteCacheSeconds}
                      onChange={(e) => setQuoteCacheSeconds(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm font-mono tabular-nums bg-[#FAF9F6] border border-[#DBD5CA] rounded-lg focus:outline-none focus:border-[#1E40AF]"
                    />
                    <p className="text-[11px] text-[#6B655E]">
                      Default: 60 seconds (allowed range: 15–600 sec).
                    </p>
                  </div>
                </div>

                {/* Deep Guide */}
                <div className="pt-4 border-t border-[#EFECE6]">
                  <div className="text-xs font-semibold text-[#181614] mb-1">
                    Deep Parameter Guide — How dipi Calculates &amp; Matches Litecoin Orders
                  </div>
                  <GuideDisclosure
                    title="How can multiple buyers pay the same address at the same time? (Litoshi Fingerprinting)"
                    defaultOpen
                  >
                    <p>
                      Whenever a buyer starts checkout, dipi converts the book&apos;s USD price to
                      LTC and appends a unique 4-digit Litoshi suffix (worth less than $0.005), such
                      as <span className="font-mono text-[#181614]">0.15824317 LTC</span>. Because
                      every active pending order has a distinct exact amount, the blockchain
                      verifier always knows exactly which buyer paid which order.
                    </p>
                  </GuideDisclosure>
                  <GuideDisclosure title="What does Order Expiry Window do to my book stock?">
                    <p>
                      While an order is pending, dipi temporarily reserves 1 unused digital code
                      from <span className="font-mono">codes.json</span> so two simultaneous buyers
                      can never be promised the last code. If the buyer doesn&apos;t pay within the
                      expiry window, the order marks itself expired and the reserved code returns to
                      stock automatically.
                    </p>
                  </GuideDisclosure>
                  <GuideDisclosure title="How does Volatility Spread (%) work mathematically?">
                    <p>
                      A <strong>2% spread</strong> slightly lowers the effective LTC/USD conversion
                      rate used during checkout (e.g., if spot is $100/LTC, dipi quotes using
                      $98/LTC), requesting ~2% more LTC so your net USD revenue stays protected if
                      the market dips during the payment window.
                    </p>
                  </GuideDisclosure>
                  <GuideDisclosure title="When should I use Manual Rate vs Live Rate?">
                    <p>
                      Keep <strong>Live Market Spot Rate</strong> for normal stores — it pulls
                      public LTC/USD market feeds automatically with no API key required and caches
                      results for the interval you set. Use <strong>Manual Fixed Rate</strong> only
                      if you want fixed predictable LTC totals or run in a network-restricted
                      environment.
                    </p>
                  </GuideDisclosure>
                </div>

                {/* Step 4 Footer */}
                <div className="pt-4 border-t border-[#EFECE6] flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => setActiveStep(3)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#6B655E] hover:text-[#181614] bg-white border border-[#DBD5CA] rounded-lg cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleSkipStep(4)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#6B655E] hover:text-[#181614] bg-[#FAF9F6] hover:bg-[#EFECE6] border border-[#DBD5CA] rounded-lg cursor-pointer"
                    >
                      <SkipForward className="w-3.5 h-3.5" />
                      <span>Skip this step</span>
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={handleSaveStep4}
                      className="inline-flex items-center gap-2 px-5 py-2 text-xs sm:text-sm font-medium text-white bg-[#1E40AF] hover:bg-[#1D4ED8] rounded-lg cursor-pointer disabled:opacity-50"
                    >
                      <span>{isBusy ? 'Saving...' : 'Save & Continue'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ==================== STEP 5: SALE ALERTS & WEBHOOKS ==================== */}
            {activeStep === 5 && (
              <div className="space-y-6">
                {/* Telegram */}
                <div className="space-y-3 pb-5 border-b border-[#EFECE6]">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-[#181614]">
                        Telegram Sale Alerts
                      </div>
                      <p className="text-xs text-[#6B655E]">
                        Receive an instant Telegram message whenever a book is purchased and code
                        delivered.
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={telegramEnabled}
                      onClick={() => setTelegramEnabled((v) => !v)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg border cursor-pointer shrink-0 ${
                        telegramEnabled
                          ? 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]'
                          : 'bg-[#FAF9F6] text-[#6B655E] border-[#DBD5CA]'
                      }`}
                    >
                      {telegramEnabled ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>

                  {telegramEnabled && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="block text-xs font-medium text-[#6B655E]">
                            Telegram Bot Token
                          </label>
                          <input
                            type="password"
                            dir="ltr"
                            value={telegramBotToken}
                            onChange={(e) => setTelegramBotToken(e.target.value)}
                            placeholder={
                              overview?.saleNotifications.telegramBotTokenConfigured
                                ? `Saved (${overview.saleNotifications.telegramBotTokenHint || '••••'}) — enter to replace`
                                : '123456789:AAH...'
                            }
                            className="w-full px-3 py-2 text-xs font-mono bg-[#FAF9F6] border border-[#DBD5CA] rounded-lg focus:outline-none focus:border-[#1E40AF]"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-xs font-medium text-[#6B655E]">
                            Telegram Chat ID
                          </label>
                          <input
                            type="text"
                            dir="ltr"
                            value={telegramChatId}
                            onChange={(e) => setTelegramChatId(e.target.value)}
                            placeholder="123456789 or -100... or @channel"
                            className="w-full px-3 py-2 text-xs font-mono bg-[#FAF9F6] border border-[#DBD5CA] rounded-lg focus:outline-none focus:border-[#1E40AF]"
                          />
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={testingChannel === 'telegram' || isBusy}
                        onClick={() => handleTestNotification('telegram')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#181614] bg-[#FAF9F6] hover:bg-[#EFECE6] border border-[#DBD5CA] rounded-lg cursor-pointer disabled:opacity-50"
                      >
                        <Send className="w-3 h-3" />
                        <span>
                          {testingChannel === 'telegram'
                            ? 'Sending Test...'
                            : 'Save & Send Telegram Test'}
                        </span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Discord */}
                <div className="space-y-3 pb-5 border-b border-[#EFECE6]">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-[#181614]">
                        Discord Channel Alerts
                      </div>
                      <p className="text-xs text-[#6B655E]">
                        Post a clean sale summary card to a private Discord channel.
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={discordEnabled}
                      onClick={() => setDiscordEnabled((v) => !v)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg border cursor-pointer shrink-0 ${
                        discordEnabled
                          ? 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]'
                          : 'bg-[#FAF9F6] text-[#6B655E] border-[#DBD5CA]'
                      }`}
                    >
                      {discordEnabled ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>

                  {discordEnabled && (
                    <div className="space-y-3">
                      <div className="space-y-1">
                        <label className="block text-xs font-medium text-[#6B655E]">
                          Discord Webhook URL
                        </label>
                        <input
                          type="password"
                          dir="ltr"
                          value={discordWebhookUrl}
                          onChange={(e) => setDiscordWebhookUrl(e.target.value)}
                          placeholder={
                            overview?.saleNotifications.discordWebhookConfigured
                              ? `Saved (${overview.saleNotifications.discordWebhookHint || '••••'}) — enter to replace`
                              : 'https://discord.com/api/webhooks/...'
                          }
                          className="w-full px-3 py-2 text-xs font-mono bg-[#FAF9F6] border border-[#DBD5CA] rounded-lg focus:outline-none focus:border-[#1E40AF]"
                        />
                      </div>
                      <button
                        type="button"
                        disabled={testingChannel === 'discord' || isBusy}
                        onClick={() => handleTestNotification('discord')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#181614] bg-[#FAF9F6] hover:bg-[#EFECE6] border border-[#DBD5CA] rounded-lg cursor-pointer disabled:opacity-50"
                      >
                        <Send className="w-3 h-3" />
                        <span>
                          {testingChannel === 'discord'
                            ? 'Sending Test...'
                            : 'Save & Send Discord Test'}
                        </span>
                      </button>
                    </div>
                  )}
                </div>

                {/* Custom Outbound Webhook */}
                <div className="space-y-3 pb-5 border-b border-[#EFECE6]">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-[#181614]">
                        Custom Outbound Sale Webhook
                      </div>
                      <p className="text-xs text-[#6B655E]">
                        Forward signed JSON sale events to Zapier, Make, n8n, or your own API.
                      </p>
                    </div>
                    <button
                      type="button"
                      role="switch"
                      aria-checked={outboundWebhookEnabled}
                      onClick={() => setOutboundWebhookEnabled((v) => !v)}
                      className={`px-3 py-1.5 text-xs font-medium rounded-lg border cursor-pointer shrink-0 ${
                        outboundWebhookEnabled
                          ? 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]'
                          : 'bg-[#FAF9F6] text-[#6B655E] border-[#DBD5CA]'
                      }`}
                    >
                      {outboundWebhookEnabled ? 'Enabled' : 'Disabled'}
                    </button>
                  </div>

                  {outboundWebhookEnabled && (
                    <div className="space-y-3">
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div className="space-y-1">
                          <label className="block text-xs font-medium text-[#6B655E]">
                            Public HTTPS Endpoint URL
                          </label>
                          <input
                            type="url"
                            dir="ltr"
                            value={outboundWebhookUrl}
                            onChange={(e) => setOutboundWebhookUrl(e.target.value)}
                            placeholder="https://hooks.example.com/dipi-sales"
                            className="w-full px-3 py-2 text-xs font-mono bg-[#FAF9F6] border border-[#DBD5CA] rounded-lg focus:outline-none focus:border-[#1E40AF]"
                          />
                        </div>
                        <div className="space-y-1">
                          <label className="block text-xs font-medium text-[#6B655E]">
                            Signing Secret (optional HMAC-SHA256)
                          </label>
                          <div className="flex items-center gap-1.5">
                            <input
                              type="text"
                              dir="ltr"
                              value={outboundWebhookSecret}
                              onChange={(e) => setOutboundWebhookSecret(e.target.value)}
                              placeholder="Paste or generate secret"
                              className="flex-1 min-w-0 px-3 py-2 text-xs font-mono bg-[#FAF9F6] border border-[#DBD5CA] rounded-lg focus:outline-none focus:border-[#1E40AF]"
                            />
                            <button
                              type="button"
                              onClick={() => setOutboundWebhookSecret(generateHexSecret())}
                              className="px-2.5 py-2 text-xs font-medium text-[#181614] bg-[#F2EFE9] hover:bg-[#E6E2DA] rounded-lg cursor-pointer shrink-0"
                            >
                              Generate
                            </button>
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        disabled={testingChannel === 'webhook' || isBusy}
                        onClick={() => handleTestNotification('webhook')}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#181614] bg-[#FAF9F6] hover:bg-[#EFECE6] border border-[#DBD5CA] rounded-lg cursor-pointer disabled:opacity-50"
                      >
                        <Send className="w-3 h-3" />
                        <span>
                          {testingChannel === 'webhook'
                            ? 'Sending Test...'
                            : 'Save & Send Webhook Test'}
                        </span>
                      </button>
                    </div>
                  )}

                  {(telegramEnabled || discordEnabled || outboundWebhookEnabled) && (
                    <label className="flex items-center gap-2 text-xs text-[#6B655E] cursor-pointer pt-1">
                      <input
                        type="checkbox"
                        checked={includeSandboxSales}
                        onChange={(e) => setIncludeSandboxSales(e.target.checked)}
                        className="rounded border-[#DBD5CA]"
                      />
                      <span>Also send alerts for Sandbox simulated test sales</span>
                    </label>
                  )}
                </div>

                {/* Optional Inbound Litecoin Node Webhook Secret */}
                <div className="space-y-2">
                  <div className="text-sm font-semibold text-[#181614]">
                    Inbound Litecoin Payment Webhook Secret{' '}
                    <span className="text-xs font-normal text-[#857E75]">
                      (advanced · completely optional)
                    </span>
                  </div>
                  <p className="text-xs text-[#6B655E]">
                    Only needed if you run your own Litecoin Core node (
                    <span className="font-mono">walletnotify</span>) or BTCPay Server to push TXIDs
                    to <span className="font-mono text-[#181614]">POST /api/webhooks/ltc</span>.
                    Built-in automatic blockchain polling already works with zero setup.
                  </p>
                  <div className="flex flex-wrap items-center gap-2">
                    <input
                      type="text"
                      dir="ltr"
                      value={inboundWebhookSecret}
                      onChange={(e) => setInboundWebhookSecret(e.target.value)}
                      placeholder={
                        overview?.webhookConfigured
                          ? `Already configured (${overview.webhookSecretHint || '••••'})`
                          : 'Leave blank to skip, or generate a 64-char HMAC secret'
                      }
                      className="flex-1 min-w-[220px] px-3 py-2 text-xs font-mono bg-[#FAF9F6] border border-[#DBD5CA] rounded-lg focus:outline-none focus:border-[#1E40AF]"
                    />
                    <button
                      type="button"
                      onClick={() => setInboundWebhookSecret(generateHexSecret())}
                      className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#181614] bg-[#F2EFE9] hover:bg-[#E6E2DA] rounded-lg cursor-pointer shrink-0"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                      <span>Generate</span>
                    </button>
                    {inboundWebhookSecret && (
                      <button
                        type="button"
                        onClick={() => copyToClipboard('inbound', inboundWebhookSecret)}
                        className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#181614] bg-white border border-[#DBD5CA] rounded-lg cursor-pointer shrink-0"
                      >
                        {copiedSecretField === 'inbound' ? (
                          <Check className="w-3.5 h-3.5 text-[#047857]" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                        <span>{copiedSecretField === 'inbound' ? 'Copied' : 'Copy'}</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Deep Step-by-Step Guide: How to get every token/URL */}
                <div className="pt-4 border-t border-[#EFECE6]">
                  <div className="text-xs font-semibold text-[#181614] mb-1">
                    Deep Parameter Guide — Exact Steps to Get Every Token, ID &amp; Webhook URL
                  </div>
                  <GuideDisclosure
                    title="How to get a Telegram Bot Token and Chat ID (2 minutes)"
                    defaultOpen
                  >
                    <ol className="list-decimal pl-4 space-y-1.5">
                      <li>
                        <strong>Get Bot Token</strong>: Open Telegram, search for{' '}
                        <span className="font-mono text-[#181614]">@BotFather</span> (verified blue
                        checkmark), send <span className="font-mono">/newbot</span>, pick a display
                        name and a username ending in <span className="font-mono">bot</span> (e.g.{' '}
                        <span className="font-mono">mybookshop_alerts_bot</span>). Copy the HTTP API
                        token (looks like{' '}
                        <span className="font-mono text-[#181614]">
                          123456789:AAH...
                        </span>
                        ).
                      </li>
                      <li>
                        <strong>Start the bot</strong>: Tap the link to your new bot and press{' '}
                        <strong>Start</strong> (or add the bot as an Admin in your private sales
                        channel).
                      </li>
                      <li>
                        <strong>Get Chat ID</strong>: For personal DMs, message{' '}
                        <span className="font-mono text-[#181614]">@userinfobot</span> to read your
                        numeric <span className="font-mono">Id</span>. For a private group or
                        channel, send a message in it and open{' '}
                        <span className="font-mono break-all text-[#181614]">
                          https://api.telegram.org/bot&lt;YOUR_TOKEN&gt;/getUpdates
                        </span>{' '}
                        to copy the <span className="font-mono">&quot;chat&quot;:{'{"id":...}'}</span>{' '}
                        number (channels start with <span className="font-mono">-100...</span>, or
                        use <span className="font-mono">@channelusername</span> for public
                        channels).
                      </li>
                    </ol>
                  </GuideDisclosure>
                  <GuideDisclosure title="How to get a Discord Webhook URL (30 seconds)">
                    <ol className="list-decimal pl-4 space-y-1.5">
                      <li>Open Discord and go to the private server &amp; channel for alerts.</li>
                      <li>
                        Click the gear icon (<strong>Edit Channel</strong>) →{' '}
                        <strong>Integrations</strong> → <strong>Webhooks</strong> →{' '}
                        <strong>New Webhook</strong>.
                      </li>
                      <li>
                        Click <strong>Copy Webhook URL</strong> (starts with{' '}
                        <span className="font-mono text-[#181614]">
                          https://discord.com/api/webhooks/...
                        </span>
                        ) and paste it above.
                      </li>
                    </ol>
                  </GuideDisclosure>
                  <GuideDisclosure title="How Outbound & Inbound HMAC Webhooks work">
                    <p>
                      <strong>Outbound Sale Webhook</strong>: Every confirmed sale sends a{' '}
                      <span className="font-mono">POST</span> JSON payload with order ID, book
                      title, USD/LTC settled, TXID, and remaining stock. If you set a Signing
                      Secret, dipi includes an{' '}
                      <span className="font-mono text-[#181614]">X-Dipi-Signature</span> HMAC-SHA256
                      header so your receiver can verify authenticity.
                    </p>
                    <p>
                      <strong>Inbound Payment Webhook</strong>: Lets an external Litecoin node push
                      TXIDs directly to <span className="font-mono">POST /api/webhooks/ltc</span>{' '}
                      signed with <span className="font-mono">X-Webhook-Signature</span>. dipi still
                      verifies the TXID on-chain before unlocking any book code.
                    </p>
                  </GuideDisclosure>
                </div>

                {/* Step 5 Footer */}
                <div className="pt-4 border-t border-[#EFECE6] flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => setActiveStep(4)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#6B655E] hover:text-[#181614] bg-white border border-[#DBD5CA] rounded-lg cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleSkipStep(5)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#6B655E] hover:text-[#181614] bg-[#FAF9F6] hover:bg-[#EFECE6] border border-[#DBD5CA] rounded-lg cursor-pointer"
                    >
                      <SkipForward className="w-3.5 h-3.5" />
                      <span>Skip this step</span>
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={handleSaveStep5}
                      className="inline-flex items-center gap-2 px-5 py-2 text-xs sm:text-sm font-medium text-white bg-[#1E40AF] hover:bg-[#1D4ED8] rounded-lg cursor-pointer disabled:opacity-50"
                    >
                      <span>{isBusy ? 'Saving...' : 'Save & Continue'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ==================== STEP 6: STOREFRONT LOOK & CATALOG CONTROLS ==================== */}
            {activeStep === 6 && (
              <div className="space-y-6">
                {/* Theme Presets */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-[#181614]">
                    Color Theme Preset{' '}
                    <span className="font-normal text-[#857E75]">
                      (fine-tune individual colors &amp; custom wallpaper later in Preferences)
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                    {THEME_PRESETS.map((preset) => {
                      const isActive =
                        prefs.backgroundColor.toLowerCase() ===
                          preset.backgroundColor.toLowerCase() &&
                        prefs.accentColor.toLowerCase() === preset.accentColor.toLowerCase();
                      const swatch = PRESET_SWATCHES[preset.id] || {
                        bg: 'bg-[#FAF9F6]',
                        surface: 'bg-white',
                        accent: 'bg-[#1E40AF]',
                      };
                      return (
                        <button
                          key={preset.id}
                          type="button"
                          onClick={() =>
                            setPrefs((p) => ({
                              ...p,
                              backgroundColor: preset.backgroundColor,
                              surfaceColor: preset.surfaceColor,
                              textColor: preset.textColor,
                              accentColor: preset.accentColor,
                            }))
                          }
                          className={`p-3 rounded-lg border text-left transition-colors cursor-pointer space-y-2 ${
                            isActive
                              ? 'bg-[#EFF6FF] border-[#1E40AF]'
                              : 'bg-[#FAF9F6] border-[#E6E2DA] hover:border-[#BDB5A8]'
                          }`}
                        >
                          <div className="flex items-center gap-1.5">
                            <span
                              className={`w-4 h-4 rounded-sm border border-black/15 ${swatch.bg}`}
                              aria-hidden="true"
                            />
                            <span
                              className={`w-4 h-4 rounded-sm border border-black/15 ${swatch.surface}`}
                              aria-hidden="true"
                            />
                            <span
                              className={`w-4 h-4 rounded-sm border border-black/15 ${swatch.accent}`}
                              aria-hidden="true"
                            />
                          </div>
                          <div className="text-xs font-semibold text-[#181614]">{preset.label}</div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Grid & Card Geometry */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-[#181614]">
                      Desktop Grid Columns
                    </label>
                    <select
                      value={prefs.gridColumns}
                      onChange={(e) =>
                        setPrefs((p) => ({
                          ...p,
                          gridColumns: Number(e.target.value) as 2 | 3 | 4,
                        }))
                      }
                      className="w-full px-3 py-2 text-sm bg-[#FAF9F6] border border-[#DBD5CA] rounded-lg"
                    >
                      <option value={2}>2 books per row (Editorial)</option>
                      <option value={3}>3 books per row (Balanced · Default)</option>
                      <option value={4}>4 books per row (Compact Catalog)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-[#181614]">
                      Card Corner Style
                    </label>
                    <select
                      value={prefs.cardRadius}
                      onChange={(e) =>
                        setPrefs((p) => ({
                          ...p,
                          cardRadius: e.target.value as CardRadiusChoice,
                        }))
                      }
                      className="w-full px-3 py-2 text-sm bg-[#FAF9F6] border border-[#DBD5CA] rounded-lg"
                    >
                      <option value="sharp">Sharp (4px)</option>
                      <option value="rounded">Rounded (12px · Default)</option>
                      <option value="soft">Soft (20px)</option>
                    </select>
                  </div>

                  <div className="space-y-1.5">
                    <label className="block text-xs font-semibold text-[#181614]">
                      Mobile Card Style
                    </label>
                    <select
                      value={prefs.mobileCardStyle}
                      onChange={(e) =>
                        setPrefs((p) => ({
                          ...p,
                          mobileCardStyle: e.target.value as MobileCardStyle,
                        }))
                      }
                      className="w-full px-3 py-2 text-sm bg-[#FAF9F6] border border-[#DBD5CA] rounded-lg"
                    >
                      <option value="standard">Standard A4 Card</option>
                      <option value="horizontal">Horizontal List Row</option>
                      <option value="compact">Compact Dense Card</option>
                      <option value="cover-focus">Cover Focus (Minimal)</option>
                    </select>
                  </div>
                </div>

                {/* Catalog Controls */}
                <div className="space-y-2.5 pt-2 border-t border-[#EFECE6]">
                  <div className="text-xs font-semibold text-[#181614]">
                    Storefront Discovery Controls
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
                    {(
                      [
                        {
                          key: 'showSearchBar',
                          label: 'Search Bar',
                          desc: 'Search title, author, subject, or publisher.',
                        },
                        {
                          key: 'showCategoryFilter',
                          label: 'Subject Categories',
                          desc: 'Filter tabs built automatically from book subjects.',
                        },
                        {
                          key: 'showSortControl',
                          label: 'Sort Selector',
                          desc: 'Sort by Featured, Price Low/High, or Title.',
                        },
                      ] as const
                    ).map((ctrl) => (
                      <button
                        key={ctrl.key}
                        type="button"
                        role="switch"
                        aria-checked={prefs[ctrl.key]}
                        onClick={() => setPrefs((p) => ({ ...p, [ctrl.key]: !p[ctrl.key] }))}
                        className={`p-3 rounded-lg border text-left transition-colors cursor-pointer ${
                          prefs[ctrl.key]
                            ? 'bg-[#ECFDF5] border-[#A7F3D0]'
                            : 'bg-[#FAF9F6] border-[#E6E2DA]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-xs font-semibold text-[#181614]">{ctrl.label}</span>
                          <span
                            className={`text-[11px] font-medium ${
                              prefs[ctrl.key] ? 'text-[#047857]' : 'text-[#857E75]'
                            }`}
                          >
                            {prefs[ctrl.key] ? 'Active' : 'Off'}
                          </span>
                        </div>
                        <p className="text-[11px] text-[#6B655E] mt-1">{ctrl.desc}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Deep Guide */}
                <div className="pt-4 border-t border-[#EFECE6]">
                  <div className="text-xs font-semibold text-[#181614] mb-1">
                    Deep Parameter Guide — Designing for Small vs Large Catalogs
                  </div>
                  <GuideDisclosure
                    title="How to choose the best grid & discovery controls for your catalog"
                    defaultOpen
                  >
                    <p>
                      If you sell <strong>1–6 curated books</strong>, turning off Search and Sort
                      creates an ultra-clean gallery where shoppers tap straight to buy. If you sell{' '}
                      <strong>10+ books across genres</strong>, keep Search, Subject Categories, and
                      Sort active and use 3 or 4 desktop columns.
                    </p>
                    <p>
                      In <strong>Admin Vault → Preferences</strong>, you can also upload a full-page
                      background image, change fonts (B Titr, Lalezar, Playfair Display, Vazirmatn),
                      or activate <strong>Store Pause / Maintenance Mode</strong> with a live
                      desktop/mobile preview.
                    </p>
                  </GuideDisclosure>
                </div>

                {/* Step 6 Footer */}
                <div className="pt-4 border-t border-[#EFECE6] flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => setActiveStep(5)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#6B655E] hover:text-[#181614] bg-white border border-[#DBD5CA] rounded-lg cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>
                  <div className="flex items-center gap-2.5">
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={() => handleSkipStep(6)}
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#6B655E] hover:text-[#181614] bg-[#FAF9F6] hover:bg-[#EFECE6] border border-[#DBD5CA] rounded-lg cursor-pointer"
                    >
                      <SkipForward className="w-3.5 h-3.5" />
                      <span>Skip this step</span>
                    </button>
                    <button
                      type="button"
                      disabled={isBusy}
                      onClick={handleSaveStep6}
                      className="inline-flex items-center gap-2 px-5 py-2 text-xs sm:text-sm font-medium text-white bg-[#1E40AF] hover:bg-[#1D4ED8] rounded-lg cursor-pointer disabled:opacity-50"
                    >
                      <span>{isBusy ? 'Saving...' : 'Save & Continue'}</span>
                      <ArrowRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ==================== STEP 7: BOOKS, CODES.JSON & LAUNCH ==================== */}
            {activeStep === 7 && (
              <div className="space-y-6">
                {/* Current Catalog Snapshot */}
                <div className="p-4 bg-[#FAF9F6] border border-[#E6E2DA] rounded-lg flex flex-wrap items-center justify-between gap-4">
                  <div className="space-y-1">
                    <div className="text-xs font-semibold text-[#181614]">
                      Current Digital Inventory in{' '}
                      <span className="font-mono">data/codes.json</span>
                    </div>
                    <div className="text-xs text-[#6B655E] font-mono tabular-nums">
                      {overview?.products.length ?? 0} books · {overview?.stats.availableCodes ?? 0}{' '}
                      unused codes ready · {overview?.stats.usedCodes ?? 0} delivered
                      {addedBooksCount > 0 ? ` (+${addedBooksCount} added in setup)` : ''}
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowAddBookForm((v) => !v)}
                    className="px-3.5 py-2 text-xs font-medium text-[#181614] bg-white hover:bg-[#EFECE6] border border-[#DBD5CA] rounded-lg cursor-pointer shrink-0"
                  >
                    {showAddBookForm ? 'Hide Quick-Add Form' : 'Add Your First Book Now (Optional)'}
                  </button>
                </div>

                {/* Optional Inline First Book + Codes Form */}
                {showAddBookForm && (
                  <form
                    onSubmit={handleAddFirstBook}
                    className="p-5 bg-[#FAF9F6] border border-[#E6E2DA] rounded-lg space-y-4"
                  >
                    <div className="text-xs font-semibold text-[#181614]">
                      Add a Book &amp; Paste Initial Single-Use Digital Codes
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <input
                        type="text"
                        dir="auto"
                        value={bookTitle}
                        onChange={(e) => setBookTitle(e.target.value)}
                        placeholder="Book Title *"
                        className="px-3 py-2 text-sm bg-white border border-[#DBD5CA] rounded-lg"
                      />
                      <input
                        type="text"
                        dir="auto"
                        value={bookSubject}
                        onChange={(e) => setBookSubject(e.target.value)}
                        placeholder="Subject / Category (optional)"
                        className="px-3 py-2 text-sm bg-white border border-[#DBD5CA] rounded-lg"
                      />
                      <input
                        type="text"
                        dir="auto"
                        value={bookWriter}
                        onChange={(e) => setBookWriter(e.target.value)}
                        placeholder="Author / Writer *"
                        className="px-3 py-2 text-sm bg-white border border-[#DBD5CA] rounded-lg"
                      />
                      <input
                        type="text"
                        dir="auto"
                        value={bookTranslator}
                        onChange={(e) => setBookTranslator(e.target.value)}
                        placeholder="Translator (or leave blank for Original Edition)"
                        className="px-3 py-2 text-sm bg-white border border-[#DBD5CA] rounded-lg"
                      />
                      <input
                        type="text"
                        dir="auto"
                        value={bookPublication}
                        onChange={(e) => setBookPublication(e.target.value)}
                        placeholder="Publication / Publisher *"
                        className="px-3 py-2 text-sm bg-white border border-[#DBD5CA] rounded-lg"
                      />
                      <input
                        type="number"
                        step="0.01"
                        min="1"
                        value={bookPrice}
                        onChange={(e) => setBookPrice(e.target.value)}
                        placeholder="Price in USD *"
                        className="px-3 py-2 text-sm font-mono bg-white border border-[#DBD5CA] rounded-lg"
                      />
                    </div>

                    <textarea
                      rows={2}
                      dir="auto"
                      maxLength={1200}
                      value={bookDescription}
                      onChange={(e) => setBookDescription(e.target.value)}
                      placeholder="Optional book description / blurb..."
                      className="w-full px-3 py-2 text-sm bg-white border border-[#DBD5CA] rounded-lg"
                    />

                    <div className="flex flex-wrap items-center gap-3">
                      <input
                        ref={coverInputRef}
                        type="file"
                        accept="image/jpeg,image/png,image/webp"
                        onChange={handleBookCoverUpload}
                        className="hidden"
                      />
                      {bookCover && (
                        <div className="relative w-12 aspect-[210/297] rounded border border-[#DBD5CA] overflow-hidden bg-white shrink-0">
                          <img
                            src={bookCover}
                            alt="Uploaded cover"
                            className="w-full h-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => setBookCover('')}
                            aria-label="Remove cover"
                            className="absolute top-0.5 right-0.5 p-0.5 bg-[#181614]/80 text-white rounded cursor-pointer"
                          >
                            <X className="w-2.5 h-2.5" />
                          </button>
                        </div>
                      )}
                      <button
                        type="button"
                        disabled={isUploadingCover}
                        onClick={() => coverInputRef.current?.click()}
                        className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-[#181614] bg-white hover:bg-[#EFECE6] border border-[#DBD5CA] rounded-lg cursor-pointer disabled:opacity-50"
                      >
                        <Upload className="w-3.5 h-3.5" />
                        <span>
                          {isUploadingCover
                            ? 'Uploading Cover...'
                            : bookCover
                              ? 'Replace A4 Cover *'
                              : 'Upload A4 Cover Image *'}
                        </span>
                      </button>
                    </div>

                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-[#6B655E]">
                        Initial Digital Redemption Codes (optional · one per line)
                      </label>
                      <textarea
                        rows={3}
                        dir="ltr"
                        value={bookCodesText}
                        onChange={(e) => setBookCodesText(e.target.value)}
                        placeholder={'BOOK-KEY-0001\nBOOK-KEY-0002'}
                        className="w-full px-3 py-2 text-xs font-mono bg-white border border-[#DBD5CA] rounded-lg"
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={isBusy || isUploadingCover}
                      className="px-4 py-2 text-xs font-medium text-white bg-[#181614] hover:bg-[#1E40AF] rounded-lg cursor-pointer disabled:opacity-50"
                    >
                      {isBusy ? 'Saving Book...' : 'Save Book & Import Codes'}
                    </button>
                  </form>
                )}

                {/* Active Secret Admin URL Reminder */}
                <div className="p-3.5 bg-[#FAF9F6] border border-[#E6E2DA] rounded-lg flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div className="space-y-0.5 min-w-0">
                    <div className="font-semibold text-[#181614]">
                      Your Private Admin Vault URL (Bookmark This)
                    </div>
                    <div className="font-mono text-[#1E40AF] break-all">{fullAdminUrlPreview}</div>
                  </div>
                  <button
                    type="button"
                    onClick={() => copyToClipboard('summary-admin-url', fullAdminUrlPreview)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#181614] bg-white hover:bg-[#EFECE6] border border-[#DBD5CA] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    {copiedSecretField === 'summary-admin-url' ? (
                      <Check className="w-3.5 h-3.5 text-[#047857]" />
                    ) : (
                      <Copy className="w-3.5 h-3.5 text-[#6B655E]" />
                    )}
                    <span>
                      {copiedSecretField === 'summary-admin-url' ? 'Copied' : 'Copy Admin URL'}
                    </span>
                  </button>
                </div>

                {/* Setup Summary Table */}
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-[#181614]">Setup Summary</div>
                  <div className="border border-[#E6E2DA] rounded-lg divide-y divide-[#EFECE6] text-xs">
                    {STEPS.map((step) => {
                      const state = stepStates[step.id];
                      return (
                        <div
                          key={step.id}
                          className="px-3.5 py-2.5 flex items-center justify-between gap-3"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <span className="font-mono text-[#857E75] tabular-nums">
                              {step.code}.
                            </span>
                            <span className="font-medium text-[#181614] truncate">
                              {step.title}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 shrink-0">
                            <span
                              className={
                                state === 'saved'
                                  ? 'text-[#047857] font-medium'
                                  : 'text-[#857E75]'
                              }
                            >
                              {state === 'saved'
                                ? 'Configured'
                                : state === 'skipped'
                                  ? 'Skipped (Defaults)'
                                  : 'Using Defaults'}
                            </span>
                            {step.id < 7 && (
                              <button
                                type="button"
                                onClick={() => setActiveStep(step.id)}
                                className="text-[#1E40AF] hover:underline font-medium cursor-pointer"
                              >
                                Edit
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Deep Guide */}
                <div className="pt-4 border-t border-[#EFECE6]">
                  <div className="text-xs font-semibold text-[#181614] mb-1">
                    Deep Parameter Guide — How Digital Delivery &amp; Launch Checklist Work
                  </div>
                  <GuideDisclosure
                    title="How does codes.json protect against double-selling codes?"
                    defaultOpen
                  >
                    <p>
                      Every book links to single-use codes in{' '}
                      <span className="font-mono text-[#181614]">data/codes.json</span> marked{' '}
                      <span className="font-mono">used: false</span>. When an order confirms on the
                      Litecoin blockchain, dipi acquires an atomic server lock, flips that exact
                      code to <span className="font-mono">used: true</span>, records the Order ID
                      and TXID, and delivers it to the buyer. Once all codes for a book are used,
                      its storefront button automatically switches to <strong>Out of Stock</strong>.
                    </p>
                  </GuideDisclosure>
                  <GuideDisclosure title="Pre-launch checklist before sharing your store link">
                    <ul className="list-disc pl-4 space-y-1">
                      <li>
                        Verify your real <strong>Litecoin Mainnet receiving address</strong> in{' '}
                        <strong>Settings</strong>.
                      </li>
                      <li>
                        Turn <strong>OFF</strong> Sandbox Payment Simulation once your test run
                        passes.
                      </li>
                      <li>
                        Add your books and single-use digital redemption codes under{' '}
                        <strong>Manage Books &amp; Codes</strong>.
                      </li>
                      <li>
                        Download periodic backups of{' '}
                        <span className="font-mono text-[#181614]">codes.json</span> using the
                        export button in Inventory.
                      </li>
                    </ul>
                  </GuideDisclosure>
                </div>

                {/* Step 7 Footer */}
                <div className="pt-4 border-t border-[#EFECE6] flex flex-wrap items-center justify-between gap-3">
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={() => setActiveStep(6)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-medium text-[#6B655E] hover:text-[#181614] bg-white border border-[#DBD5CA] rounded-lg cursor-pointer"
                  >
                    <ArrowLeft className="w-3.5 h-3.5" />
                    <span>Back</span>
                  </button>
                  <button
                    type="button"
                    disabled={isBusy}
                    onClick={handleFinishSetup}
                    className="inline-flex items-center gap-2 px-5 py-2.5 text-xs sm:text-sm font-medium text-white bg-[#047857] hover:bg-[#065F46] rounded-lg transition-colors whitespace-nowrap cursor-pointer disabled:opacity-50"
                  >
                    <ShieldCheck className="w-4 h-4" />
                    <span>{isBusy ? 'Finishing Setup...' : 'Finish Setup & Open Admin Vault'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </section>
    </main>
  );
}
