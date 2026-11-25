import { useEffect, useRef, useState } from 'react';
import {
  Building2,
  ChevronDown,
  EyeOff,
  Info,
  Languages,
  LifeBuoy,
  Monitor,
  PauseCircle,
  PenLine,
  RotateCcw,
  RotateCw,
  Smartphone,
  Trash2,
  Upload,
} from 'lucide-react';
import { updateAdminPreferences, uploadAdminBackground, uploadAdminLogo } from '../api';
import {
  applyStorefrontVars,
  DEFAULT_PREFERENCES,
  getCardRadiusClass,
  isSafeSupportLinkUrl,
  THEME_PRESETS,
} from '../theme';
import type {
  BodyFontChoice,
  BookDescriptionMode,
  CardRadiusChoice,
  LogoDisplayMode,
  MobileCardStyle,
  MobileGridGap,
  StorefrontPreferences,
  TitleFontChoice,
} from '../types';

interface PreferencesPanelProps {
  adminToken: string | null;
  initialPreferences: StorefrontPreferences;
  onSaved: (next: StorefrontPreferences) => void;
  onFeedback: (feedback: { type: 'success' | 'error'; text: string }) => void;
}

const HEX_REGEX = /^#[0-9a-fA-F]{6}$/;

export function PreferencesPanel({
  adminToken,
  initialPreferences,
  onSaved,
  onFeedback,
}: PreferencesPanelProps) {
  const [draft, setDraft] = useState<StorefrontPreferences>(initialPreferences);
  const [previewDevice, setPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [isSaving, setIsSaving] = useState(false);
  const [isUploadingBg, setIsUploadingBg] = useState(false);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const bgInputRef = useRef<HTMLInputElement | null>(null);
  const logoInputRef = useRef<HTMLInputElement | null>(null);
  const previewRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setDraft(initialPreferences);
  }, [initialPreferences]);

  useEffect(() => {
    if (previewRef.current) {
      applyStorefrontVars(previewRef.current, draft, 'preview');
    }
  }, [draft]);

  const updateField = <K extends keyof StorefrontPreferences>(
    key: K,
    value: StorefrontPreferences[K]
  ) => {
    setDraft((prev) => ({ ...prev, [key]: value }));
  };

  const handleUploadBackground = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingBg(true);
    try {
      const { backgroundImageUrl } = await uploadAdminBackground(adminToken, file);
      setDraft((prev) => ({ ...prev, backgroundImageUrl }));
      onFeedback({
        type: 'success',
        text: 'Background image uploaded. Click Save Preferences to publish.',
      });
    } catch (err) {
      onFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Background upload failed.',
      });
    } finally {
      setIsUploadingBg(false);
      if (bgInputRef.current) {
        bgInputRef.current.value = '';
      }
    }
  };

  const handleUploadLogo = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingLogo(true);
    try {
      const { logoUrl } = await uploadAdminLogo(adminToken, file);
      setDraft((prev) => ({
        ...prev,
        logoUrl,
        logoDisplayMode: prev.logoDisplayMode === 'text-only' ? 'logo-and-text' : prev.logoDisplayMode,
      }));
      onFeedback({
        type: 'success',
        text: 'Main page logo uploaded. Click Save Preferences to publish.',
      });
    } catch (err) {
      onFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Logo upload failed.',
      });
    } finally {
      setIsUploadingLogo(false);
      if (logoInputRef.current) {
        logoInputRef.current.value = '';
      }
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const { preferences } = await updateAdminPreferences(adminToken, draft);
      setDraft(preferences);
      onSaved(preferences);
      onFeedback({
        type: 'success',
        text: 'Storefront preferences saved and applied to the main page.',
      });
    } catch (err) {
      onFeedback({
        type: 'error',
        text: err instanceof Error ? err.message : 'Could not save preferences.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  const handleResetDefaults = () => {
    setDraft({ ...DEFAULT_PREFERENCES });
  };

  const isPersianPreview = draft.language === 'fa';
  const radiusClass = getCardRadiusClass(draft.cardRadius);
  const supportUrlTrimmed = draft.supportLinkUrl.trim();
  const supportUrlInvalid =
    supportUrlTrimmed.length > 0 && !isSafeSupportLinkUrl(supportUrlTrimmed);
  const previewHasSupportLink =
    draft.supportLinkEnabled &&
    draft.supportLinkTitle.trim().length > 0 &&
    isSafeSupportLinkUrl(supportUrlTrimmed);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
      <form
        onSubmit={handleSave}
        className="lg:col-span-7 bg-white border border-[#E6E2DA] rounded-xl p-6 space-y-6"
      >
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="font-titr text-xl font-bold text-[#181614]">Storefront Preferences</h2>
            <p className="text-xs text-[#6B655E] mt-1">
              Customize language, colors, background artwork, typography, and layout for the main
              bookstore page. Admin Vault stays in English.
            </p>
          </div>
          <button
            type="button"
            onClick={handleResetDefaults}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-[#6B655E] hover:text-[#181614] bg-[#FAF9F6] hover:bg-[#EFECE6] border border-[#E6E2DA] rounded-lg transition-colors cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset Defaults</span>
          </button>
        </div>

        {/* Language, Brand Name & Browser Page Title */}
        <div className="space-y-4 pt-1">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#6B655E]">Main Page Language</label>
              <select
                value={draft.language}
                onChange={(e) => updateField('language', e.target.value === 'fa' ? 'fa' : 'en')}
                className="w-full px-3 py-2.5 text-sm bg-white border border-[#DBD5CA] rounded-lg"
              >
                <option value="en">English (LTR)</option>
                <option value="fa">Persian — فارسی (RTL)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#6B655E]">
                Header Brand Text (replaces dipi)
              </label>
              <input
                type="text"
                maxLength={40}
                value={draft.storeName}
                onChange={(e) => updateField('storeName', e.target.value)}
                placeholder="dipi"
                className="w-full px-3 py-2.5 text-sm bg-white border border-[#DBD5CA] rounded-lg"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[#6B655E]">
              Browser Page Title
            </label>
            <input
              type="text"
              maxLength={120}
              value={draft.pageTitle}
              onChange={(e) => updateField('pageTitle', e.target.value)}
              placeholder="dipi — Digital Bookstore Settled in Litecoin"
              className="w-full px-3 py-2.5 text-sm bg-white border border-[#DBD5CA] rounded-lg"
            />
            <p className="text-[11px] text-[#857E75]">
              Shown in the browser tab and bookmarks when visitors open the main bookstore page.
            </p>
          </div>
        </div>

        {/* Main Page Logo Upload & Display Mode */}
        <div className="pt-4 border-t border-[#EFECE6] space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-xs font-medium text-[#181614]">Main Page Logo</div>
              <div className="text-[11px] text-[#857E75]">
                Upload a custom JPG, PNG, or WebP logo image to display in the storefront header.
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                ref={logoInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleUploadLogo}
                className="sr-only"
              />
              <button
                type="button"
                disabled={isUploadingLogo}
                onClick={() => logoInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#181614] bg-white hover:bg-[#F2EFE9] border border-[#DBD5CA] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>
                  {isUploadingLogo
                    ? 'Uploading...'
                    : draft.logoUrl
                      ? 'Replace Logo'
                      : 'Upload Logo'}
                </span>
              </button>
              {draft.logoUrl && (
                <button
                  type="button"
                  onClick={() => updateField('logoUrl', '')}
                  className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-medium text-[#B91C1C] hover:bg-[#FEF2F2] border border-[#FECACA] rounded-lg transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              )}
            </div>
          </div>

          {draft.logoUrl && (
            <div className="p-3.5 bg-[#FAF9F6] border border-[#E6E2DA] rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div className="h-11 px-3 bg-white border border-[#E6E2DA] rounded-lg flex items-center justify-center">
                  <img
                    src={draft.logoUrl}
                    alt="Uploaded storefront logo"
                    className="max-h-8 w-auto max-w-[120px] object-contain"
                  />
                </div>
                <span className="text-xs text-[#6B655E]">Display mode</span>
              </div>

              <div className="flex items-center gap-1.5">
                {(
                  [
                    ['logo-and-text', 'Logo + Text'],
                    ['logo-only', 'Logo Only'],
                    ['text-only', 'Text Only'],
                  ] as Array<[LogoDisplayMode, string]>
                ).map(([mode, label]) => (
                  <button
                    key={mode}
                    type="button"
                    onClick={() => updateField('logoDisplayMode', mode)}
                    className={`px-2.5 py-1.5 text-[11px] font-medium rounded-md border transition-colors cursor-pointer whitespace-nowrap ${
                      draft.logoDisplayMode === mode
                        ? 'bg-[#181614] text-white border-[#181614]'
                        : 'bg-white text-[#181614] border-[#DBD5CA] hover:bg-[#EFECE6]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Quick Color Presets */}
        <div className="pt-4 border-t border-[#EFECE6] space-y-2.5">
          <div className="text-xs font-medium text-[#6B655E]">Color Presets</div>
          <div className="flex flex-wrap gap-2">
            {THEME_PRESETS.map((preset) => {
              const isSelected =
                draft.backgroundColor.toUpperCase() === preset.backgroundColor &&
                draft.surfaceColor.toUpperCase() === preset.surfaceColor &&
                draft.textColor.toUpperCase() === preset.textColor &&
                draft.accentColor.toUpperCase() === preset.accentColor;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() =>
                    setDraft((prev) => ({
                      ...prev,
                      backgroundColor: preset.backgroundColor,
                      surfaceColor: preset.surfaceColor,
                      textColor: preset.textColor,
                      accentColor: preset.accentColor,
                    }))
                  }
                  className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                    isSelected
                      ? 'bg-[#181614] text-white border-[#181614]'
                      : 'bg-[#FAF9F6] text-[#181614] border-[#DBD5CA] hover:bg-[#EFECE6]'
                  }`}
                >
                  {preset.label}
                </button>
              );
            })}
          </div>
        </div>

        {/* Custom Color Pickers */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {(
            [
              ['backgroundColor', 'Background Color'],
              ['surfaceColor', 'Card & Surface Color'],
              ['textColor', 'Text Color'],
              ['accentColor', 'Accent & Link Color'],
            ] as const
          ).map(([key, label]) => (
            <div key={key} className="space-y-1.5">
              <label className="block text-xs font-medium text-[#6B655E]">{label}</label>
              <div className="flex items-center gap-2">
                <input
                  type="color"
                  aria-label={label}
                  value={HEX_REGEX.test(draft[key]) ? draft[key] : '#FFFFFF'}
                  onChange={(e) => updateField(key, e.target.value.toUpperCase())}
                  className="w-10 h-10 p-1 bg-white border border-[#DBD5CA] rounded-lg cursor-pointer shrink-0"
                />
                <input
                  type="text"
                  maxLength={7}
                  value={draft[key]}
                  onChange={(e) => updateField(key, e.target.value.toUpperCase())}
                  className="flex-1 px-3 py-2 text-xs font-mono bg-white border border-[#DBD5CA] rounded-lg uppercase"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Background Image Upload & Overlay */}
        <div className="pt-4 border-t border-[#EFECE6] space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <div className="text-xs font-medium text-[#181614]">Background Image</div>
              <div className="text-[11px] text-[#857E75]">
                Optional JPG, PNG, or WebP backdrop (up to 5 MB).
              </div>
            </div>
            <div className="flex items-center gap-2">
              <input
                ref={bgInputRef}
                type="file"
                accept="image/jpeg,image/png,image/webp"
                onChange={handleUploadBackground}
                className="sr-only"
              />
              <button
                type="button"
                disabled={isUploadingBg}
                onClick={() => bgInputRef.current?.click()}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-medium text-[#181614] bg-white hover:bg-[#F2EFE9] border border-[#DBD5CA] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
              >
                <Upload className="w-3.5 h-3.5" />
                <span>
                  {isUploadingBg
                    ? 'Uploading...'
                    : draft.backgroundImageUrl
                      ? 'Replace Image'
                      : 'Upload Image'}
                </span>
              </button>
              {draft.backgroundImageUrl && (
                <button
                  type="button"
                  onClick={() => updateField('backgroundImageUrl', '')}
                  className="inline-flex items-center gap-1 px-2.5 py-2 text-xs font-medium text-[#B91C1C] hover:bg-[#FEF2F2] border border-[#FECACA] rounded-lg transition-colors cursor-pointer"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Remove</span>
                </button>
              )}
            </div>
          </div>

          {draft.backgroundImageUrl && (
            <div className="p-3.5 bg-[#FAF9F6] border border-[#E6E2DA] rounded-lg flex flex-col sm:flex-row sm:items-center gap-4">
              <img
                src={draft.backgroundImageUrl}
                alt="Storefront background preview"
                className="w-24 h-16 object-cover rounded border border-[#E6E2DA] shrink-0"
              />
              <div className="flex-1 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-medium text-[#6B655E]">Background Tint Overlay</span>
                  <span className="font-mono text-[#181614] tabular-nums">
                    {Math.round(draft.backgroundOverlayOpacity * 100)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="0.92"
                  step="0.02"
                  value={draft.backgroundOverlayOpacity}
                  onChange={(e) =>
                    updateField('backgroundOverlayOpacity', Number.parseFloat(e.target.value))
                  }
                  className="w-full accent-[#1E40AF] cursor-pointer"
                />
                <p className="text-[11px] text-[#857E75]">
                  Blends your Background Color over the image to keep book titles easy to read.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Typography */}
        <div className="pt-4 border-t border-[#EFECE6] grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[#6B655E]">Book Title Font</label>
            <select
              value={draft.titleFont}
              onChange={(e) => updateField('titleFont', e.target.value as TitleFontChoice)}
              className="w-full px-3 py-2.5 text-sm bg-white border border-[#DBD5CA] rounded-lg"
            >
              <option value="b-titr">B Titr (Default Bold)</option>
              <option value="lalezar">Lalezar Display</option>
              <option value="playfair">Playfair Display Serif</option>
              <option value="vazirmatn">Vazirmatn Bold</option>
              <option value="dm-sans">DM Sans Bold</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[#6B655E]">Body &amp; UI Font</label>
            <select
              value={draft.bodyFont}
              onChange={(e) => updateField('bodyFont', e.target.value as BodyFontChoice)}
              className="w-full px-3 py-2.5 text-sm bg-white border border-[#DBD5CA] rounded-lg"
            >
              <option value="default">Auto (DM Sans / Vazirmatn)</option>
              <option value="vazirmatn">Vazirmatn</option>
              <option value="dm-sans">DM Sans</option>
              <option value="serif">Classic Serif</option>
              <option value="mono">IBM Plex Mono</option>
            </select>
          </div>
        </div>

        {/* Desktop Layout & Card Shape */}
        <div className="pt-4 border-t border-[#EFECE6] grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[#6B655E]">
              Desktop Books Per Row
            </label>
            <div className="grid grid-cols-3 gap-2">
              {([2, 3, 4] as const).map((cols) => (
                <button
                  key={cols}
                  type="button"
                  onClick={() => updateField('gridColumns', cols)}
                  className={`py-2 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                    draft.gridColumns === cols
                      ? 'bg-[#181614] text-white border-[#181614]'
                      : 'bg-white text-[#181614] border-[#DBD5CA] hover:bg-[#FAF9F6]'
                  }`}
                >
                  {cols} Columns
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[#6B655E]">Card Corner Style</label>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  ['sharp', 'Sharp'],
                  ['rounded', 'Rounded'],
                  ['soft', 'Soft'],
                ] as Array<[CardRadiusChoice, string]>
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => updateField('cardRadius', value)}
                  className={`py-2 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                    draft.cardRadius === value
                      ? 'bg-[#181614] text-white border-[#181614]'
                      : 'bg-white text-[#181614] border-[#DBD5CA] hover:bg-[#FAF9F6]'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile Layout & Book Card Styles */}
        <div className="pt-4 border-t border-[#EFECE6] space-y-4">
          <div>
            <div className="text-xs font-semibold text-[#181614]">
              Mobile Layout &amp; Book Cards
            </div>
            <p className="text-[11px] text-[#857E75] mt-0.5">
              Tailor how books appear on phones independently from desktop.
            </p>
          </div>

          {/* Mobile Card Type */}
          <div className="space-y-1.5">
            <label className="block text-xs font-medium text-[#6B655E]">
              Mobile Book Card Type
            </label>
            <div className="grid grid-cols-2 gap-2.5">
              {(
                [
                  ['standard', 'Standard A4', 'Full portrait A4 cover + details'],
                  ['horizontal', 'Horizontal Row', 'Side A4 cover + stacked info'],
                  ['compact', 'Compact Grid', 'Tighter padding for 2-up shelves'],
                  ['cover-focus', 'Cover Focus', 'Gallery cover + minimal title & price'],
                ] as Array<[MobileCardStyle, string, string]>
              ).map(([style, title, desc]) => {
                const active = draft.mobileCardStyle === style;
                return (
                  <button
                    key={style}
                    type="button"
                    onClick={() => {
                      setDraft((prev) => ({
                        ...prev,
                        mobileCardStyle: style,
                        mobileGridColumns:
                          style === 'horizontal'
                            ? 1
                            : style === 'compact' && prev.mobileGridColumns === 1
                              ? 2
                              : prev.mobileGridColumns,
                      }));
                      setPreviewDevice('mobile');
                    }}
                    className={`p-3 text-left rounded-lg border transition-colors cursor-pointer ${
                      active
                        ? 'bg-[#181614] text-white border-[#181614]'
                        : 'bg-[#FAF9F6] text-[#181614] border-[#DBD5CA] hover:bg-[#EFECE6]'
                    }`}
                  >
                    <div className="text-xs font-semibold">{title}</div>
                    <div
                      className={`text-[11px] mt-0.5 ${
                        active ? 'text-white/75' : 'text-[#6B655E]'
                      }`}
                    >
                      {desc}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Mobile Columns & Spacing */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#6B655E]">
                Mobile Books Per Row
              </label>
              <div className="grid grid-cols-2 gap-2">
                {([1, 2] as const).map((cols) => {
                  const disabled = draft.mobileCardStyle === 'horizontal' && cols === 2;
                  return (
                    <button
                      key={cols}
                      type="button"
                      disabled={disabled}
                      onClick={() => {
                        updateField('mobileGridColumns', cols);
                        setPreviewDevice('mobile');
                      }}
                      className={`py-2 text-xs font-medium rounded-lg border transition-colors ${
                        disabled
                          ? 'bg-[#F5F2EC] text-[#A8A095] border-[#E6E2DA] cursor-not-allowed'
                          : draft.mobileGridColumns === cols
                            ? 'bg-[#181614] text-white border-[#181614] cursor-pointer'
                            : 'bg-white text-[#181614] border-[#DBD5CA] hover:bg-[#FAF9F6] cursor-pointer'
                      }`}
                    >
                      {cols === 1 ? '1 Per Row' : '2 Per Row'}
                    </button>
                  );
                })}
              </div>
              {draft.mobileCardStyle === 'horizontal' && (
                <p className="text-[11px] text-[#857E75]">
                  Horizontal rows always use 1 book per row on mobile.
                </p>
              )}
            </div>

            <div className="space-y-1.5">
              <label className="block text-xs font-medium text-[#6B655E]">
                Mobile Card Spacing
              </label>
              <div className="grid grid-cols-3 gap-2">
                {(
                  [
                    ['tight', 'Tight'],
                    ['normal', 'Normal'],
                    ['airy', 'Airy'],
                  ] as Array<[MobileGridGap, string]>
                ).map(([gap, label]) => (
                  <button
                    key={gap}
                    type="button"
                    onClick={() => {
                      updateField('mobileGridGap', gap);
                      setPreviewDevice('mobile');
                    }}
                    className={`py-2 text-xs font-medium rounded-lg border transition-colors cursor-pointer ${
                      draft.mobileGridGap === gap
                        ? 'bg-[#181614] text-white border-[#181614]'
                        : 'bg-white text-[#181614] border-[#DBD5CA] hover:bg-[#FAF9F6]'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {draft.mobileCardStyle !== 'cover-focus' && (
            <label className="flex items-start gap-2.5 cursor-pointer pt-1">
              <input
                type="checkbox"
                checked={draft.mobileShowMetadata}
                onChange={(e) => {
                  updateField('mobileShowMetadata', e.target.checked);
                  setPreviewDevice('mobile');
                }}
                className="mt-0.5 rounded border-[#DBD5CA]"
              />
              <span className="text-xs text-[#6B655E] leading-relaxed">
                <strong className="text-[#181614]">Show Translator &amp; Publication on mobile</strong>{' '}
                — uncheck for cleaner cards showing cover, title, writer, and LTC price.
              </span>
            </label>
          )}
        </div>

        {/* Catalog Controls (Categories, Sorting & Search) */}
        <div className="space-y-3 pt-4 border-t border-[#EFECE6]">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6B655E]">
              Catalog Controls
            </h3>
            <p className="text-[11px] text-[#857E75] mt-0.5">
              Independently enable or deactivate storefront categories, sorting, and search.
            </p>
          </div>

          <div className="space-y-2.5">
            {/* Subject / Category Filter */}
            <div className="flex items-center justify-between gap-3 p-3 bg-[#FAF9F6] border border-[#E6E2DA] rounded-lg">
              <div className="min-w-0">
                <div className="text-xs font-semibold text-[#181614]">
                  Subject / Category Filter
                </div>
                <p className="text-[11px] text-[#6B655E] mt-0.5">
                  Show subject tabs above the book grid when books have a subject assigned.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={draft.showCategoryFilter}
                onClick={() => updateField('showCategoryFilter', !draft.showCategoryFilter)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer shrink-0 ${
                  draft.showCategoryFilter
                    ? 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0] hover:bg-[#D1FAE5]'
                    : 'bg-white text-[#6B655E] border-[#DBD5CA] hover:bg-[#EFECE6]'
                }`}
              >
                {draft.showCategoryFilter ? 'Active' : 'Deactivated'}
              </button>
            </div>

            {/* Sort Selector */}
            <div className="flex items-center justify-between gap-3 p-3 bg-[#FAF9F6] border border-[#E6E2DA] rounded-lg">
              <div className="min-w-0">
                <div className="text-xs font-semibold text-[#181614]">Sort Selector</div>
                <p className="text-[11px] text-[#6B655E] mt-0.5">
                  Let shoppers sort books by Featured, Price, or Title, or deactivate sorting
                  completely.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={draft.showSortControl}
                onClick={() => updateField('showSortControl', !draft.showSortControl)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer shrink-0 ${
                  draft.showSortControl
                    ? 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0] hover:bg-[#D1FAE5]'
                    : 'bg-white text-[#6B655E] border-[#DBD5CA] hover:bg-[#EFECE6]'
                }`}
              >
                {draft.showSortControl ? 'Active' : 'Deactivated'}
              </button>
            </div>

            {/* Search Bar */}
            <div className="flex items-center justify-between gap-3 p-3 bg-[#FAF9F6] border border-[#E6E2DA] rounded-lg">
              <div className="min-w-0">
                <div className="text-xs font-semibold text-[#181614]">Search Bar</div>
                <p className="text-[11px] text-[#6B655E] mt-0.5">
                  Show the catalog search box for title, subject, writer, translator, and publisher.
                </p>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={draft.showSearchBar}
                onClick={() => updateField('showSearchBar', !draft.showSearchBar)}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer shrink-0 ${
                  draft.showSearchBar
                    ? 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0] hover:bg-[#D1FAE5]'
                    : 'bg-white text-[#6B655E] border-[#DBD5CA] hover:bg-[#EFECE6]'
                }`}
              >
                {draft.showSearchBar ? 'Active' : 'Deactivated'}
              </button>
            </div>
          </div>
        </div>

        {/* Book Description Display (strictly 1 of 4 mutually exclusive options) */}
        <div className="space-y-3 pt-4 border-t border-[#EFECE6]">
          <div>
            <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6B655E]">
              Book Description Display
            </h3>
            <p className="text-[11px] text-[#857E75] mt-0.5">
              Choose strictly one way to display book descriptions (options cannot be mixed). Edit
              each book&apos;s description under Manage Books &amp; Codes.
            </p>
          </div>

          <div
            role="radiogroup"
            aria-label="Book Description Display"
            className="grid grid-cols-1 sm:grid-cols-2 gap-2.5"
          >
            {(
              [
                {
                  value: 'detail-modal',
                  label: 'Book Detail Sheet',
                  desc: 'Tap cover or title to open description modal; Buy jumps straight to checkout.',
                  icon: Info,
                },
                {
                  value: 'cover-flip',
                  label: 'Back-of-Book Cover Flip',
                  desc: 'Flip the A4 cover in-place to read the blurb with zero card height shift.',
                  icon: RotateCw,
                },
                {
                  value: 'checkout-accordion',
                  label: 'Checkout Accordion',
                  desc: 'Cards stay 1-tap buy; collapsed "About this book" toggle inside checkout.',
                  icon: ChevronDown,
                },
                {
                  value: 'none',
                  label: 'No Description',
                  desc: 'Hide descriptions everywhere on the storefront and checkout.',
                  icon: EyeOff,
                },
              ] as Array<{
                value: BookDescriptionMode;
                label: string;
                desc: string;
                icon: typeof Info;
              }>
            ).map((option) => {
              const Icon = option.icon;
              const isSelected = draft.descriptionDisplayMode === option.value;
              return (
                <button
                  key={option.value}
                  type="button"
                  role="radio"
                  aria-checked={isSelected}
                  onClick={() => updateField('descriptionDisplayMode', option.value)}
                  className={`p-3 rounded-lg border text-left transition-colors cursor-pointer flex items-start gap-2.5 ${
                    isSelected
                      ? 'bg-[#EFF6FF] border-[#1E40AF] text-[#181614]'
                      : 'bg-[#FAF9F6] border-[#E6E2DA] text-[#4A453F] hover:border-[#BDB5A8]'
                  }`}
                >
                  <span
                    className={`mt-0.5 p-1.5 rounded-md border shrink-0 ${
                      isSelected
                        ? 'bg-[#1E40AF] text-white border-[#1E40AF]'
                        : 'bg-white text-[#6B655E] border-[#E6E2DA]'
                    }`}
                  >
                    <Icon className="w-3.5 h-3.5" aria-hidden="true" />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs font-semibold text-[#181614]">
                      {option.label}
                    </span>
                    <span className="block text-[11px] text-[#6B655E] leading-snug mt-0.5">
                      {option.desc}
                    </span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Store Pause / Maintenance Mode */}
        <div className="space-y-3 pt-4 border-t border-[#EFECE6]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6B655E]">
                Store Pause / Maintenance Mode
              </h3>
              <p className="text-[11px] text-[#857E75] mt-0.5">
                Temporarily pause new Litecoin checkouts while keeping Order Lookup open for past
                buyers.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={draft.maintenanceMode}
              onClick={() => updateField('maintenanceMode', !draft.maintenanceMode)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg border transition-colors cursor-pointer shrink-0 ${
                draft.maintenanceMode
                  ? 'bg-[#FFFBEB] text-[#B45309] border-[#FCD34D] hover:bg-[#FEF3C7]'
                  : 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0] hover:bg-[#D1FAE5]'
              }`}
            >
              {draft.maintenanceMode ? 'Store Paused' : 'Store Live'}
            </button>
          </div>

          {draft.maintenanceMode ? (
            <div className="space-y-3 p-3.5 bg-[#FFFBEB]/70 border border-[#FDE68A] rounded-lg">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-[#6B655E]">
                  Notice Title <span className="text-[#9E978E]">(optional)</span>
                </label>
                <input
                  type="text"
                  dir="auto"
                  maxLength={80}
                  value={draft.maintenanceTitle}
                  onChange={(e) => updateField('maintenanceTitle', e.target.value)}
                  placeholder={
                    isPersianPreview ? 'فروشگاه موقتاً متوقف است' : 'Store Temporarily Paused'
                  }
                  className="w-full px-3 py-2 text-sm bg-white border border-[#DBD5CA] rounded-lg focus:outline-none focus:border-[#1E40AF]"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-medium text-[#6B655E]">
                  Notice Message <span className="text-[#9E978E]">(optional)</span>
                </label>
                <textarea
                  rows={2}
                  dir="auto"
                  maxLength={320}
                  value={draft.maintenanceMessage}
                  onChange={(e) => updateField('maintenanceMessage', e.target.value)}
                  placeholder={
                    isPersianPreview
                      ? 'ثبت سفارش جدید موقتاً برای بروزرسانی متوقف شده است. خریداران قبلی می‌توانند از پیگیری سفارش استفاده کنند.'
                      : 'We are restocking codes or updating the store. Existing buyers can still access codes in Order Lookup.'
                  }
                  className="w-full px-3 py-2 text-sm bg-white border border-[#DBD5CA] rounded-lg focus:outline-none focus:border-[#1E40AF]"
                />
              </div>

              <label className="flex items-start gap-2.5 cursor-pointer pt-0.5">
                <input
                  type="checkbox"
                  checked={draft.maintenanceHideCatalog}
                  onChange={(e) => updateField('maintenanceHideCatalog', e.target.checked)}
                  className="mt-0.5 rounded border-[#DBD5CA]"
                />
                <span className="text-xs text-[#6B655E] leading-relaxed">
                  <strong className="text-[#181614]">Hide book catalog during maintenance</strong> —
                  replace the book grid with a full maintenance notice. Leave unchecked for
                  browse-only mode (books stay visible with Buy paused).
                </span>
              </label>
            </div>
          ) : (
            <p className="text-[11px] text-[#857E75] bg-[#FAF9F6] border border-[#EFECE6] rounded-lg px-3 py-2">
              Your storefront is live and accepting new Litecoin orders. Click{' '}
              <strong className="text-[#181614]">Store Live</strong> above to pause checkouts.
            </p>
          )}
        </div>

        {/* Footer Support Link */}
        <div className="space-y-3 pt-4 border-t border-[#EFECE6]">
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-semibold uppercase tracking-wider text-[#6B655E]">
                Footer Support Link
              </h3>
              <p className="text-[11px] text-[#857E75] mt-0.5">
                Show a custom support link in the storefront footer, or deactivate it completely.
              </p>
            </div>
            <span
              className={`px-2 py-0.5 text-[11px] font-medium rounded-md border ${
                draft.supportLinkEnabled
                  ? 'bg-[#ECFDF5] text-[#047857] border-[#A7F3D0]'
                  : 'bg-[#F3F1EC] text-[#6B655E] border-[#E6E2DA]'
              }`}
            >
              {draft.supportLinkEnabled ? 'Active' : 'Deactivated'}
            </span>
          </div>

          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={draft.supportLinkEnabled}
              onChange={(e) => updateField('supportLinkEnabled', e.target.checked)}
              className="mt-0.5 rounded border-[#DBD5CA]"
            />
            <span className="text-xs text-[#6B655E] leading-relaxed">
              <strong className="text-[#181614]">Enable Support Link in Footer</strong> — uncheck to
              hide the support link completely from the storefront.
            </span>
          </label>

          {draft.supportLinkEnabled ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="space-y-1">
                <label className="block text-xs font-medium text-[#6B655E]">
                  Link Title
                </label>
                <input
                  type="text"
                  dir="auto"
                  maxLength={60}
                  value={draft.supportLinkTitle}
                  onChange={(e) => updateField('supportLinkTitle', e.target.value)}
                  placeholder="Contact Support"
                  className="w-full px-3 py-2 text-sm bg-[#FAF9F6] border border-[#DBD5CA] rounded-lg focus:outline-none focus:border-[#1E40AF]"
                />
              </div>
              <div className="space-y-1">
                <label className="block text-xs font-medium text-[#6B655E]">
                  Link URL
                </label>
                <input
                  type="text"
                  dir="ltr"
                  maxLength={300}
                  value={draft.supportLinkUrl}
                  onChange={(e) => updateField('supportLinkUrl', e.target.value)}
                  placeholder="https://t.me/yourstore"
                  className={`w-full px-3 py-2 text-sm font-mono bg-[#FAF9F6] border rounded-lg focus:outline-none ${
                    supportUrlInvalid
                      ? 'border-[#DC2626] focus:border-[#DC2626]'
                      : 'border-[#DBD5CA] focus:border-[#1E40AF]'
                  }`}
                />
                {supportUrlInvalid ? (
                  <p className="text-[11px] text-[#DC2626]">
                    Enter a valid URL starting with https://, http://, mailto:, or tg:.
                  </p>
                ) : (
                  <p className="text-[11px] text-[#857E75]">
                    Supports https://, http://, mailto:, and tg: links.
                  </p>
                )}
              </div>
            </div>
          ) : (
            <p className="text-[11px] text-[#857E75] bg-[#FAF9F6] border border-[#EFECE6] rounded-lg px-3 py-2">
              The footer support link is currently deactivated and will not appear on the storefront.
            </p>
          )}
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={isSaving}
            className="px-5 py-2.5 text-sm font-medium text-white bg-[#1E40AF] hover:bg-[#1D4ED8] rounded-lg transition-colors cursor-pointer disabled:opacity-50"
          >
            {isSaving ? 'Saving Preferences...' : 'Save Preferences'}
          </button>
        </div>
      </form>

      {/* Live Storefront Preview (Desktop / Mobile toggle) */}
      <div className="lg:col-span-5 bg-white border border-[#E6E2DA] rounded-xl p-5 space-y-3 lg:sticky lg:top-20">
        <div className="flex items-center justify-between gap-2">
          <div>
            <h3 className="text-xs font-semibold text-[#181614]">Live Main Page Preview</h3>
            <div className="text-[11px] text-[#857E75] font-mono mt-0.5">
              {draft.language === 'fa' ? 'FA · RTL' : 'EN · LTR'} ·{' '}
              {previewDevice === 'desktop'
                ? `${draft.gridColumns} cols`
                : `${draft.mobileCardStyle} · ${draft.mobileGridColumns}/row`}
            </div>
          </div>

          <div className="inline-flex items-center p-0.5 bg-[#EFECE6] rounded-lg border border-[#E6E2DA]">
            <button
              type="button"
              onClick={() => setPreviewDevice('desktop')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors cursor-pointer ${
                previewDevice === 'desktop'
                  ? 'bg-white text-[#181614] shadow-2xs'
                  : 'text-[#6B655E] hover:text-[#181614]'
              }`}
            >
              <Monitor className="w-3 h-3" />
              <span>Desktop</span>
            </button>
            <button
              type="button"
              onClick={() => setPreviewDevice('mobile')}
              className={`inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium rounded-md transition-colors cursor-pointer ${
                previewDevice === 'mobile'
                  ? 'bg-white text-[#181614] shadow-2xs'
                  : 'text-[#6B655E] hover:text-[#181614]'
              }`}
            >
              <Smartphone className="w-3 h-3" />
              <span>Mobile</span>
            </button>
          </div>
        </div>

        <div
          ref={previewRef}
          dir={isPersianPreview ? 'rtl' : 'ltr'}
          className={`storefront-preview rounded-xl border border-[#E6E2DA] overflow-hidden mx-auto transition-all ${
            previewDevice === 'mobile' ? 'max-w-[300px]' : 'w-full'
          }`}
        >
          {/* Mini Browser Tab Bar */}
          <div
            dir="ltr"
            className="px-3 py-2 bg-[#EFECE6] border-b border-[#DBD5CA] flex items-center gap-2 text-[11px] text-[#4A453F]"
          >
            <div className="px-2.5 py-1 bg-white rounded-md border border-[#E6E2DA] truncate max-w-full font-medium">
              {draft.pageTitle || 'dipi — Digital Bookstore Settled in Litecoin'}
            </div>
          </div>

          <div className="storefront-preview-overlay p-3.5 space-y-3.5">
            {/* Mini Header */}
            <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[color-mix(in_srgb,var(--preview-text)_14%,transparent)]">
              <div className="flex items-center gap-2 min-w-0">
                {draft.logoUrl && draft.logoDisplayMode !== 'text-only' && (
                  <img
                    src={draft.logoUrl}
                    alt={draft.storeName || 'Logo'}
                    className="h-6 w-auto max-w-[96px] object-contain shrink-0"
                  />
                )}
                {(!draft.logoUrl || draft.logoDisplayMode !== 'logo-only') && (
                  <span dir="auto" className="storefront-preview-title text-base truncate">
                    {draft.storeName || 'dipi'}
                  </span>
                )}
              </div>
              <span className="text-[11px] opacity-75 shrink-0">
                {isPersianPreview ? 'پیگیری سفارش' : 'Order Lookup'}
              </span>
            </div>

            {draft.maintenanceMode && draft.maintenanceHideCatalog ? (
              <div
                className={`p-4 text-center space-y-2 bg-[var(--preview-surface)] border border-[color-mix(in_srgb,var(--preview-text)_16%,transparent)] ${radiusClass}`}
              >
                <div className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium rounded-md bg-[#FFFBEB] text-[#B45309] border border-[#FDE68A]">
                  <PauseCircle className="w-3 h-3 shrink-0" />
                  <span>{isPersianPreview ? 'حالت توقف موقت' : 'Maintenance Mode'}</span>
                </div>
                <div dir="auto" className="storefront-preview-title text-sm font-bold">
                  {draft.maintenanceTitle.trim() ||
                    (isPersianPreview ? 'فروشگاه موقتاً متوقف است' : 'Store Temporarily Paused')}
                </div>
                <p dir="auto" className="text-[10px] opacity-75 leading-relaxed">
                  {draft.maintenanceMessage.trim() ||
                    (isPersianPreview
                      ? 'ثبت سفارش جدید موقتاً متوقف شده است. خریداران قبلی می‌توانند از پیگیری سفارش استفاده کنند.'
                      : 'New checkouts are temporarily paused. Existing buyers can still use Order Lookup.')}
                </p>
                <div className="pt-1">
                  <span className="inline-block px-2.5 py-1 text-[10px] font-semibold rounded-md bg-[var(--preview-accent)] text-white">
                    {isPersianPreview ? 'پیگیری سفارش‌های قبلی' : 'Open Order Lookup'}
                  </span>
                </div>
              </div>
            ) : (
              <>
                {draft.maintenanceMode && (
                  <div className="px-2.5 py-2 rounded-lg bg-[#FFFBEB] border border-[#FDE68A] text-[#92400E] space-y-0.5">
                    <div className="flex items-center gap-1.5 text-[10px] font-semibold">
                      <PauseCircle className="w-3 h-3 shrink-0" />
                      <span dir="auto" className="truncate">
                        {draft.maintenanceTitle.trim() ||
                          (isPersianPreview
                            ? 'فروشگاه موقتاً متوقف است'
                            : 'Store Temporarily Paused')}
                      </span>
                    </div>
                    <p dir="auto" className="text-[9px] opacity-85 line-clamp-2">
                      {draft.maintenanceMessage.trim() ||
                        (isPersianPreview
                          ? 'ثبت سفارش جدید موقتاً متوقف شده است.'
                          : 'New checkouts are temporarily paused for maintenance.')}
                    </p>
                  </div>
                )}

                {(draft.showSearchBar || draft.showCategoryFilter || draft.showSortControl) && (
              <div className="space-y-2">
                {(draft.showSearchBar || draft.showSortControl) && (
                  <div className="flex items-center justify-between gap-2 text-[10px]">
                    {draft.showSearchBar && (
                      <span className="px-2 py-1 rounded-md bg-[var(--preview-surface)] border border-[color-mix(in_srgb,var(--preview-text)_14%,transparent)] opacity-70 truncate">
                        {isPersianPreview ? 'جستجو...' : 'Search...'}
                      </span>
                    )}
                    {draft.showSortControl && (
                      <span className="px-2 py-1 rounded-md bg-[var(--preview-surface)] border border-[color-mix(in_srgb,var(--preview-text)_14%,transparent)] opacity-85 shrink-0">
                        {isPersianPreview ? 'مرتب‌سازی: پیش‌فرض' : 'Sort: Featured'}
                      </span>
                    )}
                  </div>
                )}
                {draft.showCategoryFilter && (
                  <div className="flex flex-wrap items-center gap-1 text-[10px]">
                    <span className="px-2 py-0.5 rounded-md bg-[var(--preview-accent)] text-white font-medium">
                      {isPersianPreview ? 'همه' : 'All'}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-[var(--preview-surface)] border border-[color-mix(in_srgb,var(--preview-text)_14%,transparent)] opacity-80">
                      {isPersianPreview ? 'داستان کلاسیک' : 'Classic Fiction'}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-[var(--preview-surface)] border border-[color-mix(in_srgb,var(--preview-text)_14%,transparent)] opacity-80">
                      {isPersianPreview ? 'علمی‌تخیلی' : 'Science Fiction'}
                    </span>
                  </div>
                )}
              </div>
            )}

            {previewDevice === 'desktop' ? (
              /* Desktop Sample Card */
              <div
                className={`bg-[var(--preview-surface)] border border-[color-mix(in_srgb,var(--preview-text)_14%,transparent)] ${radiusClass} overflow-hidden max-w-[240px] mx-auto shadow-xs`}
              >
                <div className="relative aspect-[210/297] max-h-40 w-full bg-[color-mix(in_srgb,var(--preview-text)_8%,transparent)] flex items-center justify-center p-4">
                  <span className="storefront-preview-title text-lg text-center opacity-80">
                    {isPersianPreview ? 'صد سال تنهایی' : 'One Hundred Years'}
                  </span>
                  {draft.descriptionDisplayMode === 'detail-modal' && (
                    <span className="absolute top-1.5 end-1.5 p-1 rounded-md bg-[var(--preview-surface)] border border-[color-mix(in_srgb,var(--preview-text)_16%,transparent)] opacity-85">
                      <Info className="w-2.5 h-2.5" aria-hidden="true" />
                    </span>
                  )}
                  {draft.descriptionDisplayMode === 'cover-flip' && (
                    <span className="absolute top-1.5 end-1.5 p-1 rounded-md bg-[var(--preview-surface)] border border-[color-mix(in_srgb,var(--preview-text)_16%,transparent)] opacity-85">
                      <RotateCw className="w-2.5 h-2.5" aria-hidden="true" />
                    </span>
                  )}
                </div>
                <div className="px-3.5 py-1.5 border-b border-[color-mix(in_srgb,var(--preview-text)_10%,transparent)] flex items-center">
                  <div className="storefront-preview-title text-lg/[1.05]">
                    {isPersianPreview ? 'صد سال تنهایی' : 'One Hundred Years'}
                  </div>
                </div>
                <div className="px-3.5 py-2 space-y-1 text-[11px] opacity-80">
                  <div className="flex justify-between gap-2">
                    <span className="opacity-70">{isPersianPreview ? 'نویسنده' : 'Writer'}</span>
                    <span>{isPersianPreview ? 'گابریل گارسیا مارکز' : 'G. García Márquez'}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span className="opacity-70">
                      {isPersianPreview ? 'انتشارات' : 'Publication'}
                    </span>
                    <span>{isPersianPreview ? 'امیرکبیر' : 'Amir Kabir'}</span>
                  </div>
                </div>
                <div className="px-3.5 py-2.5 border-t border-[color-mix(in_srgb,var(--preview-text)_12%,transparent)] flex items-center justify-between gap-2 text-[11px]">
                  <div className="flex items-baseline gap-1 min-w-0">
                    <span dir="ltr" className="font-mono font-semibold text-xs shrink-0">
                      $14
                    </span>
                    <span className="text-[9px] opacity-65 truncate">
                      {isPersianPreview ? '(پرداخت با لایت‌کوین)' : '(Paid by LTC)'}
                    </span>
                  </div>
                  <span className="px-2.5 py-1 rounded-md font-semibold bg-[var(--preview-accent)] text-white shrink-0">
                    {isPersianPreview ? 'خرید' : 'Buy'}
                  </span>
                </div>
              </div>
            ) : (
              /* Mobile Sample Grid (2 books reflecting mobile columns, style, gap & metadata) */
              <div
                className={`grid ${
                  draft.mobileCardStyle === 'horizontal' || draft.mobileGridColumns === 1
                    ? 'grid-cols-1'
                    : 'grid-cols-2'
                } ${
                  draft.mobileGridGap === 'tight'
                    ? 'gap-x-2 gap-y-0'
                    : draft.mobileGridGap === 'airy'
                      ? 'gap-x-4 gap-y-0'
                      : 'gap-x-3 gap-y-0'
                }`}
              >
                {(isPersianPreview
                  ? [
                      {
                        title: 'صد سال تنهایی',
                        writer: 'مارکز',
                        translator: 'بهمن فرزانه',
                        pub: 'امیرکبیر',
                        price: '$14',
                      },
                      {
                        title: 'بیگانه',
                        writer: 'آلبر کامو',
                        translator: 'جلال آل‌احمد',
                        pub: 'نشر چشمه',
                        price: '$9',
                      },
                    ]
                  : [
                      {
                        title: 'One Hundred Years',
                        writer: 'G. Márquez',
                        translator: 'G. Rabassa',
                        pub: 'Amir Kabir',
                        price: '$14',
                      },
                      {
                        title: 'The Stranger',
                        writer: 'Albert Camus',
                        translator: 'M. Ward',
                        pub: 'Cheshmeh',
                        price: '$9',
                      },
                    ]
                ).map((sample) => {
                  const isHoriz = draft.mobileCardStyle === 'horizontal';
                  const isCoverOnly = draft.mobileCardStyle === 'cover-focus';
                  const isComp = draft.mobileCardStyle === 'compact';
                  const useMetaIcons =
                    draft.mobileGridColumns === 2 &&
                    (draft.mobileCardStyle === 'standard' || draft.mobileCardStyle === 'compact');
                  const previewBody = (
                    <>
                      <div
                        className={`w-full flex items-center ${
                          isCoverOnly
                            ? ''
                            : 'border-b border-[color-mix(in_srgb,var(--preview-text)_10%,transparent)]'
                        } ${isComp || isCoverOnly ? 'px-2 py-1' : 'px-2.5 py-1.5'}`}
                      >
                        <div
                          className={`storefront-preview-title line-clamp-2 ${
                            isComp || isCoverOnly ? 'text-xs/[1.05]' : 'text-sm/[1.05]'
                          }`}
                        >
                          {sample.title}
                        </div>
                      </div>

                      <div
                        className={
                          isCoverOnly
                            ? 'h-0 overflow-hidden p-0 min-w-0'
                            : `space-y-0.5 text-[10px] opacity-80 min-w-0 overflow-hidden ${
                                isComp ? 'px-2 py-1' : 'px-2.5 py-1.5'
                              } ${isHoriz ? 'flex-1' : ''}`
                        }
                      >
                        <div
                          className={`flex items-center ${
                            useMetaIcons ? 'justify-start gap-1.5' : 'justify-between gap-1'
                          }`}
                        >
                          {useMetaIcons ? (
                            <PenLine className="w-3 h-3 opacity-65 shrink-0" aria-hidden="true" />
                          ) : (
                            <span className="opacity-65 shrink-0">
                              {isPersianPreview ? 'نویسنده' : 'Writer'}
                            </span>
                          )}
                          <span className="truncate">{sample.writer}</span>
                        </div>
                        {draft.mobileShowMetadata && (
                          <>
                            <div
                              className={`flex items-center ${
                                useMetaIcons ? 'justify-start gap-1.5' : 'justify-between gap-1'
                              }`}
                            >
                              {useMetaIcons ? (
                                <Languages
                                  className="w-3 h-3 opacity-65 shrink-0"
                                  aria-hidden="true"
                                />
                              ) : (
                                <span className="opacity-65 shrink-0">
                                  {isPersianPreview ? 'ترجمه' : 'Trans.'}
                                </span>
                              )}
                              <span className="truncate">{sample.translator}</span>
                            </div>
                            <div
                              className={`flex items-center ${
                                useMetaIcons ? 'justify-start gap-1.5' : 'justify-between gap-1'
                              }`}
                            >
                              {useMetaIcons ? (
                                <Building2
                                  className="w-3 h-3 opacity-65 shrink-0"
                                  aria-hidden="true"
                                />
                              ) : (
                                <span className="opacity-65 shrink-0">
                                  {isPersianPreview ? 'انتشارات' : 'Pub.'}
                                </span>
                              )}
                              <span className="truncate">{sample.pub}</span>
                            </div>
                          </>
                        )}
                      </div>

                      <div
                        className={`${
                          isComp || isCoverOnly ? 'px-2 py-1.5' : 'px-2.5 py-2'
                        } border-t border-[color-mix(in_srgb,var(--preview-text)_12%,transparent)] flex items-center justify-between gap-1 text-[10px] ${
                          isHoriz ? 'mt-auto' : ''
                        }`}
                      >
                        <div className="flex items-baseline gap-1 min-w-0">
                          <span dir="ltr" className="font-mono font-semibold text-[11px] shrink-0">
                            {sample.price}
                          </span>
                          <span className="text-[8px] opacity-65 truncate">
                            {isPersianPreview ? '(پرداخت با لایت‌کوین)' : '(Paid by LTC)'}
                          </span>
                        </div>
                        <span className="px-2 py-0.5 rounded-md font-semibold bg-[var(--preview-accent)] text-white shrink-0">
                          {isPersianPreview ? 'خرید' : 'Buy'}
                        </span>
                      </div>
                    </>
                  );

                  const previewMargin =
                    draft.mobileGridGap === 'tight'
                      ? 'mb-2'
                      : draft.mobileGridGap === 'airy'
                        ? 'mb-4'
                        : 'mb-3';

                  return (
                    <div
                      key={sample.title}
                      className={`bg-[var(--preview-surface)] border border-[color-mix(in_srgb,var(--preview-text)_14%,transparent)] ${radiusClass} ${previewMargin} overflow-hidden min-w-0 ${
                        isHoriz
                          ? 'flex flex-row'
                          : 'grid grid-cols-1 grid-rows-subgrid row-span-4 gap-y-0 items-stretch'
                      }`}
                    >
                      <div
                        className={`relative ${
                          isHoriz
                            ? 'w-16 shrink-0 aspect-[210/297] border-e'
                            : 'w-full aspect-[210/297] max-h-28 border-b'
                        } border-[color-mix(in_srgb,var(--preview-text)_12%,transparent)] bg-[color-mix(in_srgb,var(--preview-text)_8%,transparent)] flex items-center justify-center p-2`}
                      >
                        <span className="storefront-preview-title text-[10px]/[1.18] text-center opacity-75">
                          {sample.title}
                        </span>
                        {draft.descriptionDisplayMode === 'detail-modal' && (
                          <span className="absolute top-1 end-1 p-0.5 rounded bg-[var(--preview-surface)] border border-[color-mix(in_srgb,var(--preview-text)_16%,transparent)] opacity-85">
                            <Info className="w-2.5 h-2.5" aria-hidden="true" />
                          </span>
                        )}
                        {draft.descriptionDisplayMode === 'cover-flip' && (
                          <span className="absolute top-1 end-1 p-0.5 rounded bg-[var(--preview-surface)] border border-[color-mix(in_srgb,var(--preview-text)_16%,transparent)] opacity-85">
                            <RotateCw className="w-2.5 h-2.5" aria-hidden="true" />
                          </span>
                        )}
                      </div>

                      {isHoriz ? (
                        <div className="flex flex-col flex-1 min-w-0">{previewBody}</div>
                      ) : (
                        previewBody
                      )}
                    </div>
                  );
                })}
              </div>
            )}
              </>
            )}

            {/* Mini Footer Preview */}
            <div
              dir="ltr"
              className="pt-2 border-t border-[color-mix(in_srgb,var(--preview-text)_12%,transparent)] text-center space-y-1"
            >
              {previewHasSupportLink && (
                <div>
                  <span
                    dir="auto"
                    className="inline-flex items-center gap-1 text-[11px] font-medium text-[var(--preview-accent)]"
                  >
                    <LifeBuoy className="w-3 h-3 shrink-0" aria-hidden="true" />
                    <span>{draft.supportLinkTitle.trim()}</span>
                  </span>
                </div>
              )}
              <p className="text-[10px] opacity-65">
                Powered By <span className="font-aguafina text-sm leading-none">dipi</span>
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
