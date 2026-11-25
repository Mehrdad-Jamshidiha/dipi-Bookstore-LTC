export type StoreLang = 'en' | 'fa';

export interface StoreCopy {
  nav: {
    books: string;
    adminVault: string;
    orderLookup: string;
    primaryNavLabel: string;
    switchLanguageLabel: string;
  };
  catalog: {
    searchPlaceholder: string;
    allCategories: string;
    categoriesLabel: string;
    sortLabel: string;
    sortFeatured: string;
    sortPriceAsc: string;
    sortPriceDesc: string;
    sortTitleAsc: string;
    ltcSpotLabel: string;
    tapToPayHint: string;
    emptyCatalogTitle: string;
    emptyCatalogDesc: string;
    noBooksMatch: string;
    loadError: string;
    checkoutError: string;
  };
  card: {
    coverAlt: (title: string) => string;
    writer: string;
    translator: string;
    publication: string;
    outOfStock: string;
    paused: string;
    opening: string;
    buy: string;
    paidByLtc: string;
    viewDetails: string;
    showBlurb: string;
    showCover: string;
  };
  checkout: {
    closeLabel: string;
    confirmedUnlocked: string;
    quoteExpired: string;
    orderCancelled: string;
    awaitingLtc: string;
    cancelOrder: string;
    cancellingOrder: string;
    cancelFailed: string;
    translatorPrefix: (name: string) => string;
    listeningDefault: string;
    listeningFallback: string;
    copyFailed: string;
    pollError: string;
    enterTxidError: string;
    verifyFailed: string;
    sandboxFailed: string;
    downloadFailed: string;
    verifiedBanner: string;
    confirmations: (count: number) => string;
    copied: string;
    copyCode: string;
    copy: string;
    downloading: string;
    downloadTxt: string;
    howToRedeem: string;
    amountSettled: string;
    txidLabel: string;
    orderAccessKey: string;
    copiedBang: string;
    scanToPay: string;
    payWithLitecoin: string;
    showQrCode: string;
    hideQrCode: string;
    qrAlt: (amount: string) => string;
    openWallet: string;
    checkingBlockchain: string;
    checkPaymentNow: string;
    exactAmount: string;
    ltcAddress: (network: string) => string;
    pasteTxidLabel: string;
    txidPlaceholder: string;
    verifying: string;
    verifyTxid: string;
    sandboxTitle: string;
    sandboxDesc: string;
    simulating: string;
    simulatePayment: string;
    accessKeyLabel: string;
    copyOrderAndKey: string;
    havePromoCode: string;
    promoPlaceholder: string;
    applyPromo: string;
    applyingPromo: string;
    removePromo: string;
    promoCodeLabel: string;
    promoSaved: (amount: string) => string;
    enterPromoError: string;
    promoFailed: string;
    aboutBook: string;
  };
  lookup: {
    title: string;
    subtitle: string;
    formTitle: string;
    closeLabel: string;
    orderIdLabel: string;
    orderKeyLabel: string;
    orderKeyPlaceholder: string;
    showKeyLabel: string;
    hideKeyLabel: string;
    missingFieldsError: string;
    notFoundError: string;
    reopenError: string;
    loading: string;
    openOrder: string;
    recentThisSession: string;
    emptySessionTitle: string;
    emptySessionDesc: string;
    statusLabel: (status: string) => string;
  };
  openOrderPrompt: {
    title: string;
    description: string;
    currentOrderLabel: string;
    newBookLabel: string;
    cancelAndOpenNew: string;
    cancellingAndOpening: string;
    openExistingOrder: string;
    keepCurrentOrder: string;
    closeLabel: string;
  };
  maintenance: {
    badge: string;
    defaultTitle: string;
    defaultMessage: string;
    orderLookupCta: string;
  };
  detailModal: {
    closeLabel: string;
    subject: string;
    aboutBook: string;
  };
}

export const STORE_COPY: Record<StoreLang, StoreCopy> = {
  en: {
    nav: {
      books: 'Books',
      adminVault: 'Admin Vault',
      orderLookup: 'Order Lookup',
      primaryNavLabel: 'Primary navigation',
      switchLanguageLabel: 'Switch language',
    },
    catalog: {
      searchPlaceholder: 'Search title, subject, writer, translator, publication...',
      allCategories: 'All',
      categoriesLabel: 'Filter by subject',
      sortLabel: 'Sort books',
      sortFeatured: 'Featured',
      sortPriceAsc: 'Price: Low to High',
      sortPriceDesc: 'Price: High to Low',
      sortTitleAsc: 'Title: A–Z',
      ltcSpotLabel: 'LTC Spot',
      tapToPayHint: 'Tap any book to pay with Litecoin',
      emptyCatalogTitle: 'No books available yet',
      emptyCatalogDesc: 'This storefront is ready — books added in Admin Vault will appear here.',
      noBooksMatch: 'No books match your search.',
      loadError: 'Unable to load books.',
      checkoutError: 'Could not open Litecoin checkout.',
    },
    card: {
      coverAlt: (title) => `Cover of ${title}`,
      writer: 'Writer',
      translator: 'Translator',
      publication: 'Publication',
      outOfStock: 'Out of stock',
      paused: 'Paused',
      opening: 'Opening...',
      buy: 'Buy',
      paidByLtc: '(Paid by LTC)',
      viewDetails: 'Details',
      showBlurb: 'Read description',
      showCover: 'Back to cover',
    },
    checkout: {
      closeLabel: 'Close checkout',
      confirmedUnlocked: 'Confirmed & Unlocked',
      quoteExpired: 'Quote Expired',
      orderCancelled: 'Order Cancelled',
      awaitingLtc: 'Awaiting LTC',
      cancelOrder: 'Cancel Order',
      cancellingOrder: 'Cancelling...',
      cancelFailed: 'Could not cancel order.',
      translatorPrefix: (name) => `Trans. ${name}`,
      listeningDefault: 'Listening on Litecoin network for exact payment...',
      listeningFallback: 'Listening for incoming Litecoin transaction...',
      copyFailed: 'Clipboard copy failed. Please select and copy manually.',
      pollError: 'Unable to check blockchain right now.',
      enterTxidError: 'Paste your 64-character Litecoin transaction ID (TXID).',
      verifyFailed: 'Verification failed.',
      sandboxFailed: 'Sandbox confirmation failed.',
      downloadFailed: 'Download failed.',
      verifiedBanner: 'Litecoin payment verified — code marked used in codes.json',
      confirmations: (count) => `${count} confirmation${count === 1 ? '' : 's'}`,
      copied: 'Copied',
      copyCode: 'Copy Code',
      copy: 'Copy',
      downloading: 'Downloading...',
      downloadTxt: 'Download Receipt',
      howToRedeem: 'How to Redeem',
      amountSettled: 'Amount Settled',
      txidLabel: 'TXID',
      orderAccessKey: 'Order Access Key',
      copiedBang: 'Copied!',
      scanToPay: 'Scan to pay with Litecoin',
      payWithLitecoin: 'Pay with Litecoin',
      showQrCode: 'Show QR Code',
      hideQrCode: 'Hide QR Code',
      qrAlt: (amount) => `Litecoin payment QR code for ${amount} LTC`,
      openWallet: 'Open Litecoin Wallet',
      checkingBlockchain: 'Checking blockchain...',
      checkPaymentNow: 'Check Payment Now',
      exactAmount: 'Exact Litecoin Amount',
      ltcAddress: (network) => `Litecoin Address (${network})`,
      pasteTxidLabel: 'Fast Verify By TXID',
      txidPlaceholder: '64-character Litecoin transaction hash...',
      verifying: 'Verifying...',
      verifyTxid: 'Verify TXID',
      sandboxTitle: 'Sandbox Test Mode',
      sandboxDesc:
        'Simulate a confirmed Litecoin transaction to mark the code used in codes.json and unlock download.',
      simulating: 'Confirming & Updating codes.json...',
      simulatePayment: 'Simulate Confirmed LTC Payment',
      accessKeyLabel: 'Access Key:',
      copyOrderAndKey: 'Copy Order & Key',
      havePromoCode: 'Have a Promo Code?',
      promoPlaceholder: 'Enter promo code (e.g. SAVE20)',
      applyPromo: 'Apply',
      applyingPromo: 'Applying...',
      removePromo: 'Remove',
      promoCodeLabel: 'Promo Code',
      promoSaved: (amount) => `Saved ${amount}`,
      enterPromoError: 'Enter a promo code to apply.',
      promoFailed: 'Could not apply promo code.',
      aboutBook: 'About this book',
    },
    lookup: {
      title: 'Order Lookup',
      subtitle:
        'Check your Litecoin payment status or reopen your digital book code with your Order ID and Access Key.',
      formTitle: 'Find Your Order',
      closeLabel: 'Close order lookup',
      orderIdLabel: 'Order ID',
      orderKeyLabel: 'Order Access Key',
      orderKeyPlaceholder: 'Access key shown at checkout',
      showKeyLabel: 'Show access key',
      hideKeyLabel: 'Hide access key',
      missingFieldsError: 'Enter both your Order ID and Access Key.',
      notFoundError: 'Order not found.',
      reopenError: 'Could not open order.',
      loading: 'Loading...',
      openOrder: 'Open Order',
      recentThisSession: 'Recent This Session',
      emptySessionTitle: 'No orders opened in this session yet',
      emptySessionDesc:
        'Orders you start or reopen in this browser tab appear here for quick access.',
      statusLabel: (status) => status,
    },
    openOrderPrompt: {
      title: 'You Already Have an Open Order',
      description:
        'Only 1 open order is allowed at a time. Cancel your last open order to start a new one.',
      currentOrderLabel: 'Current Open Order',
      newBookLabel: 'New Book Selected',
      cancelAndOpenNew: 'Cancel Last Order & Open New',
      cancellingAndOpening: 'Cancelling & Opening...',
      openExistingOrder: 'View Current Order',
      keepCurrentOrder: 'Keep Current Order',
      closeLabel: 'Close prompt',
    },
    maintenance: {
      badge: 'Maintenance Mode',
      defaultTitle: 'Store Temporarily Paused',
      defaultMessage:
        'New checkouts are temporarily paused for maintenance. Existing buyers can still access their codes in Order Lookup.',
      orderLookupCta: 'Open Order Lookup',
    },
    detailModal: {
      closeLabel: 'Close book details',
      subject: 'Subject',
      aboutBook: 'About this book',
    },
  },
  fa: {
    nav: {
      books: 'کتاب‌ها',
      adminVault: 'پنل مدیریت',
      orderLookup: 'پیگیری سفارش',
      primaryNavLabel: 'منوی اصلی',
      switchLanguageLabel: 'تغییر زبان',
    },
    catalog: {
      searchPlaceholder: 'جستجوی عنوان، موضوع، نویسنده، مترجم یا انتشارات...',
      allCategories: 'همه',
      categoriesLabel: 'فیلتر بر اساس موضوع',
      sortLabel: 'مرتب‌سازی کتاب‌ها',
      sortFeatured: 'پیش‌فرض',
      sortPriceAsc: 'قیمت: کم به زیاد',
      sortPriceDesc: 'قیمت: زیاد به کم',
      sortTitleAsc: 'عنوان: الف تا ی',
      ltcSpotLabel: 'نرخ لحظه‌ای لایت‌کوین',
      tapToPayHint: 'برای خرید با لایت‌کوین روی هر کتاب بزنید',
      emptyCatalogTitle: 'هنوز کتابی ثبت نشده است',
      emptyCatalogDesc: 'فروشگاه آماده است — کتاب‌هایی که در پنل مدیریت اضافه شوند اینجا نمایش داده می‌شوند.',
      noBooksMatch: 'کتابی مطابق با جستجوی شما یافت نشد.',
      loadError: 'بارگذاری فهرست کتاب‌ها با خطا مواجه شد.',
      checkoutError: 'امکان باز کردن صفحه پرداخت لایت‌کوین وجود ندارد.',
    },
    card: {
      coverAlt: (title) => `جلد کتاب ${title}`,
      writer: 'نویسنده',
      translator: 'مترجم',
      publication: 'انتشارات',
      outOfStock: 'ناموجود',
      paused: 'متوقف',
      opening: 'در حال باز شدن...',
      buy: 'خرید',
      paidByLtc: '(پرداخت با لایت‌کوین)',
      viewDetails: 'توضیحات',
      showBlurb: 'مشاهده توضیحات کتاب',
      showCover: 'بازگشت به جلد',
    },
    checkout: {
      closeLabel: 'بستن پنجره پرداخت',
      confirmedUnlocked: 'تأیید و تحویل شد',
      quoteExpired: 'مهلت پرداخت تمام شد',
      orderCancelled: 'سفارش لغو شد',
      awaitingLtc: 'در انتظار پرداخت لایت‌کوین',
      cancelOrder: 'لغو سفارش',
      cancellingOrder: 'در حال لغو...',
      cancelFailed: 'لغو سفارش ناموفق بود.',
      translatorPrefix: (name) => `ترجمه ${name}`,
      listeningDefault: 'در حال بررسی شبکه لایت‌کوین برای دریافت مبلغ دقیق...',
      listeningFallback: 'در انتظار دریافت تراکنش لایت‌کوین...',
      copyFailed: 'کپی ناموفق بود. لطفاً متن را به‌صورت دستی کپی کنید.',
      pollError: 'در حال حاضر امکان بررسی بلاک‌چین وجود ندارد.',
      enterTxidError: 'شناسه ۶۴ کاراکتری تراکنش لایت‌کوین (TXID) را وارد کنید.',
      verifyFailed: 'تأیید تراکنش ناموفق بود.',
      sandboxFailed: 'شبیه‌سازی پرداخت ناموفق بود.',
      downloadFailed: 'دانلود فایل ناموفق بود.',
      verifiedBanner: 'پرداخت لایت‌کوین تأیید شد — کد شما فعال و تحویل داده شد',
      confirmations: (count) => `${count} تأیید شبکه`,
      copied: 'کپی شد',
      copyCode: 'کپی کد',
      copy: 'کپی',
      downloading: 'در حال دانلود...',
      downloadTxt: 'دانلود رسید',
      howToRedeem: 'راهنمای استفاده',
      amountSettled: 'مبلغ تسویه‌شده',
      txidLabel: 'شناسه تراکنش (TXID)',
      orderAccessKey: 'کلید دسترسی سفارش',
      copiedBang: 'کپی شد!',
      scanToPay: 'برای پرداخت با لایت‌کوین اسکن کنید',
      payWithLitecoin: 'پرداخت با لایت‌کوین',
      showQrCode: 'نمایش کد QR',
      hideQrCode: 'پنهان کردن کد QR',
      qrAlt: (amount) => `کد QR پرداخت ${amount} لایت‌کوین`,
      openWallet: 'باز کردن کیف‌پول لایت‌کوین',
      checkingBlockchain: 'در حال بررسی بلاک‌چین...',
      checkPaymentNow: 'بررسی مجدد پرداخت',
      exactAmount: 'مبلغ دقیق لایت‌کوین',
      ltcAddress: (network) => `آدرس لایت‌کوین (${network})`,
      pasteTxidLabel: 'تأیید سریع با TXID',
      txidPlaceholder: 'هش ۶۴ کاراکتری تراکنش لایت‌کوین...',
      verifying: 'در حال بررسی...',
      verifyTxid: 'تأیید TXID',
      sandboxTitle: 'حالت آزمایشی (Sandbox)',
      sandboxDesc:
        'یک تراکنش تأییدشده لایت‌کوین را شبیه‌سازی کنید تا وضعیت کد به‌روزرسانی شده و دانلود باز شود.',
      simulating: 'در حال تأیید و ثبت...',
      simulatePayment: 'شبیه‌سازی پرداخت موفق لایت‌کوین',
      accessKeyLabel: 'کلید دسترسی:',
      copyOrderAndKey: 'کپی شماره سفارش و کلید',
      havePromoCode: 'کد تخفیف دارید؟',
      promoPlaceholder: 'کد تخفیف را وارد کنید...',
      applyPromo: 'اعمال',
      applyingPromo: 'در حال اعمال...',
      removePromo: 'حذف',
      promoCodeLabel: 'کد تخفیف',
      promoSaved: (amount) => `${amount} تخفیف`,
      enterPromoError: 'لطفاً یک کد تخفیف وارد کنید.',
      promoFailed: 'اعمال کد تخفیف ناموفق بود.',
      aboutBook: 'درباره این کتاب',
    },
    lookup: {
      title: 'پیگیری سفارش',
      subtitle:
        'با وارد کردن شماره سفارش و کلید دسترسی، وضعیت پرداخت لایت‌کوین یا کد کتاب خود را مشاهده کنید.',
      formTitle: 'جستجوی سفارش',
      closeLabel: 'بستن پیگیری سفارش',
      orderIdLabel: 'شماره سفارش',
      orderKeyLabel: 'کلید دسترسی سفارش',
      orderKeyPlaceholder: 'کلید نمایش‌داده‌شده در صفحه پرداخت',
      showKeyLabel: 'نمایش کلید دسترسی',
      hideKeyLabel: 'پنهان کردن کلید دسترسی',
      missingFieldsError: 'هر دو فیلد شماره سفارش و کلید دسترسی را وارد کنید.',
      notFoundError: 'سفارشی با این مشخصات یافت نشد.',
      reopenError: 'امکان باز کردن سفارش وجود ندارد.',
      loading: 'در حال جستجو...',
      openOrder: 'مشاهده سفارش',
      recentThisSession: 'سفارش‌های اخیر این نشست',
      emptySessionTitle: 'هنوز سفارشی در این نشست باز نشده است',
      emptySessionDesc:
        'سفارش‌هایی که در این تب ثبت یا باز کنید، برای دسترسی سریع در این بخش نمایش داده می‌شوند.',
      statusLabel: (status) =>
        status === 'confirmed'
          ? 'تأییدشده'
          : status === 'pending'
            ? 'در انتظار پرداخت'
            : status === 'cancelled'
              ? 'لغوشده'
              : status === 'expired'
                ? 'منقضی‌شده'
                : status,
    },
    openOrderPrompt: {
      title: 'شما یک سفارش باز دارید',
      description:
        'هر کاربر هم‌زمان فقط می‌تواند ۱ سفارش باز داشته باشد. برای ثبت سفارش جدید، ابتدا سفارش قبلی را لغو کنید.',
      currentOrderLabel: 'سفارش باز فعلی',
      newBookLabel: 'کتاب جدید انتخاب‌شده',
      cancelAndOpenNew: 'لغو سفارش قبلی و ثبت سفارش جدید',
      cancellingAndOpening: 'در حال لغو و باز کردن...',
      openExistingOrder: 'مشاهده سفارش فعلی',
      keepCurrentOrder: 'نگه‌داشتن سفارش فعلی',
      closeLabel: 'بستن پنجره',
    },
    maintenance: {
      badge: 'حالت توقف موقت',
      defaultTitle: 'فروشگاه موقتاً متوقف است',
      defaultMessage:
        'ثبت سفارش جدید موقتاً برای بروزرسانی متوقف شده است. خریداران قبلی همچنان می‌توانند از بخش پیگیری سفارش به کد خود دسترسی داشته باشند.',
      orderLookupCta: 'پیگیری سفارش‌های قبلی',
    },
    detailModal: {
      closeLabel: 'بستن توضیحات کتاب',
      subject: 'موضوع',
      aboutBook: 'درباره این کتاب',
    },
  },
};
