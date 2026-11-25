import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertCircle,
  BookOpenCheck,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Eye,
  EyeOff,
  FileJson,
  KeyRound,
  Lock,
  LogOut,
  PauseCircle,
  Pencil,
  PlayCircle,
  Plus,
  RefreshCw,
  ShieldCheck,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import {
  addAdminCodes,
  adminConfirmOrder,
  createAdminBook,
  deleteAdminBook,
  deleteAdminCode,
  fetchAdminOverview,
  fetchAdminStatus,
  loginAdmin,
  logoutAdmin,
  updateAdminBook,
  updateAdminPreferences,
  updateAdminSecurity,
  updateAdminSettings,
  uploadAdminCover,
} from '../api';
import { FirstTimeSetupWizard } from './FirstTimeSetupWizard';
import { PreferencesPanel } from './PreferencesPanel';
import { PromoCodesPanel } from './PromoCodesPanel';
import { SaleNotificationsCard } from './SaleNotificationsCard';
import { SalesPerDayChart } from './SalesPerDayChart';
import type { AdminAuthStatus, AdminBookRecord, AdminOverviewResponse } from '../types';

interface AdminVaultProps {
  adminToken: string | null;
  onAdminTokenChange: (token: string | null) => void;
  onCatalogMutated: () => void;
  onAdminPathChanged?: (nextPath: string) => void;
}

type AdminTab =
  | 'overview'
  | 'inventory'
  | 'add'
  | 'orders'
  | 'promos'
  | 'preferences'
  | 'settings';

export function AdminVault({
  adminToken,
  onAdminTokenChange,
  onCatalogMutated,
  onAdminPathChanged,
}: AdminVaultProps) {
  const [authStatus, setAuthStatus] = useState<AdminAuthStatus | null>(null);
  const [showSetupWizard, setShowSetupWizard] = useState(false);
  const [usernameInput, setUsernameInput] = useState('');
  const [passwordInput, setPasswordInput] = useState('');
  const [authError, setAuthError] = useState<string | null>(null);
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const [overview, setOverview] = useState<AdminOverviewResponse | null>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>('overview');
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error'; text: string } | null>(
    null
  );

  // Inventory filters
  const [statusFilter, setStatusFilter] = useState<'all' | 'unused' | 'used'>('all');
  const [bookFilter, setBookFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showRawCodes, setShowRawCodes] = useState(true);
  const [showJsonInspector, setShowJsonInspector] = useState(false);

  // Bulk add codes state
  const [bulkProductId, setBulkProductId] = useState('');
  const [bulkCodesText, setBulkCodesText] = useState('');
  const [isAddingCodes, setIsAddingCodes] = useState(false);

  // New book form state
  const [bookTitle, setBookTitle] = useState('');
  const [bookSubject, setBookSubject] = useState('');
  const [bookDescription, setBookDescription] = useState('');
  const [bookWriter, setBookWriter] = useState('');
  const [bookTranslator, setBookTranslator] = useState('');
  const [bookPublication, setBookPublication] = useState('');
  const [bookPrice, setBookPrice] = useState('12.00');
  const [bookCover, setBookCover] = useState('');
  const [bookCoverFilename, setBookCoverFilename] = useState('');
  const [isUploadingCover, setIsUploadingCover] = useState(false);
  const [isCreatingBook, setIsCreatingBook] = useState(false);
  const coverInputRef = useRef<HTMLInputElement | null>(null);

  // Edit / remove existing book state
  const [editingBookId, setEditingBookId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [editSubject, setEditSubject] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editWriter, setEditWriter] = useState('');
  const [editTranslator, setEditTranslator] = useState('');
  const [editPublication, setEditPublication] = useState('');
  const [editPrice, setEditPrice] = useState('');
  const [editCover, setEditCover] = useState('');
  const [isUploadingEditCover, setIsUploadingEditCover] = useState(false);
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [confirmDeleteBookId, setConfirmDeleteBookId] = useState<string | null>(null);
  const [isDeletingBookId, setIsDeletingBookId] = useState<string | null>(null);
  const editCoverInputRef = useRef<HTMLInputElement | null>(null);

  // Settings form state
  const [receivingAddress, setReceivingAddress] = useState('');
  const [network, setNetwork] = useState<'mainnet' | 'testnet'>('mainnet');
  const [minConfirmations, setMinConfirmations] = useState('1');
  const [allowSandbox, setAllowSandbox] = useState(true);
  const [autoDownloadReceipt, setAutoDownloadReceipt] = useState(false);
  const [isSavingSettings, setIsSavingSettings] = useState(false);
  const [isResumingStore, setIsResumingStore] = useState(false);
  const [copiedWebhook, setCopiedWebhook] = useState(false);

  // Order Expiry & Quote Settings state
  const [orderExpiryMinutes, setOrderExpiryMinutes] = useState('20');
  const [ltcRateMode, setLtcRateMode] = useState<'live' | 'manual'>('live');
  const [manualLtcRateUsd, setManualLtcRateUsd] = useState('88.50');
  const [quoteSpreadPercent, setQuoteSpreadPercent] = useState('0');
  const [quoteCacheSeconds, setQuoteCacheSeconds] = useState('60');
  const [isSavingQuoteSettings, setIsSavingQuoteSettings] = useState(false);

  // Webhook secret management in Settings
  const [webhookSecretInput, setWebhookSecretInput] = useState('');
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const [isSavingWebhookSecret, setIsSavingWebhookSecret] = useState(false);
  const [copiedWebhookSecret, setCopiedWebhookSecret] = useState(false);

  // Admin Vault Security management in Settings
  const [requirePasscode, setRequirePasscode] = useState(false);
  const [adminUsernameInput, setAdminUsernameInput] = useState('');
  const [newAdminPasscode, setNewAdminPasscode] = useState('');
  const [confirmAdminPasscode, setConfirmAdminPasscode] = useState('');
  const [adminPathInput, setAdminPathInput] = useState('admin');
  const [copiedAdminUrl, setCopiedAdminUrl] = useState(false);
  const [isSavingSecurity, setIsSavingSecurity] = useState(false);

  useEffect(() => {
    fetchAdminStatus()
      .then((status) => {
        setAuthStatus(status);
        setRequirePasscode(!status.debugOpenAccess);
      })
      .catch(() => setAuthError('Unable to check admin status.'));
  }, []);

  const hasAccess = Boolean(adminToken || authStatus?.debugOpenAccess);

  const loadOverview = useCallback(async () => {
    if (!hasAccess) return;
    try {
      const data = await fetchAdminOverview(adminToken);
      setOverview(data);
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
      setRequirePasscode(data.settings.adminOpenAccess === false);
      setAdminUsernameInput(data.adminUsername || '');
      setAdminPathInput(data.adminPath || 'admin');
      setBulkProductId((prev) => prev || data.products[0]?.id || '');
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to load vault.';
      if (message.toLowerCase().includes('session') || message.toLowerCase().includes('auth')) {
        onAdminTokenChange(null);
      } else {
        setFeedback({ type: 'error', text: message });
      }
    }
  }, [adminToken, hasAccess, onAdminTokenChange]);

  useEffect(() => {
    if (hasAccess) {
      loadOverview();
    }
  }, [hasAccess, loadOverview]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError(null);
    if (authStatus?.hasUsername && !usernameInput.trim()) {
      setAuthError('Enter your admin username.');
      return;
    }
    setIsAuthenticating(true);
    try {
      const { token, authStatus: nextStatus } = await loginAdmin({
        username: usernameInput.trim() || undefined,
        password: passwordInput,
      });
      setPasswordInput('');
      setAuthStatus(nextStatus);
      onAdminTokenChange(token);
    } catch (err) {
      setAuthError(err instanceof Error ? err.message : 'Invalid username or password.');
    } finally {
      setIsAuthenticating(false);
    }
  };

  const handleLogout = async () => {
    if (adminToken) {
      await logoutAdmin(adminToken);
    }
    onAdminTokenChange(null);
    setOverview(null);
  };

  const bookMap = useMemo(() => {
    const map = new Map<string, string>();
    for (const b of overview?.products || []) {
      map.set(b.id, b.title);
    }
    return map;
  }, [overview?.products]);

  const filteredCodes = useMemo(() => {
    if (!overview) return [];
    const q = searchQuery.trim().toLowerCase();
    return overview.codes.filter((c) => {
      if (statusFilter === 'unused' && c.used) return false;
      if (statusFilter === 'used' && !c.used) return false;
      if (bookFilter !== 'all' && c.productId !== bookFilter) return false;
      if (q) {
        const hay = `${c.id} ${c.code} ${c.orderId || ''} ${c.txid || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
  }, [overview, statusFilter, bookFilter, searchQuery]);

  const handleBulkAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasAccess || !bulkProductId) return;
    setFeedback(null);
    const lines = bulkCodesText
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    if (lines.length === 0) {
      setFeedback({ type: 'error', text: 'Paste at least one code (one per line).' });
      return;
    }

    setIsAddingCodes(true);
    try {
      const result = await addAdminCodes(adminToken, bulkProductId, lines);
      setBulkCodesText('');
      setFeedback({
        type: 'success',
        text: `Appended ${result.addedCount} unused code${result.addedCount === 1 ? '' : 's'} to codes.json${
          result.skippedDuplicates > 0 ? ` (${result.skippedDuplicates} duplicate skipped)` : ''
        }.`,
      });
      await loadOverview();
      onCatalogMutated();
    } catch (err) {
      setFeedback({ type: 'error', text: err instanceof Error ? err.message : 'Failed to add codes.' });
    } finally {
      setIsAddingCodes(false);
    }
  };

  const handleCoverFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !hasAccess) return;
    setFeedback(null);
    setIsUploadingCover(true);
    try {
      const { coverUrl } = await uploadAdminCover(adminToken, file);
      setBookCover(coverUrl);
      setBookCoverFilename(file.name);
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Cover upload failed.',
      });
    } finally {
      setIsUploadingCover(false);
      if (coverInputRef.current) {
        coverInputRef.current.value = '';
      }
    }
  };

  const handleCreateBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasAccess) return;
    setFeedback(null);
    const parsedPrice = Number.parseFloat(bookPrice);
    if (
      !bookTitle.trim() ||
      !bookWriter.trim() ||
      !bookPublication.trim() ||
      !Number.isFinite(parsedPrice) ||
      parsedPrice <= 0
    ) {
      setFeedback({
        type: 'error',
        text: 'Fill in Book Title, Writer, Publication, and a valid USD price.',
      });
      return;
    }
    if (!bookCover) {
      setFeedback({
        type: 'error',
        text: 'Please upload an A4 cover image before adding the book.',
      });
      return;
    }

    setIsCreatingBook(true);
    try {
      await createAdminBook(adminToken, {
        title: bookTitle.trim(),
        subject: bookSubject.trim(),
        description: bookDescription.trim(),
        writer: bookWriter.trim(),
        translator: bookTranslator.trim() || 'Original Edition',
        publication: bookPublication.trim(),
        priceUsd: parsedPrice,
        coverUrl: bookCover,
      });
      setBookTitle('');
      setBookSubject('');
      setBookDescription('');
      setBookWriter('');
      setBookTranslator('');
      setBookPublication('');
      setBookCover('');
      setBookCoverFilename('');
      setFeedback({
        type: 'success',
        text: 'Book added to codes.json. Import unused digital codes for it on the left.',
      });
      await loadOverview();
      onCatalogMutated();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Could not add book.',
      });
    } finally {
      setIsCreatingBook(false);
    }
  };

  const startEditingBook = (book: AdminBookRecord) => {
    setFeedback(null);
    setConfirmDeleteBookId(null);
    setEditingBookId(book.id);
    setEditTitle(book.title);
    setEditSubject(book.subject || '');
    setEditDescription(book.description || '');
    setEditWriter(book.writer);
    setEditTranslator(book.translator);
    setEditPublication(book.publication);
    setEditPrice(book.priceUsd.toFixed(2));
    setEditCover(book.coverUrl);
  };

  const cancelEditingBook = () => {
    setEditingBookId(null);
    setEditTitle('');
    setEditSubject('');
    setEditDescription('');
    setEditWriter('');
    setEditTranslator('');
    setEditPublication('');
    setEditPrice('');
    setEditCover('');
  };

  const handleEditCoverFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !hasAccess) return;
    setFeedback(null);
    setIsUploadingEditCover(true);
    try {
      const { coverUrl } = await uploadAdminCover(adminToken, file);
      setEditCover(coverUrl);
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Cover upload failed.',
      });
    } finally {
      setIsUploadingEditCover(false);
      if (editCoverInputRef.current) {
        editCoverInputRef.current.value = '';
      }
    }
  };

  const handleSaveBookEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasAccess || !editingBookId) return;
    setFeedback(null);
    const parsedPrice = Number.parseFloat(editPrice);
    if (
      !editTitle.trim() ||
      !editWriter.trim() ||
      !editPublication.trim() ||
      !Number.isFinite(parsedPrice) ||
      parsedPrice <= 0
    ) {
      setFeedback({
        type: 'error',
        text: 'Fill in Book Title, Writer, Publication, and a valid USD price.',
      });
      return;
    }

    setIsSavingEdit(true);
    try {
      await updateAdminBook(adminToken, editingBookId, {
        title: editTitle.trim(),
        subject: editSubject.trim(),
        description: editDescription.trim(),
        writer: editWriter.trim(),
        translator: editTranslator.trim() || 'Original Edition',
        publication: editPublication.trim(),
        priceUsd: parsedPrice,
        coverUrl: editCover,
      });
      cancelEditingBook();
      setFeedback({ type: 'success', text: 'Book details updated in codes.json.' });
      await loadOverview();
      onCatalogMutated();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Could not update book.',
      });
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteBook = async (book: AdminBookRecord) => {
    if (!hasAccess) return;
    setFeedback(null);
    setIsDeletingBookId(book.id);
    try {
      const result = await deleteAdminBook(adminToken, book.id);
      if (editingBookId === book.id) {
        cancelEditingBook();
      }
      setConfirmDeleteBookId(null);
      if (bulkProductId === book.id) {
        setBulkProductId('');
      }
      setFeedback({
        type: 'success',
        text: `Removed "${book.title}" from catalog${
          result.removedUnusedCodes > 0
            ? ` along with ${result.removedUnusedCodes} unused code${
                result.removedUnusedCodes === 1 ? '' : 's'
              }`
            : ''
        }.`,
      });
      await loadOverview();
      onCatalogMutated();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Could not remove book.',
      });
    } finally {
      setIsDeletingBookId(null);
    }
  };

  const handleDeleteCode = async (codeId: string) => {
    if (!hasAccess) return;
    setFeedback(null);
    try {
      await deleteAdminCode(adminToken, codeId);
      setFeedback({ type: 'success', text: `Removed unused code ${codeId} from codes.json.` });
      await loadOverview();
      onCatalogMutated();
    } catch (err) {
      setFeedback({ type: 'error', text: err instanceof Error ? err.message : 'Delete failed.' });
    }
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasAccess) return;
    setFeedback(null);
    setIsSavingSettings(true);
    try {
      await updateAdminSettings(adminToken, {
        receivingAddress: receivingAddress.trim(),
        network,
        minConfirmations: Number.parseInt(minConfirmations, 10) || 1,
        allowSandbox,
        autoDownloadReceipt,
      });
      setFeedback({ type: 'success', text: 'Litecoin settlement configuration updated.' });
      await loadOverview();
    } catch (err) {
      setFeedback({ type: 'error', text: err instanceof Error ? err.message : 'Save failed.' });
    } finally {
      setIsSavingSettings(false);
    }
  };

  const handleSaveQuoteSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasAccess) return;
    setFeedback(null);

    const parsedExpiry = Number.parseInt(orderExpiryMinutes, 10);
    const parsedManualRate = Number.parseFloat(manualLtcRateUsd);
    const parsedSpread = Number.parseFloat(quoteSpreadPercent);
    const parsedCache = Number.parseInt(quoteCacheSeconds, 10);

    if (!Number.isFinite(parsedExpiry) || parsedExpiry < 5 || parsedExpiry > 120) {
      setFeedback({ type: 'error', text: 'Order expiry window must be between 5 and 120 minutes.' });
      return;
    }
    if (!Number.isFinite(parsedManualRate) || parsedManualRate < 1 || parsedManualRate > 100000) {
      setFeedback({ type: 'error', text: 'Manual LTC/USD rate must be between $1 and $100,000.' });
      return;
    }
    if (!Number.isFinite(parsedSpread) || parsedSpread < 0 || parsedSpread > 25) {
      setFeedback({ type: 'error', text: 'Quote volatility buffer must be between 0% and 25%.' });
      return;
    }
    if (!Number.isFinite(parsedCache) || parsedCache < 15 || parsedCache > 600) {
      setFeedback({
        type: 'error',
        text: 'Spot rate cache interval must be between 15 and 600 seconds.',
      });
      return;
    }

    setIsSavingQuoteSettings(true);
    try {
      await updateAdminSettings(adminToken, {
        orderExpiryMinutes: parsedExpiry,
        ltcRateMode,
        manualLtcRateUsd: parsedManualRate,
        quoteSpreadPercent: parsedSpread,
        quoteCacheSeconds: parsedCache,
      });
      setFeedback({
        type: 'success',
        text: 'Order expiry and LTC quote settings saved and applied to new orders.',
      });
      await loadOverview();
      onCatalogMutated();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Could not save quote settings.',
      });
    } finally {
      setIsSavingQuoteSettings(false);
    }
  };

  const handleGenerateWebhookSecret = () => {
    const bytes = new Uint8Array(32);
    window.crypto.getRandomValues(bytes);
    const hex = Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
    setWebhookSecretInput(hex);
    setShowWebhookSecret(true);
  };

  const handleSaveWebhookSecret = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasAccess) return;
    const trimmed = webhookSecretInput.trim();
    if (!trimmed) {
      setFeedback({
        type: 'error',
        text: 'Enter or generate a webhook signing secret before saving.',
      });
      return;
    }
    setFeedback(null);
    setIsSavingWebhookSecret(true);
    try {
      await updateAdminSettings(adminToken, { webhookSecret: trimmed });
      setWebhookSecretInput('');
      setShowWebhookSecret(false);
      setFeedback({
        type: 'success',
        text: 'Webhook signing secret saved in Settings.',
      });
      await loadOverview();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Could not save webhook secret.',
      });
    } finally {
      setIsSavingWebhookSecret(false);
    }
  };

  const handleClearWebhookSecret = async () => {
    if (!hasAccess) return;
    setFeedback(null);
    setIsSavingWebhookSecret(true);
    try {
      await updateAdminSettings(adminToken, { clearWebhookSecret: true });
      setWebhookSecretInput('');
      setFeedback({ type: 'success', text: 'Webhook signing secret removed.' });
      await loadOverview();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Could not remove webhook secret.',
      });
    } finally {
      setIsSavingWebhookSecret(false);
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

  const handleCopyAdminUrl = async () => {
    const clean = normalizeAdminPathInput(adminPathInput) || 'admin';
    try {
      await navigator.clipboard.writeText(`${window.location.origin}/${clean}`);
      setCopiedAdminUrl(true);
      window.setTimeout(() => setCopiedAdminUrl(false), 2000);
    } catch {
      // ignore clipboard errors
    }
  };

  const handleSaveSecurity = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!hasAccess) return;
    setFeedback(null);

    const cleanAdminPath = normalizeAdminPathInput(adminPathInput);
    if (!/^[a-z0-9][a-z0-9_-]{2,47}$/.test(cleanAdminPath)) {
      setFeedback({
        type: 'error',
        text: 'Secret Admin URL path must be 3–48 lowercase letters, numbers, dashes, or underscores.',
      });
      return;
    }

    const isManagedByEnv = Boolean(authStatus?.managedByEnv);
    const trimmedUser = adminUsernameInput.trim();
    const trimmedPw = newAdminPasscode.trim();

    if (!isManagedByEnv) {
      if (trimmedUser && !/^[a-zA-Z0-9._-]{3,32}$/.test(trimmedUser)) {
        setFeedback({
          type: 'error',
          text: 'Username must be 3–32 characters using letters, numbers, dots, dashes, or underscores.',
        });
        return;
      }
      if (trimmedPw.length > 0) {
        if (trimmedPw.length < 8) {
          setFeedback({ type: 'error', text: 'Admin password must be at least 8 characters.' });
          return;
        }
        if (trimmedPw !== confirmAdminPasscode.trim()) {
          setFeedback({ type: 'error', text: 'Passwords do not match.' });
          return;
        }
      } else if (requirePasscode && !overview?.hasAdminPasscode) {
        setFeedback({
          type: 'error',
          text: 'Enter a password (at least 8 characters) before locking Admin Vault.',
        });
        return;
      }
    }

    const previousPath = overview?.adminPath || 'admin';

    setIsSavingSecurity(true);
    try {
      const result = await updateAdminSecurity(
        adminToken,
        isManagedByEnv
          ? { adminPath: cleanAdminPath }
          : {
              username: trimmedUser || undefined,
              password: trimmedPw || undefined,
              requirePasscode,
              adminPath: cleanAdminPath,
            }
      );
      if (result.token) {
        onAdminTokenChange(result.token);
      }
      const savedPath = result.adminPath || cleanAdminPath;
      setAuthStatus(result.authStatus);
      setRequirePasscode(!result.authStatus.debugOpenAccess);
      setAdminUsernameInput(result.adminUsername || trimmedUser);
      setAdminPathInput(savedPath);
      onAdminPathChanged?.(savedPath);
      setNewAdminPasscode('');
      setConfirmAdminPasscode('');

      const pathChangedNote =
        savedPath !== previousPath
          ? ` Bookmark your new Admin URL: ${window.location.origin}/${savedPath}`
          : '';

      setFeedback({
        type: 'success',
        text: isManagedByEnv
          ? `Secret Admin URL updated to /${savedPath}.${pathChangedNote}`
          : `${
              trimmedPw
                ? requirePasscode
                  ? 'Admin credentials updated and Admin Vault locked.'
                  : 'Admin credentials saved.'
                : requirePasscode
                  ? 'Admin Vault access settings saved.'
                  : 'Admin Vault open access enabled for local testing.'
            }${pathChangedNote}`,
      });
      await loadOverview();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Could not update security settings.',
      });
    } finally {
      setIsSavingSecurity(false);
    }
  };

  const handleManualConfirmOrder = async (orderId: string) => {
    if (!hasAccess) return;
    setFeedback(null);
    try {
      await adminConfirmOrder(adminToken, orderId);
      setFeedback({
        type: 'success',
        text: `Order ${orderId} confirmed and assigned code marked used in codes.json.`,
      });
      await loadOverview();
      onCatalogMutated();
    } catch (err) {
      setFeedback({ type: 'error', text: err instanceof Error ? err.message : 'Action failed.' });
    }
  };

  const handleQuickResumeStore = async () => {
    if (!hasAccess || !overview) return;
    setFeedback(null);
    setIsResumingStore(true);
    try {
      const { preferences } = await updateAdminPreferences(adminToken, {
        ...overview.settings.preferences,
        maintenanceMode: false,
      });
      setOverview((prev) =>
        prev
          ? {
              ...prev,
              settings: {
                ...prev.settings,
                preferences,
              },
            }
          : prev
      );
      setFeedback({
        type: 'success',
        text: 'Store resumed — new Litecoin checkouts are now live again.',
      });
      onCatalogMutated();
    } catch (err) {
      setFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Could not resume storefront.',
      });
    } finally {
      setIsResumingStore(false);
    }
  };

  const existingSubjects = useMemo(() => {
    if (!overview) return [];
    const seen = new Set<string>();
    for (const book of overview.products) {
      const clean = (book.subject || '').trim();
      if (clean) seen.add(clean);
    }
    return Array.from(seen).sort((a, b) => a.localeCompare(b));
  }, [overview]);

  const webhookSnippet = `curl -X POST "${window.location.origin}/api/webhooks/ltc" \\
  -H "Content-Type: application/json" \\
  -H "X-Webhook-Signature: <hmac_sha256_hex_of_body>" \\
  -d '{"orderId":"SK-XXXXXXXX","txid":"<64_char_litecoin_txid>"}'`;

  if (!authStatus) {
    return (
      <main className="max-w-6xl mx-auto px-6 py-16 text-sm text-[#6B655E]">
        Loading Admin Vault...
      </main>
    );
  }

  const shouldLaunchFirstTimeSetup =
    showSetupWizard ||
    authStatus.needsSetup ||
    (!authStatus.setupCompleted && hasAccess);

  if (shouldLaunchFirstTimeSetup) {
    return (
      <FirstTimeSetupWizard
        authStatus={authStatus}
        adminToken={adminToken}
        initialOverview={overview}
        isRerunMode={Boolean(authStatus.setupCompleted && showSetupWizard)}
        onAdminTokenChange={onAdminTokenChange}
        onAuthStatusChange={setAuthStatus}
        onCatalogMutated={onCatalogMutated}
        onAdminPathChanged={onAdminPathChanged}
        onComplete={(message) => {
          setShowSetupWizard(false);
          if (message) {
            setFeedback({ type: 'success', text: message });
          }
          void loadOverview();
        }}
      />
    );
  }

  if (!hasAccess) {
    return (
      <main className="max-w-md mx-auto px-6 py-16">
        <div className="bg-white border border-[#E6E2DA] rounded-2xl p-8 space-y-6">
          <div className="space-y-2">
            <div className="w-10 h-10 rounded-lg bg-[#F2EFE9] flex items-center justify-center text-[#181614]">
              <Lock className="w-5 h-5" />
            </div>
            <h1 className="font-titr text-2xl font-bold text-[#181614]">Admin Vault Sign In</h1>
            <p className="text-sm text-[#6B655E] leading-relaxed">
              Sign in with your admin credentials to manage books, codes.json inventory, and
              Litecoin settlement settings.
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            {authStatus.hasUsername && (
              <div className="space-y-1.5">
                <label
                  htmlFor="admin-login-username"
                  className="block text-xs font-medium text-[#6B655E]"
                >
                  Admin Username
                </label>
                <input
                  id="admin-login-username"
                  type="text"
                  dir="ltr"
                  value={usernameInput}
                  onChange={(e) => setUsernameInput(e.target.value)}
                  autoComplete="username"
                  placeholder="Enter username"
                  className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#DBD5CA] rounded-lg focus:outline-none focus:border-[#1E40AF]"
                />
              </div>
            )}

            <div className="space-y-1.5">
              <label htmlFor="admin-login-pw" className="block text-xs font-medium text-[#6B655E]">
                Admin Password
              </label>
              <input
                id="admin-login-pw"
                type="password"
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                autoComplete="current-password"
                placeholder="Enter password"
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#DBD5CA] rounded-lg focus:outline-none focus:border-[#1E40AF]"
              />
            </div>

            {authError && (
              <div className="flex items-start gap-2 text-xs text-[#B91C1C]">
                <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
                <span>{authError}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={isAuthenticating}
              className="w-full py-2.5 px-4 text-sm font-medium text-white bg-[#181614] hover:bg-[#1E40AF] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              {isAuthenticating ? 'Verifying...' : 'Unlock Admin Vault'}
            </button>
          </form>
        </div>
      </main>
    );
  }

  return (
    <main className="max-w-6xl mx-auto px-6 py-10 space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-titr text-3xl font-bold text-[#181614]">
            Admin Vault &amp; codes.json
          </h1>
          <p className="text-sm text-[#6B655E] mt-1">
            Manage books, inspect live <span className="font-mono text-[#181614]">used</span>{' '}
            statuses, and configure Litecoin settlement.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowSetupWizard(true)}
            className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-[#181614] hover:bg-[#EFECE6] bg-white border border-[#E6E2DA] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <BookOpenCheck className="w-3.5 h-3.5 text-[#1E40AF]" />
            <span>Guided Setup</span>
          </button>

          {adminToken && (
            <button
              type="button"
              onClick={handleLogout}
              className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-[#6B655E] hover:text-[#181614] bg-white border border-[#E6E2DA] rounded-lg transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Lock</span>
            </button>
          )}
        </div>
      </div>

      {overview?.settings.preferences.maintenanceMode && (
        <div className="px-4 py-3.5 rounded-xl border border-[#FCD34D] bg-[#FFFBEB] text-[#92400E] flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-start gap-2.5 min-w-0">
            <PauseCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#B45309]" />
            <div className="text-xs leading-relaxed">
              <strong className="text-[#78350F]">
                Store Pause / Maintenance Mode is active.
              </strong>{' '}
              New Litecoin checkouts are blocked while Order Lookup stays open for existing buyers.
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => setActiveTab('preferences')}
              className="px-3 py-1.5 text-xs font-medium text-[#78350F] bg-white hover:bg-[#FEF3C7] border border-[#FCD34D] rounded-lg transition-colors cursor-pointer"
            >
              Edit Notice
            </button>
            <button
              type="button"
              disabled={isResumingStore}
              onClick={handleQuickResumeStore}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-[#047857] hover:bg-[#065F46] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              <PlayCircle className="w-3.5 h-3.5" />
              <span>{isResumingStore ? 'Resuming...' : 'Resume Store'}</span>
            </button>
          </div>
        </div>
      )}

      {feedback && (
        <div
          className={`px-4 py-3 rounded-lg border text-sm flex items-center justify-between gap-4 ${
            feedback.type === 'success'
              ? 'bg-[#F0FDF9] border-[#99F6E4] text-[#115E59]'
              : 'bg-[#FEF2F2] border-[#FECACA] text-[#991B1B]'
          }`}
        >
          <div className="flex items-center gap-2">
            {feedback.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0" />
            )}
            <span>{feedback.text}</span>
          </div>
          <button
            type="button"
            onClick={() => setFeedback(null)}
            className="text-xs font-medium underline cursor-pointer"
          >
            Dismiss
          </button>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-1 p-1 bg-[#EFECE6] rounded-lg w-fit">
        {(
          [
            ['overview', 'Overview'],
            ['inventory', 'codes.json Inventory'],
            ['add', 'Manage Books & Codes'],
            ['orders', 'Orders'],
            ['promos', 'Promo Codes'],
            ['preferences', 'Preferences'],
            ['settings', 'Settings'],
          ] as Array<[AdminTab, string]>
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            onClick={() => setActiveTab(key)}
            className={`px-4 py-2 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === key
                ? 'bg-white text-[#181614] shadow-xs'
                : 'text-[#6B655E] hover:text-[#181614]'
            }`}
          >
            {label}
          </button>
        ))}
      </div>

      {/* TAB 0: OVERVIEW */}
      {activeTab === 'overview' && overview && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 lg:grid-cols-4 bg-white border border-[#E6E2DA] rounded-xl divide-y lg:divide-y-0 lg:divide-x divide-[#E6E2DA]">
            <div className="p-5">
              <div className="text-xs text-[#6B655E] mb-1">Unused Book Codes</div>
              <div className="font-mono text-2xl font-semibold text-[#0F766E] tabular-nums">
                {overview.stats.availableCodes}
              </div>
              <div className="text-xs text-[#857E75] mt-1 tabular-nums">
                of {overview.stats.totalCodes} total
              </div>
            </div>

            <div className="p-5">
              <div className="text-xs text-[#6B655E] mb-1">Used (Delivered)</div>
              <div className="font-mono text-2xl font-semibold text-[#181614] tabular-nums">
                {overview.stats.usedCodes}
              </div>
              <div className="text-xs text-[#857E75] mt-1 tabular-nums">
                {overview.stats.confirmedOrderCount} verified orders
              </div>
            </div>

            <div className="p-5">
              <div className="text-xs text-[#6B655E] mb-1">LTC Settled</div>
              <div className="font-mono text-2xl font-semibold text-[#1E40AF] tabular-nums">
                {overview.stats.totalLtcSettled.toFixed(5)} LTC
              </div>
              <div className="text-xs text-[#857E75] mt-1 tabular-nums">
                ${overview.stats.totalUsdSettled.toFixed(2)} USD
              </div>
            </div>

            <div className="p-5">
              <div className="text-xs text-[#6B655E] mb-1">Active Checkouts</div>
              <div className="font-mono text-2xl font-semibold text-[#181614] tabular-nums">
                {overview.stats.pendingOrderCount}
              </div>
              <div className="text-xs text-[#857E75] mt-1">
                {overview.settings.network} · {overview.settings.minConfirmations} conf
              </div>
            </div>
          </div>

          <SalesPerDayChart dailySales={overview.dailySales ?? []} />
        </div>
      )}

      {/* TAB 1: INVENTORY */}
      {activeTab === 'inventory' && overview && (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3">
              <div className="flex items-center gap-1 p-1 bg-[#EFECE6] rounded-lg">
                {(['all', 'unused', 'used'] as const).map((status) => (
                  <button
                    key={status}
                    type="button"
                    onClick={() => setStatusFilter(status)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors cursor-pointer ${
                      statusFilter === status
                        ? 'bg-white text-[#181614]'
                        : 'text-[#6B655E] hover:text-[#181614]'
                    }`}
                  >
                    {status === 'all' ? 'All' : status === 'unused' ? 'Unused (false)' : 'Used (true)'}
                  </button>
                ))}
              </div>

              <select
                value={bookFilter}
                onChange={(e) => setBookFilter(e.target.value)}
                aria-label="Filter by book"
                className="px-3 py-2 text-xs bg-white border border-[#DBD5CA] rounded-lg text-[#181614]"
              >
                <option value="all">All Books</option>
                {overview.products.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title}
                  </option>
                ))}
              </select>

              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search code, order ID, TXID..."
                className="px-3 py-2 text-xs bg-white border border-[#DBD5CA] rounded-lg text-[#181614] w-56"
              />
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowRawCodes((v) => !v)}
                className="inline-flex items-center gap-1.5 text-xs font-medium text-[#6B655E] hover:text-[#181614] cursor-pointer"
              >
                {showRawCodes ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                <span>{showRawCodes ? 'Mask Codes' : 'Reveal Codes'}</span>
              </button>

              <button
                type="button"
                onClick={() => setShowJsonInspector((v) => !v)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#1E40AF] bg-white border border-[#DBD5CA] rounded-lg hover:bg-[#FAF9F6] cursor-pointer"
              >
                <FileJson className="w-3.5 h-3.5" />
                <span>{showJsonInspector ? 'Hide Raw JSON' : 'Inspect Raw JSON'}</span>
              </button>
            </div>
          </div>

          {showJsonInspector && (
            <div className="bg-[#181614] text-[#F5F2EC] rounded-xl p-5 overflow-x-auto max-h-96 overflow-y-auto">
              <div className="text-xs font-mono text-[#A8A095] mb-2">
                data/codes.json (live snapshot)
              </div>
              <pre className="text-xs font-mono leading-relaxed">
                {JSON.stringify({ books: overview.products.length, codes: filteredCodes }, null, 2)}
              </pre>
            </div>
          )}

          <div className="bg-white border border-[#E6E2DA] rounded-xl overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-sm">
                <thead>
                  <tr className="border-b border-[#E6E2DA] bg-[#FAF9F6] text-xs font-medium text-[#6B655E]">
                    <th className="py-3 px-4">Code ID</th>
                    <th className="py-3 px-4">Book</th>
                    <th className="py-3 px-4">Digital Code</th>
                    <th className="py-3 px-4">used Status</th>
                    <th className="py-3 px-4">Order &amp; TXID</th>
                    <th className="py-3 px-4 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#EFECE6]">
                  {filteredCodes.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-10 text-center text-sm text-[#6B655E]">
                        No digital codes match the current filters.
                      </td>
                    </tr>
                  ) : (
                    filteredCodes.map((rec) => (
                      <tr key={rec.id} className="hover:bg-[#FAF9F6]/70">
                        <td className="py-3 px-4 font-mono text-xs text-[#6B655E] whitespace-nowrap">
                          {rec.id}
                        </td>
                        <td dir="auto" className="py-3 px-4 text-xs font-medium text-[#181614]">
                          {bookMap.get(rec.productId) || rec.productId}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-[#181614] whitespace-nowrap">
                          {showRawCodes ? rec.code : `${rec.code.slice(0, 5)}••••••••••`}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {rec.used ? (
                            <span className="inline-flex items-center gap-1.5 text-xs font-mono font-medium text-[#6B655E]">
                              <CheckCircle2 className="w-3.5 h-3.5 text-[#0F766E]" />
                              used: true
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 text-xs font-mono font-medium text-[#0F766E]">
                              <ShieldCheck className="w-3.5 h-3.5" />
                              used: false
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 font-mono text-xs text-[#6B655E]">
                          {rec.orderId ? (
                            <div className="space-y-0.5">
                              <div className="text-[#181614]">{rec.orderId}</div>
                              {rec.txid && (
                                <div className="truncate max-w-[180px]" title={rec.txid}>
                                  {rec.txid}
                                </div>
                              )}
                            </div>
                          ) : (
                            <span>—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {!rec.used ? (
                            <button
                              type="button"
                              onClick={() => handleDeleteCode(rec.id)}
                              className="inline-flex items-center gap-1 text-xs text-[#6B655E] hover:text-[#B91C1C] cursor-pointer"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Remove</span>
                            </button>
                          ) : (
                            <span className="text-xs text-[#A8A095]">Locked</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MANAGE BOOKS & IMPORT CODES */}
      {activeTab === 'add' && overview && (
        <div className="space-y-8">
          {/* Current Books List (Edit / Remove) */}
          <div className="bg-white border border-[#E6E2DA] rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-[#E6E2DA] bg-[#FAF9F6] flex items-center justify-between gap-4">
              <div>
                <h2 className="font-titr text-xl font-bold text-[#181614]">
                  Current Books ({overview.products.length})
                </h2>
                <p className="text-xs text-[#6B655E] mt-0.5">
                  Edit title, subject, writer, translator, publication, price, or A4 cover, or
                  remove books from the storefront.
                </p>
              </div>
              <datalist id="book-subject-suggestions">
                {existingSubjects.map((subject) => (
                  <option key={subject} value={subject} />
                ))}
              </datalist>
              <input
                ref={editCoverInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleEditCoverFileChange}
                className="hidden"
              />
            </div>

            {overview.products.length === 0 ? (
              <div className="p-8 text-center text-sm text-[#6B655E]">
                No books in catalog yet. Use the form below to add your first book.
              </div>
            ) : (
              <ul className="divide-y divide-[#EFECE6]">
                {overview.products.map((book) => {
                  const bookCodes = overview.codes.filter((c) => c.productId === book.id);
                  const unusedCount = bookCodes.filter((c) => !c.used).length;
                  const usedCount = bookCodes.filter((c) => c.used).length;
                  const isEditing = editingBookId === book.id;
                  const isConfirmingDelete = confirmDeleteBookId === book.id;

                  return (
                    <li key={book.id} className="p-5 sm:px-6">
                      {isEditing ? (
                        <form onSubmit={handleSaveBookEdit} className="space-y-4">
                          <div className="flex flex-col sm:flex-row items-start gap-5">
                            <div className="flex flex-col items-center gap-2 shrink-0">
                              <img
                                src={editCover}
                                alt={editTitle}
                                referrerPolicy="no-referrer"
                                className="w-20 aspect-[210/297] object-cover rounded-lg border border-[#DBD5CA] bg-[#F2EFE9]"
                              />
                              <button
                                type="button"
                                disabled={isUploadingEditCover}
                                onClick={() => editCoverInputRef.current?.click()}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-[#181614] bg-[#FAF9F6] hover:bg-[#EFECE6] border border-[#DBD5CA] rounded-md cursor-pointer disabled:opacity-50"
                              >
                                <Upload className="w-3 h-3" />
                                <span>{isUploadingEditCover ? 'Uploading...' : 'Change Cover'}</span>
                              </button>
                            </div>

                            <div className="flex-1 w-full space-y-3">
                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="space-y-1">
                                  <label className="block text-xs font-medium text-[#6B655E]">
                                    Book Title
                                  </label>
                                  <input
                                    type="text"
                                    dir="auto"
                                    value={editTitle}
                                    onChange={(e) => setEditTitle(e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-[#DBD5CA] rounded-lg"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="block text-xs font-medium text-[#6B655E]">
                                    Subject / Category <span className="text-[#9E978E]">(optional)</span>
                                  </label>
                                  <input
                                    type="text"
                                    dir="auto"
                                    maxLength={60}
                                    list="book-subject-suggestions"
                                    value={editSubject}
                                    onChange={(e) => setEditSubject(e.target.value)}
                                    placeholder="e.g. Classic Fiction"
                                    className="w-full px-3 py-2 text-sm border border-[#DBD5CA] rounded-lg"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="block text-xs font-medium text-[#6B655E]">
                                    Price (USD)
                                  </label>
                                  <input
                                    type="number"
                                    step="0.01"
                                    min="1"
                                    value={editPrice}
                                    onChange={(e) => setEditPrice(e.target.value)}
                                    className="w-full px-3 py-2 text-sm font-mono border border-[#DBD5CA] rounded-lg"
                                  />
                                </div>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                <div className="space-y-1">
                                  <label className="block text-xs font-medium text-[#6B655E]">
                                    Book Writer
                                  </label>
                                  <input
                                    type="text"
                                    dir="auto"
                                    value={editWriter}
                                    onChange={(e) => setEditWriter(e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-[#DBD5CA] rounded-lg"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="block text-xs font-medium text-[#6B655E]">
                                    Book Translator
                                  </label>
                                  <input
                                    type="text"
                                    dir="auto"
                                    value={editTranslator}
                                    onChange={(e) => setEditTranslator(e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-[#DBD5CA] rounded-lg"
                                  />
                                </div>
                                <div className="space-y-1">
                                  <label className="block text-xs font-medium text-[#6B655E]">
                                    Publication
                                  </label>
                                  <input
                                    type="text"
                                    dir="auto"
                                    value={editPublication}
                                    onChange={(e) => setEditPublication(e.target.value)}
                                    className="w-full px-3 py-2 text-sm border border-[#DBD5CA] rounded-lg"
                                  />
                                </div>
                              </div>

                              <div className="space-y-1">
                                <label className="block text-xs font-medium text-[#6B655E]">
                                  Book Description / Synopsis{' '}
                                  <span className="text-[#9E978E]">(optional, up to 1200 chars)</span>
                                </label>
                                <textarea
                                  rows={3}
                                  dir="auto"
                                  maxLength={1200}
                                  value={editDescription}
                                  onChange={(e) => setEditDescription(e.target.value)}
                                  placeholder="Short back-cover blurb or edition notes..."
                                  className="w-full px-3 py-2 text-sm border border-[#DBD5CA] rounded-lg focus:outline-none focus:border-[#1E40AF]"
                                />
                              </div>

                              <div className="flex items-center gap-2.5 pt-1">
                                <button
                                  type="submit"
                                  disabled={isSavingEdit || isUploadingEditCover}
                                  className="px-4 py-2 text-xs font-medium text-white bg-[#1E40AF] hover:bg-[#1D4ED8] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  {isSavingEdit ? 'Saving...' : 'Save Changes'}
                                </button>
                                <button
                                  type="button"
                                  onClick={cancelEditingBook}
                                  className="px-3.5 py-2 text-xs font-medium text-[#6B655E] hover:text-[#181614] bg-white border border-[#DBD5CA] rounded-lg transition-colors cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </div>
                            </div>
                          </div>
                        </form>
                      ) : (
                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                          <div className="flex items-center gap-4 min-w-0">
                            <img
                              src={book.coverUrl}
                              alt={book.title}
                              referrerPolicy="no-referrer"
                              className="w-12 aspect-[210/297] object-cover rounded border border-[#E6E2DA] bg-[#F2EFE9] shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-2 min-w-0">
                                <div
                                  dir="auto"
                                  className="font-titr text-lg font-bold text-[#181614] truncate"
                                >
                                  {book.title}
                                </div>
                                {book.subject && (
                                  <span
                                    dir="auto"
                                    className="px-2 py-0.5 text-[11px] font-medium text-[#4A453F] bg-[#F3F1EC] border border-[#E6E2DA] rounded-md shrink-0"
                                  >
                                    {book.subject}
                                  </span>
                                )}
                              </div>
                              <div className="text-xs text-[#6B655E] flex flex-wrap items-center gap-x-2 gap-y-0.5 mt-0.5">
                                <span dir="auto">{book.writer}</span>
                                <span aria-hidden="true">·</span>
                                <span dir="auto">Trans. {book.translator}</span>
                                <span aria-hidden="true">·</span>
                                <span dir="auto">{book.publication}</span>
                              </div>
                              <div className="text-xs font-mono text-[#857E75] tabular-nums mt-1">
                                ${book.priceUsd.toFixed(2)} USD · {unusedCount} unused · {usedCount}{' '}
                                used
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2 shrink-0">
                            {isConfirmingDelete ? (
                              <>
                                <button
                                  type="button"
                                  disabled={isDeletingBookId === book.id}
                                  onClick={() => handleDeleteBook(book)}
                                  className="px-3 py-1.5 text-xs font-medium text-white bg-[#B91C1C] hover:bg-[#991B1B] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                                >
                                  {isDeletingBookId === book.id ? 'Removing...' : 'Confirm Remove'}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => setConfirmDeleteBookId(null)}
                                  className="px-3 py-1.5 text-xs font-medium text-[#6B655E] hover:text-[#181614] bg-white border border-[#DBD5CA] rounded-lg transition-colors cursor-pointer"
                                >
                                  Cancel
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  onClick={() => startEditingBook(book)}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#181614] bg-white hover:bg-[#F2EFE9] border border-[#DBD5CA] rounded-lg transition-colors cursor-pointer"
                                >
                                  <Pencil className="w-3.5 h-3.5" />
                                  <span>Edit</span>
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setEditingBookId(null);
                                    setConfirmDeleteBookId(book.id);
                                  }}
                                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#B91C1C] bg-white hover:bg-[#FEF2F2] border border-[#FECACA] rounded-lg transition-colors cursor-pointer"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                  <span>Remove</span>
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
            <form
              onSubmit={handleBulkAdd}
              className="lg:col-span-6 bg-white border border-[#E6E2DA] rounded-xl p-6 space-y-4"
            >
            <div>
              <h2 className="font-titr text-xl font-bold text-[#181614]">
                Bulk Import Book Codes
              </h2>
              <p className="text-xs text-[#6B655E] mt-1">
                Paste one code per line to append with <span className="font-mono">used: false</span>{' '}
                in <span className="font-mono">codes.json</span>.
              </p>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="bulk-book" className="block text-xs font-medium text-[#6B655E]">
                Select Book
              </label>
              <select
                id="bulk-book"
                value={bulkProductId}
                onChange={(e) => setBulkProductId(e.target.value)}
                className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#DBD5CA] rounded-lg text-[#181614]"
              >
                {overview.products.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.title} (${b.priceUsd.toFixed(2)})
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="bulk-codes-area" className="block text-xs font-medium text-[#6B655E]">
                Codes (one per line)
              </label>
              <textarea
                id="bulk-codes-area"
                rows={7}
                value={bulkCodesText}
                onChange={(e) => setBulkCodesText(e.target.value)}
                placeholder={'BKSL-11A2-9F83-4C2E\nBKSL-77B4-3D19-8E5A'}
                className="w-full px-3.5 py-2.5 text-sm font-mono bg-white border border-[#DBD5CA] rounded-lg text-[#181614] placeholder:text-[#A8A095] focus:outline-none focus:border-[#1E40AF]"
              />
            </div>

            <button
              type="submit"
              disabled={isAddingCodes}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[#1E40AF] hover:bg-[#1D4ED8] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>{isAddingCodes ? 'Saving...' : 'Append Codes'}</span>
            </button>
          </form>

          <form
            onSubmit={handleCreateBook}
            className="lg:col-span-6 bg-white border border-[#E6E2DA] rounded-xl p-6 space-y-4"
          >
            <div>
              <h2 className="font-titr text-xl font-bold text-[#181614]">Add New Book</h2>
              <p className="text-xs text-[#6B655E] mt-1">
                Supports both Persian and English titles (rendered in bold B Titr).
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-[#6B655E]">Book Title</label>
                <input
                  type="text"
                  dir="auto"
                  value={bookTitle}
                  onChange={(e) => setBookTitle(e.target.value)}
                  placeholder="e.g. The Blind Owl or بوف کور"
                  className="w-full px-3.5 py-2 text-sm border border-[#DBD5CA] rounded-lg"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-[#6B655E]">
                  Subject / Category <span className="text-[#9E978E]">(optional)</span>
                </label>
                <input
                  type="text"
                  dir="auto"
                  maxLength={60}
                  list="book-subject-suggestions"
                  value={bookSubject}
                  onChange={(e) => setBookSubject(e.target.value)}
                  placeholder="e.g. Classic Fiction, Philosophy, رمان"
                  className="w-full px-3.5 py-2 text-sm border border-[#DBD5CA] rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-[#6B655E]">Book Writer</label>
                <input
                  type="text"
                  dir="auto"
                  value={bookWriter}
                  onChange={(e) => setBookWriter(e.target.value)}
                  placeholder="Author name"
                  className="w-full px-3 py-2 text-sm border border-[#DBD5CA] rounded-lg"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-[#6B655E]">Book Translator</label>
                <input
                  type="text"
                  dir="auto"
                  value={bookTranslator}
                  onChange={(e) => setBookTranslator(e.target.value)}
                  placeholder="Translator name"
                  className="w-full px-3 py-2 text-sm border border-[#DBD5CA] rounded-lg"
                />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-[#6B655E]">Publication</label>
                <input
                  type="text"
                  dir="auto"
                  value={bookPublication}
                  onChange={(e) => setBookPublication(e.target.value)}
                  placeholder="Publisher name"
                  className="w-full px-3 py-2 text-sm border border-[#DBD5CA] rounded-lg"
                />
              </div>
              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-[#6B655E]">Price (USD)</label>
                <input
                  type="number"
                  step="0.01"
                  min="1"
                  value={bookPrice}
                  onChange={(e) => setBookPrice(e.target.value)}
                  className="w-full px-3 py-2 text-sm font-mono border border-[#DBD5CA] rounded-lg"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#6B655E]">
                Book Description / Synopsis{' '}
                <span className="text-[#9E978E]">(optional, up to 1200 chars)</span>
              </label>
              <textarea
                rows={3}
                dir="auto"
                maxLength={1200}
                value={bookDescription}
                onChange={(e) => setBookDescription(e.target.value)}
                placeholder="Short back-cover blurb or edition notes..."
                className="w-full px-3.5 py-2 text-sm border border-[#DBD5CA] rounded-lg focus:outline-none focus:border-[#1E40AF]"
              />
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-medium text-[#6B655E]">
                A4 Cover Artwork
              </label>

              <input
                ref={coverInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleCoverFileChange}
                className="hidden"
              />

              <div className="flex items-start gap-4">
                {bookCover && (
                  <div className="relative w-20 aspect-[210/297] rounded-lg overflow-hidden border border-[#DBD5CA] bg-[#F2EFE9] shrink-0">
                    <img
                      src={bookCover}
                      alt="Uploaded book cover preview"
                      className="w-full h-full object-cover"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setBookCover('');
                        setBookCoverFilename('');
                      }}
                      aria-label="Remove uploaded cover"
                      className="absolute top-1 right-1 p-0.5 bg-[#181614]/80 text-white rounded-md hover:bg-[#181614] cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                )}

                <div className="flex-1 space-y-2">
                  <button
                    type="button"
                    disabled={isUploadingCover}
                    onClick={() => coverInputRef.current?.click()}
                    className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-[#181614] bg-[#FAF9F6] hover:bg-[#EFECE6] border border-[#DBD5CA] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  >
                    <Upload className="w-4 h-4" />
                    <span>
                      {isUploadingCover
                        ? 'Uploading...'
                        : bookCover
                          ? 'Replace Cover Image'
                          : 'Upload Cover Image'}
                    </span>
                  </button>
                  <p className="text-xs text-[#857E75]">
                    {bookCoverFilename
                      ? `Uploaded: ${bookCoverFilename}`
                      : 'JPG, PNG, or WebP up to 5 MB (cropped cleanly to A4 portrait).'}
                  </p>
                </div>
              </div>
            </div>

            <button
              type="submit"
              disabled={isCreatingBook || isUploadingCover}
              className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium text-white bg-[#181614] hover:bg-[#1E40AF] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
            >
              <Plus className="w-4 h-4" />
              <span>{isCreatingBook ? 'Adding Book...' : 'Add Book to Catalog'}</span>
            </button>
          </form>
          </div>
        </div>
      )}

      {/* TAB 3: ORDERS */}
      {activeTab === 'orders' && overview && (
        <div className="bg-white border border-[#E6E2DA] rounded-xl overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-sm">
              <thead>
                <tr className="border-b border-[#E6E2DA] bg-[#FAF9F6] text-xs font-medium text-[#6B655E]">
                  <th className="py-3 px-4">Order ID</th>
                  <th className="py-3 px-4">Book</th>
                  <th className="py-3 px-4">Amount</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Code &amp; Method</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFECE6]">
                {overview.orders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 text-center text-sm text-[#6B655E]">
                      No orders yet.
                    </td>
                  </tr>
                ) : (
                  overview.orders.map((ord) => (
                    <tr key={ord.id} className="hover:bg-[#FAF9F6]/70">
                      <td className="py-3 px-4 font-mono text-xs font-medium text-[#181614]">
                        {ord.id}
                      </td>
                      <td dir="auto" className="py-3 px-4 text-xs text-[#181614]">
                        {ord.bookTitle}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs tabular-nums text-[#181614]">
                        {ord.expectedLtc} LTC
                        <span className="text-[#857E75]"> (${ord.priceUsd.toFixed(2)})</span>
                        {ord.promoCode && (
                          <span className="ml-1.5 inline-block text-[10px] font-semibold text-[#0F766E] bg-[#F0FDF9] border border-[#99F6E4] px-1.5 py-0.5 rounded">
                            {ord.promoCode}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-xs font-medium">
                        {ord.status === 'confirmed' ? (
                          <span className="text-[#0F766E]">Confirmed</span>
                        ) : ord.status === 'pending' ? (
                          <span className="text-[#1E40AF]">Pending LTC</span>
                        ) : ord.status === 'cancelled' ? (
                          <span className="text-[#B91C1C]">Cancelled</span>
                        ) : (
                          <span className="text-[#857E75]">Expired</span>
                        )}
                      </td>
                      <td className="py-3 px-4 font-mono text-xs text-[#6B655E]">
                        {ord.deliveredCodeId
                          ? `${ord.deliveredCodeId} · ${ord.verificationMethod}`
                          : '—'}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        {ord.status === 'pending' ? (
                          <button
                            type="button"
                            onClick={() => handleManualConfirmOrder(ord.id)}
                            className="text-xs font-medium text-[#1E40AF] hover:underline cursor-pointer"
                          >
                            Mark Confirmed
                          </button>
                        ) : (
                          <span className="text-xs text-[#A8A095]">
                            {ord.confirmedAt ? new Date(ord.confirmedAt).toLocaleTimeString() : '—'}
                          </span>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 3B: PROMO CODES */}
      {activeTab === 'promos' && overview && (
        <PromoCodesPanel
          adminToken={adminToken}
          promos={overview.promos || []}
          products={overview.products}
          onMutated={loadOverview}
          onFeedback={setFeedback}
        />
      )}

      {/* TAB 4: PREFERENCES */}
      {activeTab === 'preferences' && overview && (
        <PreferencesPanel
          adminToken={adminToken}
          initialPreferences={overview.settings.preferences}
          onSaved={(nextPreferences) => {
            setOverview((prev) =>
              prev
                ? {
                    ...prev,
                    settings: {
                      ...prev.settings,
                      storefrontLanguage: nextPreferences.language,
                      preferences: nextPreferences,
                    },
                  }
                : prev
            );
            onCatalogMutated();
          }}
          onFeedback={setFeedback}
        />
      )}

      {/* TAB 5: SETTINGS (LTC WALLET, EXPIRY & QUOTE, WEBHOOK & ADMIN SECURITY) */}
      {activeTab === 'settings' && overview && (() => {
        const previewBaseRate =
          ltcRateMode === 'manual'
            ? Number.isFinite(Number.parseFloat(manualLtcRateUsd)) &&
              Number.parseFloat(manualLtcRateUsd) >= 1
              ? Number.parseFloat(manualLtcRateUsd)
              : overview.currentQuote.spotLtcUsd
            : overview.currentQuote.spotLtcUsd;
        const previewSpread =
          Number.isFinite(Number.parseFloat(quoteSpreadPercent)) &&
          Number.parseFloat(quoteSpreadPercent) >= 0 &&
          Number.parseFloat(quoteSpreadPercent) <= 25
            ? Number.parseFloat(quoteSpreadPercent)
            : 0;
        const previewEffectiveRate =
          previewSpread > 0
            ? Number(Math.max(0.01, previewBaseRate / (1 + previewSpread / 100)).toFixed(2))
            : Number(previewBaseRate.toFixed(2));
        const sample10UsdLtc = (10 / previewEffectiveRate).toFixed(5);
        const previewExpiry = Number.parseInt(orderExpiryMinutes, 10) || 20;

        return (
        <div className="space-y-8">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          <div className="lg:col-span-6 space-y-6">
            <form
              onSubmit={handleSaveSettings}
              className="bg-white border border-[#E6E2DA] rounded-xl p-6 space-y-5"
            >
              <div>
                <h2 className="font-titr text-xl font-bold text-[#181614]">
                  Litecoin Settlement Settings
                </h2>
                <p className="text-xs text-[#6B655E] mt-1">
                  Configure your receiving Litecoin address, network, confirmations, and checkout
                  behavior.
                </p>
              </div>

              <div className="space-y-1.5">
                <label className="block text-xs font-medium text-[#6B655E]">
                  Receiving Litecoin Address
                </label>
                <input
                  type="text"
                  value={receivingAddress}
                  onChange={(e) => setReceivingAddress(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-sm font-mono border border-[#DBD5CA] rounded-lg"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-[#6B655E]">Network</label>
                  <select
                    value={network}
                    onChange={(e) => setNetwork(e.target.value === 'testnet' ? 'testnet' : 'mainnet')}
                    className="w-full px-3.5 py-2.5 text-sm bg-white border border-[#DBD5CA] rounded-lg"
                  >
                    <option value="mainnet">Litecoin Mainnet</option>
                    <option value="testnet">Litecoin Testnet</option>
                  </select>
                </div>

                <div className="space-y-1.5">
                  <label className="block text-xs font-medium text-[#6B655E]">
                    Minimum Confirmations
                  </label>
                  <input
                    type="number"
                    min="0"
                    max="12"
                    value={minConfirmations}
                    onChange={(e) => setMinConfirmations(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-sm font-mono border border-[#DBD5CA] rounded-lg"
                  />
                </div>
              </div>

              <label className="flex items-start gap-3 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={allowSandbox}
                  disabled={overview.sandboxLockedOffByEnv}
                  onChange={(e) => setAllowSandbox(e.target.checked)}
                  className="mt-1 rounded border-[#DBD5CA]"
                />
                <span className="text-xs text-[#6B655E] leading-relaxed">
                  <strong className="text-[#181614] block">
                    Allow Sandbox Payment Simulation
                  </strong>
                  Turn off in production so only verified on-chain LTC transactions or signed webhooks
                  unlock book codes.
                </span>
              </label>

              <label className="flex items-start gap-3 pt-1 cursor-pointer">
                <input
                  type="checkbox"
                  checked={autoDownloadReceipt}
                  onChange={(e) => setAutoDownloadReceipt(e.target.checked)}
                  className="mt-1 rounded border-[#DBD5CA]"
                />
                <span className="text-xs text-[#6B655E] leading-relaxed">
                  <strong className="text-[#181614] block">
                    Auto-Download Receipt on Confirmation
                  </strong>
                  Automatically download the receipt file to the buyer&apos;s device as soon as a
                  Litecoin transaction is confirmed.
                </span>
              </label>

              <button
                type="submit"
                disabled={isSavingSettings}
                className="px-4 py-2.5 text-sm font-medium text-white bg-[#1E40AF] hover:bg-[#1D4ED8] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSavingSettings ? 'Saving...' : 'Save Litecoin Settings'}
              </button>
            </form>

            {/* Order Expiry & Quote Settings */}
            <form
              onSubmit={handleSaveQuoteSettings}
              className="bg-white border border-[#E6E2DA] rounded-xl p-6 space-y-5"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <Clock className="w-4 h-4 text-[#181614]" />
                  <h2 className="font-titr text-xl font-bold text-[#181614]">
                    Order Expiry &amp; Quote Settings
                  </h2>
                </div>
                <span className="px-2 py-0.5 text-[11px] font-mono rounded-md border bg-[#FAF9F6] text-[#6B655E] border-[#E6E2DA]">
                  {ltcRateMode === 'manual' ? 'Manual Rate' : overview.currentQuote.source}
                </span>
              </div>

              <p className="text-xs text-[#6B655E] leading-relaxed">
                Control how long unpaid orders hold a reserved book code and how LTC/USD checkout
                quotes are calculated.
              </p>

              {/* Order Expiry Window */}
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor="order-expiry-minutes"
                    className="block text-xs font-medium text-[#6B655E]"
                  >
                    Order Expiry Window (Minutes)
                  </label>
                  <span className="text-[11px] text-[#857E75] font-mono">5–120 min</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    id="order-expiry-minutes"
                    type="number"
                    min="5"
                    max="120"
                    value={orderExpiryMinutes}
                    onChange={(e) => setOrderExpiryMinutes(e.target.value)}
                    className="w-24 px-3 py-2 text-sm font-mono bg-[#FAF9F6] border border-[#DBD5CA] rounded-lg focus:outline-none focus:border-[#1E40AF]"
                  />
                  <div className="flex flex-wrap items-center gap-1.5">
                    {[10, 15, 20, 30, 60].map((preset) => (
                      <button
                        key={preset}
                        type="button"
                        onClick={() => setOrderExpiryMinutes(String(preset))}
                        className={`px-2.5 py-1.5 text-xs font-mono rounded-md border transition-colors cursor-pointer ${
                          Number.parseInt(orderExpiryMinutes, 10) === preset
                            ? 'bg-[#181614] text-white border-[#181614]'
                            : 'bg-white text-[#6B655E] border-[#DBD5CA] hover:bg-[#FAF9F6] hover:text-[#181614]'
                        }`}
                      >
                        {preset}m
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-[11px] text-[#857E75]">
                  Unpaid orders expire automatically after this window and release their reserved
                  book code back to stock.
                </p>
              </div>

              {/* Rate Mode Selector */}
              <div className="space-y-2 pt-3 border-t border-[#EFECE6]">
                <label className="block text-xs font-medium text-[#6B655E]">
                  LTC/USD Quote Source
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setLtcRateMode('live')}
                    className={`py-2 px-3 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                      ltcRateMode === 'live'
                        ? 'bg-[#181614] text-white border-[#181614]'
                        : 'bg-white text-[#181614] border-[#DBD5CA] hover:bg-[#FAF9F6]'
                    }`}
                  >
                    Live Spot Feed
                  </button>
                  <button
                    type="button"
                    onClick={() => setLtcRateMode('manual')}
                    className={`py-2 px-3 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                      ltcRateMode === 'manual'
                        ? 'bg-[#181614] text-white border-[#181614]'
                        : 'bg-white text-[#181614] border-[#DBD5CA] hover:bg-[#FAF9F6]'
                    }`}
                  >
                    Fixed Manual Rate
                  </button>
                </div>

                {ltcRateMode === 'live' ? (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between gap-2">
                      <label
                        htmlFor="quote-cache-seconds"
                        className="block text-xs font-medium text-[#6B655E]"
                      >
                        Spot Feed Cache (Seconds)
                      </label>
                      <span className="text-[11px] text-[#857E75] font-mono">15–600s</span>
                    </div>
                    <input
                      id="quote-cache-seconds"
                      type="number"
                      min="15"
                      max="600"
                      value={quoteCacheSeconds}
                      onChange={(e) => setQuoteCacheSeconds(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm font-mono bg-[#FAF9F6] border border-[#DBD5CA] rounded-lg focus:outline-none focus:border-[#1E40AF]"
                    />
                    <p className="text-[11px] text-[#857E75]">
                      Fetches live LTC/USD from Coinbase Spot (with CoinGecko fallback) and caches
                      for this many seconds.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-1.5 pt-1">
                    <div className="flex items-center justify-between gap-2">
                      <label
                        htmlFor="manual-ltc-rate"
                        className="block text-xs font-medium text-[#6B655E]"
                      >
                        Manual LTC/USD Rate ($)
                      </label>
                      <span className="text-[11px] text-[#857E75] font-mono">$1–$100,000</span>
                    </div>
                    <input
                      id="manual-ltc-rate"
                      type="number"
                      step="0.01"
                      min="1"
                      max="100000"
                      value={manualLtcRateUsd}
                      onChange={(e) => setManualLtcRateUsd(e.target.value)}
                      className="w-full px-3.5 py-2 text-sm font-mono bg-[#FAF9F6] border border-[#DBD5CA] rounded-lg focus:outline-none focus:border-[#1E40AF]"
                    />
                    <p className="text-[11px] text-[#857E75]">
                      Overrides live market feeds with your fixed USD price per 1 LTC.
                    </p>
                  </div>
                )}
              </div>

              {/* Quote Volatility Buffer */}
              <div className="space-y-2 pt-3 border-t border-[#EFECE6]">
                <div className="flex items-center justify-between gap-2">
                  <label
                    htmlFor="quote-spread-percent"
                    className="block text-xs font-medium text-[#6B655E]"
                  >
                    Quote Volatility Buffer (%)
                  </label>
                  <span className="text-[11px] text-[#857E75] font-mono">0%–25%</span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <input
                    id="quote-spread-percent"
                    type="number"
                    step="0.5"
                    min="0"
                    max="25"
                    value={quoteSpreadPercent}
                    onChange={(e) => setQuoteSpreadPercent(e.target.value)}
                    className="w-24 px-3 py-2 text-sm font-mono bg-[#FAF9F6] border border-[#DBD5CA] rounded-lg focus:outline-none focus:border-[#1E40AF]"
                  />
                  <div className="flex flex-wrap items-center gap-1.5">
                    {[0, 1, 2, 3, 5].map((pct) => (
                      <button
                        key={pct}
                        type="button"
                        onClick={() => setQuoteSpreadPercent(String(pct))}
                        className={`px-2.5 py-1.5 text-xs font-mono rounded-md border transition-colors cursor-pointer ${
                          Number.parseFloat(quoteSpreadPercent) === pct
                            ? 'bg-[#181614] text-white border-[#181614]'
                            : 'bg-white text-[#6B655E] border-[#DBD5CA] hover:bg-[#FAF9F6] hover:text-[#181614]'
                        }`}
                      >
                        {pct}%
                      </button>
                    ))}
                  </div>
                </div>
                <p className="text-[11px] text-[#857E75]">
                  Adds a percentage cushion to quoted LTC amounts to offset market swings or
                  conversion fees while orders await confirmation.
                </p>
              </div>

              {/* Live Quote Calculation Preview */}
              <div className="rounded-lg border border-[#E6E2DA] bg-[#FAF9F6] px-3.5 py-2.5 text-xs space-y-1">
                <div className="flex items-center justify-between gap-2 text-[#6B655E]">
                  <span>Effective Quote Rate</span>
                  <span className="font-mono font-semibold text-[#181614] tabular-nums">
                    ${previewEffectiveRate.toFixed(2)}/LTC
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2 text-[11px] text-[#857E75]">
                  <span>Sample $10.00 book · {previewExpiry} min window</span>
                  <span className="font-mono tabular-nums text-[#181614]">
                    ≈ {sample10UsdLtc} LTC
                  </span>
                </div>
              </div>

              <button
                type="submit"
                disabled={isSavingQuoteSettings}
                className="px-4 py-2.5 text-sm font-medium text-white bg-[#1E40AF] hover:bg-[#1D4ED8] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                {isSavingQuoteSettings ? 'Saving...' : 'Save Expiry & Quote Settings'}
              </button>
            </form>
          </div>

          <div className="lg:col-span-6 space-y-6">
            {/* Admin Vault Security */}
            <form
              onSubmit={handleSaveSecurity}
              className="bg-white border border-[#E6E2DA] rounded-xl p-6 space-y-4"
            >
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <KeyRound className="w-4 h-4 text-[#181614]" />
                  <h2 className="font-titr text-xl font-bold text-[#181614]">
                    Admin Vault Access
                  </h2>
                </div>
                <span
                  className={`px-2 py-0.5 text-[11px] font-medium rounded-md border ${
                    authStatus.debugOpenAccess
                      ? 'bg-[#FFFBEB] text-[#92400E] border-[#FCD34D]'
                      : 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]'
                  }`}
                >
                  {authStatus.debugOpenAccess ? 'Open Access' : 'Passcode Locked'}
                </span>
              </div>

              <p className="text-xs text-[#6B655E] leading-relaxed">
                Set your own Admin Vault passcode and choose whether login is required. Everything
                is saved locally per store instance.
              </p>

              <label className="flex items-start gap-3 cursor-pointer">
                <input
                  type="checkbox"
                  checked={requirePasscode}
                  disabled={authStatus.managedByEnv}
                  onChange={(e) => setRequirePasscode(e.target.checked)}
                  className="mt-1 rounded border-[#DBD5CA]"
                />
                <span className="text-xs text-[#6B655E] leading-relaxed">
                  <strong className="text-[#181614] block">
                    Require Passcode to Access Admin Vault
                  </strong>
                  Enable this before handing the store to customers so only someone with your
                  passcode can open Admin Vault.
                </span>
              </label>

              {!authStatus.managedByEnv && (
                <div className="space-y-3 pt-1">
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-[#6B655E]">
                      Admin Username
                    </label>
                    <input
                      type="text"
                      dir="ltr"
                      value={adminUsernameInput}
                      onChange={(e) => setAdminUsernameInput(e.target.value)}
                      autoComplete="username"
                      placeholder="e.g. owner"
                      className="w-full px-3 py-2 text-sm bg-[#FAF9F6] border border-[#DBD5CA] rounded-lg focus:outline-none focus:border-[#1E40AF]"
                    />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-[#6B655E]">
                        {overview.hasAdminPasscode ? 'New Password (optional)' : 'Admin Password'}
                      </label>
                      <input
                        type="password"
                        value={newAdminPasscode}
                        onChange={(e) => setNewAdminPasscode(e.target.value)}
                        autoComplete="new-password"
                        placeholder="Min 8 characters"
                        className="w-full px-3 py-2 text-sm bg-[#FAF9F6] border border-[#DBD5CA] rounded-lg focus:outline-none focus:border-[#1E40AF]"
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="block text-xs font-medium text-[#6B655E]">
                        Confirm Password
                      </label>
                      <input
                        type="password"
                        value={confirmAdminPasscode}
                        onChange={(e) => setConfirmAdminPasscode(e.target.value)}
                        autoComplete="new-password"
                        placeholder="Repeat password"
                        className="w-full px-3 py-2 text-sm bg-[#FAF9F6] border border-[#DBD5CA] rounded-lg focus:outline-none focus:border-[#1E40AF]"
                      />
                    </div>
                  </div>
                </div>
              )}

              <div className="p-3.5 bg-[#FAF9F6] border border-[#E6E2DA] rounded-lg space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <label
                    htmlFor="settings-admin-path"
                    className="text-xs font-semibold text-[#181614]"
                  >
                    Secret Admin URL Path
                  </label>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setAdminPathInput(generateRandomAdminPath())}
                      className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-[#181614] bg-white hover:bg-[#EFECE6] border border-[#DBD5CA] rounded-md transition-colors cursor-pointer"
                    >
                      <RefreshCw className="w-3 h-3 text-[#6B655E]" />
                      <span>Randomize</span>
                    </button>
                    <button
                      type="button"
                      onClick={handleCopyAdminUrl}
                      className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-medium text-[#181614] bg-white hover:bg-[#EFECE6] border border-[#DBD5CA] rounded-md transition-colors cursor-pointer"
                    >
                      {copiedAdminUrl ? (
                        <Check className="w-3 h-3 text-[#047857]" />
                      ) : (
                        <Copy className="w-3 h-3 text-[#6B655E]" />
                      )}
                      <span>{copiedAdminUrl ? 'Copied' : 'Copy URL'}</span>
                    </button>
                  </div>
                </div>

                <div className="flex items-center bg-white border border-[#DBD5CA] rounded-lg overflow-hidden focus-within:border-[#1E40AF]">
                  <span className="px-2.5 py-2 text-xs font-mono text-[#857E75] bg-[#F3F1EC] border-r border-[#E6E2DA] select-none shrink-0">
                    /
                  </span>
                  <input
                    id="settings-admin-path"
                    type="text"
                    dir="ltr"
                    maxLength={48}
                    value={adminPathInput}
                    onChange={(e) => setAdminPathInput(e.target.value.replace(/\s+/g, ''))}
                    placeholder="admin or vault-a3f89b12"
                    className="w-full px-2.5 py-2 text-sm font-mono bg-white text-[#181614] focus:outline-none"
                  />
                </div>

                <p className="text-[11px] text-[#6B655E] leading-relaxed">
                  Admin Vault is hidden from public navigation. Current URL:{' '}
                  <span className="font-mono text-[#181614] break-all">
                    {window.location.origin}/{normalizeAdminPathInput(adminPathInput) || 'admin'}
                  </span>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2.5">
                <button
                  type="submit"
                  disabled={isSavingSecurity}
                  className="px-4 py-2 text-xs font-medium text-white bg-[#181614] hover:bg-[#1E40AF] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                >
                  {isSavingSecurity ? 'Saving...' : 'Save Access Settings'}
                </button>
                <button
                  type="button"
                  onClick={() => setShowSetupWizard(true)}
                  className="px-3.5 py-2 text-xs font-medium text-[#181614] bg-[#FAF9F6] hover:bg-[#EFECE6] border border-[#DBD5CA] rounded-lg transition-colors cursor-pointer"
                >
                  Open Guided Setup
                </button>
              </div>
            </form>

            {/* Webhook Automation */}
            <div className="bg-white border border-[#E6E2DA] rounded-xl p-6 space-y-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="font-titr text-xl font-bold text-[#181614]">Webhook Automation</h2>
                <span
                  className={`px-2 py-0.5 text-[11px] font-mono rounded-md border ${
                    overview.webhookConfigured
                      ? 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]'
                      : 'bg-[#F3F1EC] text-[#6B655E] border-[#E6E2DA]'
                  }`}
                >
                  {overview.webhookConfigured
                    ? `Active (${overview.webhookSecretHint || '••••'})`
                    : 'Not configured'}
                </span>
              </div>

              <p className="text-xs text-[#6B655E] leading-relaxed">
                Optional: set a signing secret here to accept signed notifications from Litecoin
                Core (<span className="font-mono">walletnotify</span>) or BTCPay at{' '}
                <span className="font-mono text-[#181614]">POST /api/webhooks/ltc</span>.
              </p>

              <form onSubmit={handleSaveWebhookSecret} className="space-y-2.5">
                <label className="block text-xs font-medium text-[#6B655E]">
                  Webhook Signing Secret (HMAC-SHA256)
                </label>
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type={showWebhookSecret ? 'text' : 'password'}
                      dir="ltr"
                      value={webhookSecretInput}
                      onChange={(e) => setWebhookSecretInput(e.target.value)}
                      placeholder={
                        overview.webhookConfigured
                          ? 'Enter new secret to replace existing'
                          : 'Paste or generate a signing secret'
                      }
                      className="w-full pl-3 pr-9 py-2 text-xs font-mono bg-[#FAF9F6] border border-[#DBD5CA] rounded-lg focus:outline-none focus:border-[#1E40AF]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowWebhookSecret((prev) => !prev)}
                      aria-label={showWebhookSecret ? 'Hide secret' : 'Show secret'}
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
                    onClick={handleGenerateWebhookSecret}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#181614] bg-[#F2EFE9] hover:bg-[#E6E2DA] rounded-lg transition-colors cursor-pointer shrink-0"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    <span>Generate</span>
                  </button>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <button
                    type="submit"
                    disabled={isSavingWebhookSecret || !webhookSecretInput.trim()}
                    className="px-3.5 py-1.5 text-xs font-medium text-white bg-[#1E40AF] hover:bg-[#1D4ED8] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                  >
                    {isSavingWebhookSecret ? 'Saving...' : 'Save Secret'}
                  </button>

                  {webhookSecretInput.trim() && (
                    <button
                      type="button"
                      onClick={async () => {
                        await navigator.clipboard.writeText(webhookSecretInput.trim());
                        setCopiedWebhookSecret(true);
                        window.setTimeout(() => setCopiedWebhookSecret(false), 2000);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#181614] bg-[#FAF9F6] hover:bg-[#EFECE6] border border-[#DBD5CA] rounded-lg transition-colors cursor-pointer"
                    >
                      {copiedWebhookSecret ? (
                        <Check className="w-3.5 h-3.5 text-[#0F766E]" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                      <span>{copiedWebhookSecret ? 'Copied Secret' : 'Copy Secret'}</span>
                    </button>
                  )}

                  {overview.webhookConfigured && (
                    <button
                      type="button"
                      disabled={isSavingWebhookSecret}
                      onClick={handleClearWebhookSecret}
                      className="px-3 py-1.5 text-xs font-medium text-[#B91C1C] bg-white hover:bg-[#FEF2F2] border border-[#FECACA] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
                    >
                      Remove Secret
                    </button>
                  )}
                </div>
              </form>

              <div className="bg-[#181614] text-[#F5F2EC] rounded-lg p-4 overflow-x-auto">
                <pre className="text-xs font-mono leading-relaxed">{webhookSnippet}</pre>
              </div>

              <button
                type="button"
                onClick={async () => {
                  await navigator.clipboard.writeText(webhookSnippet);
                  setCopiedWebhook(true);
                  window.setTimeout(() => setCopiedWebhook(false), 2000);
                }}
                className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-[#181614] bg-[#F2EFE9] hover:bg-[#E6E2DA] rounded-lg transition-colors cursor-pointer"
              >
                {copiedWebhook ? (
                  <Check className="w-3.5 h-3.5 text-[#0F766E]" />
                ) : (
                  <Copy className="w-3.5 h-3.5" />
                )}
                <span>{copiedWebhook ? 'Copied cURL Example' : 'Copy cURL Example'}</span>
              </button>
            </div>
          </div>
        </div>

        <SaleNotificationsCard
          adminToken={adminToken}
          initialConfig={overview.saleNotifications}
          onSaved={(nextNotifications) => {
            setOverview((prev) =>
              prev ? { ...prev, saleNotifications: nextNotifications } : prev
            );
          }}
          onFeedback={setFeedback}
        />
        </div>
        );
      })()}

      {authStatus.debugOpenAccess && (
        <div className="px-4 py-3 rounded-lg border border-[#FCD34D] bg-[#FFFBEB] text-xs text-[#92400E] flex flex-wrap items-center justify-between gap-3">
          <span>
            <strong>Open Access Mode:</strong> Admin Vault is currently open without a passcode for
            easy setup. You can set a passcode and lock it anytime under{' '}
            <button
              type="button"
              onClick={() => setActiveTab('settings')}
              className="font-semibold underline cursor-pointer"
            >
              Settings → Admin Vault Access
            </button>
            .
          </span>
        </div>
      )}
    </main>
  );
}
