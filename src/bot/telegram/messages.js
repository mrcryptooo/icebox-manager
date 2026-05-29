const MSG = {
  // ─── خوش‌آمد و منو ────────────────────────────────────────────────────────
  welcome: (name) =>
    `🍦 سلام ${name} عزیز!\n\n` +
    `به *IceBox Manager* خوش آمدید.\n` +
    `دستیار مالی ساده برای مدیریت فروش، خرج و گزارش‌های کسب‌وکارتان.\n\n` +
    `از منوی زیر انتخاب کنید 👇`,

  mainMenu: 'از منوی زیر انتخاب کنید 👇',

  // ─── شعبه ─────────────────────────────────────────────────────────────────
  noBranches:
    '⚠️ هیچ شعبه‌ای ثبت نشده است.\n' +
    'ابتدا از بخش «مدیریت شعبه‌ها» یک شعبه اضافه کنید.',

  noBranchesAction:
    '⚠️ هنوز هیچ شعبه‌ای ثبت نشده است.\n\n' +
    'برای ثبت فروش یا خرج ابتدا باید حداقل یک شعبه اضافه کنید.\n' +
    'همین الان شعبه اضافه می‌کنید؟',

  selectBranch:          '🏪 کدام شعبه؟',
  selectBranchForReport: '🏪 گزارش برای کدام شعبه؟',
  selectReportType:      '📊 نوع گزارش را انتخاب کنید:',

  askBranchName:    '🏪 نام شعبه جدید را وارد کنید:',
  askBranchAddress: '📍 آدرس شعبه (اختیاری):\n(آدرس وارد کنید یا «ندارم» بنویسید):',
  branchCreated: (name) => `✅ شعبه «${name}» با موفقیت ثبت شد.`,

  branchList: (branches) =>
    branches.length === 0
      ? 'هیچ شعبه‌ای ثبت نشده است.'
      : `📋 لیست شعبه‌ها:\n\n` +
        branches
          .map((b, i) => `${i + 1}. ${b.name}${b.address ? ' — ' + b.address : ''}`)
          .join('\n'),

  // ─── فروش — سوالات ────────────────────────────────────────────────────────
  askCash:
    '💵 فروش نقدی چقدر بود؟\n' +
    'عدد وارد کنید (تومان) — مثال: 3500000 یا ۳,۵۰۰,۰۰۰\n' +
    'اگر فروش نقدی نداشتید عدد ۰ بزنید:',

  askPos:
    '💳 فروش پوز چقدر بود؟\n' +
    'عدد وارد کنید یا ۰:',

  askCardTransfer:
    '🔄 کارت‌به‌کارت چقدر بود؟\n' +
    'عدد وارد کنید یا ۰:',

  askOnline:
    '🌐 فروش آنلاین چقدر بود؟\n' +
    'عدد وارد کنید یا ۰:',

  askOrderCount:
    '🛒 تعداد سفارش‌ها چندتا بود؟\n' +
    'عدد وارد کنید یا ۰:',

  askNote:
    '📝 توضیح اختیاری داری؟\n' +
    '(متن وارد کنید یا «ندارم» بنویسید):',

  // ─── فروش — تأیید و نتیجه ────────────────────────────────────────────────
  confirmSale: (data) =>
    `📋 خلاصه فروش — لطفاً بررسی کنید:\n\n` +
    `🏪 شعبه: ${data.branchName}\n` +
    `📅 تاریخ: ${data.date}\n` +
    `${'─'.repeat(26)}\n` +
    `💵 فروش نقدی: ${data.cash} تومان\n` +
    `💳 فروش پوز: ${data.pos} تومان\n` +
    `🔄 کارت‌به‌کارت: ${data.cardTransfer} تومان\n` +
    `🌐 فروش آنلاین: ${data.online} تومان\n` +
    `${'─'.repeat(26)}\n` +
    `🧾 جمع کل: ${data.total} تومان\n` +
    `🛒 تعداد سفارش: ${data.orderCount}\n` +
    `📝 یادداشت: ${data.note || '—'}\n\n` +
    `برای ذخیره «✅ تأیید و ذخیره» بزنید.\n` +
    `برای اصلاح «✏️ ویرایش» بزنید.`,

  saleSavedWithSummary: (data) =>
    `✅ فروش با موفقیت ثبت شد.\n\n` +
    `🏪 شعبه: ${data.branchName}\n` +
    `📅 تاریخ: ${data.date}\n` +
    `${'─'.repeat(26)}\n` +
    `💵 نقدی: ${data.cash} تومان\n` +
    `💳 پوز: ${data.pos} تومان\n` +
    `🔄 کارت‌به‌کارت: ${data.cardTransfer} تومان\n` +
    `🌐 آنلاین: ${data.online} تومان\n` +
    `${'─'.repeat(26)}\n` +
    `🧾 فروش کل: ${data.total} تومان\n` +
    `🛒 تعداد سفارش: ${data.orderCount}` +
    (data.note ? `\n📝 یادداشت: ${data.note}` : ''),

  saleUpdated: (id) => `✅ فروش شماره #${id} با موفقیت ویرایش شد.`,
  editStarted: '✏️ اطلاعات را از ابتدا وارد کنید:',

  // ─── خرج — سوالات ─────────────────────────────────────────────────────────
  askExpenseAmount:
    '💰 مبلغ خرج چقدر است؟\n' +
    'عدد وارد کنید (تومان) — مثال: 500000 یا ۵۰۰,۰۰۰:',

  askExpenseCategory: '📂 دسته‌بندی خرج را انتخاب کنید:',

  askExpenseNote:
    '📝 توضیح (اختیاری):\n' +
    '(متن وارد کنید یا «ندارم» بنویسید):',

  // ─── خرج — تأیید و نتیجه ─────────────────────────────────────────────────
  confirmExpense: (data) =>
    `📋 خلاصه خرج — لطفاً بررسی کنید:\n\n` +
    `🏪 شعبه: ${data.branchName}\n` +
    `📅 تاریخ: ${data.date}\n` +
    `📂 دسته: ${data.category}\n` +
    `💰 مبلغ: ${data.amount} تومان\n` +
    `📝 یادداشت: ${data.note || '—'}\n\n` +
    `برای ذخیره «✅ تأیید و ذخیره» بزنید.\n` +
    `برای اصلاح «✏️ ویرایش» بزنید.`,

  expenseSavedWithSummary: (data) =>
    `✅ خرج با موفقیت ثبت شد.\n\n` +
    `🏪 شعبه: ${data.branchName}\n` +
    `📅 تاریخ: ${data.date}\n` +
    `📂 دسته: ${data.category}\n` +
    `💰 مبلغ: ${data.amount} تومان` +
    (data.note ? `\n📝 یادداشت: ${data.note}` : ''),

  expenseUpdated: (id) => `✅ خرج شماره #${id} با موفقیت ویرایش شد.`,

  // ─── خطاها ────────────────────────────────────────────────────────────────
  invalidNumber:
    '⚠️ عدد وارد‌شده معتبر نیست.\n' +
    'لطفاً فقط عدد وارد کنید.\n' +
    'مثال: 2500000 یا ۲,۵۰۰,۰۰۰',

  invalidAmount:
    '⚠️ مبلغ باید بیشتر از صفر باشد.\n' +
    'لطفاً مجدداً وارد کنید.\n' +
    'مثال: 500000 یا ۵۰۰,۰۰۰',

  invalidId:
    '⚠️ شناسه نامعتبر است.\n' +
    'لطفاً فقط عدد وارد کنید.\n' +
    'مثال: 3',

  recordNotFound:
    '❌ رکوردی با این شناسه پیدا نشد.\n' +
    'شناسه را از لیست «آخرین فروش‌ها» یا «آخرین مخارج» پیدا کنید.',

  cancelled: '❌ عملیات لغو شد.',

  permissionDenied:
    '🚫 شما دسترسی به این بخش را ندارید.\n' +
    'برای اطلاعات بیشتر با مدیر کسب‌وکار تماس بگیرید.',

  // ─── مدیریت ثبت‌ها ────────────────────────────────────────────────────────
  manageRecordsMenu: '🗂️ مدیریت ثبت‌ها:\nمی‌توانید آخرین رکوردها را ببینید، ویرایش یا حذف کنید.',
  noRecordsYet: (type) => `📋 هیچ ${type}ی هنوز ثبت نشده است.`,

  // ─── لیست آخرین فروش‌ها ──────────────────────────────────────────────────
  recentSalesList: (sales) => {
    if (sales.length === 0) return '📋 هیچ فروشی ثبت نشده است.';
    const sep = '─'.repeat(28);
    const lines = [`📋 آخرین ${sales.length} فروش ثبت‌شده:\n${sep}`];
    for (const s of sales) {
      lines.push(
        `\n🔹 شناسه #${s.id} | ${s.branchName} | ${s.date}\n` +
        `   💵 نقدی: ${s.cash} | 💳 پوز: ${s.pos}\n` +
        `   🔄 کارت: ${s.cardTransfer} | 🌐 آنلاین: ${s.online}\n` +
        `   🧾 کل: ${s.total} تومان | 🛒 ${s.orderCount} سفارش` +
        (s.note ? `\n   📝 ${s.note}` : '')
      );
    }
    lines.push(`\n${sep}\nبرای حذف یا ویرایش، شناسه موردنظر را یادداشت کنید.`);
    return lines.join('\n');
  },

  // ─── لیست آخرین مخارج ────────────────────────────────────────────────────
  recentExpensesList: (expenses) => {
    if (expenses.length === 0) return '📋 هیچ خرجی ثبت نشده است.';
    const sep = '─'.repeat(28);
    const lines = [`📋 آخرین ${expenses.length} خرج ثبت‌شده:\n${sep}`];
    for (const e of expenses) {
      lines.push(
        `\n🔹 شناسه #${e.id} | ${e.branchName} | ${e.date}\n` +
        `   📂 ${e.category} | 💰 ${e.amount} تومان` +
        (e.note ? `\n   📝 ${e.note}` : '')
      );
    }
    lines.push(`\n${sep}\nبرای حذف یا ویرایش، شناسه موردنظر را یادداشت کنید.`);
    return lines.join('\n');
  },

  // ─── حذف فروش ────────────────────────────────────────────────────────────
  askDeleteSaleId:
    '🗑️ شناسه فروشی که می‌خواهید حذف کنید را وارد کنید:\n' +
    '(شناسه را از لیست «آخرین فروش‌ها» پیدا کنید)',

  confirmDeleteSale: (data) =>
    `⚠️ آیا مطمئن هستید این فروش حذف شود؟\n\n` +
    `شناسه: #${data.id}\n` +
    `🏪 شعبه: ${data.branchName}\n` +
    `📅 تاریخ: ${data.date}\n` +
    `💵 نقدی: ${data.cash} تومان\n` +
    `💳 پوز: ${data.pos} تومان\n` +
    `🔄 کارت‌به‌کارت: ${data.cardTransfer} تومان\n` +
    `🌐 آنلاین: ${data.online} تومان\n` +
    `🧾 کل: ${data.total} تومان\n` +
    `🛒 سفارش: ${data.orderCount}\n\n` +
    `⚠️ این رکورد از گزارش‌ها حذف خواهد شد.`,

  saleDeleted: (id) => `✅ فروش شماره #${id} با موفقیت حذف شد.`,

  // ─── حذف خرج ─────────────────────────────────────────────────────────────
  askDeleteExpenseId:
    '🗑️ شناسه خرجی که می‌خواهید حذف کنید را وارد کنید:\n' +
    '(شناسه را از لیست «آخرین مخارج» پیدا کنید)',

  confirmDeleteExpense: (data) =>
    `⚠️ آیا مطمئن هستید این خرج حذف شود؟\n\n` +
    `شناسه: #${data.id}\n` +
    `🏪 شعبه: ${data.branchName}\n` +
    `📅 تاریخ: ${data.date}\n` +
    `📂 دسته: ${data.category}\n` +
    `💰 مبلغ: ${data.amount} تومان` +
    (data.note ? `\n📝 یادداشت: ${data.note}` : '') +
    `\n\n⚠️ این رکورد از گزارش‌ها حذف خواهد شد.`,

  expenseDeleted: (id) => `✅ خرج شماره #${id} با موفقیت حذف شد.`,

  // ─── ویرایش فروش ─────────────────────────────────────────────────────────
  askEditSaleId:
    '✏️ شناسه فروشی که می‌خواهید ویرایش کنید را وارد کنید:\n' +
    '(شناسه را از لیست «آخرین فروش‌ها» پیدا کنید)',

  showSaleForEdit: (data) =>
    `📋 اطلاعات فعلی فروش شناسه #${data.id}:\n\n` +
    `🏪 شعبه: ${data.branchName}\n` +
    `📅 تاریخ: ${data.date}\n` +
    `💵 نقدی: ${data.cash} تومان\n` +
    `💳 پوز: ${data.pos} تومان\n` +
    `🔄 کارت‌به‌کارت: ${data.cardTransfer} تومان\n` +
    `🌐 آنلاین: ${data.online} تومان\n` +
    `🛒 سفارش: ${data.orderCount}\n` +
    `📝 یادداشت: ${data.note || '—'}\n\n` +
    `اکنون مقادیر جدید را وارد کنید:`,

  // ─── ویرایش خرج ──────────────────────────────────────────────────────────
  askEditExpenseId:
    '✏️ شناسه خرجی که می‌خواهید ویرایش کنید را وارد کنید:\n' +
    '(شناسه را از لیست «آخرین مخارج» پیدا کنید)',

  showExpenseForEdit: (data) =>
    `📋 اطلاعات فعلی خرج شناسه #${data.id}:\n\n` +
    `🏪 شعبه: ${data.branchName}\n` +
    `📅 تاریخ: ${data.date}\n` +
    `📂 دسته: ${data.category}\n` +
    `💰 مبلغ: ${data.amount} تومان\n` +
    `📝 یادداشت: ${data.note || '—'}\n\n` +
    `اکنون مقادیر جدید را وارد کنید:`,

  // ─── گزارش‌ها ─────────────────────────────────────────────────────────────
  reportsMenu:   '📊 گزارش‌ها:\nنوع گزارش را انتخاب کنید:',
  selectPeriod:  '📅 بازه زمانی را انتخاب کنید:',

  askStartDate:
    '📅 تاریخ شروع را به شمسی وارد کنید:\n' +
    '(مثال: 1405-03-01)',

  askEndDate:
    '📅 تاریخ پایان را به شمسی وارد کنید:\n' +
    '(مثال: 1405-03-31)',

  invalidDate:
    '⚠️ فرمت تاریخ معتبر نیست.\n' +
    'تاریخ شمسی وارد کنید.\n' +
    'مثال درست: 1405-03-05',

  endBeforeStart:
    '⚠️ تاریخ پایان نمی‌تواند قبل از تاریخ شروع باشد.\n' +
    'لطفاً دوباره ماه و روز پایان را انتخاب کنید:',

  // ─── تقویم دکمه‌ای ────────────────────────────────────────────────────────
  pickStartMonth: '📅 ماه شروع را انتخاب کنید:',
  pickStartDay: (monthName) => `📅 روز شروع از ماه ${monthName} را انتخاب کنید:`,
  pickEndMonth: '📅 ماه پایان را انتخاب کنید:',
  pickEndDay: (monthName) => `📅 روز پایان از ماه ${monthName} را انتخاب کنید:`,
  startDateSelected: (jalali) => `✅ تاریخ شروع انتخاب شد: ${jalali}`,
  endDateSelected:   (jalali) => `✅ تاریخ پایان انتخاب شد: ${jalali}`,

  notEnoughBranches:
    '⚠️ برای مقایسه شعبه‌ها باید حداقل دو شعبه ثبت شده باشد.\n' +
    'ابتدا از «مدیریت شعبه‌ها» شعبه جدید اضافه کنید.',

  // ─── کنترل دسترسی ────────────────────────────────────────────────────────
  unauthorized:
    '🚫 شما اجازه دسترسی به این ربات را ندارید.\n\n' +
    'این ربات فقط برای مدیر کسب‌وکار فعال است.\n' +
    'برای دریافت دسترسی آیدی خود را با دستور /id ببینید.',

  yourId: (id) =>
    `🆔 آیدی تلگرام شما: \`${id}\`\n\n` +
    `این عدد را به مدیر سیستم بدهید تا دسترسی بگیرید.`,

  // ─── health check ─────────────────────────────────────────────────────────
  healthStatus: (data) =>
    `🩺 *وضعیت سیستم*\n\n` +
    `🤖 ربات: ${data.botStatus}\n` +
    `🗄️ دیتابیس: ${data.dbStatus}\n` +
    `⏰ زمان سرور: ${data.serverTime}\n` +
    `🌐 محیط اجرا: \`${data.environment}\``,

  // ─── خروجی اطلاعات ───────────────────────────────────────────────────────
  exportMenu:
    '📤 *خروجی اطلاعات*\n\n' +
    'فایل CSV آماده دانلود می‌شود.\n' +
    'کدام اطلاعات را می‌خواهید؟',

  exportGenerating:   '⏳ در حال آماده‌سازی فایل...',
  exportEmptySales:   '⚠️ هیچ فروشی برای خروجی وجود ندارد.',
  exportEmptyExpenses: '⚠️ هیچ خرجی برای خروجی وجود ندارد.',

  // ─── خوش‌آمد کاربر جدید (Phase 7) ───────────────────────────────────────
  // برای کاربری که نه super_admin است و نه عضو هیچ کسب‌وکاری
  newUserWelcome: (id) =>
    `🆔 آیدی تلگرام شما: \`${id}\`\n\n` +
    `• اگر مالک کسب‌وکار هستید، کد لایسنس خود را وارد کنید.\n` +
    `• اگر عضو تیم هستید، این آیدی را برای مالک کسب‌وکار بفرستید\n` +
    `  تا شما را به تیم اضافه کند.\n\n` +
    `فرمت لایسنس: \`ICE-XXXX-XXXX\``,

  // برای کاربری که در یک کسب‌وکار غیرفعال شده
  memberInactive:
    '🚫 حساب شما در این کسب‌وکار غیرفعال شده است.\n\n' +
    'برای بازگشت با مدیر کسب‌وکار تماس بگیرید.',

  // ─── ثبت‌نام کسب‌وکار (Phase 7) ──────────────────────────────────────────
  licensePrompt:
    '🔑 برای استفاده از ربات، کد لایسنس خود را وارد کنید:\n\n' +
    'فرمت: ICE-XXXX-XXXX\n' +
    'مثال: ICE-AB12-CD34\n\n' +
    'اگر کد لایسنس ندارید با مدیر سیستم تماس بگیرید.',

  licenseInvalid:
    '⚠️ فرمت کد لایسنس نادرست است.\n' +
    'کد باید به شکل ICE-XXXX-XXXX باشد.\n' +
    'مثال: ICE-AB12-CD34\n\nدوباره وارد کنید:',

  licenseUsedOrInvalid:
    '❌ این کد لایسنس معتبر نیست یا قبلاً استفاده شده است.\n' +
    'با مدیر سیستم تماس بگیرید.',

  askBusinessName:
    '🏪 نام کسب‌وکار خود را وارد کنید:\n' +
    '(مثال: بستنی آریا، شیرینی‌فروشی صبا)',

  askBusinessType:
    '🏷️ نوع کسب‌وکار را انتخاب یا بنویسید:',

  askBusinessCity:
    '🌆 شهر محل کسب‌وکار را وارد کنید:\n' +
    '(یا «ندارم» بنویسید):',

  askBusinessPhone:
    '📞 شماره تماس کسب‌وکار را وارد کنید:\n' +
    '(یا «ندارم» بنویسید):',

  businessRegistered: (name) =>
    `✅ *کسب‌وکار «${name}» با موفقیت ثبت شد!*\n\n` +
    `🎉 به IceBox Manager خوش آمدید.\n` +
    `حالا می‌توانید شعبه، فروش، خرج و گزارش‌هایتان را مدیریت کنید.\n\n` +
    `از منوی زیر شروع کنید 👇`,

  // ─── مدیریت تیم (Phase 7) ────────────────────────────────────────────────
  teamMenu: '👥 مدیریت تیم:\nاعضای تیم خود را مدیریت کنید.',

  askMemberTelegramId:
    '🆔 آیدی تلگرام عضو جدید را وارد کنید:\n\n' +
    'عضو باید ابتدا /start به ربات زده باشد.\n' +
    'برای دریافت آیدی، از عضو بخواهید دستور /id را به ربات بزند.',

  askRealName:
    '✏️ نام و نام خانوادگی واقعی عضو را وارد کنید:\n' +
    '(مثال: علی رضایی)\n' +
    'این نام در لیست تیم نمایش داده می‌شود.',

  memberNotFound:
    '⚠️ کاربری با این آیدی در سیستم ثبت نشده است.\n\n' +
    'آیدی تلگرام باید عددی باشد.\n' +
    'از عضو بخواهید دستور /id را بزند و عدد را برای شما بفرستد.',

  selectRole: '🎭 نقش عضو را انتخاب کنید:',

  memberAddedDetailed: (data) =>
    `✅ *عضو جدید با موفقیت اضافه شد*\n\n` +
    `👤 نام: ${data.displayName}\n` +
    `🎭 نقش: ${data.roleLabel}\n` +
    `🆔 آیدی تلگرام: \`${data.telegramId}\``,

  memberAlreadyInTeam: (data) =>
    `ℹ️ *این عضو قبلاً در تیم بود. اطلاعات به‌روزرسانی شد.*\n\n` +
    `👤 نام: ${data.displayName}\n` +
    `🎭 نقش جدید: ${data.roleLabel}`,

  // ─── سازگاری قدیمی ───────────────────────────────────────────────────────
  memberAdded: (name, role, roleLabel) =>
    `✅ «${name || role}» با نقش «${roleLabel}» به تیم اضافه شد.`,

  noTeamMembers:
    '👥 هنوز هیچ عضوی در تیم ثبت نشده است.\n' +
    'برای افزودن عضو از «➕ افزودن عضو» استفاده کنید.',

  selectMember: '👤 عضو موردنظر را از لیست انتخاب کنید:',

  memberAction: (name, roleLabel, isActive) =>
    `👤 *${name}*\n` +
    `🎭 نقش: ${roleLabel}\n` +
    `📌 وضعیت: ${isActive ? '✅ فعال' : '🚫 غیرفعال'}\n\n` +
    `عملیات مورد نظر را انتخاب کنید:`,

  memberPermissionsList: (name, perms) => {
    const PLBL = {
      '*': '🔑 دسترسی کامل (همه بخش‌ها)',
      'sales.create': '✅ ثبت فروش',
      'sales.view': '👁 مشاهده فروش',
      'sales.edit': '✏️ ویرایش فروش',
      'sales.delete': '🗑️ حذف فروش',
      'expenses.create': '✅ ثبت خرج',
      'expenses.view': '👁 مشاهده خرج',
      'expenses.edit': '✏️ ویرایش خرج',
      'expenses.delete': '🗑️ حذف خرج',
      'reports.view': '📊 مشاهده گزارش‌ها',
      'exports.create': '📤 خروجی اطلاعات',
      'branches.manage': '🏪 مدیریت شعبه‌ها',
      'manage_records.view': '🗂️ مدیریت ثبت‌ها',
      'settings.manage': '⚙️ تنظیمات',
      'team.manage': '👥 مدیریت تیم',
      'suppliers.manage': '🏭 مدیریت تأمین‌کننده‌ها',
      'purchases.create': '🛒 ثبت خرید مواد',
      'purchases.view': '👁 مشاهده خریدها',
      'supplier_payments.create': '💵 ثبت پرداخت به تأمین‌کننده',
      'supplier_accounts.view': '💳 مشاهده حساب تأمین‌کنندگان',
      'inventory.view': '📦 مشاهده انبار',
      'inventory.manage': '🏗️ مدیریت انبار',
      'inventory.consume': '➖ ثبت مصرف انبار',
      'inventory.adjust': '🔧 اصلاح موجودی انبار',
    };
    const sep = '─'.repeat(26);
    const permsArr = Array.isArray(perms) ? perms : [];
    if (permsArr.length === 0) return `👤 ${name}\n\n⚠️ هیچ دسترسی تعریف نشده است.`;
    const lines = [`👤 دسترسی‌های *${name}*\n${sep}`];
    permsArr.forEach(p => lines.push(`• ${PLBL[p] || p}`));
    lines.push(sep);
    return lines.join('\n');
  },

  memberRoleChanged: (name, roleLabel) =>
    `✅ نقش «${name || 'عضو'}» به «${roleLabel}» تغییر یافت.`,

  memberDeactivated: (name) => `🚫 دسترسی «${name || 'عضو'}» غیرفعال شد.`,
  memberActivated: (name) => `✅ دسترسی «${name || 'عضو'}» دوباره فعال شد.`,

  memberNotInTeam: '❌ این کاربر عضو تیم شما نیست.',

  confirmDeactivateMember: (name, telegramId) =>
    `⚠️ آیا مطمئن هستید؟\n\nعضو: ${name || '—'}\nآیدی: ${telegramId}\n\nپس از غیرفعال شدن، این کاربر دیگر نمی‌تواند از ربات استفاده کند.`,

  // ─── مدیریت لایسنس (Phase 7 — super_admin) ──────────────────────────────
  licenseMenu:
    '🔑 *مدیریت لایسنس‌ها*\n\n' +
    'از اینجا می‌توانید لایسنس جدید بسازید یا وضعیت لایسنس‌ها را ببینید.',

  licenseCreated: (code) =>
    `✅ لایسنس جدید ایجاد شد:\n\n` +
    `\`${code}\`\n\n` +
    `این کد را به صاحب کسب‌وکار بدهید.`,

  licenseList: (licenses) => {
    if (licenses.length === 0) return '🔑 هیچ لایسنسی ایجاد نشده است.';
    const sep = '─'.repeat(28);
    const lines = [`🔑 لیست لایسنس‌ها:\n${sep}`];
    licenses.forEach((l, i) => {
      const status = l.used_by ? `✅ استفاده‌شده — ${l.business_name || '—'}` : '🔓 آزاد';
      lines.push(`\n${i + 1}. \`${l.code}\`\n   ${status}`);
    });
    lines.push(`\n${sep}`);
    return lines.join('\n');
  },

  // ─── قفل بخش‌ها (Phase 7) ────────────────────────────────────────────────
  lockMenu: (lockedSections) => {
    const LABELS = { reports: 'گزارش‌ها', exports: 'خروجی اطلاعات', manage_records: 'مدیریت ثبت‌ها', settings: 'تنظیمات', expenses: 'مخارج' };
    const lines = ['🔒 *قفل بخش‌ها*\n\nبخش‌های قفل‌شده با رمز محافظت می‌شوند:\n'];
    const ALL = ['reports', 'exports', 'manage_records', 'settings', 'expenses'];
    ALL.forEach(s => {
      lines.push(`${lockedSections.includes(s) ? '🔒' : '🔓'} ${LABELS[s]}`);
    });
    lines.push('\nبرای قفل یا باز کردن یک بخش، آن را انتخاب کنید:');
    return lines.join('\n');
  },

  // ─── قفل بخش‌ها ──────────────────────────────────────────────────────────
  lockSectionAction: (sectionLabel, hasLock) =>
    `🔒 بخش «${sectionLabel}»\n` +
    `وضعیت: ${hasLock ? '🔒 قفل فعال است' : '🔓 قفل غیرفعال است'}\n\n` +
    `عملیات مورد نظر را انتخاب کنید:`,

  askNewPin:
    '🔐 رمز جدید را وارد کنید:\n' +
    '(۴ تا ۶ رقم عددی — مثال: 1234)',

  askCurrentPinToRemove: '🔐 رمز فعلی را وارد کنید تا قفل برداشته شود:',
  askCurrentPinToChange: '🔐 ابتدا رمز فعلی را وارد کنید:',

  confirmNewPin: '🔐 رمز را دوباره وارد کنید تا تأیید شود:',
  pinMismatch:   '⚠️ دو رمز وارد‌شده یکسان نیستند. دوباره از ابتدا تلاش کنید:',

  // نام‌های جدید (صریح و فارسی‌تر)
  pinEnabled:  (section) => `✅ قفل بخش «${section}» فعال شد.`,
  pinDisabled: (section) => `🔓 قفل بخش «${section}» غیرفعال شد.`,
  pinChanged:  (section) => `✅ رمز بخش «${section}» با موفقیت تغییر کرد.`,
  // سازگاری با کد قدیمی
  pinSet:      (section) => `✅ قفل بخش «${section}» فعال شد.`,
  pinRemoved:  (section) => `🔓 قفل بخش «${section}» غیرفعال شد.`,

  pinPrompt:
    '🔐 این بخش با رمز محافظت شده است.\n\n' +
    'رمز عبور را وارد کنید:',

  pinWrong:      '❌ رمز واردشده اشتباه است. دوباره تلاش کنید:',
  pinMaxAttempts: '🚫 تعداد تلاش‌های مجاز تمام شد. برای امنیت، از منوی اصلی دوباره وارد شوید.',

  // ─── راهنما و تنظیمات ─────────────────────────────────────────────────────
  help:
    `📖 *راهنمای IceBox Manager*\n\n` +
    `💰 *ثبت فروش امروز*\n` +
    `فروش روزانه به تفکیک نقدی، پوز، کارت‌به‌کارت و آنلاین ثبت کنید.\n\n` +
    `🧾 *ثبت خرج*\n` +
    `مخارج روزانه را با دسته‌بندی ثبت کنید.\n\n` +
    `📊 *گزارش‌ها*\n` +
    `گزارش امروز، هفتگی، ماهانه، شعبه‌ای یا بازه دلخواه را مشاهده کنید.\n\n` +
    `🗂️ *مدیریت ثبت‌ها*\n` +
    `آخرین رکوردها را ببینید، ویرایش یا حذف کنید.\n\n` +
    `🏪 *مدیریت شعبه‌ها*\n` +
    `شعبه جدید اضافه کنید یا لیست شعبه‌ها را ببینید.\n\n` +
    `👥 *مدیریت تیم* (مالک و مدیر)\n` +
    `اعضای تیم را اضافه کنید و نقش‌ها را مدیریت کنید.\n\n` +
    `💡 در هر مرحله می‌توانید «❌ لغو» یا «🏠 منوی اصلی» بزنید.\n` +
    `در صورت بروز مشکل با مدیر سیستم تماس بگیرید.`,

  settings: `⚙️ *تنظیمات*\n\nاز گزینه‌های زیر انتخاب کنید:`,

  // ─── مدیریت دسترسی‌ها (Phase 7D) ──────────────────────────────────────────
  permissionUpdated:
    '✅ دسترسی با موفقیت به‌روزرسانی شد.',

  permissionsResetToDefault:
    '✅ دسترسی‌های پیش‌فرض نقش دوباره اعمال شد.',

  ownerPermissionDenied:
    '🔒 دسترسی این کاربر کامل است و قابل محدودسازی نیست.',

  managePermissions: (name, perms) => {
    const PLBL = {
      'sales.create':        'ثبت فروش',
      'sales.view':          'مشاهده فروش',
      'sales.edit':          'ویرایش فروش',
      'sales.delete':        'حذف فروش',
      'expenses.create':     'ثبت خرج',
      'expenses.view':       'مشاهده خرج',
      'expenses.edit':       'ویرایش خرج',
      'expenses.delete':     'حذف خرج',
      'reports.view':        'مشاهده گزارش‌ها',
      'exports.create':      'خروجی اطلاعات',
      'branches.manage':     'مدیریت شعبه‌ها',
      'manage_records.view': 'مدیریت ثبت‌ها',
      'settings.manage':     'تنظیمات',
      'team.manage':         'مدیریت تیم',
      'suppliers.manage':    'مدیریت تأمین‌کننده‌ها',
      'purchases.create':    'ثبت خرید مواد',
      'purchases.view':      'مشاهده خریدها',
      'supplier_payments.create': 'ثبت پرداخت به تأمین‌کننده',
      'supplier_accounts.view':   'مشاهده حساب تأمین‌کنندگان',
      'inventory.view':           'مشاهده انبار',
      'inventory.manage':         'مدیریت انبار',
      'inventory.consume':        'ثبت مصرف انبار',
      'inventory.adjust':         'اصلاح موجودی انبار',
    };
    const ALL = [
      'sales.create', 'sales.view', 'sales.edit', 'sales.delete',
      'expenses.create', 'expenses.view', 'expenses.edit', 'expenses.delete',
      'reports.view', 'exports.create',
      'branches.manage', 'manage_records.view', 'settings.manage', 'team.manage',
      'suppliers.manage', 'purchases.create', 'purchases.view',
      'supplier_payments.create', 'supplier_accounts.view',
      'inventory.view', 'inventory.manage', 'inventory.consume', 'inventory.adjust',
    ];
    const permsArr = Array.isArray(perms) ? perms : [];
    const sep = '─'.repeat(24);
    const lines = [`🔐 *مدیریت دسترسی‌های ${name}*\n${sep}`];
    ALL.forEach(p => lines.push(`${permsArr.includes(p) ? '✅' : '❌'} ${PLBL[p] || p}`));
    lines.push(`\n${sep}\nبرای تغییر هر دسترسی روی دکمه‌اش بزنید:`);
    return lines.join('\n');
  },

  // ─── تأمین‌کننده‌ها (Phase 8) ─────────────────────────────────────────────
  suppliersMenu:
    '🏭 *تأمین‌کننده‌ها*\n\nاز منوی زیر انتخاب کنید:',

  noSuppliers:
    '⚠️ هیچ تأمین‌کننده‌ای ثبت نشده است.\n' +
    'برای شروع «➕ افزودن تأمین‌کننده» را انتخاب کنید.',

  askSupplierName:
    '🏭 نام تأمین‌کننده را وارد کنید:\n' +
    '(مثال: شرکت لبنی آریا)',

  askSupplierPhone:
    '📞 شماره تماس تأمین‌کننده (اختیاری):\n' +
    '(شماره وارد کنید یا «ندارم» بنویسید)',

  askSupplierNote:
    '📝 یادداشت (اختیاری):\n' +
    '(متن وارد کنید یا «ندارم» بنویسید)',

  supplierAdded: (name) =>
    `✅ تأمین‌کننده «${name}» با موفقیت ثبت شد.`,

  supplierList: (suppliers) => {
    if (suppliers.length === 0) return '⚠️ هیچ تأمین‌کننده‌ای ثبت نشده است.';
    const sep = '─'.repeat(26);
    const lines = [`📋 لیست تأمین‌کننده‌ها:\n${sep}`];
    suppliers.forEach((s, i) => {
      lines.push(
        `\n${i + 1}. *${s.name}*` +
        (s.phone ? `\n   📞 ${s.phone}` : '') +
        (s.note  ? `\n   📝 ${s.note}`  : '')
      );
    });
    lines.push(`\n${sep}`);
    return lines.join('\n');
  },

  selectSupplier: '🏭 تأمین‌کننده را انتخاب کنید:',

  // ─── ثبت خرید مواد ────────────────────────────────────────────────────────
  askPurchaseItem:
    '📦 نام کالا/ماده اولیه را وارد کنید:\n' +
    '(مثال: شیر خام، خامه، شکر)',

  askPurchaseQty:
    '🔢 مقدار را وارد کنید:\n' +
    '(عدد — مثال: 10 یا 5.5)',

  askPurchaseUnit: '📏 واحد اندازه‌گیری را انتخاب کنید:',

  askPurchaseUnitPrice:
    '💰 قیمت واحد (تومان) را وارد کنید:\n' +
    '(مثال: 50000)\n' +
    'اگر نمی‌دانید عدد ۰ بزنید:',

  askPurchasePaid:
    '💵 مبلغ پرداخت‌شده در همین لحظه (تومان):\n' +
    '(اگر نقدی پرداخت نشده عدد ۰ بزنید)',

  paidTooHigh:
    '⚠️ مبلغ پرداخت‌شده نمی‌تواند بیشتر از مبلغ کل باشد.\n' +
    'لطفاً دوباره وارد کنید:',

  askPurchaseNote:
    '📝 یادداشت (اختیاری):\n' +
    '(متن وارد کنید یا «ندارم» بنویسید)',

  confirmPurchase: (d) =>
    `📋 *خلاصه خرید — بررسی کنید:*\n\n` +
    `🏭 تأمین‌کننده: ${d.supplierName}\n` +
    `📅 تاریخ: ${d.date}\n` +
    `${'─'.repeat(26)}\n` +
    `📦 کالا: ${d.itemName}\n` +
    `🔢 مقدار: ${d.quantity} ${d.unit}\n` +
    `💰 قیمت واحد: ${d.unitPrice} تومان\n` +
    `💳 جمع کل: ${d.totalAmount} تومان\n` +
    `💵 پرداخت‌شده: ${d.paidAmount} تومان\n` +
    `🔴 مانده بدهی: ${d.remaining} تومان\n` +
    (d.note ? `📝 یادداشت: ${d.note}\n` : '') +
    `\nبرای ذخیره «✅ تأیید و ذخیره» بزنید.`,

  purchaseSaved: (d) =>
    `✅ خرید با موفقیت ثبت شد.\n\n` +
    `🏭 ${d.supplierName} | 📅 ${d.date}\n` +
    `📦 ${d.itemName} — ${d.quantity} ${d.unit}\n` +
    `💳 کل: ${d.totalAmount} تومان\n` +
    `💵 پرداخت‌شده: ${d.paidAmount} تومان\n` +
    (Number(d.remaining) > 0 ? `🔴 مانده بدهی: ${d.remaining} تومان` : `✅ تسویه کامل`),

  // ─── ثبت پرداخت به تأمین‌کننده ───────────────────────────────────────────
  askPaymentAmount:
    '💵 مبلغ پرداخت (تومان) را وارد کنید:',

  askPaymentMethod: '💳 روش پرداخت را انتخاب کنید:',

  askPaymentNote:
    '📝 یادداشت (اختیاری):\n' +
    '(متن وارد کنید یا «ندارم» بنویسید)',

  confirmPayment: (d) =>
    `📋 *خلاصه پرداخت — بررسی کنید:*\n\n` +
    `🏭 تأمین‌کننده: ${d.supplierName}\n` +
    `📅 تاریخ: ${d.date}\n` +
    `${'─'.repeat(26)}\n` +
    `💵 مبلغ: ${d.amount} تومان\n` +
    `💳 روش: ${d.method}\n` +
    (d.note ? `📝 یادداشت: ${d.note}\n` : '') +
    `\nبرای ذخیره «✅ تأیید و ذخیره» بزنید.`,

  paymentSaved: (d) =>
    `✅ پرداخت با موفقیت ثبت شد.\n\n` +
    `🏭 ${d.supplierName}\n` +
    `📅 ${d.date} | 💵 ${d.amount} تومان | 💳 ${d.method}\n\n` +
    `${'─'.repeat(24)}\n` +
    `${d.isSettled ? '✅ حساب تأمین‌کننده تسویه شد' : `🔴 مانده جدید بدهی: ${d.newDebt} تومان`}`,

  // ─── حساب تأمین‌کنندگان ──────────────────────────────────────────────────
  supplierAccount: (s) => {
    // formatter داخلی — بدون نیاز به import خارجی
    const pd = '۰۱۲۳۴۵۶۷۸۹'.split('');
    const fmt = n => Math.round(Number(n) || 0).toLocaleString('en-US').replace(/\d/g, d => pd[d]);
    const sep  = '─'.repeat(26);
    const debt = Number(s.debt) || 0;
    return `💳 *حساب ${s.name}*\n${sep}\n` +
      `🛒 جمع خریدها: ${fmt(s.totalPurchases)} تومان\n` +
      `💵 پرداخت هنگام خرید: ${fmt(s.paidAtPurchase)} تومان\n` +
      `🏦 پرداخت‌های جداگانه: ${fmt(s.totalPayments)} تومان\n` +
      `${sep}\n` +
      `${debt > 0 ? `🔴 بدهی فعلی: ${fmt(debt)} تومان` : `✅ حساب تسویه است`}`;
  },

  allSupplierAccounts: (suppliers) => {
    if (suppliers.length === 0) return '⚠️ هیچ تأمین‌کننده‌ای ثبت نشده است.';
    // formatter داخلی — مستقل از formatMoney (که در handlers اعمال می‌شود)
    const pd = '۰۱۲۳۴۵۶۷۸۹'.split('');
    const fmt = n => Math.round(Number(n) || 0).toLocaleString('en-US').replace(/\d/g, d => pd[d]);
    const sep = '─'.repeat(26);
    const lines = [`💳 *خلاصه حساب تأمین‌کنندگان*\n${sep}`];
    let totalDebt = 0;
    suppliers.forEach((s, i) => {
      const debt      = Number(s.debt)           || 0;
      const purchase  = Number(s.totalPurchases) || 0;
      const atBuy     = Number(s.paidAtPurchase) || 0;
      const later     = Number(s.totalPayments)  || 0;
      const totalPaid = atBuy + later;
      totalDebt += debt;
      lines.push(
        `\n${i + 1}. *${s.name}*\n` +
        `   🛒 خریدها: ${fmt(purchase)} تومان\n` +
        `   💵 پرداخت‌شده: ${fmt(totalPaid)} تومان\n` +
        `   ${debt > 0 ? `🔴 بدهی: ${fmt(debt)} تومان` : '✅ تسویه'}`
      );
    });
    lines.push(`\n${sep}\n🔴 *جمع کل بدهی‌ها: ${fmt(totalDebt)} تومان*`);
    return lines.join('\n');
  },

  // ─── گزارش ریز مخارج (Phase 8) ───────────────────────────────────────────
  expenseDetailMenu: '🧾 *گزارش ریز مخارج*\n\nبازه زمانی را انتخاب کنید:',

  noExpensesInPeriod: '⚠️ هیچ خرجی در این بازه زمانی ثبت نشده است.',

  expenseDetailReport: (rows, startDate, endDate, totalFormatted) => {
    const sep = '─'.repeat(28);
    const lines = [
      `🧾 *گزارش ریز مخارج*\n📅 از ${startDate} تا ${endDate}\n${sep}`
    ];
    rows.forEach(r => {
      lines.push(
        `\n📌 ${r.expense_date} | ${r.branch_name || '—'}\n` +
        `   📂 ${r.category} | 💰 ${r.amount} تومان` +
        (r.note ? `\n   📝 ${r.note}` : '')
      );
    });
    lines.push(`\n${sep}\n💰 *جمع کل: ${totalFormatted} تومان*`);
    return lines.join('\n');
  },

  exportEmptyPurchases:  '⚠️ هیچ خریدی برای خروجی وجود ندارد.',
  exportEmptyInventory:  '⚠️ هیچ ماده اولیه‌ای در انبار ثبت نشده است.',

  // ─── انبار مواد اولیه (Phase 8C) ──────────────────────────────────────────
  inventoryMenu: '📦 *انبار مواد اولیه*\n\nاز منوی زیر انتخاب کنید:',

  noInventoryItems:
    '⚠️ هیچ ماده اولیه‌ای در انبار ثبت نشده است.\n' +
    'برای شروع «➕ افزودن ماده» را انتخاب کنید.',

  allInventoryOk: '✅ همه مواد اولیه موجودی کافی دارند.',

  askInventoryItemName:
    '📦 نام ماده اولیه را وارد کنید:\n' +
    '(مثال: شیر خام، خامه، شکر)',

  askInventoryItemUnit: '📏 واحد اندازه‌گیری را انتخاب کنید:',

  askInventoryItemMinStock:
    '⚠️ حداقل موجودی هشدار را وارد کنید:\n' +
    '(اگر نمی‌خواهید هشدار کمبود داشته باشید عدد ۰ بزنید)',

  askInventoryInitialStock:
    '📦 موجودی اولیه این ماده چقدر است؟\n' +
    '(اگر موجودی ندارید عدد ۰ بزنید)',

  inventoryItemAdded: (name, unit, stock) => {
    const pd  = '۰۱۲۳۴۵۶۷۸۹'.split('');
    const fmt = n => String(Math.round(Number(n) || 0)).replace(/\d/g, d => pd[d]);
    return `✅ «${name}» (${unit}) با موفقیت به انبار اضافه شد.` +
      (Number(stock) > 0 ? `\n📦 موجودی اولیه: ${fmt(stock)} ${unit}` : '');
  },

  selectInventoryItem: '📦 ماده اولیه را انتخاب کنید:',

  askConsumeQty: (name, unit, stock) => {
    const pd  = '۰۱۲۳۴۵۶۷۸۹'.split('');
    const fmt = n => String(Math.round(Number(n) || 0)).replace(/\d/g, d => pd[d]);
    return `➖ *مصرف/خروج از انبار*\n\n` +
      `📦 ماده: ${name}\n` +
      `📊 موجودی فعلی: ${fmt(stock)} ${unit}\n\n` +
      `مقدار مصرف را وارد کنید (${unit}):`;
  },

  askConsumeNote:
    '📝 دلیل یا توضیح (اختیاری):\n' +
    '(متن وارد کنید یا «ندارم» بنویسید)',

  consumeStockInsufficient: (name, currentStock, unit) => {
    const pd  = '۰۱۲۳۴۵۶۷۸۹'.split('');
    const fmt = n => String(Math.round(Number(n) || 0)).replace(/\d/g, d => pd[d]);
    return `⚠️ موجودی ناکافی!\n\n` +
      `📦 ${name}: موجودی فعلی ${fmt(currentStock)} ${unit}\n` +
      `مقدار وارد‌شده از موجودی بیشتر است.\n` +
      `لطفاً مقدار کمتری وارد کنید:`;
  },

  consumeSaved: (name, qty, unit, newStock) => {
    const pd  = '۰۱۲۳۴۵۶۷۸۹'.split('');
    const fmt = n => String(Math.round(Number(n) || 0)).replace(/\d/g, d => pd[d]);
    return `✅ مصرف ثبت شد.\n\n` +
      `📦 ${name}: ${fmt(qty)} ${unit} خارج شد.\n` +
      `📊 موجودی جدید: ${fmt(newStock)} ${unit}`;
  },

  askAdjustQty: (name, unit, currentStock) => {
    const pd  = '۰۱۲۳۴۵۶۷۸۹'.split('');
    const fmt = n => String(Math.round(Number(n) || 0)).replace(/\d/g, d => pd[d]);
    return `🔧 *اصلاح موجودی*\n\n` +
      `📦 ماده: ${name}\n` +
      `📊 موجودی سیستم: ${fmt(currentStock)} ${unit}\n\n` +
      `موجودی واقعی را وارد کنید (${unit}):`;
  },

  adjustSaved: (name, currentStock, actualQty, diff, unit) => {
    const pd  = '۰۱۲۳۴۵۶۷۸۹'.split('');
    const fmt = n => String(Math.round(Math.abs(Number(n)) || 0)).replace(/\d/g, d => pd[d]);
    const fmtS = n => String(Math.round(Number(n) || 0)).replace(/\d/g, d => pd[d]);
    return `✅ موجودی اصلاح شد.\n\n` +
      `📦 ${name}\n` +
      `📊 موجودی قبلی: ${fmtS(currentStock)} ${unit}\n` +
      `✏️ موجودی جدید: ${fmtS(actualQty)} ${unit}\n` +
      (Number(diff) >= 0
        ? `➕ افزایش: ${fmt(diff)} ${unit}`
        : `➖ کاهش: ${fmt(diff)} ${unit}`);
  },

  inventorySummary: (items) => {
    const pd  = '۰۱۲۳۴۵۶۷۸۹'.split('');
    const fmt = n => Math.round(Number(n) || 0).toLocaleString('en-US').replace(/\d/g, d => pd[d]);
    const sep = '─'.repeat(26);
    const lines = [`📦 *خلاصه موجودی انبار*\n${sep}`];
    items.forEach((item, i) => {
      const stock    = Number(item.stock)     || 0;
      const minStock = Number(item.min_stock) || 0;
      const status   = stock <= minStock ? '⚠️ کمبود' : '✅ کافی';
      lines.push(
        `\n${i + 1}. *${item.name}* (${item.unit})\n` +
        `   📦 موجودی: ${fmt(stock)} | حداقل: ${fmt(minStock)} | ${status}`
      );
    });
    lines.push(`\n${sep}`);
    return lines.join('\n');
  },

  inventoryLowStock: (items) => {
    const pd  = '۰۱۲۳۴۵۶۷۸۹'.split('');
    const fmt = n => Math.round(Number(n) || 0).toLocaleString('en-US').replace(/\d/g, d => pd[d]);
    const sep = '─'.repeat(26);
    const lines = [`⚠️ *مواد اولیه با موجودی کم*\n${sep}`];
    items.forEach(item => {
      const stock    = Number(item.stock)     || 0;
      const minStock = Number(item.min_stock) || 0;
      lines.push(
        `\n📌 *${item.name}* (${item.unit})\n` +
        `   موجودی: ${fmt(stock)} — حداقل: ${fmt(minStock)}`
      );
    });
    lines.push(
      `\n${sep}\n` +
      `برای افزودن موجودی از «➕ افزودن ماده» یا «🛒 ثبت خرید مواد» استفاده کنید.`
    );
    return lines.join('\n');
  },

  exportEmptyStaffTransactions: '⚠️ هیچ تراکنش پرسنلی برای خروجی وجود ندارد.',

  // ─── حساب پرسنل (Phase 8D) ────────────────────────────────────────────────
  payrollMenu: '👥 *حساب پرسنل*\n\nاز منوی زیر انتخاب کنید:',

  noStaffMembers: '⚠️ هیچ کارمند فعالی در سیستم ثبت نشده است.',

  selectStaffMember: '👤 کارمند مورد نظر را انتخاب کنید:',

  askBaseSalaryAmount: (name) =>
    `💰 *تعیین حقوق پایه — ${name}*\n\n` +
    `مبلغ حقوق پایه را وارد کنید (تومان):`,

  askSalaryType: '📋 نوع حقوق را انتخاب کنید:',

  salarySaved: (name, amount, salaryType) => {
    const pd  = '۰۱۲۳۴۵۶۷۸۹'.split('');
    const fmt = n => Math.round(Number(n) || 0).toLocaleString('en-US').replace(/\d/g, d => pd[d]);
    const typeMap = { monthly: 'ماهانه', daily: 'روزانه', hourly: 'ساعتی' };
    return `✅ حقوق پایه با موفقیت ذخیره شد.\n\n` +
      `👤 ${name}\n` +
      `💰 حقوق پایه: ${fmt(amount)} تومان\n` +
      `📋 نوع: ${typeMap[salaryType] || salaryType}`;
  },

  askTransactionAmount: (typeName, name) =>
    `💵 *${typeName}*\n\n` +
    `👤 کارمند: ${name}\n\n` +
    `مبلغ را وارد کنید (تومان):`,

  askTransactionNote:
    '📝 توضیح یا یادداشت (اختیاری):\n' +
    '(متن وارد کنید یا «ندارم» بنویسید)',

  confirmTransaction: (d) => {
    const pd  = '۰۱۲۳۴۵۶۷۸۹'.split('');
    const fmt = n => Math.round(Number(n) || 0).toLocaleString('en-US').replace(/\d/g, d => pd[d]);
    return `📋 *تأیید تراکنش — بررسی کنید:*\n\n` +
      `👤 کارمند: ${d.staffName}\n` +
      `📌 نوع: ${d.typeName}\n` +
      `💵 مبلغ: ${fmt(d.amount)} تومان\n` +
      `📅 تاریخ: ${d.date}\n` +
      (d.note ? `📝 یادداشت: ${d.note}\n` : '') +
      `\nبرای ذخیره «✅ تأیید و ذخیره» بزنید.`;
  },

  transactionSaved: (d) => {
    const pd  = '۰۱۲۳۴۵۶۷۸۹'.split('');
    const fmt = n => Math.round(Number(n) || 0).toLocaleString('en-US').replace(/\d/g, d => pd[d]);
    return `✅ تراکنش با موفقیت ثبت شد.\n\n` +
      `👤 ${d.staffName} | 📌 ${d.typeName}\n` +
      `💵 ${fmt(d.amount)} تومان | 📅 ${d.date}` +
      (d.note ? `\n📝 ${d.note}` : '');
  },

  staffAccountSummary: (d) => {
    const pd  = '۰۱۲۳۴۵۶۷۸۹'.split('');
    const fmt = n => Math.round(Number(n) || 0).toLocaleString('en-US').replace(/\d/g, d => pd[d]);
    const sep = '─'.repeat(26);
    const typeMap = { monthly: 'ماهانه', daily: 'روزانه', hourly: 'ساعتی' };
    const salaryTypeLbl = typeMap[d.salaryType] || d.salaryType || 'ماهانه';
    const balSign = d.balance >= 0 ? '🟢' : '🔴';
    return `👤 *حساب ${d.displayName}*\n${sep}\n` +
      `💰 حقوق پایه: ${fmt(d.baseSalary)} تومان (${salaryTypeLbl})\n` +
      `🎁 پاداش: ${fmt(d.bonus)} تومان\n` +
      `${sep}\n` +
      `💵 پرداخت حقوق: ${fmt(d.salaryPayment)} تومان\n` +
      `🧾 برداشت / علی‌الحساب: ${fmt(d.advance)} تومان\n` +
      `🍦 مصرف داخلی: ${fmt(d.internalConsumption)} تومان\n` +
      `➖ کسری / جریمه: ${fmt(d.deduction)} تومان\n` +
      `${sep}\n` +
      `${balSign} *مانده قابل پرداخت: ${fmt(d.balance)} تومان*`;
  },

  allStaffAccountSummaries: (summaries) => {
    if (summaries.length === 0) return '⚠️ هیچ کارمند فعالی در سیستم ثبت نشده است.';
    const pd  = '۰۱۲۳۴۵۶۷۸۹'.split('');
    const fmt = n => Math.round(Number(n) || 0).toLocaleString('en-US').replace(/\d/g, d => pd[d]);
    const sep = '─'.repeat(26);
    const lines = [`👥 *خلاصه حساب پرسنل*\n${sep}`];
    let totalBalance = 0;
    summaries.forEach((s, i) => {
      const balSign = s.balance >= 0 ? '🟢' : '🔴';
      totalBalance += s.balance;
      lines.push(
        `\n${i + 1}. *${s.displayName}*\n` +
        `   💰 حقوق پایه: ${fmt(s.baseSalary)} | پاداش: ${fmt(s.bonus)}\n` +
        `   💵 پرداخت‌شده: ${fmt(s.salaryPayment + s.advance + s.internalConsumption)}\n` +
        `   ${balSign} مانده: ${fmt(s.balance)} تومان`
      );
    });
    const totalSign = totalBalance >= 0 ? '🟢' : '🔴';
    lines.push(`\n${sep}\n${totalSign} *جمع مانده‌ها: ${fmt(totalBalance)} تومان*`);
    return lines.join('\n');
  },

  monthlyPayrollReport: (report) => {
    const pd  = '۰۱۲۳۴۵۶۷۸۹'.split('');
    const fmt = n => Math.round(Number(n) || 0).toLocaleString('en-US').replace(/\d/g, d => pd[d]);
    const sep = '─'.repeat(28);
    const typeMap = { monthly: 'ماهانه', daily: 'روزانه', hourly: 'ساعتی' };
    const lines = [
      `📊 *گزارش حقوق پرسنل*\n📅 از ${report.startDate} تا ${report.endDate}\n${sep}`
    ];
    report.rows.forEach((r, i) => {
      const balSign = r.balance >= 0 ? '🟢' : '🔴';
      lines.push(
        `\n${i + 1}. *${r.displayName}* (${typeMap[r.salaryType] || r.salaryType})\n` +
        `   💰 حقوق: ${fmt(r.baseSalary)} | 🎁 پاداش: ${fmt(r.bonus)}\n` +
        `   💵 پرداخت: ${fmt(r.salaryPayment)} | 🧾 برداشت: ${fmt(r.advance)}\n` +
        `   🍦 مصرف: ${fmt(r.internalConsumption)} | ➖ کسری: ${fmt(r.deduction)}\n` +
        `   ${balSign} مانده: ${fmt(r.balance)} تومان`
      );
    });
    const t = report.totals;
    const totalSign = t.balance >= 0 ? '🟢' : '🔴';
    lines.push(
      `\n${sep}\n` +
      `💰 *جمع حقوق پایه: ${fmt(t.baseSalary)} تومان*\n` +
      `💵 جمع پرداختی: ${fmt(t.salaryPayment)} تومان\n` +
      `🎁 جمع پاداش: ${fmt(t.bonus)} تومان\n` +
      `${totalSign} *جمع مانده: ${fmt(t.balance)} تومان*`
    );
    return lines.join('\n');
  },

  // ─── گزارش حسابداری کامل (Phase 8E) ──────────────────────────────────────────
  accountingPeriodMenu:
    '📊 *گزارش حسابداری کامل*\n\nبازه زمانی را انتخاب کنید:',

  accountingReport: (report, startJalali, endJalali) => {
    const pd  = '۰۱۲۳۴۵۶۷۸۹'.split('');
    const fmt = n => Math.round(Number(n) || 0).toLocaleString('en-US').replace(/\d/g, d => pd[d]);
    const fmtN = n => String(Math.round(Number(n) || 0)).replace(/\d/g, d => pd[d]);
    const sep  = '━'.repeat(24);
    const thin = '─'.repeat(24);

    const { sales, expenses, purchases, inventory, payroll, summary } = report;

    // ── فروش ──────────────────────────────────────────────────────────────────
    const salesLines = [
      `${sep}`,
      `💰 *فروش*`,
      `فروش کل: ${fmt(sales.total)} تومان`,
      `  💵 نقدی: ${fmt(sales.cash)}`,
      `  💳 پوز: ${fmt(sales.pos)}`,
      `  🔄 کارت‌به‌کارت: ${fmt(sales.cardTransfer)}`,
      `  🌐 آنلاین: ${fmt(sales.online)}`,
      `تعداد سفارش: ${fmtN(sales.orderCount)}`,
      `میانگین هر سفارش: ${fmt(sales.avgOrderValue)} تومان`,
    ];

    // ── مخارج ─────────────────────────────────────────────────────────────────
    const expLines = [
      `${sep}`,
      `🧾 *مخارج*`,
      `کل مخارج: ${fmt(expenses.total)} تومان`,
    ];
    if (expenses.topCategory) {
      expLines.push(`بیشترین دسته: ${expenses.topCategory.category} — ${fmt(expenses.topCategory.total)} تومان`);
    }
    if (expenses.categories.length > 1) {
      expenses.categories.slice(1).forEach(c => {
        expLines.push(`  • ${c.category}: ${fmt(c.total)} تومان`);
      });
    }

    // ── تأمین‌کنندگان ──────────────────────────────────────────────────────────
    const suppLines = [
      `${sep}`,
      `🏭 *تأمین‌کننده‌ها*`,
      `کل خرید مواد: ${fmt(purchases.totalAmount)} تومان`,
      `پرداخت هنگام خرید: ${fmt(purchases.paidAtPurchase)} تومان`,
      `پرداخت‌های بعدی: ${fmt(purchases.laterPayments)} تومان`,
    ];
    if (purchases.currentDebt > 0) {
      suppLines.push(`🔴 بدهی فعلی تأمین‌کننده‌ها: ${fmt(purchases.currentDebt)} تومان`);
      suppLines.push(`تعداد تأمین‌کننده بدهکار: ${fmtN(purchases.debtorCount)}`);
    } else {
      suppLines.push(`✅ بدهی تأمین‌کننده: تسویه‌شده`);
    }

    // ── انبار ─────────────────────────────────────────────────────────────────
    const invLines = [
      `${sep}`,
      `📦 *انبار*`,
      `تعداد اقلام فعال: ${fmtN(inventory.totalItems)}`,
      inventory.lowStockCount > 0
        ? `⚠️ اقلام کم‌موجودی: ${fmtN(inventory.lowStockCount)}`
        : `✅ همه اقلام موجودی کافی دارند`,
    ];

    // ── پرسنل ─────────────────────────────────────────────────────────────────
    const payLines = [
      `${sep}`,
      `👥 *پرسنل*`,
      `حقوق پرداخت‌شده: ${fmt(payroll.salaryPayment)} تومان`,
      `برداشت‌ها: ${fmt(payroll.advance)} تومان`,
      `مصرف داخلی: ${fmt(payroll.internalConsumption)} تومان`,
      `پاداش: ${fmt(payroll.bonus)} تومان`,
      `کسری: ${fmt(payroll.deduction)} تومان`,
    ];
    if (payroll.totalStaffBalance > 0) {
      payLines.push(`🔴 مانده کل حقوق پرسنل: ${fmt(payroll.totalStaffBalance)} تومان`);
    } else if (payroll.totalStaffBalance < 0) {
      payLines.push(`✅ مانده کل حقوق پرسنل: ${fmt(payroll.totalStaffBalance)} تومان`);
    } else {
      payLines.push(`✅ حقوق پرسنل تسویه‌شده`);
    }

    // ── جمع‌بندی ───────────────────────────────────────────────────────────────
    const netSign   = summary.netCash          >= 0 ? '🟢' : '🔴';
    const afterSign = summary.afterObligations >= 0 ? '🟢' : '🔴';
    const sumLines  = [
      `${sep}`,
      `📌 *جمع‌بندی مدیریتی*`,
      `ورودی (فروش): ${fmt(summary.cashIn)} تومان`,
      `خروجی پرداخت‌شده: ${fmt(summary.cashOut)} تومان`,
      `${thin}`,
      `${netSign} *مانده نقدی تقریبی: ${fmt(summary.netCash)} تومان*`,
      `${thin}`,
      `تعهدات پرداخت‌نشده: ${fmt(summary.obligations)} تومان`,
      `  بدهی تأمین‌کننده‌ها: ${fmt(purchases.currentDebt)} تومان`,
      `  مانده حقوق پرسنل: ${fmt(Math.max(0, payroll.totalStaffBalance))} تومان`,
      `${thin}`,
      `${afterSign} *مانده بعد از تعهدات: ${fmt(summary.afterObligations)} تومان*`,
      `${sep}`,
      `⚠️ _این گزارش تقریبی مدیریتی است، نه گزارش رسمی مالیاتی._`,
    ];

    const header = [
      `📊 *گزارش حسابداری کامل*`,
      `📅 از ${startJalali} تا ${endJalali}`,
    ];

    return [...header, ...salesLines, ...expLines, ...suppLines,
            ...invLines, ...payLines, ...sumLines].join('\n');
  },

  // ─── خروجی حسابداری کامل (Phase 8F) ────────────────────────────────────────
  accountingExportPeriodMenu:
    '📊 *خروجی حسابداری کامل*\n\n' +
    '۷ فایل CSV آماده می‌شود:\n' +
    '• خلاصه حسابداری\n' +
    '• فروش‌ها\n' +
    '• مخارج\n' +
    '• خریدهای مواد\n' +
    '• پرداخت‌ها به تأمین‌کنندگان\n' +
    '• انبار\n' +
    '• تراکنش‌های پرسنل\n\n' +
    'بازه زمانی را انتخاب کنید:',

  accountingExportGenerating: '⏳ در حال آماده‌سازی ۷ فایل CSV...',

  accountingExportDone: (count, startJalali, endJalali) =>
    `✅ *خروجی حسابداری کامل ارسال شد*\n\n` +
    `📅 از ${startJalali} تا ${endJalali}\n` +
    `📁 ${count} فایل CSV ارسال شد.`,

  inventoryMovements: (movements) => {
    const pd        = '۰۱۲۳۴۵۶۷۸۹'.split('');
    const fmt       = n => String(Math.round(Math.abs(Number(n)) || 0)).replace(/\d/g, d => pd[d]);
    const fmtCnt    = n => String(Math.round(Number(n) || 0)).replace(/\d/g, d => pd[d]);
    const TYPE_ICON = { in: '➕', out: '➖', adjustment: '🔧' };
    const TYPE_LBL  = { in: 'ورودی', out: 'خروجی', adjustment: 'اصلاح' };
    const sep   = '─'.repeat(26);
    const lines = [`📜 *گردش انبار — ${fmtCnt(movements.length)} حرکت اخیر*\n${sep}`];
    movements.forEach(m => {
      const icon = TYPE_ICON[m.movement_type] || '•';
      const lbl  = TYPE_LBL[m.movement_type]  || m.movement_type;
      lines.push(
        `\n📅 ${m.movement_date} | *${m.item_name}*\n` +
        `   ${icon} ${lbl}: ${fmt(m.quantity)} ${m.unit}` +
        (m.note ? `\n   📝 ${m.note}` : '')
      );
    });
    lines.push(`\n${sep}`);
    return lines.join('\n');
  },
};

module.exports = MSG;
