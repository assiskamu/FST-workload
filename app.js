// Encoding: UTF-8

// =========================
// App State & Configuration
// =========================
let currentSection = 'home';
let allRecords = [];
let notifications = [];

const APP_VERSION = '1.1.0';
const GAS_WEBAPP_URL = 'https://script.google.com/macros/s/AKfycbyTsPksFmodHQjVrXsUrQMo67QIULr86N4sXA0xKV4GmwB4BitFAgbX4hBV2MVbkJRcog/exec';
const SUBMIT_ENDPOINT_KEY = 'fst_workload_submit_endpoint_v1';
const SUBMISSION_HISTORY_KEY = 'fst_workload_submission_history_v1';
const SUBMISSION_PENDING_KEY = 'fst_workload_submission_pending_v1';
const SUBMIT_TOKEN_SESSION_KEY = 'fst_workload_submit_token_v1';
const PROFILE_STATE_STORAGE_KEY = 'profile_state_v2';
const DATA_STORE_STORAGE_KEY = 'fst_workload_v1';
const LEGACY_PROFILE_STORAGE_KEYS = ['fst_profile', 'staffProfile', 'profileDraft', 'profileSnapshot'];
const ALL_STORAGE_KEYS = [
  DATA_STORE_STORAGE_KEY,
  PROFILE_STATE_STORAGE_KEY,
  SUBMIT_ENDPOINT_KEY,
  SUBMISSION_HISTORY_KEY,
  SUBMISSION_PENDING_KEY,
  ...LEGACY_PROFILE_STORAGE_KEYS
];
const ALL_SESSION_STORAGE_KEYS = [SUBMIT_TOKEN_SESSION_KEY];
const SUBMISSION_HISTORY_LIMIT = 25;
let submissionState = { isSubmitting: false, lastError: null, lastPayload: null };
const WORKLOAD_INDEX_MAX = 50;
const WORKLOAD_STATUS_THRESHOLDS = {
  lightMax: 19,
  moderateMin: 20,
  balancedMin: 35,
  overloadedMin: 50
};

    const sections = [
      { id: 'home', label: '🏠 Home', showBadge: false },
      { id: 'profile', label: '👤 Staff Profile', showBadge: false },
      { id: 'teaching', label: '📚 Teaching', showBadge: true },
      { id: 'supervision', label: '🎓 Supervision', showBadge: true },
      { id: 'research', label: '🔬 Research', showBadge: true },
      { id: 'publications', label: '📄 Publications', showBadge: true },
      { id: 'administration', label: '🏛️ Administration', showBadge: true },
      { id: 'service', label: '🤝 Service', showBadge: true },
      { id: 'laboratory', label: '🧪 Laboratory', showBadge: true },
      { id: 'professional', label: '💼 Professional', showBadge: true },
      { id: 'assistants', label: '👨‍🏫 Assistants', showBadge: false },
      { id: 'results', label: '📊 Results', showBadge: false }
    ];

    const defaultConfig = {
      primary_color: '#0ea5e9',
      secondary_color: '#2563eb',
      background_color: '#f8fafc',
      text_color: '#1e293b',
      accent_color: '#10b981',
      font_family: 'Inter',
      font_size: 16,
      app_title: 'FST SMART Calculator',
      app_subtitle: 'Faculty of Science and Technology, Universiti Malaysia Sabah — SMART: Staff Monitoring and Assessment for Roles and Tasks'
    };

    const CONFIG_SMART = {
      systemNameShort: 'SMART',
      systemNameFull: 'FST SMART Calculator',
      sectionWeightsByStaffCategory: {
        academic: {
          Teaching: 0.25,
          Supervision: 0.25,
          Research: 0.05,
          Publications: 0.05,
          Administration: 0.30,
          Laboratory: 0.00,
          Service: 0.05,
          Professional: 0.05
        },
        admin: {
          Teaching: 0.00,
          Supervision: 0.00,
          Research: 0.00,
          Publications: 0.00,
          Administration: 0.80,
          Laboratory: 0.00,
          Service: 0.15,
          Professional: 0.05
        },
        lab: {
          Teaching: 0.00,
          Supervision: 0.00,
          Research: 0.00,
          Publications: 0.00,
          Administration: 0.20,
          Laboratory: 0.60,
          Service: 0.15,
          Professional: 0.05
        }
      },
      sectionBenchmarks: {
        TeachingWeeklyHoursBenchmark: 5,
        SupervisionBenchmarkMastersMain: 2,
        PublicationsBenchmarkPapers: 2,
        AdminBenchmarkUniversityAppointments: 1,
        ResearchBenchmark: 1,
        LaboratoryBenchmark: 1,
        ServiceBenchmark: 1,
        ProfessionalBenchmark: 1
      },
      adminConfig: {
        allowBenchmarkEditRoles: ['management', 'system_admin'],
        isBenchmarkLocked: false
      }
    };

    // =========================
    // Data Store (SDK + Fallback)
    // =========================
    const DataStore = (() => {
      let dataHandler = null;

      const readStore = () => {
        if (typeof localStorage === 'undefined') return { records: [], elementConfig: {} };
        try {
          const raw = localStorage.getItem(DATA_STORE_STORAGE_KEY);
          if (!raw) return { records: [], elementConfig: {} };
          const parsed = JSON.parse(raw);
          if (Array.isArray(parsed)) {
            return { records: parsed, elementConfig: {} };
          }
          return {
            records: Array.isArray(parsed.records) ? parsed.records : [],
            elementConfig: parsed.elementConfig && typeof parsed.elementConfig === 'object' ? parsed.elementConfig : {}
          };
        } catch (error) {
          return { records: [], elementConfig: {} };
        }
      };

      const readRecords = () => readStore().records.map(migrateRecord);

      const writeRecords = (records) => {
        if (typeof localStorage === 'undefined') return;
        try {
          const store = readStore();
          const nextStore = { ...store, records };
          localStorage.setItem(DATA_STORE_STORAGE_KEY, JSON.stringify(nextStore));
        } catch (error) {
          // Ignore storage write errors (private mode, quota, etc.)
        }
      };

      const generateId = () => `rec_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;

      const notifyChange = (records) => {
        if (dataHandler && typeof dataHandler.onDataChanged === 'function') {
          dataHandler.onDataChanged([...records]);
        }
      };

      const createFallbackSdk = () => ({
        async init(handler) {
          dataHandler = handler;
          const records = readRecords();
          notifyChange(records);
          return { isOk: true };
        },
        async create(record) {
          const records = readRecords();
          const newRecord = { ...(record || {}) };
          if (!newRecord.__backendId) {
            newRecord.__backendId = generateId();
          }
          records.push(newRecord);
          writeRecords(records);
          notifyChange(records);
          return { isOk: true, data: newRecord };
        },
        async update(record) {
          if (!record) {
            return { isOk: false, error: 'Invalid record' };
          }
          const records = readRecords();
          const backendId = record.__backendId;
          const index = backendId ? records.findIndex((item) => item.__backendId === backendId) : -1;
          const updatedRecord = {
            ...(index >= 0 ? records[index] : {}),
            ...record,
            __backendId: backendId || generateId()
          };
          if (index >= 0) {
            records[index] = updatedRecord;
          } else {
            records.push(updatedRecord);
          }
          writeRecords(records);
          notifyChange(records);
          return { isOk: true, data: updatedRecord };
        },
        async delete(record) {
          const records = readRecords();
          const backendId = record?.__backendId;
          if (!backendId) {
            return { isOk: false, error: 'Invalid record' };
          }
          const index = records.findIndex((item) => item.__backendId === backendId);
          if (index === -1) {
            return { isOk: false, error: 'Record not found' };
          }
          const removed = records.splice(index, 1)[0];
          writeRecords(records);
          notifyChange(records);
          return { isOk: true, data: removed };
        }
      });

      const ensureSdk = () => {
        if (window.dataSdk) {
          return { sdk: window.dataSdk, isStandalone: false };
        }
        const fallbackSdk = createFallbackSdk();
        window.dataSdk = fallbackSdk;
        return { sdk: fallbackSdk, isStandalone: true };
      };

      return {
        ensureSdk
      };
    })();

    // =========================
    // App Initialization
    // =========================
    async function initializeApp() {
      const dataHandler = {
        onDataChanged(data) {
          allRecords = (Array.isArray(data) ? data : []).map(migrateRecord);
          updateTotalEntries();
          renderNavigation();
          renderSection(currentSection);
        }
      };

      const { sdk, isStandalone } = DataStore.ensureSdk();

      if (isStandalone) {
        showStandaloneBanner();
      }

      const initResult = sdk?.init ? await sdk.init(dataHandler) : { isOk: false };
      
      if (!initResult.isOk) {
        showToast('Failed to initialize application', 'error');
        return;
      }

      if (window.elementSdk) {
        await window.elementSdk.init({
          defaultConfig,
          onConfigChange: async (config) => {
            const customFont = config.font_family || defaultConfig.font_family;
            const baseFontStack = 'system-ui, -apple-system, sans-serif';
            const baseSize = config.font_size || defaultConfig.font_size;

            document.body.style.fontFamily = `${customFont}, ${baseFontStack}`;
            document.body.style.fontSize = `${baseSize}px`;
            document.body.style.backgroundColor = config.background_color || defaultConfig.background_color;
            document.body.style.color = config.text_color || defaultConfig.text_color;

            const titleElement = document.querySelector('h1');
            if (titleElement) {
              titleElement.textContent = config.app_title || defaultConfig.app_title;
              titleElement.style.fontSize = `${baseSize * 1.875}px`;
            }

            const subtitleElement = document.querySelector('header p');
            if (subtitleElement) {
              subtitleElement.textContent = config.app_subtitle || defaultConfig.app_subtitle;
              subtitleElement.style.fontSize = `${baseSize * 0.875}px`;
            }
          },
          mapToCapabilities: (config) => ({
            recolorables: [
              {
                get: () => config.primary_color || defaultConfig.primary_color,
                set: (value) => {
                  window.elementSdk.config.primary_color = value;
                  window.elementSdk.setConfig({ primary_color: value });
                }
              },
              {
                get: () => config.secondary_color || defaultConfig.secondary_color,
                set: (value) => {
                  window.elementSdk.config.secondary_color = value;
                  window.elementSdk.setConfig({ secondary_color: value });
                }
              },
              {
                get: () => config.background_color || defaultConfig.background_color,
                set: (value) => {
                  window.elementSdk.config.background_color = value;
                  window.elementSdk.setConfig({ background_color: value });
                }
              },
              {
                get: () => config.text_color || defaultConfig.text_color,
                set: (value) => {
                  window.elementSdk.config.text_color = value;
                  window.elementSdk.setConfig({ text_color: value });
                }
              },
              {
                get: () => config.accent_color || defaultConfig.accent_color,
                set: (value) => {
                  window.elementSdk.config.accent_color = value;
                  window.elementSdk.setConfig({ accent_color: value });
                }
              }
            ],
            borderables: [],
            fontEditable: {
              get: () => config.font_family || defaultConfig.font_family,
              set: (value) => {
                window.elementSdk.config.font_family = value;
                window.elementSdk.setConfig({ font_family: value });
              }
            },
            fontSizeable: {
              get: () => config.font_size || defaultConfig.font_size,
              set: (value) => {
                window.elementSdk.config.font_size = value;
                window.elementSdk.setConfig({ font_size: value });
              }
            }
          }),
          mapToEditPanelValues: (config) => new Map([
            ['app_title', config.app_title || defaultConfig.app_title],
            ['app_subtitle', config.app_subtitle || defaultConfig.app_subtitle]
          ])
        });
      }

      renderNavigation();
      renderSection('home');
    }

    // =========================
    // UI Utilities
    // =========================
    function updateTotalEntries() {
      const counter = document.getElementById('total-entries');
      if (counter) {
        counter.textContent = allRecords.length;
      }
    }

    function showStandaloneBanner() {
      const bannerId = 'standalone-mode-banner';
      if (document.getElementById(bannerId)) return;

      const appRoot = document.getElementById('app');
      if (!appRoot) return;

      const banner = document.createElement('div');
      banner.id = bannerId;
      banner.className = 'bg-amber-50 border-b border-amber-200 text-amber-900 text-sm px-6 py-2 flex items-center justify-center gap-2';
      banner.innerHTML = '<span>⚠️</span><span class="font-semibold">Standalone mode</span><span class="text-xs text-amber-700">Local storage is active.</span>';
      appRoot.prepend(banner);
    }

    function toggleMenu(menuId, otherMenuIds = []) {
      const menu = document.getElementById(menuId);
      if (!menu) return;
      menu.classList.toggle('hidden');
      otherMenuIds.forEach((id) => {
        const otherMenu = document.getElementById(id);
        if (otherMenu) {
          otherMenu.classList.add('hidden');
        }
      });
    }

    function toggleQuickActions() {
      toggleMenu('quick-actions-menu', ['notifications-menu', 'profile-menu']);
    }

    function toggleNotifications() {
      toggleMenu('notifications-menu', ['quick-actions-menu', 'profile-menu']);
    }

    function toggleProfileMenu() {
      toggleMenu('profile-menu', ['quick-actions-menu', 'notifications-menu']);
    }

    function openMobileNav() {
      const sidebar = document.getElementById('mobile-sidebar');
      const overlay = document.getElementById('mobile-nav-overlay');
      const toggle = document.getElementById('mobile-nav-toggle');

      if (!sidebar || !overlay) return;

      sidebar.classList.remove('-translate-x-full');
      sidebar.classList.add('translate-x-0');
      overlay.classList.remove('opacity-0', 'pointer-events-none');
      overlay.classList.add('opacity-100');
      sidebar.setAttribute('aria-hidden', 'false');
      if (toggle) {
        toggle.setAttribute('aria-expanded', 'true');
      }
      document.body.classList.add('overflow-hidden');
    }

    function closeMobileNav() {
      const sidebar = document.getElementById('mobile-sidebar');
      const overlay = document.getElementById('mobile-nav-overlay');
      const toggle = document.getElementById('mobile-nav-toggle');

      if (!sidebar || !overlay) return;

      sidebar.classList.add('-translate-x-full');
      sidebar.classList.remove('translate-x-0');
      overlay.classList.add('opacity-0', 'pointer-events-none');
      overlay.classList.remove('opacity-100');
      sidebar.setAttribute('aria-hidden', 'true');
      if (toggle) {
        toggle.setAttribute('aria-expanded', 'false');
      }
      document.body.classList.remove('overflow-hidden');
    }

    function toggleMobileNav() {
      const sidebar = document.getElementById('mobile-sidebar');
      if (!sidebar) return;
      if (sidebar.classList.contains('translate-x-0')) {
        closeMobileNav();
      } else {
        openMobileNav();
      }
    }

    function syncMobileNavAria() {
      const sidebar = document.getElementById('mobile-sidebar');
      const toggle = document.getElementById('mobile-nav-toggle');
      if (!sidebar || !toggle) return;
      const isMobile = window.matchMedia('(max-width: 767px)').matches;
      if (!isMobile) {
        sidebar.setAttribute('aria-hidden', 'false');
        toggle.setAttribute('aria-expanded', 'false');
        document.body.classList.remove('overflow-hidden');
        return;
      }
      const isOpen = sidebar.classList.contains('translate-x-0');
      sidebar.setAttribute('aria-hidden', isOpen ? 'false' : 'true');
      toggle.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
    }

    function setupMobileNav() {
      const toggle = document.getElementById('mobile-nav-toggle');
      const overlay = document.getElementById('mobile-nav-overlay');
      const closeButton = document.getElementById('mobile-nav-close');

      if (toggle) {
        toggle.addEventListener('click', toggleMobileNav);
      }
      if (overlay) {
        overlay.addEventListener('click', closeMobileNav);
      }
      if (closeButton) {
        closeButton.addEventListener('click', closeMobileNav);
      }

      document.addEventListener('keydown', (event) => {
        if (event.key === 'Escape') {
          closeMobileNav();
        }
      });

      window.addEventListener('resize', () => {
        if (window.matchMedia('(min-width: 768px)').matches) {
          closeMobileNav();
        }
        syncMobileNavAria();
      });

      syncMobileNavAria();
    }

    function updateLiveScore() {
      const scores = calculateScores();
      const normalized = calculateNormalizedScores();
      const status = getWorkloadStatus(scores.total);
      const profile = getProfile();
      
      const badge = document.getElementById('live-score-badge');
      const scoreValue = document.getElementById('live-score-value');
      const scoreIcon = document.getElementById('live-score-icon');
      
      if (profile && allRecords.length > 1) {
        badge.classList.remove('hidden');
        scoreValue.textContent = Math.round(scores.total);
        scoreIcon.textContent = status.icon;
      } else {
        badge.classList.add('hidden');
      }
    }

    function updateProfileDisplay() {
      const profile = getProfile();
      const avatar = document.getElementById('profile-avatar');
      const nameDisplay = document.getElementById('profile-name-display');
      const rankDisplay = document.getElementById('profile-rank-display');
      const menuContent = document.getElementById('profile-menu-content');
      
      if (profile) {
        const initials = profile.profile_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        avatar.textContent = initials;
        nameDisplay.textContent = profile.profile_name;
        rankDisplay.textContent = profile.profile_rank || getProfileCategoryLabel(profile.profile_category) || 'Staff';
        
        const scores = calculateScores();
        const status = getWorkloadStatus(scores.total);
        
        menuContent.innerHTML = `
          <div class="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-4 mb-4">
            <div class="flex items-center gap-3 mb-3">
              <div class="w-16 h-16 bg-gradient-to-br from-purple-500 to-pink-500 rounded-full flex items-center justify-center text-white font-bold text-2xl shadow-md">
                ${initials}
              </div>
              <div class="flex-1">
                <div class="font-bold text-gray-900">${profile.profile_name}</div>
                <div class="text-sm text-gray-600">${profile.profile_staff_id}</div>
                <div class="text-xs text-gray-500">${profile.profile_rank || getProfileCategoryLabel(profile.profile_category)}</div>
              </div>
            </div>
          </div>
          
          <div class="space-y-2 mb-4">
            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span class="text-sm text-gray-600">Total Score</span>
              <span class="font-bold text-lg text-gray-900">${scores.total.toFixed(1)}</span>
            </div>
            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span class="text-sm text-gray-600">Status</span>
              <span class="flex items-center gap-1">
                <span>${status.icon}</span>
                <span class="font-semibold text-sm text-gray-900">${status.label}</span>
              </span>
            </div>
            <div class="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <span class="text-sm text-gray-600">Total Entries</span>
              <span class="font-bold text-lg text-gray-900">${allRecords.length}</span>
            </div>
          </div>
          
          <div class="space-y-2">
            <button onclick="navigateToSection('profile'); toggleProfileMenu();" class="w-full text-left px-3 py-2 hover:bg-gray-50 rounded text-sm text-gray-700">
              📝 Edit Profile
            </button>
            <button onclick="navigateToSection('results'); toggleProfileMenu();" class="w-full text-left px-3 py-2 hover:bg-gray-50 rounded text-sm text-gray-700">
              📊 View Full Report
            </button>
          </div>
        `;
      } else {
        avatar.textContent = '?';
        nameDisplay.textContent = 'Guest';
        rankDisplay.textContent = 'No Profile';
        
        menuContent.innerHTML = `
          <div class="text-center py-4">
            <div class="text-4xl mb-2">👤</div>
            <p class="text-sm text-gray-600 mb-4">Create your profile to get started</p>
            <button onclick="navigateToSection('profile'); toggleProfileMenu();" class="w-full px-4 py-2 bg-sky-600 text-white rounded-lg font-semibold hover:bg-sky-700">
              Create Profile
            </button>
          </div>
        `;
      }
    }

    function updateBreadcrumb() {
      const breadcrumb = document.getElementById('breadcrumb-nav');
      if (!breadcrumb) return;
      const currentSectionObj = sections.find(s => s.id === currentSection);
      
      if (!currentSectionObj) return;
      
      breadcrumb.innerHTML = `
        <button onclick="navigateToSection('home')" class="hover:text-sky-600 transition">
          🏠 Home
        </button>
        ${currentSection !== 'home' ? `
          <span>›</span>
          <span class="text-gray-900 font-semibold">${currentSectionObj.label}</span>
        ` : ''}
      `;
    }

    function addNotification(message, type = 'info') {
      const notification = {
        id: Date.now(),
        message,
        type,
        timestamp: new Date()
      };
      
      notifications.unshift(notification);
      
      if (notifications.length > 10) {
        notifications = notifications.slice(0, 10);
      }
      
      updateNotificationsDisplay();
    }

    function updateNotificationsDisplay() {
      const badge = document.getElementById('notification-badge');
      const list = document.getElementById('notifications-list');
      
      if (notifications.length > 0) {
        badge.classList.remove('hidden');
        badge.textContent = notifications.length;
        
        list.innerHTML = notifications.map(notif => {
          const icon = notif.type === 'warning' ? '⚠️' : notif.type === 'success' ? '✅' : 'ℹ️';
          
          return `
            <div class="px-4 py-3 hover:bg-gray-50 border-b border-gray-100">
              <div class="flex items-start gap-2">
                <span class="text-lg">${icon}</span>
                <div class="flex-1">
                  <p class="text-sm text-gray-700">${notif.message}</p>
                  <p class="text-xs text-gray-500 mt-1">${formatTimeAgo(notif.timestamp)}</p>
                </div>
              </div>
            </div>
          `;
        }).join('');
      } else {
        badge.classList.add('hidden');
        list.innerHTML = '<div class="px-4 py-8 text-center text-gray-500 text-sm">No notifications</div>';
      }
    }

    function formatTimeAgo(date) {
      const seconds = Math.floor((new Date() - date) / 1000);
      
      if (seconds < 60) return 'Just now';
      if (seconds < 3600) return `${Math.floor(seconds / 60)}m ago`;
      if (seconds < 86400) return `${Math.floor(seconds / 3600)}h ago`;
      return `${Math.floor(seconds / 86400)}d ago`;
    }

    function checkWorkloadNotifications() {
      const scores = calculateScores();
      const profile = getProfile();
      
      if (!profile) return;
      
      if (scores.total >= WORKLOAD_STATUS_THRESHOLDS.overloadedMin && !notifications.some(n => n.message.includes('workload has reached overload'))) {
        addNotification('Your workload has reached overload level (50+). Consider rebalancing your activities.', 'warning');
      }
      
      if (allRecords.length >= 900 && !notifications.some(n => n.message.includes('approaching the 999 record limit'))) {
        addNotification(`You're approaching the 999 record limit (${allRecords.length}/999).`, 'warning');
      }
      
      if (allRecords.length >= 999) {
        addNotification('Maximum record limit reached (999/999). Please delete some records to add new ones.', 'warning');
      }
    }

    const PROFILE_CATEGORY_LABELS = {
      academic: 'Academic Staff',
      admin: 'Administration Staff',
      lab: 'Lab Staff'
    };

    function normalizeProfileCategoryKey(value) {
      const category = String(value || '').trim().toLowerCase();
      if (category === 'academic staff' || category === 'academic') return 'academic';
      if (category === 'administration staff' || category === 'admin') return 'admin';
      if (category === 'lab staff' || category === 'laboratory staff' || category === 'lab') return 'lab';
      return '';
    }

    function normalizeProfileCategory(value) {
      const key = normalizeProfileCategoryKey(value);
      return key ? PROFILE_CATEGORY_LABELS[key] : '';
    }

    function getProfileCategoryLabel(value) {
      return normalizeProfileCategory(value);
    }


    function getActiveSectionWeights(profile = getProfile(), config = readSmartConfig()) {
      const categoryKey = normalizeProfileCategoryKey(profile?.profile_category || profile?.staff_category || 'academic') || 'academic';
      const allWeights = config.sectionWeightsByStaffCategory || CONFIG_SMART.sectionWeightsByStaffCategory;
      return {
        ...(allWeights?.academic || CONFIG_SMART.sectionWeightsByStaffCategory.academic),
        ...((allWeights && allWeights[categoryKey]) || {})
      };
    }

    function getReportingPeriodPreset(periodType) {
      const now = new Date();
      const year = now.getFullYear();
      const month = now.getMonth();

      if (periodType === 'Monthly') {
        return {
          start: new Date(year, month, 1),
          end: new Date(year, month + 1, 0)
        };
      }

      const isFirstHalf = month < 6;
      return {
        start: new Date(year, isFirstHalf ? 0 : 6, 1),
        end: new Date(year, isFirstHalf ? 5 : 11, isFirstHalf ? 30 : 31)
      };
    }

    function formatDateInputValue(value) {
      if (!value) return '';
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) return '';
      return date.toISOString().split('T')[0];
    }

    function calculateReportingDays(startDate, endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || end < start) return 0;
      const millisecondsPerDay = 24 * 60 * 60 * 1000;
      return Math.floor((end - start) / millisecondsPerDay) + 1;
    }

    function toFirstDayOfYearDate(value) {
      const year = Number(value);
      if (!Number.isFinite(year) || year < 1900) return '';
      return `${Math.trunc(year)}-01-01`;
    }

    function migrateRecord(record) {
      if (!record || typeof record !== 'object') return record;
      const migrated = { ...record };

      if (migrated.section === 'supervision') {
        if (migrated.student_role === 'leader') migrated.student_role = 'main';
        if (migrated.student_role === 'member') migrated.student_role = 'co';
        if (migrated.student_year && !migrated.student_start_semester) {
          migrated.student_start_semester = 'Other';
          migrated.student_start_semester_other = `Legacy year ${migrated.student_year}`;
        }
      }

      if (migrated.section === 'research') {
        if (migrated.research_role === 'co-lead') migrated.research_role = 'member';
        if (migrated.research_year && !migrated.research_start_date) {
          migrated.research_start_date = toFirstDayOfYearDate(migrated.research_year);
        }
      }

      if (migrated.section === 'publications') {
        if (!migrated.pub_stage && migrated.pub_status) {
          const statusMap = {
            Drafting: 'drafting',
            Submitted: 'revising',
            Accepted: 'responding_reviewers',
            Published: 'proofing',
            Other: 'revising'
          };
          migrated.pub_stage = statusMap[migrated.pub_status] || 'revising';
        }
      }

      if (migrated.section === 'admin_duties' && migrated.duty_year && !migrated.duty_start_date) {
        migrated.duty_start_date = toFirstDayOfYearDate(migrated.duty_year);
      }
      if (migrated.section === 'service' && migrated.service_date && !migrated.service_start_date) {
        migrated.service_start_date = migrated.service_date;
      }
      if (migrated.section === 'laboratory' && migrated.lab_year && !migrated.lab_start_date) {
        migrated.lab_start_date = toFirstDayOfYearDate(migrated.lab_year);
      }
      if (migrated.section === 'professional' && migrated.prof_year && !migrated.prof_start_date) {
        migrated.prof_start_date = toFirstDayOfYearDate(migrated.prof_year);
      }

      return migrated;
    }

    function parseProfileState(profile, options = {}) {
      const { includeLocalState = true } = options;
      const defaults = {
        staff_name: '',
        staff_id: '',
        staff_category: '',
        admin_status: '',
        staff_grade: '',
        reporting_period_type: 'Semester',
        reporting_start_date: '',
        reporting_end_date: '',
        programme: '',
        academic_rank: '',
        administrative_position: '',
        laboratory_position: ''
      };

      const legacyExtras = (() => {
        if (!profile?.profile_json) return {};
        try {
          return JSON.parse(profile.profile_json) || {};
        } catch (error) {
          return {};
        }
      })();

      const legacyCategory = normalizeProfileCategory(profile?.profile_category || legacyExtras.staff_category);
      const parsedState = (() => {
        if (!profile?.profile_state) return {};
        if (typeof profile.profile_state === 'string') {
          try {
            return JSON.parse(profile.profile_state) || {};
          } catch (error) {
            return {};
          }
        }
        if (typeof profile.profile_state === 'object') return profile.profile_state;
        return {};
      })();

      const localState = includeLocalState ? readLocalJson(PROFILE_STATE_STORAGE_KEY, {}) : {};
      const resolvedAdminStatus = String(parsedState.admin_status || profile?.admin_status || localState.admin_status || '').trim().toLowerCase();
      const state = {
        ...defaults,
        ...localState,
        ...legacyExtras,
        ...parsedState,
        staff_name: parsedState.staff_name || profile?.profile_name || legacyExtras.staff_display_name || localState.staff_name || '',
        staff_id: parsedState.staff_id || profile?.profile_staff_id || localState.staff_id || '',
        staff_category: normalizeProfileCategory(parsedState.staff_category || legacyCategory || localState.staff_category),
        admin_status: resolvedAdminStatus === 'admin' || resolvedAdminStatus === 'non_admin' ? resolvedAdminStatus : '',
        programme: parsedState.programme || profile?.profile_programme || localState.programme || '',
        academic_rank: parsedState.academic_rank || profile?.profile_rank || localState.academic_rank || '',
        administrative_position: parsedState.administrative_position
          || (profile?.profile_admin_position === 'Other' ? profile?.profile_other_admin_position : profile?.profile_admin_position)
          || localState.administrative_position
          || '',
        reporting_period_type: parsedState.reporting_period_type || localState.reporting_period_type || 'Semester',
        reporting_start_date: formatDateInputValue(parsedState.reporting_start_date || localState.reporting_start_date || ''),
        reporting_end_date: formatDateInputValue(parsedState.reporting_end_date || localState.reporting_end_date || '')
      };

      if (!['Semester', 'Monthly', 'Custom'].includes(state.reporting_period_type)) {
        state.reporting_period_type = 'Semester';
      }

      if (!state.reporting_start_date || !state.reporting_end_date) {
        const preset = getReportingPeriodPreset(state.reporting_period_type);
        state.reporting_start_date = state.reporting_start_date || formatDateInputValue(preset.start);
        state.reporting_end_date = state.reporting_end_date || formatDateInputValue(preset.end);
      }

      return state;
    }

    function formatAdminStatusValue(value, staffCategory) {
      if (normalizeProfileCategoryKey(staffCategory) !== 'academic') return 'Not applicable';
      if (value === 'admin') return 'Admin';
      if (value === 'non_admin') return 'Non admin';
      return '';
    }

    function renderSavedProfileSummary(profile) {
      if (!profile) return '';
      const savedState = parseProfileState(profile, { includeLocalState: false });
      const startDate = savedState.reporting_start_date;
      const endDate = savedState.reporting_end_date;

      const rows = [
        ['Staff Name', savedState.staff_name],
        ['Staff ID', savedState.staff_id],
        ['Staff Category', getProfileCategoryLabel(savedState.staff_category)],
        ['Admin Status', formatAdminStatusValue(savedState.admin_status, savedState.staff_category)],
        ['Grade', savedState.staff_grade],
        ['Reporting Period Type', savedState.reporting_period_type],
        ['Start Date', startDate],
        ['End Date', endDate],
        ['Programme', savedState.programme],
        ['Academic Rank', savedState.academic_rank],
        ['Administrative Position', savedState.administrative_position],
        ['Laboratory Position', savedState.laboratory_position]
      ].filter(([, value]) => String(value || '').trim() !== '');

      return `
        <div id="profile_summary_card" class="bg-white border border-sky-200 rounded-xl p-4 shadow-sm">
          <h3 class="text-sm font-semibold text-sky-700 mb-2">Saved profile summary</h3>
          <div class="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2 text-sm">
            ${rows.map(([label, value]) => `<div><span class="text-gray-500">${escapeHtml(label)}:</span> <span class="font-medium text-gray-900">${escapeHtml(String(value))}</span></div>`).join('')}
          </div>
        </div>
      `;
    }

    function renderProfile() {
      const profile = getProfile();
      const profileState = parseProfileState(profile);
      const isAcademicStaff = normalizeProfileCategoryKey(profileState.staff_category) === 'academic';
      const adminStatus = profileState.admin_status === 'admin' || profileState.admin_status === 'non_admin' ? profileState.admin_status : '';

      return `
        <div class="max-w-3xl mx-auto space-y-4">
          ${renderSavedProfileSummary(profile)}

          <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 class="heading-font text-2xl font-bold mb-2">👤 Staff Profile</h2>
            <p class="text-sm text-gray-600 mb-6">Enter your profile details for reporting and section defaults.</p>

            <form id="profile_form" onsubmit="saveProfile(event)" class="space-y-6">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="md:col-span-2">
                  <label for="staff_name" class="block text-sm font-semibold text-gray-700 mb-2">Staff Name *</label>
                  <input type="text" id="staff_name" required
                         class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"
                         value="${escapeHtml(profileState.staff_name)}"
                         placeholder="Enter staff name">
                </div>

                <div>
                  <label for="staff_id" class="block text-sm font-semibold text-gray-700 mb-2">Staff ID</label>
                  <input type="text" id="staff_id" pattern="[A-Za-z0-9-]{4,20}" title="Use 4-20 letters, numbers, or hyphens"
                         class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"
                         value="${escapeHtml(profileState.staff_id)}"
                         placeholder="e.g., 250505-05050">
                  <p class="text-xs text-gray-500 mt-1">Optional. Use letters, numbers, and hyphens only.</p>
                </div>

                <div>
                  <label for="staff_category" class="block text-sm font-semibold text-gray-700 mb-2">Staff Category *</label>
                  <select id="staff_category" required onchange="toggleCategoryFields()" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none">
                    <option value="">Select category</option>
                    <option value="Academic Staff" ${profileState.staff_category === 'Academic Staff' ? 'selected' : ''}>Academic Staff</option>
                    <option value="Administration Staff" ${profileState.staff_category === 'Administration Staff' ? 'selected' : ''}>Administration Staff</option>
                    <option value="Lab Staff" ${profileState.staff_category === 'Lab Staff' ? 'selected' : ''}>Lab Staff</option>
                  </select>
                </div>

                <div>
                  <label for="staff_grade" class="block text-sm font-semibold text-gray-700 mb-2">Grade</label>
                  <input type="text" id="staff_grade"
                         class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"
                         value="${escapeHtml(profileState.staff_grade)}"
                         placeholder="e.g., DS51">
                  <p class="text-xs text-gray-500 mt-1">Optional classification code for reporting.</p>
                </div>

                <div>
                  <label for="admin_status" class="block text-sm font-semibold text-gray-700 mb-2">Admin Status ${isAcademicStaff ? '*' : ''}</label>
                  <select id="admin_status" ${isAcademicStaff ? 'required' : 'disabled'} class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none disabled:bg-gray-100 disabled:text-gray-500">
                    <option value="" ${adminStatus === '' ? 'selected' : ''}>${isAcademicStaff ? 'Select admin status' : 'Not applicable'}</option>
                    <option value="non_admin" ${adminStatus === 'non_admin' ? 'selected' : ''}>Non admin</option>
                    <option value="admin" ${adminStatus === 'admin' ? 'selected' : ''}>Admin</option>
                  </select>
                  <p id="admin_status_note" class="text-xs text-amber-700 mt-1 ${isAcademicStaff ? 'hidden' : ''}">Applies to Academic Staff only.</p>
                </div>

                <div>
                  <label for="reporting_period_type" class="block text-sm font-semibold text-gray-700 mb-2">Reporting Period Type *</label>
                  <select id="reporting_period_type" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none">
                    <option value="Semester" ${profileState.reporting_period_type === 'Semester' ? 'selected' : ''}>Semester</option>
                    <option value="Monthly" ${profileState.reporting_period_type === 'Monthly' ? 'selected' : ''}>Monthly</option>
                    <option value="Custom" ${profileState.reporting_period_type === 'Custom' ? 'selected' : ''}>Custom</option>
                  </select>
                </div>

                <div>
                  <label for="reporting_start_date" class="block text-sm font-semibold text-gray-700 mb-2">Start Date *</label>
                  <input type="date" id="reporting_start_date" required
                         class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"
                         value="${escapeHtml(profileState.reporting_start_date)}">
                </div>

                <div>
                  <label for="reporting_end_date" class="block text-sm font-semibold text-gray-700 mb-2">End Date *</label>
                  <input type="date" id="reporting_end_date" required
                         class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"
                         value="${escapeHtml(profileState.reporting_end_date)}">
                </div>

                <div>
                  <label class="block text-sm font-semibold text-gray-700 mb-2">Reporting Days / Weeks</label>
                  <p id="reporting_duration_display" class="w-full px-4 py-3 border border-gray-200 rounded-lg bg-gray-50 text-gray-700 text-sm">0 days (0.0 weeks)</p>
                </div>

                <div id="programme_field" style="display:none;">
                  <label for="programme" class="block text-sm font-semibold text-gray-700 mb-2">Programme</label>
                  <select id="programme" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none">
                    <option value="">Select Programme</option>
                    <option value="UH6422001 Environmental Science" ${profileState.programme === 'UH6422001 Environmental Science' ? 'selected' : ''}>UH6422001 Environmental Science</option>
                    <option value="UH6441001 Industrial Physics" ${profileState.programme === 'UH6441001 Industrial Physics' ? 'selected' : ''}>UH6441001 Industrial Physics</option>
                    <option value="UH6443002 Geology" ${profileState.programme === 'UH6443002 Geology' ? 'selected' : ''}>UH6443002 Geology</option>
                    <option value="UH6443003 Marine Science" ${profileState.programme === 'UH6443003 Marine Science' ? 'selected' : ''}>UH6443003 Marine Science</option>
                    <option value="UH6461001 Mathematics with Economics" ${profileState.programme === 'UH6461001 Mathematics with Economics' ? 'selected' : ''}>UH6461001 Mathematics with Economics</option>
                    <option value="UH6461002 Mathematics Computer Graphics" ${profileState.programme === 'UH6461002 Mathematics Computer Graphics' ? 'selected' : ''}>UH6461002 Mathematics Computer Graphics</option>
                    <option value="UH6545001 Biotechnology" ${profileState.programme === 'UH6545001 Biotechnology' ? 'selected' : ''}>UH6545001 Biotechnology</option>
                    <option value="UH6545002 Industrial Chemistry" ${profileState.programme === 'UH6545002 Industrial Chemistry' ? 'selected' : ''}>UH6545002 Industrial Chemistry</option>
                  </select>
                </div>

                <div id="academic_rank_field" style="display:none;">
                  <label for="academic_rank" class="block text-sm font-semibold text-gray-700 mb-2">Academic Rank</label>
                  <select id="academic_rank" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none">
                    <option value="">Select rank</option>
                    <option value="Professor" ${profileState.academic_rank === 'Professor' ? 'selected' : ''}>Professor</option>
                    <option value="Associate Professor" ${profileState.academic_rank === 'Associate Professor' ? 'selected' : ''}>Associate Professor</option>
                    <option value="Senior Lecturer" ${profileState.academic_rank === 'Senior Lecturer' ? 'selected' : ''}>Senior Lecturer</option>
                    <option value="Lecturer" ${profileState.academic_rank === 'Lecturer' ? 'selected' : ''}>Lecturer</option>
                  </select>
                </div>

                <div id="administrative_position_field" style="display:none;">
                  <label for="administrative_position" class="block text-sm font-semibold text-gray-700 mb-2">Administrative Position</label>
                  <input type="text" id="administrative_position"
                         class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"
                         value="${escapeHtml(profileState.administrative_position)}"
                         placeholder="e.g., Deputy Dean">
                </div>

                <div id="laboratory_position_field" style="display:none;">
                  <label for="laboratory_position" class="block text-sm font-semibold text-gray-700 mb-2">Laboratory Position</label>
                  <input type="text" id="laboratory_position"
                         class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"
                         value="${escapeHtml(profileState.laboratory_position)}"
                         placeholder="e.g., Laboratory Coordinator">
                </div>

              </div>

              <button type="submit" id="save_profile_btn" class="w-full px-6 py-3 bg-sky-600 text-white rounded-lg font-semibold hover:bg-sky-700">
                💾 Save Profile
              </button>
            </form>

            ${profile ? `
              <button type="button" onclick="deleteProfile('${profile.__backendId}')"
                      class="mt-4 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium text-sm border border-red-200">
                Delete Profile
              </button>
            ` : ''}
          </div>
        </div>
      `;
    }

    function setupProfileEventListeners() {
      [
        'staff_name', 'staff_id', 'staff_category', 'staff_grade',
        'reporting_period_type', 'reporting_start_date', 'reporting_end_date',
        'programme', 'academic_rank', 'administrative_position', 'laboratory_position', 'admin_status'
      ].forEach((id) => {
        const element = document.getElementById(id);
        if (!element) return;
        element.addEventListener('change', () => {
          if (id === 'staff_category') toggleCategoryFields();
          if (id === 'reporting_period_type') applyReportingPeriodPreset();
          if (id === 'reporting_period_type' || id === 'reporting_start_date' || id === 'reporting_end_date') {
            updateReportingDurationPreview();
          }
        });
        if (id === 'reporting_start_date' || id === 'reporting_end_date') {
          element.addEventListener('input', updateReportingDurationPreview);
        }
      });

      toggleCategoryFields();
      updateReportingDurationPreview();
    }

    function toggleCategoryFields() {
      const categoryKey = normalizeProfileCategoryKey(document.getElementById('staff_category')?.value || '');
      const programmeField = document.getElementById('programme_field');
      const rankField = document.getElementById('academic_rank_field');
      const adminField = document.getElementById('administrative_position_field');
      const labField = document.getElementById('laboratory_position_field');
      const adminStatusField = document.getElementById('admin_status');
      const adminStatusNote = document.getElementById('admin_status_note');

      if (programmeField) programmeField.style.display = categoryKey === 'academic' ? 'block' : 'none';
      if (rankField) rankField.style.display = categoryKey === 'academic' ? 'block' : 'none';
      if (adminField) adminField.style.display = categoryKey === 'admin' ? 'block' : 'none';
      if (labField) labField.style.display = categoryKey === 'lab' ? 'block' : 'none';

      if (adminStatusField) {
        const placeholderOption = adminStatusField.querySelector('option[value=""]');
        if (categoryKey === 'academic') {
          adminStatusField.disabled = false;
          adminStatusField.required = true;
          if (placeholderOption) placeholderOption.textContent = 'Select admin status';
          if (adminStatusNote) adminStatusNote.classList.add('hidden');
        } else {
          adminStatusField.value = '';
          adminStatusField.disabled = true;
          adminStatusField.required = false;
          if (placeholderOption) placeholderOption.textContent = 'Not applicable';
          if (adminStatusNote) adminStatusNote.classList.remove('hidden');
        }
      }

      if (categoryKey !== 'academic') {
        const programme = document.getElementById('programme');
        const rank = document.getElementById('academic_rank');
        if (programme) programme.value = '';
        if (rank) rank.value = '';
      }
      if (categoryKey !== 'admin') {
        const adminPos = document.getElementById('administrative_position');
        if (adminPos) adminPos.value = '';
      }
      if (categoryKey !== 'lab') {
        const labPos = document.getElementById('laboratory_position');
        if (labPos) labPos.value = '';
      }
    }

    function applyReportingPeriodPreset() {
      const periodType = document.getElementById('reporting_period_type')?.value || 'Semester';
      if (periodType === 'Custom') return;
      const preset = getReportingPeriodPreset(periodType);
      const startInput = document.getElementById('reporting_start_date');
      const endInput = document.getElementById('reporting_end_date');
      if (startInput) startInput.value = formatDateInputValue(preset.start);
      if (endInput) endInput.value = formatDateInputValue(preset.end);
    }

    function updateReportingDurationPreview() {
      const startDate = document.getElementById('reporting_start_date')?.value || '';
      const endDate = document.getElementById('reporting_end_date')?.value || '';
      const reportingDays = calculateReportingDays(startDate, endDate);
      const reportingWeeks = reportingDays ? (reportingDays / 7).toFixed(1) : '';
      const durationDisplay = document.getElementById('reporting_duration_display');
      if (durationDisplay) {
        durationDisplay.textContent = reportingDays
          ? `${reportingDays} days (${reportingWeeks} weeks)`
          : 'Enter a valid start and end date.';
      }
    }

    async function saveProfile(event) {
      event.preventDefault();

      if (allRecords.length >= 999) {
        showToast('Maximum limit of 999 records reached', 'error');
        return;
      }

      const btn = document.getElementById('save_profile_btn');
      btn.disabled = true;
      btn.innerHTML = '<div class="loading-spinner mx-auto"></div>';

      const staffId = (document.getElementById('staff_id')?.value || '').trim();
      if (staffId && !/^[A-Za-z0-9-]{4,20}$/.test(staffId)) {
        showToast('Staff ID format is invalid. Use 4-20 letters, numbers, or hyphens.', 'error');
        btn.disabled = false;
        btn.innerHTML = '💾 Save Profile';
        return;
      }

      const profileState = {
        staff_name: (document.getElementById('staff_name')?.value || '').trim(),
        staff_id: staffId,
        staff_category: normalizeProfileCategory(document.getElementById('staff_category')?.value || ''),
        admin_status: '',
        staff_grade: (document.getElementById('staff_grade')?.value || '').trim(),
        reporting_period_type: (document.getElementById('reporting_period_type')?.value || 'Semester').trim(),
        reporting_start_date: formatDateInputValue(document.getElementById('reporting_start_date')?.value || ''),
        reporting_end_date: formatDateInputValue(document.getElementById('reporting_end_date')?.value || ''),
        programme: (document.getElementById('programme')?.value || '').trim(),
        academic_rank: (document.getElementById('academic_rank')?.value || '').trim(),
        administrative_position: (document.getElementById('administrative_position')?.value || '').trim(),
        laboratory_position: (document.getElementById('laboratory_position')?.value || '').trim()
      };
      const categoryKey = normalizeProfileCategoryKey(profileState.staff_category);
      profileState.admin_status = categoryKey === 'academic' ? (document.getElementById('admin_status')?.value || '').trim() : null;
      profileState.academic_rank = categoryKey === 'academic' ? profileState.academic_rank : null;

      if (categoryKey === 'academic' && !profileState.admin_status) {
        showToast('Admin Status is required for Academic Staff.', 'error');
        btn.disabled = false;
        btn.innerHTML = '💾 Save Profile';
        return;
      }

      const reportingDays = calculateReportingDays(profileState.reporting_start_date, profileState.reporting_end_date);
      if (!reportingDays) {
        showToast('Please enter a valid reporting start and end date.', 'error');
        btn.disabled = false;
        btn.innerHTML = '💾 Save Profile';
        return;
      }

      writeLocalJson(PROFILE_STATE_STORAGE_KEY, profileState);

      const profileData = {
        section: 'profile',
        profile_name: profileState.staff_name,
        profile_staff_id: profileState.staff_id,
        profile_category: profileState.staff_category,
        admin_status: categoryKey === 'academic' ? profileState.admin_status : null,
        profile_programme: categoryKey === 'academic' ? profileState.programme : '',
        profile_rank: categoryKey === 'academic' ? profileState.academic_rank : null,
        profile_admin_position: categoryKey === 'admin' ? profileState.administrative_position : '',
        profile_other_admin_position: '',
        profile_state: JSON.stringify(profileState),
        profile_json: '',
        created_at: new Date().toISOString()
      };

      const existingProfile = getProfile();
      let result;

      if (existingProfile) {
        result = await window.dataSdk.update({ ...existingProfile, ...profileData });
      } else {
        result = await window.dataSdk.create(profileData);
      }

      btn.disabled = false;
      btn.innerHTML = '💾 Save Profile';

      if (result.isOk) {
        if (currentSection === 'profile') {
          renderSection('profile');
        }
        showToast('Profile saved successfully!');
        setTimeout(() => {
          navigateToSection('teaching');
        }, 1000);
      } else {
        showToast('Failed to save profile', 'error');
      }
    }

    async function deleteProfile(backendId) {
      const profile = allRecords.find(r => r.__backendId === backendId);
      if (!profile) return;

      const result = await window.dataSdk.delete(profile);

      if (result.isOk) {
        writeLocalJson(PROFILE_STATE_STORAGE_KEY, {});
        showToast('Profile deleted successfully!');
      } else {
        showToast('Failed to delete profile', 'error');
      }
    }


    // =========================
    // Navigation & Section Renderers
    // =========================
    function renderNavigation() {
      const nav = document.getElementById('sidebar-nav');
      
      const counts = {
        teaching: allRecords.filter(r => r.section === 'teaching').length,
        supervision: allRecords.filter(r => r.section === 'supervision').length,
        research: allRecords.filter(r => r.section === 'research').length,
        publications: allRecords.filter(r => r.section === 'publications').length,
        administration: allRecords.filter(r => r.section === 'administration' || r.section === 'admin_duties').length,
        service: getRecordsBySection('service').length,
        laboratory: getRecordsBySection('laboratory').length,
        professional: getRecordsBySection('professional').length
      };

      nav.innerHTML = sections.map(section => `
        <button 
          onclick="navigateToSection('${section.id}')"
          class="sidebar-button w-full text-left px-4 py-3 rounded-lg font-medium ${currentSection === section.id ? 'active' : 'text-gray-700'}"
          data-section="${section.id}"
        >
          <div class="flex items-center justify-between">
            <span>${section.label}</span>
            ${section.showBadge && counts[section.id] > 0 ? `
              <span class="bg-sky-500 text-white text-xs font-bold px-2 py-1 rounded-full">${counts[section.id]}</span>
            ` : ''}
          </div>
        </button>
      `).join('');
    }

    function navigateToSection(sectionId) {
      currentSection = sectionId;
      if (window.matchMedia('(max-width: 767px)').matches) {
        closeMobileNav();
      }
      renderNavigation();
      renderSection(sectionId);
      updateBreadcrumb();
    }

    function renderSection(sectionId) {
      const contentArea = document.getElementById('main-content');
      
      switch(sectionId) {
        case 'home':
          contentArea.innerHTML = renderHome();
          break;
        case 'profile':
          contentArea.innerHTML = renderProfile();
          setupProfileEventListeners();
          break;
        case 'teaching':
          contentArea.innerHTML = renderTeaching();
          setupTeachingEventListeners();
          break;
        case 'supervision':
          contentArea.innerHTML = renderSupervision();
          setupSupervisionEventListeners();
          break;
        case 'research':
          contentArea.innerHTML = renderResearch();
          setupResearchEventListeners();
          break;
        case 'publications':
          contentArea.innerHTML = renderPublications();
          setupPublicationsEventListeners();
          break;
        case 'administration':
          contentArea.innerHTML = renderAdministrationCombined();
          setupAdministrationCombinedEventListeners();
          break;
        case 'admin_duties':
          contentArea.innerHTML = renderAdministrationCombined();
          setupAdministrationCombinedEventListeners();
          break;
        case 'service':
          contentArea.innerHTML = renderService();
          setupServiceEventListeners();
          break;
        case 'laboratory':
          contentArea.innerHTML = renderLaboratory();
          setupLaboratoryEventListeners();
          break;
        case 'professional':
          contentArea.innerHTML = renderProfessional();
          setupProfessionalEventListeners();
          break;
        case 'assistants':
          contentArea.innerHTML = renderAssistants();
          break;
        case 'results':
          contentArea.innerHTML = renderResults();
          renderSubmissionStatus();
          break;
        default:
          contentArea.innerHTML = '<p>Section not found</p>';
      }
    }

    function showToast(message, type = 'success') {
      const existingToast = document.querySelector('.toast');
      if (existingToast) {
        existingToast.remove();
      }

      const toast = document.createElement('div');
      toast.className = `toast ${type}`;
      toast.textContent = message;
      document.body.appendChild(toast);

      setTimeout(() => {
        toast.remove();
      }, 3000);
    }

    function getProfile() {
      return allRecords.find(r => r.section === 'profile') || null;
    }

    function getRecordsBySection(section) {
      return allRecords.filter(r => r.section === section).map(migrateRecord);
    }

    function escapeHtml(value) {
      return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;');
    }

    function readLocalJson(key, fallback) {
      if (typeof localStorage === 'undefined') return fallback;
      try {
        const raw = localStorage.getItem(key);
        if (!raw) return fallback;
        return JSON.parse(raw);
      } catch (error) {
        return fallback;
      }
    }

    function writeLocalJson(key, value) {
      if (typeof localStorage === 'undefined') return;
      try {
        localStorage.setItem(key, JSON.stringify(value));
      } catch (error) {
        // Ignore storage write errors
      }
    }

    function readSmartConfig() {
      if (typeof localStorage === 'undefined') return { ...CONFIG_SMART };
      try {
        const raw = localStorage.getItem(DATA_STORE_STORAGE_KEY);
        if (!raw) return { ...CONFIG_SMART };
        const parsed = JSON.parse(raw);
        const savedConfig = parsed?.elementConfig?.smartConfig;
        if (!savedConfig || typeof savedConfig !== 'object') {
          return { ...CONFIG_SMART };
        }

        const defaultWeightsByCategory = CONFIG_SMART.sectionWeightsByStaffCategory || {};
        const savedWeightsByCategory = savedConfig.sectionWeightsByStaffCategory || {};
        const legacyWeights = savedConfig.sectionWeights || {};

        return {
          ...CONFIG_SMART,
          ...savedConfig,
          sectionWeightsByStaffCategory: {
            academic: { ...(defaultWeightsByCategory.academic || {}), ...legacyWeights, ...(savedWeightsByCategory.academic || {}) },
            admin: { ...(defaultWeightsByCategory.admin || {}), ...(savedWeightsByCategory.admin || {}) },
            lab: { ...(defaultWeightsByCategory.lab || {}), ...(savedWeightsByCategory.lab || {}) }
          },
          sectionBenchmarks: { ...CONFIG_SMART.sectionBenchmarks, ...(savedConfig.sectionBenchmarks || {}) },
          adminConfig: { ...CONFIG_SMART.adminConfig, ...(savedConfig.adminConfig || {}) }
        };
      } catch (error) {
        return { ...CONFIG_SMART };
      }
    }

    function writeSmartConfig(nextConfig, actor = 'unknown') {
      if (typeof localStorage === 'undefined') return;
      try {
        const raw = localStorage.getItem(DATA_STORE_STORAGE_KEY);
        const parsed = raw ? JSON.parse(raw) : { records: [], elementConfig: {} };
        const previous = parsed?.elementConfig?.smartConfig || {};
        const defaultWeightsByCategory = CONFIG_SMART.sectionWeightsByStaffCategory || {};
        const merged = {
          ...CONFIG_SMART,
          ...nextConfig,
          sectionWeightsByStaffCategory: {
            academic: { ...(defaultWeightsByCategory.academic || {}), ...(nextConfig.sectionWeightsByStaffCategory?.academic || {}) },
            admin: { ...(defaultWeightsByCategory.admin || {}), ...(nextConfig.sectionWeightsByStaffCategory?.admin || {}) },
            lab: { ...(defaultWeightsByCategory.lab || {}), ...(nextConfig.sectionWeightsByStaffCategory?.lab || {}) }
          },
          sectionBenchmarks: { ...CONFIG_SMART.sectionBenchmarks, ...(nextConfig.sectionBenchmarks || {}) },
          adminConfig: { ...CONFIG_SMART.adminConfig, ...(nextConfig.adminConfig || {}) },
          lastUpdatedAt: new Date().toISOString(),
          lastUpdatedBy: actor
        };
        parsed.elementConfig = parsed.elementConfig || {};
        parsed.elementConfig.smartConfig = merged;
        localStorage.setItem(DATA_STORE_STORAGE_KEY, JSON.stringify(parsed));

        const changedFields = [];
        Object.keys(merged.sectionBenchmarks || {}).forEach((k) => {
          if ((previous.sectionBenchmarks || {})[k] !== merged.sectionBenchmarks[k]) changedFields.push(`sectionBenchmarks.${k}`);
        });
        if ((previous.adminConfig || {}).isBenchmarkLocked !== (merged.adminConfig || {}).isBenchmarkLocked) changedFields.push('adminConfig.isBenchmarkLocked');
        const audit = readLocalJson('smartConfigAudit', []);
        audit.unshift({ timestamp: new Date().toISOString(), user: actor, changedFields });
        writeLocalJson('smartConfigAudit', audit.slice(0, 100));
      } catch (error) {
        // ignore
      }
    }

    function getSubmissionHistory() {
      const history = readLocalJson(SUBMISSION_HISTORY_KEY, []);
      return Array.isArray(history) ? history : [];
    }

    function addSubmissionHistory(entry) {
      const history = getSubmissionHistory();
      history.unshift(entry);
      const trimmed = history.slice(0, SUBMISSION_HISTORY_LIMIT);
      writeLocalJson(SUBMISSION_HISTORY_KEY, trimmed);
    }

    function getPendingSubmission() {
      return readLocalJson(SUBMISSION_PENDING_KEY, null);
    }

    function setPendingSubmission(payload) {
      writeLocalJson(SUBMISSION_PENDING_KEY, payload);
    }

    function clearPendingSubmission() {
      if (typeof localStorage === 'undefined') return;
      try {
        localStorage.removeItem(SUBMISSION_PENDING_KEY);
      } catch (error) {
        // Ignore storage errors
      }
    }

    function readSubmitEndpoint() {
      if (GAS_WEBAPP_URL && !GAS_WEBAPP_URL.includes('PASTE_APPS_SCRIPT_WEB_APP_URL_HERE')) {
        return GAS_WEBAPP_URL;
      }
      if (typeof localStorage === 'undefined') return '';
      try {
        return localStorage.getItem(SUBMIT_ENDPOINT_KEY) || '';
      } catch (error) {
        return '';
      }
    }

    function promptSubmitEndpoint() {
      const currentEndpoint = readSubmitEndpoint();
      const endpoint = window.prompt(
        'Enter the Apps Script Web App URL for submissions:',
        currentEndpoint || 'https://'
      );
      if (!endpoint) return null;
      const trimmed = endpoint.trim();
      if (!/^https?:\/\//i.test(trimmed)) {
        showToast('Please enter a valid URL starting with http or https.', 'error');
        return null;
      }
      if (typeof localStorage !== 'undefined') {
        try {
          localStorage.setItem(SUBMIT_ENDPOINT_KEY, trimmed);
        } catch (error) {
          // Ignore storage errors
        }
      }
      return trimmed;
    }

    function configureSubmissionEndpoint() {
      const endpoint = promptSubmitEndpoint();
      if (!endpoint) return;
      showToast('Submission endpoint saved.', 'success');
      submissionState.lastError = null;
      renderSubmissionStatus();
    }

function getSubmitToken() {
  return 'WL-2026-9F3c1D7a0b4E8c2A-6a5B4c3D2e1F0a9B';
}



    function clearSubmitToken() {
      if (typeof sessionStorage === 'undefined') return;
      try {
        sessionStorage.removeItem(SUBMIT_TOKEN_SESSION_KEY);
      } catch (error) {
        // Ignore storage errors
      }
    }

    function clearAllPersistedState() {
      if (typeof localStorage !== 'undefined') {
        ALL_STORAGE_KEYS.forEach((key) => {
          try {
            localStorage.removeItem(key);
          } catch (error) {
            // Ignore storage errors
          }
        });
      }

      if (typeof sessionStorage !== 'undefined') {
        ALL_SESSION_STORAGE_KEYS.forEach((key) => {
          try {
            sessionStorage.removeItem(key);
          } catch (error) {
            // Ignore storage errors
          }
        });
      }
    }

    function resetInMemoryState() {
      allRecords = [];
      notifications = [];
      submissionState = { isSubmitting: false, lastError: null, lastPayload: null };

      updateTotalEntries();
      renderNavigation();
      renderSubmissionStatus();
    }

    function validateSubmissionState() {
      const errors = [];
      const profile = getProfile();

      if (!profile) {
        errors.push({ section: 'profile', message: 'Staff profile is required.' });
      } else {
        const profileFields = [
          { key: 'profile_name', label: 'Staff Name' },
          { key: 'profile_category', label: 'Staff Category' }
        ];

        profileFields.forEach(field => {
          if (!profile[field.key]) {
            errors.push({ section: 'profile', message: `${field.label} is required.` });
          }
        });

        if (normalizeProfileCategoryKey(profile.profile_category) === 'academic') {
          if (!profile.profile_programme) {
            errors.push({ section: 'profile', message: 'Programme is required for academic staff.' });
          }
          if (!profile.profile_rank) {
            errors.push({ section: 'profile', message: 'Academic rank is required for academic staff.' });
          }
          if (!profile.admin_status) {
            errors.push({ section: 'profile', message: 'Admin status is required for academic staff.' });
          }
        }

        if (normalizeProfileCategoryKey(profile.profile_category) === 'admin' && !profile.profile_admin_position) {
          errors.push({ section: 'profile', message: 'Administrative position is required for admin staff.' });
        }
      }

      const requiredBySection = {
        teaching: ['course_code', 'course_name', 'course_credit_hours', 'course_lecture', 'course_semester', 'course_role', 'teaching_section'],
        supervision: ['student_name', 'student_matric', 'student_level', 'student_role', 'student_current_status', 'student_title', 'student_start_semester', 'student_start_date'],
        research: ['research_title', 'research_grant_code', 'research_role', 'research_start_date'],
        publications: ['pub_title', 'pub_type', 'pub_stage'],
        administration: ['admin_position', 'admin_faculty', 'admin_start_date'],
        admin_duties: ['duty_type', 'duty_name', 'duty_frequency', 'duty_start_date'],
        service: ['service_type', 'service_title', 'service_organization', 'service_start_date'],
        laboratory: ['lab_responsibility', 'lab_name', 'lab_frequency', 'lab_start_date'],
        professional: ['prof_type', 'prof_scope', 'prof_title', 'prof_organization', 'prof_start_date']
      };

      const numericBySection = {
        teaching: ['course_credit_hours', 'course_lecture', 'course_tutorial', 'course_lab', 'course_fieldwork'],
        supervision: [],
        research: ['research_amount'],
        publications: [],
        administration: [],
        admin_duties: [],
        service: [],
        laboratory: [],
        professional: []
      };

      Object.keys(requiredBySection).forEach(sectionKey => {
        const records = getRecordsBySection(sectionKey);
        records.forEach((record, index) => {
          requiredBySection[sectionKey].forEach(field => {
            const value = record[field];
            if (value === null || value === undefined || value === '') {
              errors.push({
                section: sectionKey,
                message: `Missing ${field.replace(/_/g, ' ')} in ${sectionKey} entry #${index + 1}.`
              });
            }
          });

          if (sectionKey === 'teaching' && record.course_semester === 'Other' && !record.course_semester_other) {
            errors.push({
              section: 'teaching',
              message: `Specify the semester for teaching entry #${index + 1}.`
            });
          }

          if (sectionKey === 'supervision' && record.student_start_semester === 'Other' && !record.student_start_semester_other) {
            errors.push({
              section: 'supervision',
              message: `Specify start semester details for supervision entry #${index + 1}.`
            });
          }

          if (sectionKey === 'publications' && record.indexing_label === 'Other' && !record.indexing_other_text) {
            errors.push({
              section: 'publications',
              message: `Specify indexing details for publication entry #${index + 1}.`
            });
          }

          if (sectionKey === 'publications' && record.author_position_label === 'Other' && !record.author_position_other_text) {
            errors.push({
              section: 'publications',
              message: `Specify author position details for publication entry #${index + 1}.`
            });
          }

          if (sectionKey === 'publications' && record.pub_type === 'other' && !record.pub_type_other_text) {
            errors.push({
              section: 'publications',
              message: `Specify item type details for publication entry #${index + 1}.`
            });
          }


          if (sectionKey === 'admin_duties' && record.duty_type === 'Other' && !record.duty_type_other_text) {
            errors.push({
              section: 'admin_duties',
              message: `Specify duty type details for admin duties entry #${index + 1}.`
            });
          }

          if (sectionKey === 'service' && record.service_type === 'Other' && !record.service_type_other_text) {
            errors.push({
              section: 'service',
              message: `Specify service type details for service entry #${index + 1}.`
            });
          }

          if (sectionKey === 'laboratory' && record.lab_responsibility === 'Other' && !record.lab_responsibility_other_text) {
            errors.push({
              section: 'laboratory',
              message: `Specify laboratory responsibility details for laboratory entry #${index + 1}.`
            });
          }

          if (sectionKey === 'professional' && record.prof_type === 'Other' && !record.prof_type_other_text) {
            errors.push({
              section: 'professional',
              message: `Specify professional activity details for professional entry #${index + 1}.`
            });
          }

          numericBySection[sectionKey].forEach(field => {
            const value = record[field];
            if (value === null || value === undefined || value === '') return;
            const numeric = Number(value);
            if (!Number.isFinite(numeric) || numeric < 0) {
              errors.push({
                section: sectionKey,
                message: `Invalid number for ${field.replace(/_/g, ' ')} in ${sectionKey} entry #${index + 1}.`
              });
            }
          });

                  });
      });

      return {
        isValid: errors.length === 0,
        errors
      };
    }

    function deriveTermFromTeaching(teachingRecords) {
      const terms = teachingRecords
        .map(course => (course.course_semester === 'Other' ? course.course_semester_other : course.course_semester))
        .filter(Boolean);

      const uniqueTerms = Array.from(new Set(terms));
      if (uniqueTerms.length === 0) {
        return 'N/A';
      }
      if (uniqueTerms.length === 1) {
        return uniqueTerms[0];
      }
      return uniqueTerms.join(' | ');
    }

    function calculateTotalHours(sectionsByKey) {
      const teachingHours = (sectionsByKey.teaching || []).reduce((sum, course) => {
        const total = Number(course.course_lecture || 0) +
          Number(course.course_tutorial || 0) +
          Number(course.course_lab || 0) +
          Number(course.course_fieldwork || 0);
        return sum + (Number.isFinite(total) ? total : 0);
      }, 0);

      const serviceHours = (sectionsByKey.service || []).reduce((sum, service) => {
        const spanDays = calculateReportingDays(service.service_start_date, service.service_end_date || service.service_start_date);
        return sum + (Number.isFinite(spanDays) ? spanDays : 0);
      }, 0);

      return Math.round((teachingHours + serviceHours) * 100) / 100;
    }

    function sanitizeRecord(record) {
      if (!record || typeof record !== 'object') return {};
      const { __backendId, section, ...rest } = record;
      return { ...rest };
    }

    function buildSubmissionPayload() {
      const profile = getProfile();
      const sectionsPayload = {
        teaching: getRecordsBySection('teaching').map(sanitizeRecord),
        supervision: getRecordsBySection('supervision').map(sanitizeRecord),
        research: getRecordsBySection('research').map(sanitizeRecord),
        publications: getRecordsBySection('publications').map(sanitizeRecord),
        adminLeadership: getRecordsBySection('administration').map(sanitizeRecord),
        adminDuties: getRecordsBySection('admin_duties').map(sanitizeRecord),
        service: getRecordsBySection('service').map(sanitizeRecord),
        lab: getRecordsBySection('laboratory').map(sanitizeRecord),
        professional: getRecordsBySection('professional').map(sanitizeRecord)
      };

      const scores = calculateScores();
      const normalized = calculateNormalizedScores();
      const status = getWorkloadStatus(scores.total);
      const totalHours = calculateTotalHours({
        teaching: getRecordsBySection('teaching'),
        service: getRecordsBySection('service')
      });

      const adminPosition = profile?.profile_admin_position === 'Other'
        ? profile?.profile_other_admin_position
        : profile?.profile_admin_position;

      return {
        appVersion: APP_VERSION,
        generatedAtISO: new Date().toISOString(),
        staffProfile: profile ? {
          name: profile.profile_name,
          staffId: profile.profile_staff_id,
          category: getProfileCategoryLabel(profile.profile_category),
          programme: profile.profile_programme || '',
          rank: profile.profile_rank || '',
          adminPosition: adminPosition || ''
        } : null,
        term: deriveTermFromTeaching(getRecordsBySection('teaching')),
        sections: sectionsPayload,
        totals: {
          bySection: {
            teaching: scores.teaching,
            supervision: scores.supervision,
            research: scores.research,
            publications: scores.publications,
            adminLeadership: scores.adminLeadership,
            adminDuties: scores.adminDuties,
            administrationCombined: scores.adminLeadership + scores.adminDuties,
            service: scores.service,
            lab: scores.laboratory,
            professional: scores.professional
          },
          totalScore: scores.total,
          totalHours,
          status: status.label
        },
        profile_state: profile?.profile_state || JSON.stringify(parseProfileState(profile)),
        profile_json: ''
      };
    }

    function renderSubmissionStatus() {
      const container = document.getElementById('submission-status');
      if (!container) return;

      setSubmitButtonState(submissionState.isSubmitting);

      const pending = getPendingSubmission();
      if (pending) {
        container.classList.remove('hidden');
        container.innerHTML = `
          <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-amber-50 border border-amber-200 rounded-lg px-4 py-3 text-sm text-amber-900">
            <div>
              <strong>Pending submission detected.</strong>
              <span class="block text-xs text-amber-800">Retry to send the last report payload to the server.</span>
            </div>
            <button onclick="retrySubmission()" class="px-4 py-2 bg-amber-600 text-white rounded-lg font-semibold hover:bg-amber-700 text-sm">
              Retry Submission
            </button>
          </div>
        `;
        return;
      }

      if (submissionState.lastError) {
        const needsEndpoint = submissionState.lastError === 'Submission endpoint not configured.';
        const actionButton = needsEndpoint
          ? `
            <button onclick="configureSubmissionEndpoint()" class="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 text-sm">
              Configure Endpoint
            </button>
          `
          : `
            <button onclick="retrySubmission()" class="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 text-sm">
              Retry Submission
            </button>
          `;
        container.classList.remove('hidden');
        container.innerHTML = `
          <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3 bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-800">
            <div>
              <strong>Submission failed:</strong>
              <span class="block text-xs text-red-700">${escapeHtml(submissionState.lastError)}</span>
            </div>
            ${actionButton}
          </div>
        `;
        return;
      }

      container.classList.add('hidden');
      container.innerHTML = '';
    }

    function setSubmitButtonState(isSubmitting) {
      const submitButton = document.getElementById('submit-report');
      if (!submitButton) return;
      submitButton.disabled = isSubmitting;
      submitButton.innerHTML = isSubmitting
        ? '<span class="loading-spinner"></span><span>Submitting...</span>'
        : '<span>🚀</span> Submit Report';
      submitButton.classList.toggle('opacity-70', isSubmitting);
      submitButton.classList.toggle('cursor-not-allowed', isSubmitting);
      submitButton.classList.add('flex', 'items-center', 'gap-2');
    }

    async function submitReport() {
      if (submissionState.isSubmitting) return;

      console.log('[submit] clicked');
      let endpoint = readSubmitEndpoint();
      if (!endpoint) {
        showToast('Submission endpoint not configured yet.', 'error');
        submissionState.lastError = 'Submission endpoint not configured.';
        renderSubmissionStatus();
        endpoint = promptSubmitEndpoint();
        if (!endpoint) {
          return;
        }
        submissionState.lastError = null;
        renderSubmissionStatus();
        showToast('Submission endpoint saved. Submitting report...', 'success');
      }
      console.log('[submit] endpoint=', endpoint);

      const validation = validateSubmissionState();
      if (!validation.isValid) {
        const errorList = validation.errors.slice(0, 5).map(error => `<li>${escapeHtml(error.message)}</li>`).join('');
        const moreCount = validation.errors.length > 5 ? ` and ${validation.errors.length - 5} more.` : '.';
        showToast('Please fix validation errors before submitting.', 'error');
        submissionState.lastError = `Validation failed${moreCount}`;
        const container = document.getElementById('submission-status');
        if (container) {
          container.classList.remove('hidden');
          container.innerHTML = `
            <div class="bg-red-50 border border-red-200 rounded-lg px-4 py-3 text-sm text-red-800">
              <strong>Validation issues:</strong>
              <ul class="list-disc ml-5 mt-2 space-y-1">${errorList}</ul>
              ${validation.errors.length > 5 ? `<div class="text-xs mt-2">Showing first 5 of ${validation.errors.length} issues.</div>` : ''}
            </div>
          `;
        }
        return;
      }

      submissionState.isSubmitting = true;
      submissionState.lastError = null;
      setSubmitButtonState(true);

      try {
        const payload = buildSubmissionPayload();
        payload.submitToken = getSubmitToken();
        payload.clientSubmissionId = payload.clientSubmissionId
          || `WL-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
        submissionState.lastPayload = payload;
        console.log('[submit] payload bytes=', JSON.stringify(payload).length);

        const data = await postViaForm(endpoint, payload);

        if (!data || !data.ok) {
          throw new Error(data?.error || 'Submission failed.');
        }

        clearPendingSubmission();
        const submissionId = payload.clientSubmissionId;
        const entry = {
          submissionId,
          generatedAtISO: payload.generatedAtISO,
          term: payload.term,
          staffName: payload.staffProfile?.name || 'Unknown',
          status: payload.totals.status,
          serverTimestamp: ''
        };
        addSubmissionHistory(entry);
        showToast(`Submitted successfully! ID: ${submissionId}`);
        submissionState.lastError = null;
        renderSubmissionStatus();
      } catch (error) {
        const message = error?.message || 'Submission failed due to a network error.';
        if (submissionState.lastPayload) {
          setPendingSubmission(submissionState.lastPayload);
        }
        submissionState.lastError = message;
        showToast(`Submission failed: ${message}`, 'error');
        renderSubmissionStatus();
      } finally {
        submissionState.isSubmitting = false;
        setSubmitButtonState(false);
      }
    }

    function postViaForm(endpoint, payloadObj) {
      return new Promise((resolve, reject) => {
        if (!endpoint) {
          reject(new Error('Submission endpoint not configured.'));
          return;
        }

        let iframe;
        let form;
        try {
          iframe = document.createElement('iframe');
          iframe.name = 'submit_iframe_' + Date.now();
          iframe.style.display = 'none';
          document.body.appendChild(iframe);

          form = document.createElement('form');
          form.action = endpoint;
          form.method = 'POST';
          form.target = iframe.name;

          const input = document.createElement('input');
          input.type = 'hidden';
          input.name = 'payload';
          input.value = JSON.stringify(payloadObj);
          form.appendChild(input);

          document.body.appendChild(form);
        } catch (error) {
          try { if (form) document.body.removeChild(form); } catch (e) {}
          try { if (iframe) document.body.removeChild(iframe); } catch (e) {}
          reject(new Error('Failed to create submission form.'));
          return;
        }

        iframe.onload = () => {
          // Kita anggap server terima; browser tak bagi kita baca response (tak perlu).
          try { document.body.removeChild(form); } catch (e) {}
          try { document.body.removeChild(iframe); } catch (e) {}
          resolve({ ok: true });
        };

        form.submit();
      });
    }

    function retrySubmission() {
      if (submissionState.isSubmitting) return;
      const pending = getPendingSubmission();
      if (!pending) {
        showToast('No pending submission found.', 'error');
        submissionState.lastError = 'No pending submission available.';
        renderSubmissionStatus();
        return;
      }
      submissionState.lastPayload = pending;
      submitReport();
    }

    function bindSubmitButton() {
      document.addEventListener('click', (event) => {
        const exportMenu = document.getElementById('results-export-menu');
        if (exportMenu && !event.target.closest('#results-export-menu-container')) {
          exportMenu.classList.add('hidden');
        }

        if (event.target.id === 'results-drilldown-modal') {
          closeSectionDrilldown();
        }

        const submitButton = event.target.closest('#submit-report');
        if (!submitButton) return;
        event.preventDefault();
        submitReport();
      });
    }

    // =========================
    // Scoring & Calculations
    // =========================
    function calculateScores() {
      const scores = {
        teaching: 0,
        supervision: 0,
        research: 0,
        publications: 0,
        adminLeadership: 0,
        adminDuties: 0,
        service: 0,
        laboratory: 0,
        professional: 0,
        total: 0
      };

      allRecords.forEach(record => {
        switch(record.section) {
          case 'teaching':
            scores.teaching += calculateCourseScore(record);
            break;
          case 'supervision':
            scores.supervision += calculateSupervisionScore(record);
            break;
          case 'research':
            scores.research += calculateResearchScore(record);
            break;
          case 'publications':
            scores.publications += calculatePublicationScore(record);
            break;
          case 'administration':
            scores.adminLeadership += calculateAdministrationScore(record);
            break;
          case 'admin_duties':
            scores.adminDuties += calculateAdminDutyScore(record);
            break;
          case 'service':
            scores.service += calculateServiceScore(record);
            break;
          case 'laboratory':
            scores.laboratory += calculateLabScore(record);
            break;
          case 'professional':
            scores.professional += calculateProfessionalScore(record);
            break;
        }
      });

      scores.total = Math.round((
        scores.teaching + 
        scores.supervision + 
        scores.research + 
        scores.publications + 
        scores.adminLeadership + 
        scores.adminDuties +
        scores.service +
        scores.laboratory +
        scores.professional
      ) * 100) / 100;

      return scores;
    }


    function calculateNormalizedScores() {
      const rawScores = calculateScores();
      const smartConfig = readSmartConfig();
      const benchmarks = {
        ...CONFIG_SMART.sectionBenchmarks,
        ...(smartConfig.sectionBenchmarks || {})
      };
      const activeWeights = getActiveSectionWeights(getProfile(), smartConfig);
      const rawAdministration = rawScores.adminLeadership + rawScores.adminDuties;

      const rawByCategory = {
        Teaching: rawScores.teaching,
        Supervision: calculateRawSupervisionEquivalentMastersMain(),
        Research: rawScores.research,
        Publications: rawScores.publications,
        Administration: rawAdministration,
        Laboratory: rawScores.laboratory,
        Service: rawScores.service,
        Professional: rawScores.professional
      };

      const benchmarkByCategory = {
        Teaching: Number(benchmarks.TeachingWeeklyHoursBenchmark || 0),
        Supervision: Number(benchmarks.SupervisionBenchmarkMastersMain || 0),
        Research: Number(benchmarks.ResearchBenchmark || 0),
        Publications: Number(benchmarks.PublicationsBenchmarkPapers || 0),
        Administration: Number(benchmarks.AdminBenchmarkUniversityAppointments || 0),
        Laboratory: Number(benchmarks.LaboratoryBenchmark || 1),
        Service: Number(benchmarks.ServiceBenchmark || 0),
        Professional: Number(benchmarks.ProfessionalBenchmark || 0)
      };

      const achievements = {};
      const weightedContributions = {};
      const overloadFlags = {};

      Object.keys(rawByCategory).forEach((category) => {
        const rawValue = Number(rawByCategory[category] || 0);
        const benchmarkValue = Number(benchmarkByCategory[category] || 0);
        const achievement = benchmarkValue > 0 ? Math.min(rawValue / benchmarkValue, 1) : 0;
        const weight = Number(activeWeights[category] || 0);
        achievements[category] = achievement;
        weightedContributions[category] = achievement * weight;
        overloadFlags[category] = {
          overload: benchmarkValue > 0 ? rawValue > benchmarkValue : false,
          overloadAmount: benchmarkValue > 0 ? Math.max(rawValue - benchmarkValue, 0) : 0,
          overloadPercent: benchmarkValue > 0 ? (rawValue / benchmarkValue) * 100 : 0,
          rawValue,
          benchmarkValue
        };
      });

      const finalScore = Math.round(Object.values(weightedContributions).reduce((sum, value) => sum + value, 0) * 10000) / 100;

      return {
        rawScores,
        rawAdministration,
        achievements,
        weightedContributions,
        finalScore,
        overloadFlags,
        configSnapshot: smartConfig,
        rawByCategory,
        benchmarkByCategory,
        activeWeights
      };
    }

    function calculateRawSupervisionEquivalentMastersMain() {
      return getRecordsBySection('supervision').reduce((sum, student) => {
        const level = student.student_level;
        const role = student.student_role;
        const statusFactor = getStudentCurrentStatusFactor(student.student_current_status);
        let base = 0;
        if (level === 'masters') base = role === 'main' ? 1.0 : 0.2;
        if (level === 'phd') base = role === 'main' ? 1.6 : 0.32;
        if (level === 'undergraduate') base = 0.2;
        return sum + (base * statusFactor);
      }, 0);
    }

    function getTeachingCourseBreakdown(course) {
      const totalSemesterHours = (course.course_lecture || 0) + (course.course_tutorial || 0) + 
                                 (course.course_lab || 0) + (course.course_fieldwork || 0);
      const weeklyHoursDivisor = 14;
      const weeklyHours = totalSemesterHours / weeklyHoursDivisor;
      const coursePoints = Math.round(weeklyHours * 10) / 10;

      return {
        total_semester_hours: totalSemesterHours,
        weekly_hours_divisor: weeklyHoursDivisor,
        weekly_hours: weeklyHours,
        course_points: coursePoints,
        teaching_section: course.teaching_section || 'A'
      };
    }

    // TEACHING: Weekly hours only
    function calculateCourseScore(course) {
      return getTeachingCourseBreakdown(course).course_points;
    }

    function getSupervisionBasePoints(studentLevel, supervisorRole) {
      if (studentLevel === 'phd') return supervisorRole === 'main' ? 8 : 4;
      if (studentLevel === 'masters') return supervisorRole === 'main' ? 5 : 2.5;
      return 1;
    }

    function getStudentRegistrationModeFactor() {
      return 1.0;
    }

    function getStudentCurrentStatusFactor(studentCurrentStatus) {
      const statusFactorMap = {
        active: 1.0,
        on_leave: 0.2,
        deferred: 0.2,
        completed: 0.5,
        terminated: 0.0,
        not_active: 0.0
      };

      return statusFactorMap[studentCurrentStatus] ?? 0.0;
    }

    function getSupervisionEntryBreakdown(student) {
      const hasRequiredFields = Boolean(
        student?.student_level &&
        student?.student_role &&
        student?.student_current_status
      );

      if (!hasRequiredFields) {
        return {
          base_points: 0,
          mode_factor: 0,
          status_factor: 0,
          entry_points: 0,
          is_counted: false
        };
      }

      const basePoints = getSupervisionBasePoints(student.student_level, student.student_role);
      const modeFactor = getStudentRegistrationModeFactor();
      const statusFactor = getStudentCurrentStatusFactor(student.student_current_status);
      const entryPoints = Math.round(basePoints * modeFactor * statusFactor * 100) / 100;

      return {
        base_points: basePoints,
        mode_factor: modeFactor,
        status_factor: statusFactor,
        entry_points: entryPoints,
        is_counted: true
      };
    }

    // SUPERVISION: Fixed points by level and role
    function calculateSupervisionScore(student) {
      return getSupervisionEntryBreakdown(student).entry_points;
    }

    // ADMIN DUTIES: Base points 🧮 frequency factor
    function getAdminDutyBasePoints(dutyType) {
      if (dutyType === 'Accreditation Work') return 8;
      if (dutyType === 'Curriculum Development') return 6;
      if (dutyType === 'Committee Chair') return 5;
      if (dutyType === 'Event Organizer') return 4;
      if (dutyType === 'Committee Member') return 2;
      return 2;
    }

    function getDutyFrequencyFactor(frequency) {
      if (frequency === 'Full period') return 1.0;
      if (frequency === 'Half period') return 0.5;
      if (frequency === 'Short term') return 0.3;
      return 0;
    }

    function getAdminDutyRoleFactor(role) {
      if (role === 'Chairperson') return 1.0;
      if (role === 'Secretary') return 0.7;
      if (role === 'Member') return 0.5;
      return 0.4;
    }

    function getAdminDutyEntryBreakdown(duty) {
      if (!duty?.duty_type || !duty?.duty_frequency || !duty?.duty_role) {
        return { base_points: 0, frequency_factor: 0, role_factor: 0, entry_points: 0, is_counted: false };
      }
      const basePoints = getAdminDutyBasePoints(duty.duty_type);
      const frequencyFactor = getDutyFrequencyFactor(duty.duty_frequency);
      const roleFactor = getAdminDutyRoleFactor(duty.duty_role);
      const entryPoints = Math.round(basePoints * frequencyFactor * roleFactor * 100) / 100;
      return { base_points: basePoints, frequency_factor: frequencyFactor, role_factor: roleFactor, entry_points: entryPoints, is_counted: true };
    }

    function calculateAdminDutyScore(duty) {
      return getAdminDutyEntryBreakdown(duty).entry_points;
    }

    function getResearchRoleFactor(role) {
      if (role === 'lead') return 1.0;
      if (role === 'member') return 0.5;
      return 0;
    }


    function getResearchEntryBreakdown(research) {
      if (!research?.research_role) {
        return { base_points: 5, role_factor: 0, entry_points: 0, is_counted: false };
      }
      const basePoints = 5;
      const roleFactor = getResearchRoleFactor(research.research_role);
      const entryPoints = Math.round(basePoints * roleFactor * 100) / 100;
      return { base_points: basePoints, role_factor: roleFactor, entry_points: entryPoints, is_counted: true };
    }

    function calculateResearchScore(research) {
      return getResearchEntryBreakdown(research).entry_points;
    }

    function getPublicationBasePoints() {
      return 1;
    }

    function getPublicationStageWeight(stage) {
      const stageWeightMap = {
        drafting: 0.10,
        revising: 0.50,
        responding_reviewers: 0.50,
        proofing: 1.00,
        no_activity: 0.00
      };
      return stageWeightMap[stage] ?? 0;
    }

    function getPublicationEntryBreakdown(pub) {
      if (!pub?.pub_type || !pub?.pub_stage) {
        return { base_points: 0, stage_weight: 0, entry_points: 0, is_counted: false };
      }
      const descriptive = getPublicationDescriptiveMetadata(pub);
      const basePoints = getPublicationBasePoints(pub.pub_type);
      const stageWeight = getPublicationStageWeight(pub.pub_stage);
      const entryPoints = Math.round(basePoints * stageWeight * 100) / 100;
      return {
        base_points: basePoints,
        stage_weight: stageWeight,
        indexing: descriptive.indexing_display,
        author_position: descriptive.author_position_display,
        stage: pub.pub_stage,
        entry_points: entryPoints,
        is_counted: true
      };
    }

    function calculatePublicationScore(pub) {
      return getPublicationEntryBreakdown(pub).entry_points;
    }

    function getAdministrationBasePoints(position) {
      if (position === 'Dean') return 20;
      if (position === 'Deputy Dean') return 15;
      if (position === 'Centre Director') return 12;
      if (position === 'Head of Programme') return 10;
      if (position === 'Postgraduate Coordinator') return 8;
      if (position === 'Programme Coordinator') return 6;
      return 5;
    }

    function getActiveFractionInReportingPeriod(startDate, endDate) {
      const profile = getProfile();
      const reportStart = new Date(profile?.reporting_start_date || `${new Date().getFullYear()}-01-01`);
      const reportEnd = new Date(profile?.reporting_end_date || `${new Date().getFullYear()}-12-31`);
      const roleStart = startDate ? new Date(startDate) : reportStart;
      const roleEnd = endDate ? new Date(endDate) : reportEnd;
      const overlapStart = new Date(Math.max(reportStart.getTime(), roleStart.getTime()));
      const overlapEnd = new Date(Math.min(reportEnd.getTime(), roleEnd.getTime()));
      const reportingDays = Math.max(1, Math.floor((reportEnd - reportStart) / (1000 * 60 * 60 * 24)) + 1);
      const overlapDays = overlapEnd >= overlapStart ? Math.floor((overlapEnd - overlapStart) / (1000 * 60 * 60 * 24)) + 1 : 0;
      return Math.max(0, Math.min(1, overlapDays / reportingDays));
    }

    function getAdministrationEntryBreakdown(admin) {
      if (!admin?.admin_position || !admin?.admin_start_date) {
        return { base_points: 0, active_fraction: 0, entry_points: 0, is_counted: false };
      }
      const basePoints = getAdministrationBasePoints(admin.admin_position);
      const activeFraction = getActiveFractionInReportingPeriod(admin.admin_start_date, admin.admin_end_date);
      const entryPoints = Math.round(basePoints * activeFraction * 100) / 100;
      return { base_points: basePoints, active_fraction: activeFraction, entry_points: entryPoints, is_counted: true };
    }

    function calculateAdministrationScore(admin) {
      return getAdministrationEntryBreakdown(admin).entry_points;
    }

    function getServiceBasePoints(type) {
      if (type === 'Community Outreach') return 8;
      if (type === 'Volunteer Teaching') return 7;
      if (type === 'Public Lecture') return 6;
      if (type === 'Consulting') return 5;
      if (type === 'Mentorship') return 4;
      if (type === 'Income Generation') return 6;
      return 3;
    }

    function getServiceDurationFactor(hours) {
      const durationHours = Number(hours || 0);
      if (durationHours < 2) return 0.5;
      if (durationHours <= 6) return 1.0;
      if (durationHours <= 15) return 1.5;
      return 2.0;
    }

    function getServiceEntryBreakdown(service) {
      if (!service?.service_type || !service?.service_start_date) {
        return { base_points: 0, duration_factor: 0, span_days: 0, entry_points: 0, is_counted: false };
      }
      const basePoints = getServiceBasePoints(service.service_type);
      const spanDays = calculateReportingDays(service.service_start_date, service.service_end_date || service.service_start_date) || 1;
      const durationFactor = spanDays <= 1 ? 0.5 : spanDays <= 6 ? 1.0 : spanDays <= 15 ? 1.5 : 2.0;
      const entryPoints = Math.round(basePoints * durationFactor * 100) / 100;
      return { base_points: basePoints, duration_factor: durationFactor, span_days: spanDays, entry_points: entryPoints, is_counted: true };
    }

    function calculateServiceScore(service) {
      return getServiceEntryBreakdown(service).entry_points;
    }

    function getLabBasePoints(resp) {
      if (resp === 'Lab Coordinator') return 10;
      if (resp === 'Safety Officer') return 8;
      if (resp === 'Equipment Manager') return 7;
      if (resp === 'Inventory Manager') return 6;
      if (resp === 'SOP Development') return 5;
      if (resp === 'Lab Supervisor') return 4;
      return 3;
    }

    function getLabFrequencyFactor(freq) {
      if (freq === 'Ongoing within reporting period') return 1.0;
      if (freq === 'Per semester occurrence') return 0.6;
      if (freq === 'Per course supported') return 0.3;
      return 0;
    }

    function getLabEntryBreakdown(lab) {
      if (!lab?.lab_responsibility || !lab?.lab_frequency) {
        return { base_points: 0, frequency_factor: 0, course_count: 1, entry_points: 0, is_counted: false };
      }
      const basePoints = getLabBasePoints(lab.lab_responsibility);
      const frequencyFactor = getLabFrequencyFactor(lab.lab_frequency);
      const courseCount = lab.lab_frequency === 'Per course supported' ? Math.max(1, Number(lab.number_of_courses_supported || 1)) : 1;
      const entryPoints = Math.round(basePoints * frequencyFactor * courseCount * 100) / 100;
      return { base_points: basePoints, frequency_factor: frequencyFactor, course_count: courseCount, entry_points: entryPoints, is_counted: true };
    }

    function calculateLabScore(lab) {
      return getLabEntryBreakdown(lab).entry_points;
    }

    function getProfessionalBasePoints(prof) {
      if (prof.prof_type === 'Professional Body Leadership') return 10;
      if (prof.prof_type === 'Professional Certification') return 8;
      if (prof.prof_type === 'Conference Organizer') return 7;
      if (prof.prof_type === 'Editorial Board') return 6;
      if (prof.prof_type === 'Professional Training') return 5;
      if (prof.prof_type === 'Membership') return prof.prof_position ? 4 : 2;
      return 3;
    }

    function getEffortFactor(band) {
      if (band === 'low') return 0.5;
      if (band === 'standard') return 1.0;
      if (band === 'high') return 1.5;
      return 0;
    }

    function getProfessionalEntryBreakdown(prof) {
      if (!prof?.prof_type || !prof?.prof_start_date) {
        return { base_points: 0, active_fraction: 0, entry_points: 0, is_counted: false };
      }
      const basePoints = getProfessionalBasePoints(prof);
      const activeFraction = getActiveFractionInReportingPeriod(prof.prof_start_date, prof.prof_end_date);
      const entryPoints = Math.round(basePoints * activeFraction * 100) / 100;
      return { base_points: basePoints, active_fraction: activeFraction, entry_points: entryPoints, is_counted: true };
    }

    function calculateProfessionalScore(prof) {
      return getProfessionalEntryBreakdown(prof).entry_points;
    }

    function getWorkloadStatus(totalScore) {
      if (totalScore >= WORKLOAD_STATUS_THRESHOLDS.overloadedMin) return { label: 'Overloaded', color: 'red', icon: '⚠️' };
      if (totalScore >= WORKLOAD_STATUS_THRESHOLDS.balancedMin) return { label: 'Balanced', color: 'green', icon: '✅' };
      if (totalScore >= WORKLOAD_STATUS_THRESHOLDS.moderateMin) return { label: 'Moderate', color: 'yellow', icon: '⚡' };
      return { label: 'Light', color: 'blue', icon: '💡' };
    }

    function getWorkloadIndexMetrics(rawTotalPoints) {
      const safeTotal = Number.isFinite(Number(rawTotalPoints)) ? Number(rawTotalPoints) : 0;
      const displayIndexValue = Math.min(safeTotal, WORKLOAD_INDEX_MAX);
      const fillPercent = WORKLOAD_INDEX_MAX > 0 ? (displayIndexValue / WORKLOAD_INDEX_MAX) * 100 : 0;
      return {
        rawTotalPoints: safeTotal,
        displayIndexValue,
        fillPercent
      };
    }


    const HOME_SECTION_GUIDE = [
      {
        id: 'profile',
        icon: '👤',
        name: 'Staff Profile',
        measures: 'Profile context and reporting window used to interpret all recorded workload.',
        recordHere: ['Reporting period dates', 'Staff category and role details'],
        doNotRecordHere: ['Teaching, supervision, or research activities', 'Performance targets or KPIs'],
        notes: 'Set this first so all workload entries are interpreted in the correct reporting period.'
      },
      {
        id: 'teaching',
        icon: '📚',
        name: 'Teaching',
        measures: 'Teaching workload from course delivery effort across lecture, tutorial, lab, and fieldwork activities.',
        recordHere: ['Lecture and tutorial contact hours', 'Lab or fieldwork teaching hours', 'Course-level teaching responsibilities'],
        doNotRecordHere: ['Student feedback or quality ratings', 'Formal internal committee work (Administration)', 'Professional training credentials (Professional)'],
        notes: 'Record each course offering once only to avoid double counting.'
      },
      {
        id: 'supervision',
        icon: '🎓',
        name: 'Supervision',
        measures: 'Student supervision workload based on active supervision responsibilities in the reporting period.',
        recordHere: ['Active undergraduate supervision', 'Active postgraduate supervision', 'Co-supervision responsibilities'],
        doNotRecordHere: ['Student outcome achievements', 'Teaching contact hours (Teaching)', 'External reviewing roles (Service)'],
        notes: 'Only include students you actively supervised during the period.'
      },
      {
        id: 'research',
        icon: '🔬',
        name: 'Research',
        measures: 'Research project workload from active project roles and in-period project activity.',
        recordHere: ['Projects with active work in the period', 'Research role responsibilities on active projects'],
        doNotRecordHere: ['Grant prestige indicators', 'Journal reviewing or keynote talks (Service)', 'Internal coordination committees (Administration)'],
        notes: 'Do not record projects with no actual activity in the reporting period.'
      },
      {
        id: 'publications',
        icon: '📄',
        name: 'Publications',
        measures: 'Publication writing workload from manuscript development and revision effort in the period.',
        recordHere: ['Manuscript drafting', 'Revision and resubmission work', 'Reviewer response preparation'],
        doNotRecordHere: ['Journal ranking or prestige', 'Internal committee tasks (Administration)', 'Professional certifications (Professional)'],
        notes: 'Track writing effort, not publication impact or performance outcomes.'
      },
      {
        id: 'administration',
        icon: '🏛️',
        name: 'Administration',
        measures: 'Combined internal administration workload covering both formal leadership appointments and operational duties within the institution.',
        recordHere: ['Dean or deputy appointments', 'Head of programme appointments', 'Committee member roles', 'Accreditation and governance tasks'],
        doNotRecordHere: ['External examiner or invited talk (Service)', 'Professional body membership or certification (Professional)', 'Teaching contact hours (Teaching)'],
        notes: 'Use one Administration page to record both leadership and duties; records are still stored in their original internal categories for reporting compatibility.'
      },
      {
        id: 'service',
        icon: '🤝',
        name: 'Service',
        measures: 'External engagement or contributions to community, profession, or scholarly ecosystems where the primary audience is outside internal administration.',
        recordHere: ['External examiner', 'Keynote speaker', 'Journal reviewer', 'Community outreach'],
        doNotRecordHere: ['Internal committees (Administration)', 'Professional certification or membership (Professional)', 'Internal leadership appointment (Administration)'],
        notes: 'Use Service when the contribution is outward-facing rather than internal operations.'
      },
      {
        id: 'laboratory',
        icon: '🧪',
        name: 'Laboratory',
        measures: 'Laboratory operations workload for lab coordination, safety, inventory, and equipment responsibility.',
        recordHere: ['Lab safety oversight', 'Equipment maintenance coordination', 'Lab inventory management'],
        doNotRecordHere: ['Teaching contact hours (Teaching)', 'External examiner roles (Service)', 'Professional memberships (Professional)'],
        notes: 'Record operational lab responsibilities once and avoid overlap with Teaching.'
      },
      {
        id: 'professional',
        icon: '💼',
        name: 'Professional',
        measures: 'Professional development and professional standing activities such as training, credentials, memberships, and professional practice roles.',
        recordHere: ['Professional certification', 'Membership in professional society', 'Consultancy role if modelled as professional practice'],
        doNotRecordHere: ['External examiner or invited talk (Service)', 'Internal committee work (Administration)'],
        notes: 'Use this section for credentials and continuing professional standing activities.'
      },
      {
        id: 'assistants',
        icon: '👨‍🏫',
        name: 'Assistants',
        measures: 'Assistant support eligibility workload derived from relevant teaching and supervision totals.',
        recordHere: ['Saved Teaching totals', 'Saved Supervision totals'],
        doNotRecordHere: ['Separate manual assistant claims', 'Research-only or service-only activities'],
        notes: 'This is an eligibility check view; do not re-enter activities here.'
      },
      {
        id: 'results',
        icon: '📊',
        name: 'Results',
        measures: 'Consolidated workload snapshot across saved sections for reporting and review.',
        recordHere: ['Section totals and overall index review', 'Cross-check for missing or duplicate entries'],
        doNotRecordHere: ['New raw activities', 'Performance appraisals or KPI judgments'],
        notes: 'Review missing or duplicate entries before final submission.'
      }
    ];

    let homeGuideExpandedSections = new Set();
    let homeRecordHelperSelection = '';

    const HOME_RECORD_HELPERS = {
      internal_committee: {
        label: 'Internal committee or coordination',
        section: 'Administration',
        reason: 'This is formal internal operational or governance work assigned within Faculty or University administration.'
      },
      external_engagement: {
        label: 'External engagement or review',
        section: 'Service',
        reason: 'This is primarily external-facing contribution to the wider community, profession, or scholarly ecosystem.'
      },
      credential_training: {
        label: 'Credential, training, membership',
        section: 'Professional',
        reason: 'This reflects professional development, credentials, or standing rather than internal administration duties.'
      }
    };

    function hasReportingPeriod(profile) {
      const state = parseProfileState(profile);
      const startDate = profile?.reporting_start_date || state.reporting_start_date;
      const endDate = profile?.reporting_end_date || state.reporting_end_date;
      return Boolean(startDate && endDate);
    }

    function toggleHomeGuideSection(sectionId) {
      if (homeGuideExpandedSections.has(sectionId)) {
        homeGuideExpandedSections.delete(sectionId);
      } else {
        homeGuideExpandedSections.add(sectionId);
      }
      if (currentSection === 'home') {
        renderSection('home');
      }
    }

    function expandAllHomeGuide() {
      homeGuideExpandedSections = new Set(HOME_SECTION_GUIDE.map((section) => section.id));
      if (currentSection === 'home') {
        renderSection('home');
      }
    }

    function collapseAllHomeGuide() {
      homeGuideExpandedSections.clear();
      if (currentSection === 'home') {
        renderSection('home');
      }
    }

    function getHomeStaffCategoryDetails(profile) {
      const profileState = parseProfileState(profile);
      const categoryKey = normalizeProfileCategoryKey(profileState.staff_category);
      const categoryLabels = {
        academic: 'Academic Staff',
        admin: 'Administration Staff',
        lab: 'Laboratory Staff'
      };
      return {
        key: categoryKey,
        label: categoryLabels[categoryKey] || 'Not set'
      };
    }

    function getSectionRelevanceLine(sectionId) {
      if (['teaching', 'supervision', 'research', 'publications', 'assistants'].includes(sectionId)) {
        return 'Most relevant for: Academic Staff.';
      }
      if (sectionId === 'laboratory') {
        return 'Most relevant for: Laboratory Staff.';
      }
      if (['administration', 'service'].includes(sectionId)) {
        return 'Most relevant for: All staff categories depending on assignment.';
      }
      return 'Most relevant for: Depends on assigned role and responsibilities.';
    }

    function getSectionNotApplicableNote(sectionId, categoryKey) {
      const oftenNotApplicableForAdmin = ['teaching', 'supervision', 'research', 'publications', 'assistants'];
      const oftenNotApplicableForLab = ['teaching', 'supervision', 'research', 'publications', 'assistants'];
      if (categoryKey === 'admin' && oftenNotApplicableForAdmin.includes(sectionId)) {
        return 'If not applicable to your role, leave this section empty.';
      }
      if (categoryKey === 'lab' && oftenNotApplicableForLab.includes(sectionId)) {
        return 'If not applicable to your role, leave this section empty.';
      }
      return '';
    }

    function setHomeRecordHelperSelection(helperId) {
      homeRecordHelperSelection = helperId;
      if (currentSection === 'home') {
        renderSection('home');
      }
    }

    function renderHomeSectionAccordion(staffCategoryKey) {
      return HOME_SECTION_GUIDE.map((section) => {
        const isExpanded = homeGuideExpandedSections.has(section.id);
        const notApplicableNote = getSectionNotApplicableNote(section.id, staffCategoryKey);
        return `
          <div class="bg-white rounded-xl border border-gray-200 overflow-hidden">
            <button onclick="toggleHomeGuideSection('${section.id}')" class="w-full px-4 py-4 text-left flex items-start justify-between gap-4 hover:bg-gray-50 transition">
              <div>
                <div class="font-semibold text-gray-900">${section.icon} ${section.name}</div>
                <div class="text-sm text-gray-600 mt-1">Measures: ${section.measures}</div>
              </div>
              <span class="text-gray-500 text-sm mt-1">${isExpanded ? '▲' : '▼'}</span>
            </button>
            ${isExpanded ? `
              <div class="px-4 pb-4 border-t border-gray-100">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3 text-sm text-gray-700">
                  <div class="rounded-lg border border-gray-200 p-3">
                    <div class="font-semibold text-gray-900 mb-1">Measures</div>
                    <p>${section.measures}</p>
                  </div>
                  <div class="rounded-lg border border-gray-200 p-3">
                    <div class="font-semibold text-gray-900 mb-1">Record here</div>
                    <ul class="list-disc ml-5 space-y-1">${section.recordHere.map((item) => `<li>${item}</li>`).join('')}</ul>
                  </div>
                  <div class="rounded-lg border border-gray-200 p-3 md:col-span-2">
                    <div class="font-semibold text-gray-900 mb-1">Do not record here</div>
                    <ul class="list-disc ml-5 space-y-1">${section.doNotRecordHere.map((item) => `<li>${item}</li>`).join('')}</ul>
                  </div>
                </div>
                <p class="mt-3 text-xs text-gray-500"><span class="font-semibold">${getSectionRelevanceLine(section.id)}</span></p>
                ${notApplicableNote ? `<p class="mt-1 text-xs text-amber-700">${notApplicableNote}</p>` : ''}
                ${section.notes ? `<p class="mt-3 text-xs text-gray-500"><span class="font-semibold">Note:</span> ${section.notes}</p>` : ''}
              </div>
            ` : ''}
          </div>
        `;
      }).join('');
    }

    function renderHome() {
      const profile = getProfile();
      const scores = calculateScores();
      const indexMetrics = getWorkloadIndexMetrics(scores.total);
      const reportingPeriodSet = hasReportingPeriod(profile);
      const staffCategory = getHomeStaffCategoryDetails(profile);
      const helperAnswer = HOME_RECORD_HELPERS[homeRecordHelperSelection] || null;

      return `
        <div class="space-y-5">
          <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div class="space-y-2">
                <h2 class="heading-font text-3xl font-bold text-gray-900">FST SMART Calculator</h2>
                <p class="text-gray-600">Record workload activities for the reporting period and view a consolidated workload summary used for staffing decisions.</p>
                <p class="text-sm text-gray-700">How to use: Complete Staff Profile first, then record activities in the relevant sections, then review Results to check your consolidated workload summary.</p>
                <div class="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-900">
                  <span class="font-semibold">Important rule:</span> Record each activity once only in the most appropriate section, and do not double count across sections.
                </div>
                ${reportingPeriodSet ? `
                  <div class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-gray-100 text-gray-700 border border-gray-200">
                    Reporting period set
                  </div>
                ` : `
                  <div class="inline-flex items-center px-3 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
                    Reporting period not set
                  </div>
                `}
              </div>
              <button onclick="navigateToSection('profile')" class="px-4 py-2 bg-sky-600 text-white rounded-lg font-semibold hover:bg-sky-700 transition whitespace-nowrap">
                Start with Staff Profile
              </button>
            </div>
          </div>

          <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p class="text-xs font-semibold text-gray-500 uppercase tracking-wide">Your staff category</p>
                <p class="text-base font-semibold text-gray-900 mt-1">${staffCategory.label}</p>
              </div>
              ${staffCategory.key ? '' : `
                <button onclick="navigateToSection('profile')" class="px-3 py-2 text-sm font-semibold bg-sky-600 text-white rounded-lg hover:bg-sky-700 transition">Set in Staff Profile</button>
              `}
            </div>
          </div>

          <div class="grid grid-cols-2 md:grid-cols-4 gap-3">
            <button onclick="navigateToSection('profile')" class="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold text-gray-700 hover:border-sky-400 hover:text-sky-700 transition">👤 Staff Profile</button>
            <button onclick="navigateToSection('teaching')" class="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold text-gray-700 hover:border-sky-400 hover:text-sky-700 transition">📚 Teaching</button>
            <button onclick="navigateToSection('supervision')" class="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold text-gray-700 hover:border-sky-400 hover:text-sky-700 transition">🎓 Supervision</button>
            <button onclick="navigateToSection('results')" class="bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm font-semibold text-gray-700 hover:border-sky-400 hover:text-sky-700 transition">📊 Results</button>
          </div>

          <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
              <div>
                <h3 class="heading-font text-xl font-bold text-gray-900">Workload snapshot</h3>
                <p class="text-sm text-gray-600">Current workload index based on saved entries.</p>
              </div>
              <div class="text-right">
                <div class="text-3xl font-bold text-gray-900">${indexMetrics.displayIndexValue.toFixed(1)} / ${WORKLOAD_INDEX_MAX}</div>
                <div class="text-xs text-gray-500">Total score: ${scores.total.toFixed(1)}</div>
              </div>
            </div>
            <div class="w-full h-3 bg-gray-200 rounded-full overflow-hidden">
              <div class="h-full bg-sky-600" style="width: ${indexMetrics.fillPercent.toFixed(2)}%"></div>
            </div>
            <div class="mt-4 bg-slate-50 border border-slate-200 rounded-lg p-4">
              <h4 class="font-semibold text-gray-900 mb-1">Provisional index bands</h4>
              <p class="text-xs text-gray-600 mb-3">Bands are provisional until calibrated with faculty data. Use for rough triage only.</p>
              <div class="grid grid-cols-1 sm:grid-cols-2 gap-2 text-sm text-gray-700">
                <div>Light: 0 to 19</div>
                <div>Moderate: 20 to 34</div>
                <div>Balanced: 35 to 49</div>
                <div>Overloaded: 50 plus</div>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 class="heading-font text-xl font-bold text-gray-900 mb-3">Where do I record this?</h3>
            <div class="flex flex-wrap gap-2">
              ${Object.entries(HOME_RECORD_HELPERS).map(([id, helper]) => `
                <button onclick="setHomeRecordHelperSelection('${id}')" class="px-3 py-1.5 text-sm font-semibold rounded-full border transition ${homeRecordHelperSelection === id ? 'bg-sky-100 border-sky-300 text-sky-800' : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'}">${helper.label}</button>
              `).join('')}
            </div>
            ${helperAnswer ? `
              <div class="mt-3 text-sm bg-sky-50 border border-sky-200 rounded-lg p-3 text-sky-900">
                <span class="font-semibold">Record in:</span> ${helperAnswer.section}. ${helperAnswer.reason}
              </div>
            ` : '<p class="mt-3 text-xs text-gray-500">Select a chip to see the recommended section.</p>'}
          </div>

          <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3 mb-4">
              <h3 class="heading-font text-xl font-bold text-gray-900">Section guide</h3>
              <div class="flex gap-2">
                <button onclick="expandAllHomeGuide()" class="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition">Expand all</button>
                <button onclick="collapseAllHomeGuide()" class="px-3 py-1.5 text-xs font-semibold rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-50 transition">Collapse all</button>
              </div>
            </div>
            <div class="space-y-3">
              ${renderHomeSectionAccordion(staffCategory.key)}
            </div>
          </div>

          <p class="text-xs text-gray-500 px-1">Data is stored in your browser and is only submitted when you use Submit report.</p>
        </div>
      `;
    }

    function renderTeaching() {
      const courses = getRecordsBySection('teaching');
      const classSizeFactorRows = [
        { band: '1 to 50', factor: '1.0' },
        { band: '51 to 100', factor: '1.3' },
        { band: 'More than 100', factor: '1.5' }
      ];
      
      return `
        <div class="space-y-6">
          <!-- Formula Card -->
          <div class="bg-gradient-to-r from-blue-50 to-sky-50 rounded-xl shadow-sm border-2 border-blue-200 p-6">
            <h3 class="font-bold text-lg text-blue-900 mb-3">🧮 Teaching Workload Score Calculation</h3>
            
            <div class="bg-white rounded-lg p-4 mb-4">
              <p class="text-sm text-gray-700 mb-3">
                <strong>Course points equals weekly_hours (no class size factor)</strong>
              </p>
              <div class="text-xs text-gray-600 space-y-2 mb-4">
                <p><strong>Step 1:</strong> total_semester_hours = lecture_hours_semester + tutorial_hours_semester + lab_hours_semester + fieldwork_hours_semester</p>
                <p><strong>Step 2:</strong> weekly_hours = total_semester_hours ÷ 14</p>
                <p><strong>Step 3:</strong> course_points = round(weekly_hours, 1 decimal)</p>
              </div>
            </div>
            
            <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
              <p class="text-sm font-semibold text-yellow-900 mb-2">Example:</p>
              <p class="text-xs text-gray-700">
                Course with 22L + 6T + 0Lab + 0F = 28 hours total<br>
                Weekly = 28 ÷ 14 = 2.0 hours/week<br>
                <strong class="text-green-700">Score = 2.0 points</strong>
              </p>
            </div>

            <div id="teaching_live_preview" class="mt-4 bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs text-gray-700"></div>
          </div>

          <!-- Add Course Form -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 class="heading-font text-2xl font-bold mb-6">📚 Teaching Load</h2>
            
            <form id="teaching-form" onsubmit="saveCourse(event)" class="space-y-6">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label for="course-code" class="block text-sm font-semibold text-gray-700 mb-2">Course Code *</label>
                  <input type="text" id="course-code" required 
                         class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"
                         placeholder="e.g., SJ24102">
                </div>
                
                <div>
                  <label for="course-name" class="block text-sm font-semibold text-gray-700 mb-2">Course Name *</label>
                  <input type="text" id="course-name" required 
                         class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"
                         placeholder="e.g., Monetary Economics">
                </div>
                
                <div>
                  <label for="course-credit-hours" class="block text-sm font-semibold text-gray-700 mb-2">Credit Hours *</label>
                  <input type="number" id="course-credit-hours" required min="0" step="1"
                         class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"
                         placeholder="2">
                </div>
                
                <div><label for="teaching-section" class="block text-sm font-semibold text-gray-700 mb-2">Teaching Section *</label><select id="teaching-section" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"><option value="A" selected>Section A — Normal Teaching Subjects</option><option value="B">Section B — Flexible Learning</option></select></div>
                
                <div>
                  <label for="course-lecture" class="block text-sm font-semibold text-gray-700 mb-2">Lecture Hours (per semester) *</label>
                  <input type="number" id="course-lecture" required min="0" step="0.5"
                         class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"
                         placeholder="22">
                </div>
                
                <div>
                  <label for="course-tutorial" class="block text-sm font-semibold text-gray-700 mb-2">Tutorial Hours (per semester)</label>
                  <input type="number" id="course-tutorial" min="0" step="0.5" value="0"
                         class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"
                         placeholder="6">
                </div>
                
                <div>
                  <label for="course-lab" class="block text-sm font-semibold text-gray-700 mb-2">Lab Hours (per semester)</label>
                  <input type="number" id="course-lab" min="0" step="0.5" value="0"
                         class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"
                         placeholder="28">
                </div>
                
                <div>
                  <label for="course-fieldwork" class="block text-sm font-semibold text-gray-700 mb-2">Fieldwork Hours (per semester)</label>
                  <input type="number" id="course-fieldwork" min="0" step="0.5" value="0"
                         class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"
                         placeholder="0">
                </div>
                
                ${createOtherSpecifyBlock({
                  sectionKey: 'teaching',
                  baseId: 'course-semester',
                  labelText: 'Semester',
                  optionsArray: OTHER_SPECIFY_OPTIONS.teachingSemester,
                  valueKey: 'course_semester',
                  otherTextKey: 'course_semester_other',
                  specifyLabel: 'Specify',
                  specifyPlaceholder: 'Enter semester details',
                  required: true,
                  selectPlaceholder: 'Select Semester'
                })}
                
                <div>
                  <label for="course-role" class="block text-sm font-semibold text-gray-700 mb-2">Role *</label>
                  <select id="course-role" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none">
                    <option value="">Select Role</option>
                    <option value="Lecturer">Lecturer</option>
                    <option value="Coordinator">Coordinator</option>
                    <option value="Lecturer + Coordinator">Lecturer + Coordinator</option>
                  </select>
                </div>
              </div>
              
              <div class="flex justify-between">
                <button type="button" onclick="navigateToSection('profile')" class="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300">
                  ← Previous
                </button>
                <button type="submit" id="save-course-btn" class="px-6 py-3 bg-sky-600 text-white rounded-lg font-semibold hover:bg-sky-700">
                  ➕ Add Course
                </button>
              </div>
            </form>
          </div>
          
          ${courses.length > 0 ? `
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 class="font-bold text-lg mb-4">Your Courses (${courses.length})</h3>
              <div class="space-y-3">
                ${courses.map(course => {
                  const breakdown = getTeachingCourseBreakdown(course);
                  const semesterMeta = getOtherSpecifyMetadata(course, 'course_semester', 'course_semester_other', OTHER_SPECIFY_OPTIONS.teachingSemester);
                  const semester = semesterMeta.selected === 'Other' ? semesterMeta.display : semesterMeta.selected;
                  
                  return `
                    <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div class="flex-1">
                        <div class="font-semibold text-gray-900">${course.course_code} - ${course.course_name}</div>
                        <div class="text-sm text-gray-600 mt-1">
                          ${course.course_credit_hours} credits • Section ${course.teaching_section || 'A'} • ${course.course_role}
                        </div>
                        <div class="text-sm text-gray-600 mt-1">
                          Total: ${breakdown.total_semester_hours}h (L:${course.course_lecture || 0}, T:${course.course_tutorial || 0}, Lab:${course.course_lab || 0}, F:${course.course_fieldwork || 0}) • 
                          Weekly: ${breakdown.weekly_hours.toFixed(1)}h
                        </div>
                        ${semester ? `<div class="text-xs text-gray-500 mt-1">${semester}</div>` : ''}
                        <div class="text-xs text-gray-500 mt-1">
                          <span class="font-semibold text-green-700">Score: ${breakdown.course_points}</span>
                        </div>
                      </div>
                      <button type="button" onclick="deleteCourse('${course.__backendId}')" 
                              class="ml-4 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium text-sm">
                        Delete
                      </button>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          ` : ''}

          <div class="flex justify-end">
            <button onclick="navigateToSection('supervision')" class="px-6 py-3 bg-sky-600 text-white rounded-lg font-semibold hover:bg-sky-700">
              Next: Supervision →
            </button>
          </div>
        </div>
      `;
    }

    function setupTeachingEventListeners() {
      renderTeachingLivePreview();
      const teachingForm = document.getElementById('teaching-form');
      if (!teachingForm) return;

      wireOtherSpecifyBlock({ baseId: 'course-semester' });

      teachingForm.querySelectorAll('input, select').forEach((field) => {
        field.addEventListener('input', renderTeachingLivePreview);
        field.addEventListener('change', renderTeachingLivePreview);
      });
    }

    function renderTeachingLivePreview() {
      const preview = document.getElementById('teaching_live_preview');
      if (!preview) return;

      const courses = getRecordsBySection('teaching');
      const savedTotal = Math.round(courses.reduce((sum, course) => sum + calculateCourseScore(course), 0) * 10) / 10;
      const teachingBenchmark = Number(readSmartConfig().sectionBenchmarks.TeachingWeeklyHoursBenchmark || 5);

      const lectureRaw = document.getElementById('course-lecture')?.value ?? '';
      const tutorialRaw = document.getElementById('course-tutorial')?.value ?? '';
      const labRaw = document.getElementById('course-lab')?.value ?? '';
      const fieldworkRaw = document.getElementById('course-fieldwork')?.value ?? '';
      const teachingSection = document.getElementById('teaching-section')?.value || 'A';

      const draftCourse = {
        course_lecture: parseFloat(lectureRaw) || 0,
        course_tutorial: parseFloat(tutorialRaw) || 0,
        course_lab: parseFloat(labRaw) || 0,
        course_fieldwork: parseFloat(fieldworkRaw) || 0,
        teaching_section: teachingSection
      };

      const hasRequiredInputs = lectureRaw !== '';
      const draftBreakdown = getTeachingCourseBreakdown(draftCourse);
      const liveTotal = Math.round((savedTotal + (hasRequiredInputs ? draftBreakdown.course_points : 0)) * 10) / 10;

      preview.innerHTML = `
        <p class="font-semibold text-gray-900 mb-2">Live preview</p>
        ${hasRequiredInputs ? `
          <div class="space-y-1 mb-3">
            <p><strong>Current draft input:</strong> lecture_hours_semester=${draftCourse.course_lecture}, tutorial_hours_semester=${draftCourse.course_tutorial}, lab_hours_semester=${draftCourse.course_lab}, fieldwork_hours_semester=${draftCourse.course_fieldwork}, teaching_section=${draftCourse.teaching_section}</p>
            <p><strong>Step-by-step:</strong> total_semester_hours = ${draftCourse.course_lecture} + ${draftCourse.course_tutorial} + ${draftCourse.course_lab} + ${draftCourse.course_fieldwork} = ${draftBreakdown.total_semester_hours}</p>
            <p>weekly_hours = ${draftBreakdown.total_semester_hours} ÷ ${draftBreakdown.weekly_hours_divisor} = ${draftBreakdown.weekly_hours.toFixed(4)}</p>
            <p><strong>course_points = round(${draftBreakdown.weekly_hours.toFixed(4)}, 1) = ${draftBreakdown.course_points.toFixed(1)}</strong></p>
          </div>
        ` : '<p class="mb-3">No teaching inputs selected yet.</p>'}
        <p><strong>Saved teaching total:</strong> ${savedTotal.toFixed(1)}</p>
        <p><strong>Live teaching total (saved + draft):</strong> ${liveTotal.toFixed(1)}</p>
        <p><strong>Number of courses saved:</strong> ${courses.length}</p>
        ${savedTotal > teachingBenchmark ? `<p class='text-amber-700 font-semibold'>⚠️ Teaching overload warning: ${savedTotal.toFixed(1)} weekly hours > benchmark ${teachingBenchmark.toFixed(1)}. This does not reduce final score.</p>` : ''}
      `;
    }

    async function saveCourse(event) {
      event.preventDefault();
      
      if (allRecords.length >= 999) {
        showToast('Maximum limit of 999 records reached', 'error');
        return;
      }
      
      const btn = document.getElementById('save-course-btn');
      btn.disabled = true;
      btn.innerHTML = '<div class="loading-spinner mx-auto"></div>';
      
      const semesterMeta = getOtherSpecifyValue({ baseId: 'course-semester', optionsArray: OTHER_SPECIFY_OPTIONS.teachingSemester });
      
      const courseData = {
        section: 'teaching',
        course_code: document.getElementById('course-code').value,
        course_name: document.getElementById('course-name').value,
        course_credit_hours: parseInt(document.getElementById('course-credit-hours').value),
        course_lecture: parseFloat(document.getElementById('course-lecture').value) || 0,
        course_tutorial: parseFloat(document.getElementById('course-tutorial').value) || 0,
        course_lab: parseFloat(document.getElementById('course-lab').value) || 0,
        course_fieldwork: parseFloat(document.getElementById('course-fieldwork').value) || 0,
        teaching_section: document.getElementById('teaching-section').value || 'A',
        course_semester: semesterMeta.selected,
        course_semester_other: semesterMeta.other,
        course_role: document.getElementById('course-role').value,
        created_at: new Date().toISOString()
      };
      
      const result = await window.dataSdk.create(courseData);
      
      btn.disabled = false;
      btn.innerHTML = '➕ Add Course';
      
      if (result.isOk) {
        showToast('Course added successfully!');
        document.getElementById('teaching-form').reset();
        renderTeachingLivePreview();
      } else {
        showToast('Failed to add course', 'error');
      }
    }

    async function deleteCourse(backendId) {
      const course = allRecords.find(r => r.__backendId === backendId);
      if (!course) return;
      
      const result = await window.dataSdk.delete(course);
      
      if (result.isOk) {
        showToast('Course deleted successfully!');
      } else {
        showToast('Failed to delete course', 'error');
      }
    }

    function renderSupervision() {
      const students = getRecordsBySection('supervision');
      const basePointsRows = [
        { level: 'PhD', main: '8', co: '4' },
        { level: 'Masters', main: '5', co: '2.5' },
        { level: 'Undergraduate (FYP)', main: '1', co: '1 (role ignored for score)' }
      ];
      
      return `
        <div class="space-y-6">
          <!-- Formula Card -->
          <div class="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl shadow-sm border-2 border-purple-200 p-6">
            <h3 class="font-bold text-lg text-purple-900 mb-3">🧮 Supervision Score Calculation Formula</h3>
            
            <div class="bg-white rounded-lg p-4 mb-4">
              <p class="text-sm text-gray-700 mb-3">
                <strong>Entry points = base_points × registration_mode_factor × status_factor</strong>
              </p>
              <div class="overflow-x-auto">
                <table class="w-full text-xs text-gray-700 border border-gray-200 rounded-lg">
                  <thead class="bg-purple-100 text-purple-900">
                    <tr>
                      <th class="text-left px-3 py-2 border-b border-gray-200">Student level</th>
                      <th class="text-left px-3 py-2 border-b border-gray-200">Main supervisor</th>
                      <th class="text-left px-3 py-2 border-b border-gray-200">Co-supervisor</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${basePointsRows.map(row => `
                      <tr class="bg-white">
                        <td class="px-3 py-2 border-b border-gray-100">${row.level}</td>
                        <td class="px-3 py-2 border-b border-gray-100">${row.main}</td>
                        <td class="px-3 py-2 border-b border-gray-100">${row.co}</td>
                      </tr>
                    `).join('')}
                  </tbody>
                </table>
              </div>
            </div>
            
            <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
              <p class="text-sm font-semibold text-yellow-900 mb-2">Example:</p>
              <p class="text-xs text-gray-700">
                • Masters Leader Active = 1.0 equivalent<br>
                • Masters Member Active = 0.2 equivalent<br>
                • Completed applies status factor 0.5<br>
                • PhD Leader = 1.6, PhD Member = 0.32, Undergraduate = 0.2 (all × status factor)
              </p>
            </div>

            <div id="supervision_live_preview" class="mt-4 bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs text-gray-700"></div>
          </div>

          <!-- Add Student Form -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 class="heading-font text-2xl font-bold mb-6">🎓 Student Supervision</h2>
            
            <form id="supervision-form" onsubmit="saveStudent(event)" class="space-y-6">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label for="student-name" class="block text-sm font-semibold text-gray-700 mb-2">Student Name *</label>
                  <input type="text" id="student-name" required 
                         class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"
                         placeholder="e.g., Vallerie Peter">
                </div>
                
                <div>
                  <label for="student-matric" class="block text-sm font-semibold text-gray-700 mb-2">Matric Number *</label>
                  <input type="text" id="student-matric" required
                         class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"
                         placeholder="e.g., MS2421011T">
                </div>
                
                <div>
                  <label for="student-level" class="block text-sm font-semibold text-gray-700 mb-2">Study Level *</label>
                  <select id="student-level" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none">
                    <option value="">Select Level</option>
                    <option value="phd">PhD</option>
                    <option value="masters">Masters</option>
                    <option value="undergraduate">Undergraduate (FYP)</option>
                  </select>
                </div>
                
                <div>
                  <label for="student-role" class="block text-sm font-semibold text-gray-700 mb-2">Main Supervisor Type *</label>
                  <select id="student-role" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none">
                    <option value="">Select Role</option>
                    <option value="main">Main Supervisor</option>
                    <option value="co">Co Supervisor</option>
                  </select>
                </div>

                
                <div>
                  <label for="student_current_status" class="block text-sm font-semibold text-gray-700 mb-2">Student Current Status *</label>
                  <select id="student_current_status" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none">
                    <option value="">Select Status</option>
                    <option value="active">Active (factor 1.0)</option>
                    <option value="on_leave">On leave (factor 0.2)</option>
                    <option value="deferred">Deferred (factor 0.2)</option>
                    <option value="completed">Completed (factor 0.5)</option>
                    <option value="terminated">Terminated (factor 0.0)</option>
                    <option value="not_active">Not active (factor 0.0)</option>
                  </select>
                  <div class="mt-2 text-xs text-gray-600 bg-slate-50 border border-slate-200 rounded p-3 space-y-1">
                    <p><strong>Active:</strong> student is registered and engaged during the reporting period.</p>
                    <p><strong>On leave / Deferred:</strong> student is registered but not progressing, limited supervision contact.</p>
                    <p><strong>Completed:</strong> submission or viva completed, corrections may remain.</p>
                    <p><strong>Terminated / Not active:</strong> no supervision workload claimed.</p>
                  </div>
                </div>
                
                <div class="md:col-span-2">
                  <label for="student-title" class="block text-sm font-semibold text-gray-700 mb-2">Research Title *</label>
                  <input type="text" id="student-title" required
                         class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"
                         placeholder="e.g., Dynamic Panel Data Model">
                </div>
                
                <div>
                  <label for="student-start-semester-select" class="block text-sm font-semibold text-gray-700 mb-2">Start Semester *</label>
                  <select id="student-start-semester-select" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none">
                    <option value="">Select Semester</option>
                    ${SUPERVISION_SEMESTER_OPTIONS.map((option) => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`).join('')}
                  </select>
                  <div id="student-start-semester-other-wrap" class="mt-3 hidden">
                    <label for="student-start-semester-other" class="block text-sm font-semibold text-gray-700 mb-2">Specify</label>
                    <input id="student-start-semester-other" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none" placeholder="Enter semester details">
                  </div>
                </div>
                <div>
                  <label for="student-start-date" class="block text-sm font-semibold text-gray-700 mb-2">Start Date *</label>
                  <input type="date" id="student-start-date" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none">
                </div>
                <div>
                  <label for="student-end-date" class="block text-sm font-semibold text-gray-700 mb-2">End Date</label>
                  <input type="date" id="student-end-date" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none">
                </div>
              </div>
              
              <div class="flex justify-between">
                <button type="button" onclick="navigateToSection('teaching')" class="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300">
                  ← Previous
                </button>
                <button type="submit" id="save-student-btn" class="px-6 py-3 bg-sky-600 text-white rounded-lg font-semibold hover:bg-sky-700">
                  ➕ Add Student
                </button>
              </div>
            </form>
          </div>
          
          ${students.length > 0 ? `
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 class="font-bold text-lg mb-4">Supervised Students (${students.length})</h3>
              <div class="space-y-3">
                ${students.map(student => {
                  const breakdown = getSupervisionEntryBreakdown(student);
                  const score = breakdown.entry_points;
                  const roleLabel = student.student_role === 'main' ? 'Main Supervisor' : 'Co Supervisor';
                  const modeLabel = 'Standard';
                  const statusLabelMap = {
                    active: 'Active',
                    on_leave: 'On leave',
                    deferred: 'Deferred',
                    completed: 'Completed',
                    terminated: 'Terminated',
                    not_active: 'Not active'
                  };
                  const statusLabel = statusLabelMap[student.student_current_status] || 'Not selected';
                  
                  return `
                    <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div class="flex-1">
                        <div class="font-semibold text-gray-900">${student.student_name} (${student.student_matric})</div>
                        <div class="text-sm text-gray-600 mt-1">
                          ${student.student_level.toUpperCase()} • ${roleLabel} • Start semester ${getOtherSpecifyMetadata(student, 'student_start_semester', 'student_start_semester_other', SUPERVISION_SEMESTER_OPTIONS).display}
                        </div>
                        <div class="text-xs text-gray-500 mt-1">
                          ${modeLabel} • ${statusLabel}
                        </div>
                        <div class="text-xs text-gray-500 mt-1">${student.student_title}</div>
                        <div class="text-xs text-gray-500 mt-1">
                          <span class="font-semibold text-green-700">Score: ${breakdown.base_points} × ${breakdown.mode_factor} × ${breakdown.status_factor} = ${score}</span>
                        </div>
                      </div>
                      <button type="button" onclick="deleteStudent('${student.__backendId}')" 
                              class="ml-4 px-3 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium text-sm">
                        Delete
                      </button>
                    </div>
                  `;
                }).join('')}
              </div>
            </div>
          ` : ''}

          <div class="flex justify-end">
            <button onclick="navigateToSection('research')" class="px-6 py-3 bg-sky-600 text-white rounded-lg font-semibold hover:bg-sky-700">
              Next: Research →
            </button>
          </div>
        </div>
      `;
    }


    function setupSupervisionEventListeners() {
      renderSupervisionLivePreview();
      const supervisionForm = document.getElementById('supervision-form');
      if (!supervisionForm) return;
      wireOtherSpecifyBlock({ baseId: 'student-start-semester', onToggle: renderSupervisionLivePreview });

      supervisionForm.querySelectorAll('input, select').forEach((field) => {
        field.addEventListener('input', renderSupervisionLivePreview);
        field.addEventListener('change', renderSupervisionLivePreview);
      });
    }

    function renderSupervisionLivePreview() {
      const preview = document.getElementById('supervision_live_preview');
      if (!preview) return;

      const students = getRecordsBySection('supervision');
      const savedRows = students.map((student, index) => {
        const breakdown = getSupervisionEntryBreakdown(student);
        return {
          label: `Saved entry #${index + 1}`,
          ...breakdown
        };
      });

      const draftStudent = {
        student_level: document.getElementById('student-level')?.value || '',
        student_role: document.getElementById('student-role')?.value || '',
                student_current_status: document.getElementById('student_current_status')?.value || ''
      };
      const draftBreakdown = getSupervisionEntryBreakdown(draftStudent);
      const hasDraftSelection = Boolean(
        draftStudent.student_level ||
        draftStudent.student_role ||
                draftStudent.student_current_status
      );

      const rows = [
        ...savedRows,
        ...(hasDraftSelection ? [{ label: 'Current form draft', ...draftBreakdown }] : [])
      ];

      const savedTotal = Math.round(savedRows.reduce((sum, row) => sum + row.entry_points, 0) * 100) / 100;
      const liveTotal = Math.round(rows.reduce((sum, row) => sum + row.entry_points, 0) * 100) / 100;

      preview.innerHTML = `
        <p class="font-semibold text-gray-900 mb-2">Live preview</p>
        <div class="space-y-1 mb-3">
          ${rows.length === 0 ? '<p>No supervision entry selected yet.</p>' : rows.map((row) => `
            <p>
              ${row.label}: base_points=${row.base_points}, role_factor=${row.mode_factor}, status_factor=${row.status_factor}, entry_points=${row.entry_points.toFixed(2)}
            </p>
          `).join('')}
        </div>
        <p><strong>Saved supervision total:</strong> ${savedTotal.toFixed(2)}</p>
        <p><strong>Live supervision total (saved + draft):</strong> ${liveTotal.toFixed(2)}</p>
      `;
    }

    async function saveStudent(event) {
      event.preventDefault();
      if (allRecords.length >= 999) {
        showToast('Maximum limit of 999 records reached', 'error');
        return;
      }
      const btn = document.getElementById('save-student-btn');
      const form = document.getElementById('supervision-form');
      if (!form || !form.reportValidity()) return;
      const semesterMeta = getOtherSpecifyValue({ baseId: 'student-start-semester', optionsArray: SUPERVISION_SEMESTER_OPTIONS });
      const studentData = {
        section: 'supervision',
        student_name: document.getElementById('student-name').value,
        student_matric: document.getElementById('student-matric').value,
        student_level: document.getElementById('student-level').value,
        student_role: document.getElementById('student-role').value,
        student_current_status: document.getElementById('student_current_status').value,
        student_title: document.getElementById('student-title').value,
        student_start_semester: semesterMeta.selected,
        student_start_semester_other: semesterMeta.other,
        student_start_date: document.getElementById('student-start-date').value,
        student_end_date: document.getElementById('student-end-date').value,
        created_at: new Date().toISOString()
      };
      btn.disabled = true;
      btn.innerHTML = '<div class="loading-spinner mx-auto"></div>';
      try {
        const result = await window.dataSdk.create(studentData);
        if (result.isOk) {
          showToast('Student added successfully!');
          form.reset();
          renderSupervisionLivePreview();
        } else {
          showToast('Failed to add student', 'error');
        }
      } finally {
        btn.disabled = false;
        btn.innerHTML = '➕ Add Student';
      }
    }

    async function deleteStudent(backendId) {
      const student = allRecords.find(r => r.__backendId === backendId);
      if (!student) return;
      
      const result = await window.dataSdk.delete(student);
      
      if (result.isOk) {
        showToast('Student deleted successfully!');
      } else {
        showToast('Failed to delete student', 'error');
      }
    }

    function createCalculationPanel({ sectionKey, title, formula, baseTableHtml, factorTableHtml, workedExampleHtml, notesHtml }) {
      return `
        <div class="bg-gradient-to-r from-slate-50 to-sky-50 rounded-xl shadow-sm border-2 border-slate-200 p-6">
          <h3 class="font-bold text-lg text-slate-900 mb-3">${title}</h3>
          <div class="bg-white rounded-lg p-4 text-xs text-gray-700 space-y-3">
            <p><strong>${formula}</strong></p>
            ${baseTableHtml || ''}
            ${factorTableHtml || ''}
          </div>
          <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded text-xs text-gray-700 mt-4">${workedExampleHtml}</div>
          <div class="bg-blue-50 border border-blue-200 rounded-lg p-4 text-xs text-blue-900 mt-4">${notesHtml}</div>
          <div id="${sectionKey}_live_preview" class="mt-4 bg-slate-50 border border-slate-200 rounded-lg p-4 text-xs text-gray-700"></div>
        </div>
      `;
    }

    function createSavedList({ title, items, renderItem, emptyText = 'No entries yet' }) {
      const listHtml = items.length === 0
        ? `<p class="text-sm text-gray-500">${emptyText}</p>`
        : `<div class="space-y-3">${items.map(renderItem).join('')}</div>`;

      return `
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 class="font-semibold text-lg text-gray-900 mb-4">${title}</h3>
          ${listHtml}
        </div>
      `;
    }

    function createNavigationRow({ previous, next }) {
      return `
        <div class="flex justify-between">
          <button onclick="navigateToSection('${previous.id}')" class="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300">Previous: ${previous.label}</button>
          <button onclick="navigateToSection('${next.id}')" class="px-6 py-3 bg-sky-600 text-white rounded-lg font-semibold hover:bg-sky-700">Next: ${next.label}</button>
        </div>
      `;
    }

    const OTHER_SPECIFY_SELECT_CLASS = 'w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none';

    const SUPERVISION_SEMESTER_OPTIONS = ['Semester 1 Session 2025/2026', 'Semester 2 Session 2025/2026', 'Semester 1 Session 2026/2027', 'Semester 2 Session 2026/2027', 'Other'];
    const OTHER_SPECIFY_OPTIONS = {
      teachingSemester: ['Semester 1 2025/2026', 'Semester 2 2025/2026', 'Semester 1 2026/2027', 'Semester 2 2026/2027', 'Other'],
      publicationIndexing: ['Scopus', 'Web of Science', 'MyCite', 'ERA', 'Not indexed', 'Other'],
      publicationAuthorPosition: ['First author', 'Corresponding author', 'Co author', 'Single author', 'Editor', 'Other'],
      publicationStatus: ['Drafting', 'Submitted', 'Accepted', 'Published', 'Other'],
      administrationPosition: ['Dean', 'Deputy Dean', 'Centre Director', 'Deputy Centre Director', 'Head of Programme', 'Postgraduate Coordinator', 'Programme Coordinator'],
      adminDutyType: ['Accreditation Work', 'Curriculum Development', 'Committee Chair', 'Event Organizer', 'Committee Member', 'Other'],
      serviceType: ['Committee Service', 'Community Engagement', 'Expert Contribution', 'Event Support', 'Income Generation', 'Other'],
      laboratoryResponsibility: ['Lab Coordinator', 'Safety Officer', 'Equipment Manager', 'Inventory Manager', 'SOP Development', 'Lab Supervisor', 'Other'],
      professionalType: ['Professional Body Leadership', 'Professional Certification', 'Conference Organizer', 'Editorial Board', 'Professional Training', 'Membership', 'Other']
    };

    function normalizeSelectWithOther(rawValue, optionsArray) {
      const normalizedRawValue = (rawValue || '').trim();
      if (!normalizedRawValue) return { selected: '', other: '' };
      const matchedOption = optionsArray.find((option) => option.toLowerCase() === normalizedRawValue.toLowerCase());
      if (matchedOption) return { selected: matchedOption, other: '' };
      return { selected: 'Other', other: normalizedRawValue };
    }

    function createOtherSpecifyBlock(config) {
      const {
        sectionKey,
        baseId,
        labelText,
        optionsArray,
        valueKey,
        otherTextKey,
        specifyLabel = 'Specify',
        specifyPlaceholder,
        required = false,
        selectPlaceholder = 'Select',
        selectedValue = '',
        otherText = ''
      } = config;
      const normalized = normalizeSelectWithOther(selectedValue, optionsArray);
      const initialSelection = normalized.selected || '';
      const initialOtherText = (otherText || normalized.other || '').trim();
      const showOther = initialSelection === 'Other';
      const selectId = `${baseId}-select`;
      const otherWrapId = `${baseId}-other-wrap`;
      const otherInputId = `${baseId}-other`;

      return `
        <div>
          <label for="${selectId}" class="block text-sm font-semibold text-gray-700 mb-2">${labelText}${required ? ' *' : ''}</label>
          <select id="${selectId}" ${required ? 'required' : ''} class="${OTHER_SPECIFY_SELECT_CLASS}">
            <option value="">${selectPlaceholder}</option>
            ${optionsArray.map((option) => `<option value="${escapeHtml(option)}" ${initialSelection === option ? 'selected' : ''}>${escapeHtml(option)}</option>`).join('')}
          </select>
          <div id="${otherWrapId}" class="mt-3 ${showOther ? '' : 'hidden'}">
            <label for="${otherInputId}" class="block text-sm font-semibold text-gray-700 mb-2">${specifyLabel}</label>
            <input id="${otherInputId}" value="${escapeHtml(initialOtherText)}" placeholder="${escapeHtml(specifyPlaceholder || '')}" class="${OTHER_SPECIFY_SELECT_CLASS}" ${showOther ? 'required' : ''}>
          </div>
        </div>
      `;
    }

    function wireOtherSpecifyBlock(config) {
      const { baseId, onToggle } = config;
      const select = document.getElementById(`${baseId}-select`);
      const otherWrap = document.getElementById(`${baseId}-other-wrap`);
      const otherInput = document.getElementById(`${baseId}-other`);
      if (!select || !otherWrap || !otherInput) return;

      const sync = () => {
        const show = select.value === 'Other';
        otherWrap.classList.toggle('hidden', !show);
        otherInput.required = show;
        if (!show) {
          otherInput.value = '';
        }
        if (typeof onToggle === 'function') {
          onToggle(show);
        }
      };

      select.addEventListener('change', sync);
      sync();
    }

    function getOtherSpecifyValue({ baseId, optionsArray }) {
      const selectedValue = document.getElementById(`${baseId}-select`)?.value || '';
      const selected = normalizeSelectWithOther(selectedValue, optionsArray).selected;
      const other = selected === 'Other' ? (document.getElementById(`${baseId}-other`)?.value || '').trim() : '';
      return { selected, other };
    }


    function getOtherSpecifyMetadata(record = {}, valueKey, otherTextKey, optionsArray) {
      const normalized = normalizeSelectWithOther(record[valueKey] || '', optionsArray);
      const selected = normalized.selected || '';
      const otherText = (record[otherTextKey] || normalized.other || '').trim();
      const display = selected === 'Other' && otherText ? `Other: ${otherText}` : (selected || '-');
      return { selected, otherText, display };
    }

    function renderLivePreview({ sectionKey, breakdown, equationText, savedTotal }) {
      const preview = document.getElementById(`${sectionKey}_live_preview`);
      if (!preview) return;
      const liveTotal = Math.round((savedTotal + breakdown.entry_points) * 100) / 100;
      preview.innerHTML = `
        <p class="font-semibold mb-2">Live preview</p>
        <p>Draft item points: ${equationText} = <strong>${breakdown.entry_points.toFixed(2)}</strong></p>
        <p><strong>Saved total points:</strong> ${savedTotal.toFixed(2)}</p>
        <p><strong>Saved + draft total:</strong> ${liveTotal.toFixed(2)}</p>
      `;
    }

    function getResearchDraftInputState() {
      return {
        research_title: document.getElementById('research-title')?.value || '',
        research_grant_code: document.getElementById('research-grant-code')?.value || '',
        research_role: document.getElementById('research-role')?.value || '',
        research_status: document.getElementById('research-status')?.value || '',
        research_amount: document.getElementById('research-amount')?.value || '',
        research_start_date: document.getElementById('research-start-date')?.value || '',
        research_end_date: document.getElementById('research-end-date')?.value || ''
      };
    }

    function renderResearch() {
      const projects = getRecordsBySection('research');
      return `
        <div class="space-y-6">
          ${createCalculationPanel({
            sectionKey: 'research',
            title: '🧮 Research Workload Proxy',
            formula: 'entry_points = base_points × role_factor',
            baseTableHtml: '<p><strong>Base points:</strong> Research project item = 5</p>',
            factorTableHtml: '<p><strong>Role factors:</strong> Lead 1.0, Member 0.5</p>',
            workedExampleHtml: '<strong>Example:</strong> Lead researcher → 5 × 1.0 = 5.00 points.',
            notesHtml: '<p class="font-semibold mb-1">Notes</p><ul class="list-disc ml-5 space-y-1"><li>Only work during the selected reporting period should be claimed.</li><li>Project prestige or funding size does not affect points.</li><li>Status such as ongoing or completed does not affect points.</li></ul>'
          })}

          <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 class="heading-font text-2xl font-bold mb-6">🔬 Research Projects</h2>
            <form id="research-form" onsubmit="saveResearch(event)" class="space-y-6">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="md:col-span-2"><label for="research-title" class="block text-sm font-semibold text-gray-700 mb-2">Project Title *</label><input type="text" id="research-title" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"></div>
                <div><label for="research-grant-code" class="block text-sm font-semibold text-gray-700 mb-2">Grant Code *</label><input type="text" id="research-grant-code" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"></div>
                <div><label for="research-role" class="block text-sm font-semibold text-gray-700 mb-2">Your Role *</label><select id="research-role" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"><option value="">Select Role</option><option value="lead">Lead Researcher</option><option value="member">Research Member</option></select></div>
                <div><label for="research-status" class="block text-sm font-semibold text-gray-700 mb-2">Status (descriptive only)</label><select id="research-status" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"><option value="ongoing">Ongoing</option><option value="completed">Completed</option><option value="pending">Pending Approval</option></select></div>
                
                <div><label for="research-amount" class="block text-sm font-semibold text-gray-700 mb-2">Grant Amount (descriptive only)</label><input type="number" id="research-amount" min="0" step="0.01" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"></div>
                <div><label for="research-start-date" class="block text-sm font-semibold text-gray-700 mb-2">Start Date *</label><input type="date" id="research-start-date" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"></div><div><label for="research-end-date" class="block text-sm font-semibold text-gray-700 mb-2">End Date</label><input type="date" id="research-end-date" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"></div>
              </div>
              <div class="flex justify-end"><button type="submit" id="save-research-btn" class="px-6 py-3 bg-sky-600 text-white rounded-lg font-semibold hover:bg-sky-700">Add</button></div>
            </form>
          </div>

          ${createSavedList({
            title: 'Your Research Items',
            items: projects,
            renderItem: (item) => {
              const b = getResearchEntryBreakdown(item);
              return `<div class="border border-gray-200 rounded-lg p-4 flex items-start justify-between gap-4"><div class="text-sm text-gray-700"><p><strong>${escapeHtml(item.research_title || '-')}</strong></p><p>Role: ${escapeHtml(item.research_role || '-')}</p><p>Activity in period: ${escapeHtml(item.research_activity || '-')}</p><p>Entry points: <strong>${b.entry_points.toFixed(2)}</strong></p></div><button onclick="deleteResearch('${item.__backendId}')" class="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm font-semibold">Delete</button></div>`;
            }
          })}

          ${createNavigationRow({ previous: { id: 'supervision', label: 'Supervision' }, next: { id: 'publications', label: 'Publications' } })}
        </div>
      `;
    }

    function setupResearchEventListeners() {
      renderResearchLivePreview();
      const form = document.getElementById('research-form');
      if (!form) return;
      form.querySelectorAll('input, select').forEach((field) => {
        field.addEventListener('input', renderResearchLivePreview);
        field.addEventListener('change', renderResearchLivePreview);
      });
    }

    function renderResearchLivePreview() {
      const saved = getRecordsBySection('research');
      const savedTotal = Math.round(saved.reduce((sum, item) => sum + calculateResearchScore(item), 0) * 100) / 100;
      const draft = getResearchDraftInputState();
      const breakdown = getResearchEntryBreakdown(draft);
      renderLivePreview({ sectionKey: 'research', breakdown, equationText: `${breakdown.base_points} × ${breakdown.role_factor}`, savedTotal });
    }

    async function saveResearch(event) {
      event.preventDefault();
      if (allRecords.length >= 999) {
        showToast('Maximum limit of 999 records reached', 'error');
        return;
      }

      const btn = document.getElementById('save-research-btn');
      const form = document.getElementById('research-form');
      if (!form || !form.reportValidity()) return;

      const draft = getResearchDraftInputState();
      const breakdown = getResearchEntryBreakdown(draft);
      const researchData = { section: 'research', ...draft, entry_points: breakdown.entry_points, created_at: new Date().toISOString() };

      btn.disabled = true;
      btn.innerHTML = '<div class="loading-spinner mx-auto"></div>';
      const result = await window.dataSdk.create(researchData);
      btn.disabled = false;
      btn.innerHTML = 'Add';

      if (result.isOk) {
        showToast('Research project added successfully!');
        form.reset();
        renderSection('research');
      } else {
        showToast('Failed to add research project', 'error');
      }
    }

    async function deleteResearch(backendId) {
      const research = allRecords.find(r => r.__backendId === backendId);
      if (!research) return;
      const result = await window.dataSdk.delete(research);
      if (result.isOk) {
        showToast('Research project deleted successfully!');
        renderResearchLivePreview();
      } else {
        showToast('Failed to delete research project', 'error');
      }
    }

    const PUBLICATION_INDEXING_OPTIONS = OTHER_SPECIFY_OPTIONS.publicationIndexing;
    const PUBLICATION_AUTHOR_POSITION_OPTIONS = OTHER_SPECIFY_OPTIONS.publicationAuthorPosition;
    const PUBLICATION_STATUS_OPTIONS = OTHER_SPECIFY_OPTIONS.publicationStatus;
    const PUBLICATION_ITEM_TYPE_OPTIONS = {
      journal: 'Journal manuscript',
      conference: 'Conference paper',
      chapter: 'Book chapter',
      proceeding: 'Proceeding',
      other: 'Other'
    };

    function normalizePublicationDescriptiveValue(rawValue, allowedOptions) {
      return normalizeSelectWithOther(rawValue, allowedOptions);
    }

    function getPublicationDescriptiveMetadata(pub = {}) {
      const rawIndexing = pub.indexing_label || pub.pub_index || '';
      const rawAuthorPosition = pub.author_position_label || pub.pub_position || '';
      const normalizedIndexing = normalizePublicationDescriptiveValue(rawIndexing, PUBLICATION_INDEXING_OPTIONS);
      const normalizedAuthorPosition = normalizePublicationDescriptiveValue(rawAuthorPosition, PUBLICATION_AUTHOR_POSITION_OPTIONS);
      const indexingOther = (pub.indexing_other_text || normalizedIndexing.other || '').trim();
      const authorPositionOther = (pub.author_position_other_text || normalizedAuthorPosition.other || '').trim();
      const indexingLabel = normalizedIndexing.selected || '';
      const authorPositionLabel = normalizedAuthorPosition.selected || '';
      return {
        indexing_label: indexingLabel,
        author_position_label: authorPositionLabel,
        indexing_other_text: indexingOther,
        author_position_other_text: authorPositionOther,
        indexing_display: indexingLabel === 'Other' && indexingOther ? `Other: ${indexingOther}` : (indexingLabel || '-'),
        author_position_display: authorPositionLabel === 'Other' && authorPositionOther ? `Other: ${authorPositionOther}` : (authorPositionLabel || '-')
      };
    }

    function getPublicationItemTypeDisplay(pub = {}) {
      const itemTypeOther = (pub.pub_type_other_text || '').trim();
      if (pub.pub_type === 'other' && itemTypeOther) {
        return `Other: ${itemTypeOther}`;
      }
      return PUBLICATION_ITEM_TYPE_OPTIONS[pub.pub_type] || '-';
    }

    function getPublicationStatusMetadata(pub = {}) {
      const normalizedStatus = normalizePublicationDescriptiveValue(pub.pub_status || '', PUBLICATION_STATUS_OPTIONS);
      const statusLabel = normalizedStatus.selected || '';
      const statusOther = (pub.pub_status_other_text || normalizedStatus.other || '').trim();
      return {
        status_label: statusLabel,
        status_other_text: statusOther,
        status_display: statusLabel === 'Other' && statusOther ? `Other: ${statusOther}` : (statusLabel || '-')
      };
    }

    function getPublicationsDraftInputState() {
      const indexingLabel = document.getElementById('pub-index-select')?.value || '';
      const authorPositionLabel = document.getElementById('pub-position-select')?.value || '';
      const statusLabel = document.getElementById('pub-status-select')?.value || '';
      const itemType = document.getElementById('pub-type')?.value || '';
      return {
        pub_title: document.getElementById('pub-title')?.value || '',
        pub_type: itemType,
        pub_type_other_text: itemType === 'other' ? (document.getElementById('pub-type-other')?.value || '') : '',
                indexing_label: indexingLabel,
        author_position_label: authorPositionLabel,
        indexing_other_text: indexingLabel === 'Other' ? (document.getElementById('pub-index-other')?.value || '') : '',
        author_position_other_text: authorPositionLabel === 'Other' ? (document.getElementById('pub-position-other')?.value || '') : '',
        pub_venue: document.getElementById('pub-venue')?.value || '',
        pub_year: document.getElementById('pub-year')?.value || '',
        pub_status: statusLabel,
        pub_status_other_text: statusLabel === 'Other' ? (document.getElementById('pub-status-other')?.value || '') : ''
      };
    }

    function renderPublications() {
      const publications = getRecordsBySection('publications');
      return `
        <div class="space-y-6">
          ${createCalculationPanel({
            sectionKey: 'publications',
            title: '🧮 Publication Workload Proxy',
            formula: 'entry_points = paper_equivalent × stage_weight',
            baseTableHtml: '<p><strong>Base points by item type:</strong> Journal manuscript 10, Conference paper 6, Book chapter 8, Proceeding 5, Other 3</p>',
            factorTableHtml: '<p><strong>Writing stage weights:</strong> drafting 0.10, revising 0.50, responding reviewers 0.50, proofing 1.00, no activity 0.00</p>',
            workedExampleHtml: '<strong>Example:</strong> 1 submitted paper → 1 × 0.50 = 0.50 paper equivalent.',
            notesHtml: '<p class="font-semibold mb-1">Notes</p><ul class="list-disc ml-5 space-y-1"><li>Points represent writing work done in the reporting period.</li><li>Journal indexing, quartile, and acceptance do not change points.</li><li>Indexing, author position, venue, and status are descriptive only and do not affect points.</li></ul>'
          })}

          <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 class="heading-font text-2xl font-bold mb-6">📄 Publications</h2>
            <form id="publication-form" onsubmit="savePublication(event)" class="space-y-6">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="md:col-span-2"><label for="pub-title" class="block text-sm font-semibold text-gray-700 mb-2">Title *</label><input id="pub-title" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"></div>
                <div>
                  <label for="pub-type" class="block text-sm font-semibold text-gray-700 mb-2">Item Type *</label>
                  <select id="pub-type" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"><option value="">Select Type</option><option value="journal">Journal manuscript</option><option value="conference">Conference paper</option><option value="chapter">Book chapter</option><option value="proceeding">Proceeding</option><option value="other">Other</option></select>
                  <div id="pub-type-other-wrap" class="mt-3 hidden">
                    <label for="pub-type-other" class="block text-sm font-semibold text-gray-700 mb-2">Specify</label>
                    <input id="pub-type-other" placeholder="Enter item type details" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none">
                  </div>
                </div>
                <div><label for="pub-stage" class="block text-sm font-semibold text-gray-700 mb-2">Writing Stage *</label><select id="pub-stage" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"><option value="">Select Stage</option><option value="drafting">Drafting (1.0)</option><option value="revising">Revising (0.8)</option><option value="responding_reviewers">Responding to reviewers (0.9)</option><option value="proofing">Proofing (0.5)</option><option value="no_activity">No activity (0.0)</option></select></div>
                ${createOtherSpecifyBlock({
                  sectionKey: 'publications',
                  baseId: 'pub-index',
                  labelText: 'Indexing (descriptive only)',
                  optionsArray: PUBLICATION_INDEXING_OPTIONS,
                  valueKey: 'indexing_label',
                  otherTextKey: 'indexing_other_text',
                  specifyLabel: 'Specify',
                  specifyPlaceholder: 'Enter indexing details',
                  selectPlaceholder: 'Select indexing'
                })}
                ${createOtherSpecifyBlock({
                  sectionKey: 'publications',
                  baseId: 'pub-position',
                  labelText: 'Author Position (descriptive only)',
                  optionsArray: PUBLICATION_AUTHOR_POSITION_OPTIONS,
                  valueKey: 'author_position_label',
                  otherTextKey: 'author_position_other_text',
                  specifyLabel: 'Specify',
                  specifyPlaceholder: 'Enter author position details',
                  selectPlaceholder: 'Select author position'
                })}
                
                
                <div>
                  <label for="pub-status-select" class="block text-sm font-semibold text-gray-700 mb-2">Status (descriptive only)</label>
                  <select id="pub-status-select" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none">
                    <option value="">Select status</option>
                    ${PUBLICATION_STATUS_OPTIONS.map((option) => `<option value="${escapeHtml(option)}">${escapeHtml(option)}</option>`).join('')}
                  </select>
                  <div id="pub-status-other-wrap" class="mt-3 hidden">
                    <label for="pub-status-other" class="block text-sm font-semibold text-gray-700 mb-2">Specify</label>
                    <input id="pub-status-other" placeholder="Enter status details" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none">
                  </div>
                </div>
              </div>
              <div class="flex justify-end"><button type="submit" id="save-publication-btn" class="px-6 py-3 bg-sky-600 text-white rounded-lg font-semibold hover:bg-sky-700">Add</button></div>
            </form>
          </div>

          ${createSavedList({
            title: 'Your Publications Items',
            items: publications,
            renderItem: (item) => {
              const b = getPublicationEntryBreakdown(item);
              const descriptive = getPublicationDescriptiveMetadata(item);
              const statusMeta = getPublicationStatusMetadata(item);
              return `<div class="border border-gray-200 rounded-lg p-4 flex items-start justify-between gap-4"><div class="text-sm text-gray-700"><p>Item type: <strong>${escapeHtml(getPublicationItemTypeDisplay(item))}</strong></p><p>Writing stage: ${escapeHtml(item.pub_stage || '-')}</p><p>Indexing: ${escapeHtml(descriptive.indexing_display)}</p><p>Author position: ${escapeHtml(descriptive.author_position_display)}</p><p>Status: ${escapeHtml(statusMeta.status_display)}</p><p>Entry points: <strong>${b.entry_points.toFixed(2)}</strong></p></div><button onclick="deletePublication('${item.__backendId}')" class="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm font-semibold">Delete</button></div>`;
            }
          })}

          ${createNavigationRow({ previous: { id: 'research', label: 'Research' }, next: { id: 'administration', label: 'Administration' } })}
        </div>
      `;
    }

    function setupPublicationsEventListeners() {
      renderPublicationsLivePreview();
      const form = document.getElementById('publication-form');
      if (!form) return;

      const wirePublicationOtherToggle = ({ selectId, otherWrapId, otherInputId, otherValue }) => {
        const select = document.getElementById(selectId);
        const otherWrap = document.getElementById(otherWrapId);
        const otherInput = document.getElementById(otherInputId);
        if (!select || !otherWrap || !otherInput) return;

        const sync = () => {
          const show = select.value === otherValue;
          otherWrap.classList.toggle('hidden', !show);
          otherInput.required = show;
          if (!show) {
            otherInput.value = '';
          }
          renderPublicationsLivePreview();
        };

        select.addEventListener('change', sync);
        sync();
      };

      wireOtherSpecifyBlock({ baseId: 'pub-index', onToggle: renderPublicationsLivePreview });
      wireOtherSpecifyBlock({ baseId: 'pub-position', onToggle: renderPublicationsLivePreview });
      wirePublicationOtherToggle({ selectId: 'pub-type', otherWrapId: 'pub-type-other-wrap', otherInputId: 'pub-type-other', otherValue: 'other' });
      wirePublicationOtherToggle({ selectId: 'pub-status-select', otherWrapId: 'pub-status-other-wrap', otherInputId: 'pub-status-other', otherValue: 'Other' });

      form.querySelectorAll('input, select').forEach((field) => {
        field.addEventListener('input', renderPublicationsLivePreview);
        field.addEventListener('change', renderPublicationsLivePreview);
      });
    }

    function renderPublicationsLivePreview() {
      const saved = getRecordsBySection('publications');
      const savedTotal = Math.round(saved.reduce((sum, item) => sum + calculatePublicationScore(item), 0) * 100) / 100;
      const breakdown = getPublicationEntryBreakdown(getPublicationsDraftInputState());
      renderLivePreview({ sectionKey: 'publications', breakdown, equationText: `${breakdown.base_points} × ${breakdown.stage_weight}`, savedTotal });
    }

    async function savePublication(event) {
      event.preventDefault();
      if (allRecords.length >= 999) {
        showToast('Maximum limit of 999 records reached', 'error');
        return;
      }
      const btn = document.getElementById('save-publication-btn');
      const form = document.getElementById('publication-form');
      if (!form || !form.reportValidity()) return;
      const draft = getPublicationsDraftInputState();
      const breakdown = getPublicationEntryBreakdown(draft);
      const descriptive = getPublicationDescriptiveMetadata(draft);
      const statusMeta = getPublicationStatusMetadata(draft);
      const publicationData = {
        section: 'publications',
        ...draft,
        indexing_label: descriptive.indexing_label,
        author_position_label: descriptive.author_position_label,
        indexing_other_text: descriptive.indexing_other_text,
        author_position_other_text: descriptive.author_position_other_text,
        pub_status: statusMeta.status_label,
        pub_status_other_text: statusMeta.status_other_text,
        entry_points: breakdown.entry_points,
        created_at: new Date().toISOString()
      };
      btn.disabled = true;
      btn.innerHTML = '<div class="loading-spinner mx-auto"></div>';
      const result = await window.dataSdk.create(publicationData);
      btn.disabled = false;
      btn.innerHTML = 'Add';
      if (result.isOk) {
        showToast('Publication added successfully!');
        form.reset();
        renderSection('publications');
      } else {
        showToast('Failed to add publication', 'error');
      }
    }

    async function deletePublication(backendId) {
      const publication = allRecords.find(r => r.__backendId === backendId);
      if (!publication) return;
      const result = await window.dataSdk.delete(publication);
      if (result.isOk) {
        showToast('Publication deleted successfully!');
        renderPublicationsLivePreview();
      } else {
        showToast('Failed to delete publication', 'error');
      }
    }

    function getAdministrationDraftInputState() {
      const position = getOtherSpecifyValue({ baseId: 'admin-position', optionsArray: OTHER_SPECIFY_OPTIONS.administrationPosition });
      return {
        admin_position: position.selected,
        admin_other_position: position.other,
        admin_faculty: document.getElementById('admin-faculty')?.value || '',
        admin_start_date: document.getElementById('admin-start-date')?.value || '',
        admin_end_date: document.getElementById('admin-end-date')?.value || '',
        admin_has_allowance: document.getElementById('admin-has-allowance')?.checked || false,
        admin_allowance_amount: Number(document.getElementById('admin-allowance-amount')?.value || 0) || 0
      };
    }

    function renderAdministration() {
      const adminEntries = getRecordsBySection('administration');
      return `
        <div class="space-y-6">
          ${createCalculationPanel({
            sectionKey: 'administration',
            title: '🧮 Admin Leadership Workload',
            formula: 'entry_points = base_points × active_fraction',
            baseTableHtml: '<p><strong>Base points by position:</strong> Dean 20, Deputy Dean 15, Centre Director 12, Head of Programme 10, Postgraduate Coordinator 8, Programme Coordinator 6, Other 5</p>',
            factorTableHtml: '<p><strong>Active fraction:</strong> overlap_days ÷ reporting_days (clamped 0 to 1).</p>',
            workedExampleHtml: '<strong>Example:</strong> Head of Programme with 183 active days in a 366-day reporting period → 10 × (183/366) = 5.00 points.',
            notesHtml: '<p class="font-semibold mb-1">Notes</p><ul class="list-disc ml-5 space-y-1"><li>Points are prorated by active days within reporting period.</li><li>Allowance does not affect points.</li></ul>'
          })}

          <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 class="heading-font text-2xl font-bold mb-6">🏛️ Admin Leadership</h2>
            <form id="administration-form" onsubmit="saveAdministration(event)" class="space-y-6">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                ${createOtherSpecifyBlock({
                  sectionKey: 'administration',
                  baseId: 'admin-position',
                  labelText: 'Position',
                  optionsArray: OTHER_SPECIFY_OPTIONS.administrationPosition,
                  valueKey: 'admin_position',
                  otherTextKey: 'admin_other_position',
                  specifyLabel: 'Specify',
                  specifyPlaceholder: 'Enter leadership position details',
                  required: true,
                  selectPlaceholder: 'Select'
                })}
                <div><label for="admin-faculty" class="block text-sm font-semibold text-gray-700 mb-2">Unit/Faculty *</label><input id="admin-faculty" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"></div>
                <div><label for="admin-start-date" class="block text-sm font-semibold text-gray-700 mb-2">Start Date *</label><input id="admin-start-date" type="date" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"></div>
                <div><label for="admin-end-date" class="block text-sm font-semibold text-gray-700 mb-2">End Date</label><input id="admin-end-date" type="date" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"></div><div><label class="block text-sm font-semibold text-gray-700 mb-2">Receives allowance?</label><label class="inline-flex items-center gap-2"><input type="checkbox" id="admin-has-allowance"><span>Yes</span></label></div><div><label for="admin-allowance-amount" class="block text-sm font-semibold text-gray-700 mb-2">Allowance amount</label><input id="admin-allowance-amount" type="number" min="0" step="0.01" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"></div>
              </div>
              <div class="flex justify-end"><button type="submit" id="save-administration-btn" class="px-6 py-3 bg-sky-600 text-white rounded-lg font-semibold hover:bg-sky-700">Add</button></div>
            </form>
          </div>

          ${createSavedList({
            title: 'Your Admin Leadership Items',
            items: adminEntries,
            renderItem: (item) => {
              const b = getAdministrationEntryBreakdown(item);
              return `<div class="border border-gray-200 rounded-lg p-4 flex items-start justify-between gap-4"><div class="text-sm text-gray-700"><p><strong>${escapeHtml(getOtherSpecifyMetadata(item, 'admin_position', 'admin_other_position', OTHER_SPECIFY_OPTIONS.administrationPosition).display)}</strong></p><p>Start: ${escapeHtml(item.admin_start_date || '-')}</p><p>End: ${escapeHtml(item.admin_end_date || '-')}</p><p>Active fraction: ${b.active_fraction.toFixed(3)}</p><p>Entry points: <strong>${b.entry_points.toFixed(2)}</strong></p></div><button onclick="deleteAdministration('${item.__backendId}')" class="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm font-semibold">Delete</button></div>`;
            }
          })}

          ${createNavigationRow({ previous: { id: 'publications', label: 'Publications' }, next: { id: 'service', label: 'Service' } })}
        </div>
      `;
    }


    function renderAdministrationCombined() {
      return `
        <div class="space-y-6">
          <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <h2 class="heading-font text-2xl font-bold text-gray-900 mb-3">🏛️ Administration</h2>
            <div class="flex flex-wrap gap-2">
              <button type="button" data-admin-tab="leadership" class="px-4 py-2 bg-sky-100 text-sky-800 rounded-lg text-sm font-semibold">Admin Leadership</button>
              <button type="button" data-admin-tab="duties" class="px-4 py-2 bg-amber-100 text-amber-800 rounded-lg text-sm font-semibold">Admin Duties</button>
            </div>
          </div>
          <div id="administration-leadership-panel">${renderAdministration()}</div>
          <div id="administration-duties-panel">${renderAdminDuties()}</div>
        </div>
      `;
    }

    function setupAdministrationCombinedEventListeners() {
      setupAdministrationEventListeners();
      setupAdminDutiesEventListeners();
      document.querySelectorAll('[data-admin-tab]').forEach((button) => {
        button.addEventListener('click', () => {
          const panelId = button.getAttribute('data-admin-tab') === 'duties'
            ? 'administration-duties-panel'
            : 'administration-leadership-panel';
          document.getElementById(panelId)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
        });
      });
    }

    function setupAdministrationEventListeners() {
      renderAdministrationLivePreview();
      const form = document.getElementById('administration-form');
      if (!form) return;
      wireOtherSpecifyBlock({ baseId: 'admin-position' });
      form.querySelectorAll('input, select').forEach((field) => {
        field.addEventListener('input', renderAdministrationLivePreview);
        field.addEventListener('change', renderAdministrationLivePreview);
      });
    }

    function renderAdministrationLivePreview() {
      const saved = getRecordsBySection('administration');
      const savedTotal = Math.round(saved.reduce((sum, item) => sum + calculateAdministrationScore(item), 0) * 100) / 100;
      const breakdown = getAdministrationEntryBreakdown(getAdministrationDraftInputState());
      renderLivePreview({ sectionKey: 'administration', breakdown, equationText: `${breakdown.base_points} × ${breakdown.active_fraction.toFixed(3)}`, savedTotal });
    }

    async function saveAdministration(event) {
      event.preventDefault();
      if (allRecords.length >= 999) {
        showToast('Maximum limit of 999 records reached', 'error');
        return;
      }
      const btn = document.getElementById('save-administration-btn');
      const form = document.getElementById('administration-form');
      if (!form || !form.reportValidity()) return;
      const draft = getAdministrationDraftInputState();
      const breakdown = getAdministrationEntryBreakdown(draft);
      const administrationData = { section: 'administration', ...draft, entry_points: breakdown.entry_points, created_at: new Date().toISOString() };
      btn.disabled = true;
      btn.innerHTML = '<div class="loading-spinner mx-auto"></div>';
      const result = await window.dataSdk.create(administrationData);
      btn.disabled = false;
      btn.innerHTML = 'Add';
      if (result.isOk) {
        showToast('Administration role added successfully!');
        form.reset();
        renderSection('administration');
      } else {
        showToast('Failed to add administration role', 'error');
      }
    }

    async function deleteAdministration(backendId) {
      const admin = allRecords.find(r => r.__backendId === backendId);
      if (!admin) return;
      const result = await window.dataSdk.delete(admin);
      if (result.isOk) {
        showToast('Administration role deleted successfully!');
        renderAdministrationLivePreview();
      } else {
        showToast('Failed to delete administration role', 'error');
      }
    }

    function getAdminDutiesDraftInputState() {
      const dutyType = getOtherSpecifyValue({ baseId: 'duty-type', optionsArray: OTHER_SPECIFY_OPTIONS.adminDutyType });
      return {
        duty_type: dutyType.selected,
        duty_type_other_text: dutyType.other,
        duty_name: document.getElementById('duty-name')?.value || '',
        duty_frequency: document.getElementById('duty-frequency')?.value || '',
        duty_role: document.getElementById('duty-role')?.value || '',
        duty_appointment_level: document.getElementById('duty-appointment-level')?.value || '',
        duty_start_date: document.getElementById('duty-start-date')?.value || '',
        duty_end_date: document.getElementById('duty-end-date')?.value || ''
      };
    }

    function renderAdminDuties() {
      const duties = getRecordsBySection('admin_duties');
      return `
        <div class="space-y-6">
          ${createCalculationPanel({
            sectionKey: 'admin_duties',
            title: '🧮 Admin Duties Workload',
            formula: 'entry_points = base_points × frequency_factor',
            baseTableHtml: '<p><strong>Base points by duty type:</strong> Accreditation Work 8, Curriculum Development 6, Committee Chair 5, Event Organizer 4, Committee Member 2, Other 2</p>',
            factorTableHtml: '<p><strong>Frequency factors:</strong> Ongoing in reporting period 1.0, Per Semester 0.6, One-Time Event 0.3</p>',
            workedExampleHtml: '<strong>Example:</strong> Curriculum development done per semester → 6 × 0.6 = 3.60 points.',
            notesHtml: '<p class="font-semibold mb-1">Notes</p><ul class="list-disc ml-5 space-y-1"><li>Claim duties performed in the reporting period.</li><li>Do not split one duty into multiple duplicates to inflate points.</li></ul>'
          })}

          <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 class="heading-font text-2xl font-bold mb-6">📋 Admin Duties</h2>
            <form id="duty-form" onsubmit="saveAdminDuty(event)" class="space-y-6">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                ${createOtherSpecifyBlock({
                  sectionKey: 'admin_duties',
                  baseId: 'duty-type',
                  labelText: 'Duty Type',
                  optionsArray: OTHER_SPECIFY_OPTIONS.adminDutyType,
                  valueKey: 'duty_type',
                  otherTextKey: 'duty_type_other_text',
                  specifyLabel: 'Specify',
                  specifyPlaceholder: 'Enter duty type details',
                  required: true,
                  selectPlaceholder: 'Select'
                })}
                <div><label for="duty-role" class="block text-sm font-semibold text-gray-700 mb-2">Role *</label><select id="duty-role" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"><option value="">Select</option><option value="Chairperson">Chairperson</option><option value="Secretary">Secretary</option><option value="Member">Member</option><option value="Other">Other</option></select></div><div><label for="duty-frequency" class="block text-sm font-semibold text-gray-700 mb-2">Appointment duration *</label><select id="duty-frequency" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"><option value="">Select</option><option value="Full period">Full period</option><option value="Half period">Half period</option><option value="Short term">Short term</option></select></div><div><label for="duty-appointment-level" class="block text-sm font-semibold text-gray-700 mb-2">Appointment level *</label><select id="duty-appointment-level" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"><option value="University">University level</option><option value="Faculty">Faculty level</option><option value="Programme">Programme level</option></select></div>
                <div class="md:col-span-2"><label for="duty-name" class="block text-sm font-semibold text-gray-700 mb-2">Duty Name *</label><input id="duty-name" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"></div>
                <div><label for="duty-start-date" class="block text-sm font-semibold text-gray-700 mb-2">Start Date *</label><input id="duty-start-date" required type="date" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"><label for="duty-end-date" class="block text-sm font-semibold text-gray-700 mb-2 mt-3">End Date</label><input id="duty-end-date" type="date" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"></div>
              </div>
              <div class="flex justify-end"><button type="submit" id="save-duty-btn" class="px-6 py-3 bg-sky-600 text-white rounded-lg font-semibold hover:bg-sky-700">Add</button></div>
            </form>
          </div>

          ${createSavedList({
            title: 'Your Admin Duties Items',
            items: duties,
            renderItem: (item) => {
              const b = getAdminDutyEntryBreakdown(item);
              return `<div class="border border-gray-200 rounded-lg p-4 flex items-start justify-between gap-4"><div class="text-sm text-gray-700"><p>Duty type: <strong>${escapeHtml(getOtherSpecifyMetadata(item, 'duty_type', 'duty_type_other_text', OTHER_SPECIFY_OPTIONS.adminDutyType).display)}</strong></p><p>Frequency: ${escapeHtml(item.duty_frequency || '-')}</p><p>Entry points: <strong>${b.entry_points.toFixed(2)}</strong></p></div><button onclick="deleteAdminDuty('${item.__backendId}')" class="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm font-semibold">Delete</button></div>`;
            }
          })}

          ${createNavigationRow({ previous: { id: 'publications', label: 'Publications' }, next: { id: 'service', label: 'Service' } })}
        </div>
      `;
    }

    function setupAdminDutiesEventListeners() {
      renderAdminDutiesLivePreview();
      const form = document.getElementById('duty-form');
      if (!form) return;
      wireOtherSpecifyBlock({ baseId: 'duty-type' });
      form.querySelectorAll('input, select').forEach((field) => {
        field.addEventListener('input', renderAdminDutiesLivePreview);
        field.addEventListener('change', renderAdminDutiesLivePreview);
      });
    }

    function renderAdminDutiesLivePreview() {
      const saved = getRecordsBySection('admin_duties');
      const savedTotal = Math.round(saved.reduce((sum, item) => sum + calculateAdminDutyScore(item), 0) * 100) / 100;
      const breakdown = getAdminDutyEntryBreakdown(getAdminDutiesDraftInputState());
      renderLivePreview({ sectionKey: 'admin_duties', breakdown, equationText: `${breakdown.base_points} × ${breakdown.frequency_factor}`, savedTotal });
    }

    async function saveAdminDuty(event) {
      event.preventDefault();
      if (allRecords.length >= 999) {
        showToast('Maximum limit of 999 records reached', 'error');
        return;
      }
      const btn = document.getElementById('save-duty-btn');
      const form = document.getElementById('duty-form');
      if (!form || !form.reportValidity()) return;
      const draft = getAdminDutiesDraftInputState();
      const breakdown = getAdminDutyEntryBreakdown(draft);
      const dutyData = { section: 'admin_duties', ...draft, entry_points: breakdown.entry_points, created_at: new Date().toISOString() };
      btn.disabled = true;
      btn.innerHTML = '<div class="loading-spinner mx-auto"></div>';
      const result = await window.dataSdk.create(dutyData);
      btn.disabled = false;
      btn.innerHTML = 'Add';
      if (result.isOk) {
        showToast('Duty added successfully!');
        form.reset();
        renderSection('administration');
      } else {
        showToast('Failed to add duty', 'error');
      }
    }

    async function deleteAdminDuty(backendId) {
      const duty = allRecords.find(r => r.__backendId === backendId);
      if (!duty) return;
      const result = await window.dataSdk.delete(duty);
      if (result.isOk) {
        showToast('Duty deleted successfully!');
        renderAdminDutiesLivePreview();
      } else {
        showToast('Failed to delete duty', 'error');
      }
    }

    function getServiceDraftInputState() {
      const serviceType = getOtherSpecifyValue({ baseId: 'service-type', optionsArray: OTHER_SPECIFY_OPTIONS.serviceType });
      return {
        service_type: serviceType.selected,
        service_type_other_text: serviceType.other,
        service_scope: document.getElementById('service-scope')?.value || '',
        service_title: document.getElementById('service-title')?.value || '',
        service_organization: document.getElementById('service-organization')?.value || '',
        service_start_date: document.getElementById('service-start-date')?.value || '',
        service_end_date: document.getElementById('service-end-date')?.value || ''
      };
    }

    function getServiceDurationBand(durationHours) {
      const hours = Number(durationHours || 0);
      if (hours < 2) return 'Under 2 hours';
      if (hours <= 6) return '2 to 6 hours';
      if (hours <= 15) return '6 to 15 hours';
      return 'Over 15 hours';
    }

    function renderService() {
      const serviceItems = getRecordsBySection('service');
      return `
        <div class="space-y-6">
          ${createCalculationPanel({
            sectionKey: 'service',
            title: '🧮 Service Workload',
            formula: 'entry_points = base_points × duration_factor',
            baseTableHtml: '<p><strong>Base points by service type:</strong> Committee service 4, Community engagement 5, Expert contribution 6, Event support 3, Other 3</p>',
            factorTableHtml: '<p><strong>Duration band factors:</strong> Under 2 hours 0.5, 2 to 6 hours 1.0, 6 to 15 hours 1.5, Over 15 hours 2.0</p>',
            workedExampleHtml: '<strong>Example:</strong> Community engagement for 8 hours → 5 × 1.5 = 7.50 points.',
            notesHtml: '<p class="font-semibold mb-1">Notes</p><ul class="list-disc ml-5 space-y-1"><li>Scope such as international or national does not affect points.</li><li>Duration should reflect actual time spent in the reporting period.</li></ul>'
          })}

          <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 class="heading-font text-2xl font-bold mb-6">🤝 Service</h2>
            <form id="service-form" onsubmit="saveService(event)" class="space-y-6">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                ${createOtherSpecifyBlock({
                  sectionKey: 'service',
                  baseId: 'service-type',
                  labelText: 'Service Type',
                  optionsArray: OTHER_SPECIFY_OPTIONS.serviceType,
                  valueKey: 'service_type',
                  otherTextKey: 'service_type_other_text',
                  specifyLabel: 'Specify',
                  specifyPlaceholder: 'Enter service details',
                  required: true,
                  selectPlaceholder: 'Select'
                })}
                
                <div><label for="service-scope" class="block text-sm font-semibold text-gray-700 mb-2">Scope (descriptive only)</label><input id="service-scope" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"></div>
                <div><label for="service-start-date" class="block text-sm font-semibold text-gray-700 mb-2">Start Date *</label><input id="service-start-date" type="date" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"><label for="service-end-date" class="block text-sm font-semibold text-gray-700 mb-2 mt-3">End Date</label><input id="service-end-date" type="date" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"></div>
                <div class="md:col-span-2"><label for="service-title" class="block text-sm font-semibold text-gray-700 mb-2">Title *</label><input id="service-title" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"></div>
                <div class="md:col-span-2"><label for="service-organization" class="block text-sm font-semibold text-gray-700 mb-2">Organization *</label><input id="service-organization" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"></div>
              </div>
              <div class="flex justify-end"><button type="submit" id="save-service-btn" class="px-6 py-3 bg-sky-600 text-white rounded-lg font-semibold hover:bg-sky-700">Add</button></div>
            </form>
          </div>

          ${createSavedList({
            title: 'Your Service Items',
            items: serviceItems,
            renderItem: (item) => {
              const b = getServiceEntryBreakdown(item);
              return `<div class="border border-gray-200 rounded-lg p-4 flex items-start justify-between gap-4"><div class="text-sm text-gray-700"><p>Service type: <strong>${escapeHtml(getOtherSpecifyMetadata(item, 'service_type', 'service_type_other_text', OTHER_SPECIFY_OPTIONS.serviceType).display)}</strong></p><p>Duration hours: ${Number(item.service_duration || 0)}</p><p>Duration band: ${getServiceDurationBand(item.service_duration)}</p><p>Entry points: <strong>${b.entry_points.toFixed(2)}</strong></p></div><button onclick="deleteService('${item.__backendId}')" class="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm font-semibold">Delete</button></div>`;
            }
          })}

          ${createNavigationRow({ previous: { id: 'administration', label: 'Administration' }, next: { id: 'laboratory', label: 'Laboratory' } })}
        </div>
      `;
    }

    function setupServiceEventListeners() {
      renderServiceLivePreview();
      const form = document.getElementById('service-form');
      if (!form) return;
      wireOtherSpecifyBlock({ baseId: 'service-type' });
      form.querySelectorAll('input, select').forEach((field) => {
        field.addEventListener('input', renderServiceLivePreview);
        field.addEventListener('change', renderServiceLivePreview);
      });
    }

    function renderServiceLivePreview() {
      const saved = getRecordsBySection('service');
      const savedTotal = Math.round(saved.reduce((sum, item) => sum + calculateServiceScore(item), 0) * 100) / 100;
      const breakdown = getServiceEntryBreakdown(getServiceDraftInputState());
      renderLivePreview({ sectionKey: 'service', breakdown, equationText: `${breakdown.base_points} × ${breakdown.duration_factor}`, savedTotal });
    }

    async function saveService(event) {
      event.preventDefault();
      if (allRecords.length >= 999) {
        showToast('Maximum limit of 999 records reached', 'error');
        return;
      }
      const btn = document.getElementById('save-service-btn');
      const form = document.getElementById('service-form');
      if (!form || !form.reportValidity()) return;
      const draft = getServiceDraftInputState();
      const breakdown = getServiceEntryBreakdown(draft);
      const serviceData = { section: 'service', ...draft, entry_points: breakdown.entry_points, created_at: new Date().toISOString() };
      btn.disabled = true;
      btn.innerHTML = '<div class="loading-spinner mx-auto"></div>';
      const result = await window.dataSdk.create(serviceData);
      btn.disabled = false;
      btn.innerHTML = 'Add';
      if (result.isOk) {
        showToast('Service entry added successfully!');
        form.reset();
        renderSection('service');
      } else {
        showToast('Failed to add service entry', 'error');
      }
    }

    async function deleteService(backendId) {
      const service = allRecords.find(r => r.__backendId === backendId);
      if (!service) return;
      const result = await window.dataSdk.delete(service);
      if (result.isOk) {
        showToast('Service entry deleted successfully!');
        renderServiceLivePreview();
      } else {
        showToast('Failed to delete service entry', 'error');
      }
    }

    function getLaboratoryDraftInputState() {
      const responsibility = getOtherSpecifyValue({ baseId: 'lab-responsibility', optionsArray: OTHER_SPECIFY_OPTIONS.laboratoryResponsibility });
      return {
        lab_responsibility: responsibility.selected,
        lab_responsibility_other_text: responsibility.other,
        lab_name: document.getElementById('lab-name')?.value || '',
        lab_frequency: document.getElementById('lab-frequency')?.value || '',
        number_of_courses_supported: document.getElementById('number-of-courses-supported')?.value || 1,
        lab_start_date: document.getElementById('lab-start-date')?.value || '',
        lab_end_date: document.getElementById('lab-end-date')?.value || ''
      };
    }

    function renderLaboratory() {
      const labItems = getRecordsBySection('laboratory');
      return `
        <div class="space-y-6">
          ${createCalculationPanel({
            sectionKey: 'laboratory',
            title: '🧮 Laboratory Workload',
            formula: 'entry_points = base_points × frequency_factor × course_multiplier',
            baseTableHtml: '<p><strong>Base points by responsibility:</strong> Lab Coordinator 10, Safety Officer 8, Equipment Manager 7, Inventory Manager 6, SOP Development 5, Lab Supervisor 4, Other 3</p>',
            factorTableHtml: '<p><strong>Frequency factors:</strong> Ongoing within reporting period 1.0, Per semester occurrence 0.6, Per course supported 0.3</p>',
            workedExampleHtml: '<strong>Example:</strong> Equipment Manager per course for 3 courses → 7 × 0.3 × 3 = 6.30 points.',
            notesHtml: '<p class="font-semibold mb-1">Notes</p><ul class="list-disc ml-5 space-y-1"><li>Do not double count teaching contact time here.</li><li>Laboratory section captures technical support workload such as preparation, safety, and setup.</li></ul>'
          })}

          <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 class="heading-font text-2xl font-bold mb-6">🧪 Laboratory</h2>
            <form id="laboratory-form" onsubmit="saveLaboratory(event)" class="space-y-6">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                ${createOtherSpecifyBlock({
                  sectionKey: 'laboratory',
                  baseId: 'lab-responsibility',
                  labelText: 'Responsibility',
                  optionsArray: OTHER_SPECIFY_OPTIONS.laboratoryResponsibility,
                  valueKey: 'lab_responsibility',
                  otherTextKey: 'lab_responsibility_other_text',
                  specifyLabel: 'Specify',
                  specifyPlaceholder: 'Enter laboratory responsibility details',
                  required: true,
                  selectPlaceholder: 'Select'
                })}
                <div><label for="lab-frequency" class="block text-sm font-semibold text-gray-700 mb-2">Frequency *</label><select id="lab-frequency" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"><option value="">Select</option><option value="Ongoing within reporting period">Ongoing within reporting period</option><option value="Per semester occurrence">Per semester occurrence</option><option value="Per course supported">Per course supported</option></select></div>
                <div id="lab-course-count-wrap" class="hidden"><label for="number-of-courses-supported" class="block text-sm font-semibold text-gray-700 mb-2">Number of courses supported *</label><input id="number-of-courses-supported" type="number" min="1" step="1" value="1" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"></div>
                <div><label for="lab-start-date" class="block text-sm font-semibold text-gray-700 mb-2">Start Date *</label><input id="lab-start-date" required type="date" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"><label for="lab-end-date" class="block text-sm font-semibold text-gray-700 mb-2 mt-3">End Date</label><input id="lab-end-date" type="date" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"></div>
                <div class="md:col-span-2"><label for="lab-name" class="block text-sm font-semibold text-gray-700 mb-2">Laboratory / Context *</label><input id="lab-name" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"></div>
              </div>
              <div class="flex justify-end"><button type="submit" id="save-lab-btn" class="px-6 py-3 bg-sky-600 text-white rounded-lg font-semibold hover:bg-sky-700">Add</button></div>
            </form>
          </div>

          ${createSavedList({
            title: 'Your Laboratory Items',
            items: labItems,
            renderItem: (item) => {
              const b = getLabEntryBreakdown(item);
              const courseText = item.lab_frequency === 'Per course supported' ? ` | Courses supported: ${b.course_count}` : '';
              return `<div class="border border-gray-200 rounded-lg p-4 flex items-start justify-between gap-4"><div class="text-sm text-gray-700"><p>Responsibility: <strong>${escapeHtml(getOtherSpecifyMetadata(item, 'lab_responsibility', 'lab_responsibility_other_text', OTHER_SPECIFY_OPTIONS.laboratoryResponsibility).display)}</strong></p><p>Frequency: ${escapeHtml(item.lab_frequency || '-')} ${courseText}</p><p>Entry points: <strong>${b.entry_points.toFixed(2)}</strong></p></div><button onclick="deleteLaboratory('${item.__backendId}')" class="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm font-semibold">Delete</button></div>`;
            }
          })}

          ${createNavigationRow({ previous: { id: 'service', label: 'Service' }, next: { id: 'professional', label: 'Professional' } })}
        </div>
      `;
    }

    function setupLaboratoryEventListeners() {
      const form = document.getElementById('laboratory-form');
      if (!form) return;
      wireOtherSpecifyBlock({ baseId: 'lab-responsibility' });
      const toggle = () => {
        const perCourse = document.getElementById('lab-frequency')?.value === 'Per course supported';
        const wrap = document.getElementById('lab-course-count-wrap');
        if (wrap) wrap.classList.toggle('hidden', !perCourse);
        renderLaboratoryLivePreview();
      };
      form.querySelectorAll('input, select').forEach((field) => {
        field.addEventListener('input', toggle);
        field.addEventListener('change', toggle);
      });
      toggle();
    }

    function renderLaboratoryLivePreview() {
      const saved = getRecordsBySection('laboratory');
      const savedTotal = Math.round(saved.reduce((sum, item) => sum + calculateLabScore(item), 0) * 100) / 100;
      const breakdown = getLabEntryBreakdown(getLaboratoryDraftInputState());
      renderLivePreview({ sectionKey: 'laboratory', breakdown, equationText: `${breakdown.base_points} × ${breakdown.frequency_factor} × ${breakdown.course_count}`, savedTotal });
    }

    async function saveLaboratory(event) {
      event.preventDefault();
      if (allRecords.length >= 999) {
        showToast('Maximum limit of 999 records reached', 'error');
        return;
      }
      const btn = document.getElementById('save-lab-btn');
      const form = document.getElementById('laboratory-form');
      if (!form || !form.reportValidity()) return;
      const draft = getLaboratoryDraftInputState();
      const breakdown = getLabEntryBreakdown(draft);
      const labData = { section: 'laboratory', ...draft, entry_points: breakdown.entry_points, created_at: new Date().toISOString() };
      btn.disabled = true;
      btn.innerHTML = '<div class="loading-spinner mx-auto"></div>';
      const result = await window.dataSdk.create(labData);
      btn.disabled = false;
      btn.innerHTML = 'Add';
      if (result.isOk) {
        showToast('Laboratory item added successfully!');
        form.reset();
        renderSection('laboratory');
      } else {
        showToast('Failed to add laboratory item', 'error');
      }
    }

    async function deleteLaboratory(backendId) {
      const lab = allRecords.find(r => r.__backendId === backendId);
      if (!lab) return;
      const result = await window.dataSdk.delete(lab);
      if (result.isOk) {
        showToast('Laboratory item deleted successfully!');
        renderLaboratoryLivePreview();
      } else {
        showToast('Failed to delete laboratory item', 'error');
      }
    }

    function getProfessionalDraftInputState() {
      const profType = getOtherSpecifyValue({ baseId: 'prof-type', optionsArray: OTHER_SPECIFY_OPTIONS.professionalType });
      return {
        prof_type: profType.selected,
        prof_type_other_text: profType.other,

        prof_position: document.getElementById('prof-position')?.value || '',
        prof_scope: document.getElementById('prof-scope')?.value || '',
        prof_title: document.getElementById('prof-title')?.value || '',
        prof_organization: document.getElementById('prof-organization')?.value || '',
        prof_start_date: document.getElementById('prof-start-date')?.value || '',
        prof_end_date: document.getElementById('prof-end-date')?.value || '',
        prof_description: document.getElementById('prof-description')?.value || ''
      };
    }

    function renderProfessional() {
      const professionalItems = getRecordsBySection('professional');
      return `
        <div class="space-y-6">
          ${createCalculationPanel({
            sectionKey: 'professional',
            title: '🧮 Professional Workload',
            formula: 'entry_points = base_points × effort_factor',
            baseTableHtml: '<p><strong>Base points by activity type:</strong> Professional Body Leadership 10, Professional Certification 8, Conference Organizer 7, Editorial Board 6, Professional Training 5, Membership 2 (or 4 with assigned role), Other 3</p>',
            factorTableHtml: '<p><strong>Effort band factors:</strong> Low effort 0.5, Standard effort 1.0, High effort 1.5</p>',
            workedExampleHtml: '<strong>Example:</strong> Conference organizer with high effort → 7 × 1.5 = 10.50 points.',
            notesHtml: '<p class="font-semibold mb-1">Notes</p><ul class="list-disc ml-5 space-y-1"><li>Points represent workload effort in the reporting period.</li><li>Membership alone is low workload unless there is an assigned role.</li></ul>'
          })}

          <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 class="heading-font text-2xl font-bold mb-6">💼 Professional</h2>
            <form id="professional-form" onsubmit="saveProfessional(event)" class="space-y-6">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                ${createOtherSpecifyBlock({
                  sectionKey: 'professional',
                  baseId: 'prof-type',
                  labelText: 'Activity Type',
                  optionsArray: OTHER_SPECIFY_OPTIONS.professionalType,
                  valueKey: 'prof_type',
                  otherTextKey: 'prof_type_other_text',
                  specifyLabel: 'Specify',
                  specifyPlaceholder: 'Enter professional activity details',
                  required: true,
                  selectPlaceholder: 'Select'
                })}
                
                <div><label for="prof-position" class="block text-sm font-semibold text-gray-700 mb-2">Role/Position (optional)</label><input id="prof-position" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"></div>
                <div><label for="prof-scope" class="block text-sm font-semibold text-gray-700 mb-2">Scope (descriptive only)</label><input id="prof-scope" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"></div>
                <div class="md:col-span-2"><label for="prof-title" class="block text-sm font-semibold text-gray-700 mb-2">Activity Title *</label><input id="prof-title" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"></div>
                <div><label for="prof-organization" class="block text-sm font-semibold text-gray-700 mb-2">Organization *</label><input id="prof-organization" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"></div>
                <div><label for="prof-start-date" class="block text-sm font-semibold text-gray-700 mb-2">Start Date *</label><input id="prof-start-date" required type="date" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"><label for="prof-end-date" class="block text-sm font-semibold text-gray-700 mb-2 mt-3">End Date</label><input id="prof-end-date" type="date" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"></div>
                <div class="md:col-span-2"><label for="prof-description" class="block text-sm font-semibold text-gray-700 mb-2">Description</label><textarea id="prof-description" rows="2" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"></textarea></div>
              </div>
              <div class="flex justify-end"><button type="submit" id="save-professional-btn" class="px-6 py-3 bg-sky-600 text-white rounded-lg font-semibold hover:bg-sky-700">Add</button></div>
            </form>
          </div>

          ${createSavedList({
            title: 'Your Professional Items',
            items: professionalItems,
            renderItem: (item) => {
              const b = getProfessionalEntryBreakdown(item);
              return `<div class="border border-gray-200 rounded-lg p-4 flex items-start justify-between gap-4"><div class="text-sm text-gray-700"><p>Activity type: <strong>${escapeHtml(getOtherSpecifyMetadata(item, 'prof_type', 'prof_type_other_text', OTHER_SPECIFY_OPTIONS.professionalType).display)}</strong></p><p>Effort band: ${escapeHtml(item.prof_effort_band || '-')}</p><p>Entry points: <strong>${b.entry_points.toFixed(2)}</strong></p></div><button onclick="deleteProfessional('${item.__backendId}')" class="px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm font-semibold">Delete</button></div>`;
            }
          })}

          ${createNavigationRow({ previous: { id: 'laboratory', label: 'Laboratory' }, next: { id: 'assistants', label: 'Assistants' } })}
        </div>
      `;
    }

    function setupProfessionalEventListeners() {
      renderProfessionalLivePreview();
      const form = document.getElementById('professional-form');
      if (!form) return;
      wireOtherSpecifyBlock({ baseId: 'prof-type' });
      form.querySelectorAll('input, select, textarea').forEach((field) => {
        field.addEventListener('input', renderProfessionalLivePreview);
        field.addEventListener('change', renderProfessionalLivePreview);
      });
    }

    function renderProfessionalLivePreview() {
      const saved = getRecordsBySection('professional');
      const savedTotal = Math.round(saved.reduce((sum, item) => sum + calculateProfessionalScore(item), 0) * 100) / 100;
      const breakdown = getProfessionalEntryBreakdown(getProfessionalDraftInputState());
      renderLivePreview({ sectionKey: 'professional', breakdown, equationText: `${breakdown.base_points} × ${breakdown.active_fraction.toFixed(2)}`, savedTotal });
    }

    async function saveProfessional(event) {
      event.preventDefault();
      if (allRecords.length >= 999) {
        showToast('Maximum limit of 999 records reached', 'error');
        return;
      }
      const btn = document.getElementById('save-professional-btn');
      const form = document.getElementById('professional-form');
      if (!form || !form.reportValidity()) return;
      const draft = getProfessionalDraftInputState();
      const breakdown = getProfessionalEntryBreakdown(draft);
      const professionalData = { section: 'professional', ...draft, entry_points: breakdown.entry_points, created_at: new Date().toISOString() };
      btn.disabled = true;
      btn.innerHTML = '<div class="loading-spinner mx-auto"></div>';
      const result = await window.dataSdk.create(professionalData);
      btn.disabled = false;
      btn.innerHTML = 'Add';
      if (result.isOk) {
        showToast('Professional activity added successfully!');
        form.reset();
        renderSection('professional');
      } else {
        showToast('Failed to add professional activity', 'error');
      }
    }

    async function deleteProfessional(backendId) {
      const prof = allRecords.find(r => r.__backendId === backendId);
      if (!prof) return;
      const result = await window.dataSdk.delete(prof);
      if (result.isOk) {
        showToast('Professional activity deleted successfully!');
        renderProfessionalLivePreview();
      } else {
        showToast('Failed to delete professional activity', 'error');
      }
    }

    function renderAssistants() {
      const profile = getProfile();
      const scores = calculateScores();
      const combinedScore = scores.teaching + scores.supervision;

      if (!profile) {
        return `
        <div class="space-y-6">
          <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <div class="text-center py-12">
              <div class="text-6xl mb-4">👤</div>
              <h3 class="text-xl font-bold text-gray-900 mb-2">Profile Required</h3>
              <p class="text-gray-600 mb-6">Please create your staff profile first to check teaching assistant eligibility.</p>
              <button onclick="navigateToSection('profile')" class="px-6 py-3 bg-sky-600 text-white rounded-lg font-semibold hover:bg-sky-700">
                Go to Profile →
              </button>
            </div>
          </div>
          <div class="flex justify-between">
            <button onclick="navigateToSection('professional')" class="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300">
              ← Previous
            </button>
            <button onclick="navigateToSection('results')" class="px-6 py-3 bg-sky-600 text-white rounded-lg font-semibold hover:bg-sky-700">
              View Results →
            </button>
          </div>
        </div>
      `;
      }

      const categoryKey = normalizeProfileCategoryKey(profile.profile_category);
      const adminStatus = (profile.admin_status || '').toLowerCase();
      const isAcademicStaff = categoryKey === 'academic';

      if (!isAcademicStaff) {
        return `
        <div class="space-y-6">
          <div class="bg-blue-50 border border-blue-200 text-blue-900 rounded-xl p-4">
            <p class="font-semibold">Assistants eligibility is for Academic Staff only.</p>
            <p class="text-sm mt-1">Update Staff Category in Profile to Academic Staff to evaluate eligibility.</p>
          </div>
          <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 class="heading-font text-2xl font-bold mb-3">👨‍🏫 Assistants</h2>
            <p class="text-gray-700">Eligibility thresholds and scoring are not evaluated for non-academic staff.</p>
          </div>
          <div class="flex justify-between">
            <button onclick="navigateToSection('professional')" class="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300">
              ← Previous
            </button>
            <button onclick="navigateToSection('results')" class="px-6 py-3 bg-sky-600 text-white rounded-lg font-semibold hover:bg-sky-700">
              View Results →
            </button>
          </div>
        </div>
      `;
      }

      if (adminStatus !== 'admin' && adminStatus !== 'non_admin') {
        return `
        <div class="space-y-6">
          <div class="bg-amber-50 border border-amber-200 text-amber-900 rounded-xl p-4">
            <p class="font-semibold">Set Admin Status in Profile to evaluate Assistants eligibility.</p>
            <button onclick="navigateToSection('profile')" class="mt-3 px-4 py-2 bg-amber-600 text-white rounded-lg font-semibold hover:bg-amber-700">Go to Profile</button>
          </div>
          <div class="flex justify-between">
            <button onclick="navigateToSection('professional')" class="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300">
              ← Previous
            </button>
            <button onclick="navigateToSection('results')" class="px-6 py-3 bg-sky-600 text-white rounded-lg font-semibold hover:bg-sky-700">
              View Results →
            </button>
          </div>
        </div>
      `;
      }

      const TA_THRESHOLD_NON_ADMIN = 12;
      const TA_THRESHOLD_ADMIN = 6;
      const required = adminStatus === 'admin' ? TA_THRESHOLD_ADMIN : TA_THRESHOLD_NON_ADMIN;
      const isQualified = combinedScore >= required;
      const staffType = adminStatus === 'admin' ? 'Admin Academic Staff' : 'Non-Admin Academic Staff';

      return `
        <div class="space-y-6">
          <div class="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl shadow-sm border-2 border-indigo-200 p-6">
            <h3 class="font-bold text-lg text-indigo-900 mb-3">🧮 Teaching Assistant Eligibility Criteria</h3>
            <div class="bg-white rounded-lg p-4 mb-4">
              <p class="text-sm text-gray-700 mb-3"><strong>Eligibility Score = Teaching Score + Supervision Score</strong></p>
              <div class="text-xs text-gray-600 space-y-2">
                <p><strong>Qualification Thresholds:</strong></p>
                <p>• <strong>Non-Admin Academic Staff:</strong> ≥ ${TA_THRESHOLD_NON_ADMIN} points</p>
                <p>• <strong>Admin Academic Staff:</strong> ≥ ${TA_THRESHOLD_ADMIN} points</p>
              </div>
            </div>
          </div>

          <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 class="heading-font text-2xl font-bold mb-6">👨‍🏫 Your Teaching Assistant Eligibility</h2>
            <div class="bg-gray-50 rounded-lg p-5 mb-6">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div><div class="text-sm font-semibold text-gray-600 mb-1">Staff Name</div><div class="text-lg font-bold text-gray-900">${profile.profile_name}</div></div>
                <div><div class="text-sm font-semibold text-gray-600 mb-1">Staff Category</div><div class="text-lg font-bold text-gray-900">${staffType}</div></div>
              </div>
            </div>
            <div class="bg-gradient-to-r ${isQualified ? 'from-green-500 to-emerald-500' : 'from-red-500 to-rose-500'} rounded-xl shadow-lg p-8 text-white text-center">
              <div class="text-6xl mb-4">${isQualified ? '✅' : '❌'}</div>
              <h3 class="text-3xl font-bold mb-2">${isQualified ? 'QUALIFIED' : 'NOT QUALIFIED'}</h3>
              <p class="text-lg mb-4">for Teaching Assistant Allocation</p>
              <div class="bg-white bg-opacity-20 rounded-lg p-4 inline-block">
                <div class="text-sm mb-1">Your Score vs Required Threshold</div>
                <div class="text-3xl font-bold">${combinedScore.toFixed(2)} / ${required.toFixed(2)}</div>
              </div>
            </div>
          </div>

          <div class="flex justify-between">
            <button onclick="navigateToSection('professional')" class="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300">
              ← Previous
            </button>
            <button onclick="navigateToSection('results')" class="px-6 py-3 bg-sky-600 text-white rounded-lg font-semibold hover:bg-sky-700">
              View Results →
            </button>
          </div>
        </div>
      `;
    }

    function formatResultDate(value) {
      if (!value) return 'Not set';
      const parsed = new Date(value);
      if (Number.isNaN(parsed.getTime())) return 'Invalid date';
      return parsed.toLocaleDateString();
    }

    function getResultsSectionDefinitions(scores) {
      const administrationRecords = [...getRecordsBySection('administration'), ...getRecordsBySection('admin_duties')];
      return [
        { id: 'teaching', label: 'Teaching', icon: '📚', score: scores.teaching, color: 'blue', unitLabel: 'entries', records: getRecordsBySection('teaching') },
        { id: 'supervision', label: 'Supervision', icon: '🧑‍🏫', score: scores.supervision, color: 'purple', unitLabel: 'entries', records: getRecordsBySection('supervision') },
        { id: 'research', label: 'Research', icon: '🔬', score: scores.research, color: 'green', unitLabel: 'entries', records: getRecordsBySection('research') },
        { id: 'publications', label: 'Publications', icon: '📝', score: scores.publications, color: 'indigo', unitLabel: 'entries', records: getRecordsBySection('publications') },
        { id: 'administration', label: 'Administration', icon: '🏛️', score: (scores.adminLeadership + scores.adminDuties), color: 'rose', unitLabel: 'entries', records: administrationRecords },
        { id: 'service', label: 'Service', icon: '🤝', score: scores.service, color: 'cyan', unitLabel: 'entries', records: getRecordsBySection('service') },
        { id: 'laboratory', label: 'Laboratory', icon: '🧪', score: scores.laboratory, color: 'teal', unitLabel: 'entries', records: getRecordsBySection('laboratory') },
        { id: 'professional', label: 'Professional', icon: '💼', score: scores.professional, color: 'violet', unitLabel: 'entries', records: getRecordsBySection('professional') }
      ].map((section) => ({ ...section, count: section.records.length }));
    }

    function getSectionEntryBreakdown(sectionId, entry) {
      if (sectionId === 'teaching') {
        const b = getTeachingCourseBreakdown(entry);
        return { ...b, entry_points: b.course_points };
      }
      if (sectionId === 'supervision') return getSupervisionEntryBreakdown(entry);
      if (sectionId === 'research') return getResearchEntryBreakdown(entry);
      if (sectionId === 'publications') return getPublicationEntryBreakdown(entry);
      if (sectionId === 'administration') return entry.section === 'admin_duties' ? getAdminDutyEntryBreakdown(entry) : getAdministrationEntryBreakdown(entry);
      if (sectionId === 'admin_duties') return getAdminDutyEntryBreakdown(entry);
      if (sectionId === 'service') return getServiceEntryBreakdown(entry);
      if (sectionId === 'laboratory') return getLabEntryBreakdown(entry);
      if (sectionId === 'professional') return getProfessionalEntryBreakdown(entry);
      return { entry_points: 0, is_counted: false };
    }

    function getSectionEntryTitle(sectionId, entry, index) {
      const fallback = `Entry ${index + 1}`;
      const titleBySection = {
        teaching: entry.course_code || entry.course_name,
        supervision: entry.student_name || entry.student_title,
        research: entry.research_title,
        publications: entry.pub_title,
        administration: entry.section === 'admin_duties' ? (entry.duty_name || entry.duty_type) : entry.admin_position,
        admin_duties: entry.duty_name || entry.duty_type,
        service: entry.service_title || entry.service_type,
        laboratory: entry.lab_name || entry.lab_responsibility,
        professional: entry.prof_title || entry.prof_type
      };
      return titleBySection[sectionId] || fallback;
    }

    function renderResultsSummary(profile, scores, normalized, status, sections) {
      const indexMetrics = getWorkloadIndexMetrics(scores.total);
      const categoryKey = normalizeProfileCategoryKey(profile?.profile_category || '');
      const isAcademic = categoryKey === 'academic';
      const startDate = profile?.reporting_start_date;
      const endDate = profile?.reporting_end_date;
      const start = startDate ? new Date(startDate) : null;
      const end = endDate ? new Date(endDate) : null;
      const hasValidPeriod = start && end && !Number.isNaN(start.getTime()) && !Number.isNaN(end.getTime()) && end >= start;
      const periodDays = hasValidPeriod ? Math.floor((end - start) / (1000 * 60 * 60 * 24)) + 1 : 0;
      const periodWeeks = hasValidPeriod ? (periodDays / 7).toFixed(2) : '0.00';
      const totalEntries = sections.reduce((sum, section) => sum + section.count, 0);
      const summaryRows = [
        {
          section: 'Profile',
          label: 'Staff name',
          value: escapeHtml(profile?.profile_name || 'Not provided')
        },
        {
          section: 'Profile',
          label: 'Staff category',
          value: escapeHtml(getProfileCategoryLabel(profile?.profile_category || '') || 'Not provided')
        },
        {
          section: 'Profile',
          label: 'Admin status',
          value: escapeHtml(isAcademic ? (profile?.admin_status || 'Not provided') : 'Not applicable')
        },
        {
          section: 'Reporting period',
          label: 'Reporting period',
          value: `${formatResultDate(startDate)} to ${formatResultDate(endDate)}${hasValidPeriod ? ` <span class="text-xs text-gray-500">(${periodDays} days / ${periodWeeks} weeks)</span>` : ''}`,
          isPeriodRow: true,
          hasWarning: !hasValidPeriod
        },
        {
          section: 'Reporting period',
          label: 'Generated on',
          value: escapeHtml(new Date().toLocaleString())
        },
        {
          section: 'Totals',
          label: 'Total entries',
          value: escapeHtml(String(totalEntries))
        },
        {
          section: 'Totals',
          label: 'Workload Index',
          value: `${indexMetrics.displayIndexValue.toFixed(2)} / ${WORKLOAD_INDEX_MAX}`
        },
        {
          section: 'Totals',
          label: 'Total score',
          value: `${normalized.finalScore.toFixed(2)} <span class="text-xs text-gray-500">(normalized)</span>`
        },
        {
          section: 'Totals',
          label: 'Status',
          value: `${escapeHtml(status.label)} ${status.icon}`
        }
      ];

      if (!hasValidPeriod) {
        summaryRows.sort((a, b) => Number(Boolean(b.isPeriodRow)) - Number(Boolean(a.isPeriodRow)));
      }

      const groupedRows = summaryRows.reduce((acc, row) => {
        if (!acc[row.section]) acc[row.section] = [];
        acc[row.section].push(row);
        return acc;
      }, {});
      const sectionOrder = hasValidPeriod ? ['Profile', 'Reporting period', 'Totals'] : ['Reporting period', 'Profile', 'Totals'];

      return `
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 class="heading-font text-2xl font-bold mb-5 text-gray-900">📋 Executive Summary</h3>
          <div class="grid grid-cols-1 lg:grid-cols-3 gap-4 text-sm">
            ${sectionOrder.map((sectionName) => `
              <div class="border border-gray-200 rounded-lg overflow-hidden">
                <div class="px-4 py-2.5 bg-gray-50 border-b border-gray-200 text-xs font-semibold tracking-wide uppercase text-gray-600">${escapeHtml(sectionName)}</div>
                <div class="divide-y divide-gray-100">
                  ${(groupedRows[sectionName] || []).map((row) => `
                    <div class="grid grid-cols-[minmax(0,1fr)_minmax(0,1.3fr)] gap-3 px-4 py-2.5 items-start">
                      <div class="text-gray-600 font-medium flex items-center gap-2">
                        <span>${escapeHtml(row.label)}</span>
                        ${row.hasWarning ? '<span class="inline-flex items-center rounded-full bg-amber-100 text-amber-800 text-[10px] font-semibold px-2 py-0.5">Check</span>' : ''}
                      </div>
                      <div class="text-gray-900 font-semibold text-right break-words">${row.value}</div>
                    </div>
                  `).join('')}
                </div>
              </div>
            `).join('')}
          </div>
          <div class="mt-5 border border-gray-200 rounded-lg p-4">
            <div class="flex items-center justify-between mb-2">
              <p class="text-xs font-semibold uppercase tracking-wide text-gray-600">Workload Index scale</p>
              <p class="text-sm font-semibold text-gray-900">${indexMetrics.displayIndexValue.toFixed(2)} / ${WORKLOAD_INDEX_MAX}</p>
            </div>
            <div class="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div class="h-full bg-sky-600" style="width: ${indexMetrics.fillPercent.toFixed(2)}%"></div>
            </div>
            <div class="mt-2 flex justify-between text-[11px] text-gray-500"><span>0</span><span>20</span><span>35</span><span>50</span></div>
            <div class="mt-3 grid grid-cols-1 md:grid-cols-2 gap-2 text-xs text-gray-700">
              <p><strong>Light:</strong> 0 to 19</p>
              <p><strong>Moderate:</strong> 20 to 34</p>
              <p><strong>Balanced:</strong> 35 to 49</p>
              <p><strong>Overloaded:</strong> 50 plus</p>
            </div>
            <div class="mt-3 bg-slate-50 border border-slate-200 rounded-md p-3 text-xs text-gray-700">
              <p class="font-semibold text-gray-900 mb-1">Recommendation</p>
              <p>${status.label === 'Overloaded' ? 'Review commitments and rebalance duties to reduce current load.' : status.label === 'Balanced' ? 'Maintain your current distribution and monitor upcoming additions.' : status.label === 'Moderate' ? 'Monitor trend and rebalance if additional duties are expected.' : 'Capacity appears available; plan upcoming assignments carefully.'}</p>
            </div>
          </div>
        </div>
      `;
    }

    function renderSectionBreakdownTiles(sections) {
      return `
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 class="heading-font text-2xl font-bold mb-2">Score Breakdown by Category</h3>
          <p class="text-sm text-gray-600 mb-5">Select a category to review saved entries and points details.</p>
          <div class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            ${sections.map((section) => `
              <button onclick="openSectionDrilldown('${section.id}')" class="text-left bg-white rounded-lg p-4 border border-gray-200 border-l-4 border-l-${section.color}-500 hover:shadow-md transition min-h-[132px] flex flex-col justify-between">
                <div>
                  <div class="text-sm font-semibold text-gray-700 mb-1">${section.icon} ${section.label}</div>
                  <div class="text-2xl font-bold text-${section.color}-600 leading-tight">${section.score.toFixed(2)}</div>
                  <div class="text-xs text-gray-500 mt-2">${section.count} ${section.unitLabel}</div>
                </div>
                <div class="text-xs text-gray-400 mt-3">View details →</div>
              </button>
            `).join('')}
          </div>
        </div>
      `;
    }

    function renderSmartRadarPanel(normalized) {
      const chart = renderRadarChart([{ label: 'Individual', achievements: normalized.achievements }]);
      const warnings = Object.entries(normalized.overloadFlags || {}).filter(([,v]) => v.overload);
      return `<div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6"><h3 class="heading-font text-2xl font-bold mb-3 text-gray-900">📡 SMART Radar (Achievements)</h3><div class="text-xs text-gray-600 mb-3">Axes: Teaching, Supervision, Research, Publications, Administration, Laboratory, Service, Professional.</div>${chart}${warnings.length ? `<div class=\"mt-3 p-3 bg-amber-50 border border-amber-200 rounded text-xs text-amber-800\"><strong>Overload warnings (no score penalty):</strong><ul class=\"list-disc ml-5 mt-1\">${warnings.map(([k,v])=>`<li>${k}: raw ${v.rawValue.toFixed(2)} > benchmark ${v.benchmarkValue.toFixed(2)} (${v.overloadPercent.toFixed(1)}%)</li>`).join('')}</ul></div>` : ''}</div><p class="text-xs text-gray-500 mt-3">Note: Some sections may have zero weight depending on staff category.</p></div>`;
    }

    function renderRadarChart(dataset = []) {
      const axes = ['Teaching', 'Supervision', 'Research', 'Publications', 'Administration', 'Laboratory', 'Service', 'Professional'];
      const cx = 180; const cy = 180; const radius = 130;
      const points = axes.map((axis, idx) => {
        const angle = ((Math.PI * 2) / axes.length) * idx - (Math.PI / 2);
        const value = Math.max(0, Math.min(100, Number((dataset[0]?.achievements?.[axis] || 0) * 100)));
        const r = (value / 100) * radius;
        return { axis, value, x: cx + (Math.cos(angle) * r), y: cy + (Math.sin(angle) * r), lx: cx + Math.cos(angle) * (radius + 20), ly: cy + Math.sin(angle) * (radius + 20) };
      });
      const polygon = points.map((p) => `${p.x},${p.y}`).join(' ');
      return `<div class="w-full overflow-x-auto"><svg viewBox="0 0 360 360" class="w-full max-w-xl mx-auto">
        <circle cx="${cx}" cy="${cy}" r="${radius}" fill="none" stroke="#cbd5e1" />
        ${points.map((p) => `<line x1="${cx}" y1="${cy}" x2="${p.lx}" y2="${p.ly}" stroke="#e2e8f0"/>`).join('')}
        <polygon points="${polygon}" fill="rgba(14,165,233,0.25)" stroke="#0284c7" stroke-width="2"/>
        ${points.map((p)=>`<text x="${p.lx}" y="${p.ly}" font-size="9" text-anchor="middle" fill="#334155">${p.axis} ${p.value.toFixed(0)}%</text>`).join('')}
      </svg></div>`;
    }

    function renderSmartSettingsPanel(normalized, profile) {
      const role = String(parseProfileState(profile, false)?.userRole || '').toLowerCase();
      const canEdit = normalized.configSnapshot.adminConfig.allowBenchmarkEditRoles.includes(role);
      if (!canEdit) return '';
      const b = normalized.configSnapshot.sectionBenchmarks;
      const locked = normalized.configSnapshot.adminConfig.isBenchmarkLocked;
      const activeCategory = normalizeProfileCategoryKey(profile?.profile_category || '') || 'academic';
      const activeWeights = normalized.activeWeights || getActiveSectionWeights(profile, normalized.configSnapshot);
      const editableWeights = ['Teaching', 'Supervision', 'Research', 'Publications', 'Administration', 'Laboratory', 'Service', 'Professional'];
      return `<div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6"><h3 class="heading-font text-xl font-bold mb-4">⚙️ Settings (SMART Benchmarks & Weights)</h3><p class="text-xs text-gray-600 mb-3">Weight editing defaults to active staff category: <strong>${escapeHtml(activeCategory)}</strong>.</p><div class="grid grid-cols-1 md:grid-cols-2 gap-4">${Object.entries(b).map(([k,v])=>`<label class="text-sm"><span class="block text-gray-600 mb-1">${k}</span><input data-benchmark-key="${k}" type="number" step="0.1" value="${v}" ${locked ? 'disabled' : ''} class="w-full px-3 py-2 border border-gray-300 rounded"></label>`).join('')}</div><div class="mt-4 border-t pt-4"><h4 class="font-semibold text-sm mb-2">Section weights (${escapeHtml(activeCategory)})</h4><div class="grid grid-cols-1 md:grid-cols-2 gap-3">${editableWeights.map((k)=>`<label class="text-sm"><span class="block text-gray-600 mb-1">${k}</span><input data-weight-key="${k}" type="number" step="0.01" min="0" max="1" value="${Number(activeWeights[k] || 0)}" class="w-full px-3 py-2 border border-gray-300 rounded"></label>`).join('')}</div></div><div class="mt-3 flex items-center gap-3"><label class="inline-flex items-center gap-2"><input type="checkbox" id="benchmark-lock-toggle" ${locked ? 'checked' : ''}><span>Lock benchmark editing</span></label><button onclick="saveSmartBenchmarks()" class="px-4 py-2 bg-sky-600 text-white rounded-lg">Save Settings</button></div><p class="text-xs text-gray-500 mt-2">Version: ${escapeHtml(normalized.configSnapshot.lastUpdatedAt || '-')} by ${escapeHtml(normalized.configSnapshot.lastUpdatedBy || '-')}</p></div>`;
    }

    async function saveSmartBenchmarks() {
      const config = readSmartConfig();
      const inputs = Array.from(document.querySelectorAll('[data-benchmark-key]'));
      const sectionBenchmarks = { ...config.sectionBenchmarks };
      inputs.forEach((el) => { sectionBenchmarks[el.dataset.benchmarkKey] = Number(el.value || 0); });

      const activeCategory = normalizeProfileCategoryKey(getProfile()?.profile_category || '') || 'academic';
      const weightInputs = Array.from(document.querySelectorAll('[data-weight-key]'));
      const sectionWeightsByStaffCategory = {
        ...(config.sectionWeightsByStaffCategory || CONFIG_SMART.sectionWeightsByStaffCategory),
        [activeCategory]: {
          ...((config.sectionWeightsByStaffCategory || CONFIG_SMART.sectionWeightsByStaffCategory)[activeCategory] || {})
        }
      };
      weightInputs.forEach((el) => {
        sectionWeightsByStaffCategory[activeCategory][el.dataset.weightKey] = Number(el.value || 0);
      });

      const isLocked = Boolean(document.getElementById('benchmark-lock-toggle')?.checked);
      writeSmartConfig({ ...config, sectionBenchmarks, sectionWeightsByStaffCategory, adminConfig: { ...config.adminConfig, isBenchmarkLocked: isLocked } }, (getProfile()?.profile_name || 'unknown'));
      showToast('SMART settings saved');
      renderSection('results');
    }

    function renderSectionDrilldownModal() {
      return `
        <div id="results-drilldown-modal" class="hidden fixed inset-0 bg-black/40 z-40 p-4">
          <div class="max-w-3xl mx-auto mt-8 bg-white rounded-xl shadow-xl border border-gray-200 max-h-[80vh] overflow-hidden flex flex-col">
            <div class="px-5 py-4 border-b border-gray-200 flex items-center justify-between">
              <h4 id="results-drilldown-title" class="font-bold text-gray-900 text-lg">Section details</h4>
              <button onclick="closeSectionDrilldown()" class="px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 text-sm font-semibold">Close</button>
            </div>
            <div id="results-drilldown-body" class="p-5 overflow-y-auto"></div>
          </div>
        </div>
      `;
    }

    function openSectionDrilldown(sectionId) {
      const modal = document.getElementById('results-drilldown-modal');
      const title = document.getElementById('results-drilldown-title');
      const body = document.getElementById('results-drilldown-body');
      if (!modal || !title || !body) return;

      const scores = calculateScores();
      const sections = getResultsSectionDefinitions(scores);
      const section = sections.find((item) => item.id === sectionId);
      if (!section) return;

      title.textContent = `${section.icon} ${section.label} entries`;
      if (!section.records.length) {
        body.innerHTML = '<p class="text-sm text-gray-600">No entries recorded.</p>';
      } else {
        body.innerHTML = section.records.map((entry, index) => {
          const breakdown = getSectionEntryBreakdown(section.id, entry);
          const points = Number(breakdown.entry_points);
          const breakdownRows = Object.entries(breakdown)
            .filter(([key]) => key !== 'entry_points')
            .map(([key, value]) => `<li><span class="font-medium">${escapeHtml(key.replace(/_/g, ' '))}:</span> ${escapeHtml(String(value))}</li>`)
            .join('');
          return `
            <div class="border border-gray-200 rounded-lg p-4 mb-3">
              <div class="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                <div>
                  <p class="font-semibold text-gray-900">${escapeHtml(getSectionEntryTitle(section.id, entry, index))}</p>
                  <p class="text-sm text-gray-600">Computed points: <strong>${Number.isFinite(points) ? points.toFixed(2) : 'Missing'}</strong></p>
                </div>
                <div class="flex gap-2">
                  <button onclick="toggleDrilldownDetails('${section.id}-${index}')" class="px-3 py-2 bg-gray-100 rounded-lg text-sm font-semibold hover:bg-gray-200">View details</button>
                  <button onclick="jumpToSectionFromResults('${section.id}')" class="px-3 py-2 bg-sky-600 text-white rounded-lg text-sm font-semibold hover:bg-sky-700">Jump to section</button>
                </div>
              </div>
              <div id="drilldown-detail-${section.id}-${index}" class="hidden mt-3 text-xs text-gray-700 bg-gray-50 border border-gray-200 rounded-lg p-3">
                <ul class="space-y-1">${breakdownRows}</ul>
              </div>
            </div>
          `;
        }).join('');
      }

      modal.classList.remove('hidden');
    }

    function closeSectionDrilldown() {
      const modal = document.getElementById('results-drilldown-modal');
      if (modal) modal.classList.add('hidden');
    }

    function toggleDrilldownDetails(detailId) {
      const detail = document.getElementById(`drilldown-detail-${detailId}`);
      if (!detail) return;
      detail.classList.toggle('hidden');
    }

    function jumpToSectionFromResults(sectionId) {
      closeSectionDrilldown();
      navigateToSection(sectionId);
    }

    function renderCompositionBlock(sections, totalScore) {
      const normalizedTotal = totalScore > 0 ? totalScore : 0;
      return `
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 class="heading-font text-xl font-bold mb-4">Workload Composition</h3>
          <div class="w-full h-3 rounded-full overflow-hidden bg-slate-100 flex mb-4 border border-slate-200">
            ${sections.map((section) => {
              const pct = normalizedTotal > 0 ? (section.score / normalizedTotal) * 100 : 0;
              return `<div class="h-full bg-${section.color}-400/80" style="width:${pct.toFixed(2)}%" title="${escapeHtml(section.label)} ${pct.toFixed(2)}%"></div>`;
            }).join('')}
          </div>
          <div class="overflow-x-auto">
            <table class="min-w-full text-sm">
              <thead>
                <tr class="text-left border-b border-gray-200 text-gray-600">
                  <th class="py-2 pr-3">Section</th><th class="py-2 pr-3 text-right">Total points</th><th class="py-2 pr-3 text-right">Entries</th><th class="py-2 pr-3 text-right">Avg/entry</th><th class="py-2 text-right">% of total</th>
                </tr>
              </thead>
              <tbody>
                ${sections.map((section) => {
                  const pct = normalizedTotal > 0 ? (section.score / normalizedTotal) * 100 : 0;
                  const avg = section.count > 0 ? section.score / section.count : 0;
                  return `<tr class="border-b border-gray-100 even:bg-gray-50/70"><td class="py-1.5 pr-3">${section.icon} ${escapeHtml(section.label)}</td><td class="py-1.5 pr-3 text-right tabular-nums">${section.score.toFixed(2)}</td><td class="py-1.5 pr-3 text-right tabular-nums">${Number(section.count).toFixed(2)}</td><td class="py-1.5 pr-3 text-right tabular-nums">${avg.toFixed(2)}</td><td class="py-1.5 text-right tabular-nums">${pct.toFixed(2)}%</td></tr>`;
                }).join('')}
              </tbody>
            </table>
          </div>
        </div>
      `;
    }

    function runDataChecks(profile, sections, totalScore) {
      const checks = [];
      const hasProfile = Boolean(profile?.profile_name && profile?.profile_category);
      const startDate = profile?.reporting_start_date ? new Date(profile.reporting_start_date) : null;
      const endDate = profile?.reporting_end_date ? new Date(profile.reporting_end_date) : null;
      const validDates = Boolean(
        startDate &&
        endDate &&
        !Number.isNaN(startDate.getTime()) &&
        !Number.isNaN(endDate.getTime()) &&
        endDate >= startDate
      );

      checks.push({
        label: 'Profile and reporting period',
        status: hasProfile && validDates ? 'ok' : 'warning',
        message: hasProfile && validDates ? 'Profile and reporting period dates are recorded.' : 'Profile fields or reporting period dates need verification.'
      });

      const emptySections = sections.filter((section) => section.count === 0).map((section) => section.label);
      checks.push({
        label: 'Sections with zero entries',
        status: emptySections.length ? 'warning' : 'ok',
        message: emptySections.length ? `No entries recorded in: ${emptySections.join(', ')}.` : 'All sections include at least one entry.'
      });

      const invalidPoints = [];
      sections.forEach((section) => {
        section.records.forEach((entry, index) => {
          const breakdown = getSectionEntryBreakdown(section.id, entry);
          const points = Number(breakdown.entry_points);
          if (!Number.isFinite(points)) {
            invalidPoints.push(`${section.label} — ${getSectionEntryTitle(section.id, entry, index)}`);
          }
        });
      });
      checks.push({
        label: 'Missing or invalid points',
        status: invalidPoints.length ? 'warning' : 'ok',
        message: invalidPoints.length ? `Review entries: ${invalidPoints.join('; ')}.` : 'No missing or invalid points detected.'
      });

      const outliers = [];
      if (totalScore > 0) {
        sections.forEach((section) => {
          section.records.forEach((entry, index) => {
            const breakdown = getSectionEntryBreakdown(section.id, entry);
            const points = Number(breakdown.entry_points);
            if (Number.isFinite(points) && points / totalScore > 0.25) {
              outliers.push(`${section.label} — ${getSectionEntryTitle(section.id, entry, index)} (${points.toFixed(2)} points)`);
            }
          });
        });
      }
      checks.push({
        label: 'Outlier entries (>25% of total)',
        status: outliers.length ? 'warning' : 'ok',
        message: outliers.length ? `Review high-share entries: ${outliers.join('; ')}.` : 'No single entry exceeds 25% of total workload score.'
      });

      const teachingCount = sections.find((section) => section.id === 'teaching')?.count || 0;
      const labCount = sections.find((section) => section.id === 'laboratory')?.count || 0;
      if (teachingCount > 0 && labCount > 0) {
        checks.push({
          label: 'Teaching and Laboratory overlap reminder',
          status: 'warning',
          message: 'Review entries for overlap. Do not double count the same workload between Teaching and Laboratory sections.'
        });
      }

      const adminLeadCount = getRecordsBySection('administration').length;
      const adminDutyCount = getRecordsBySection('admin_duties').length;
      if (adminLeadCount > 0 && adminDutyCount > 0) {
        checks.push({
          label: 'Administration overlap reminder',
          status: 'warning',
          message: 'Review entries for overlap. Do not double count the same workload between Administration leadership and duty records.'
        });
      }

      return checks;
    }

    function renderDataChecks(profile, sections, totalScore) {
      const checks = runDataChecks(profile, sections, totalScore);
      const severityWeight = { error: 0, warning: 1, ok: 2 };
      const sortedChecks = [...checks].sort((a, b) => {
        const aWeight = severityWeight[a.status] ?? 3;
        const bWeight = severityWeight[b.status] ?? 3;
        return aWeight - bWeight;
      });
      const visual = {
        error: { icon: '⛔', badgeClass: 'bg-red-100 text-red-700', iconClass: 'bg-red-100 text-red-700', label: 'Error' },
        warning: { icon: '⚠️', badgeClass: 'bg-amber-100 text-amber-700', iconClass: 'bg-amber-100 text-amber-700', label: 'Warning' },
        ok: { icon: '✅', badgeClass: 'bg-emerald-100 text-emerald-700', iconClass: 'bg-emerald-100 text-emerald-700', label: 'OK' }
      };

      return `
        <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
          <h3 class="heading-font text-2xl font-bold mb-4">🧾 Data checks</h3>
          <div class="divide-y divide-gray-100 border border-gray-200 rounded-lg overflow-hidden">
            ${sortedChecks.map((check) => {
              const style = visual[check.status] || visual.warning;
              return `
              <div class="p-3.5 flex items-start gap-3">
                <span class="inline-flex items-center justify-center w-7 h-7 rounded-full text-sm ${style.iconClass}">${style.icon}</span>
                <div class="min-w-0 flex-1">
                  <div class="flex flex-wrap items-center gap-2 mb-1">
                    <p class="font-semibold text-gray-900">${escapeHtml(check.label)}</p>
                    <span class="inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-semibold ${style.badgeClass}">${style.label}</span>
                  </div>
                  <p class="text-sm text-gray-600">${escapeHtml(check.message)}</p>
                </div>
              </div>
            `;}).join('')}
          </div>
        </div>
      `;
    }

    function toggleResultsExportMenu() {
      const menu = document.getElementById('results-export-menu');
      if (!menu) return;
      menu.classList.toggle('hidden');
    }

    function renderResults() {
      const scores = calculateScores();
      const normalized = calculateNormalizedScores();
      const status = getWorkloadStatus(scores.total);
      const profile = getProfile();
      const sections = getResultsSectionDefinitions(scores);

      return `
        <div class="space-y-6">
          <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <h3 class="font-bold text-lg text-gray-900">📤 Report actions</h3>
              <div class="flex items-center gap-3">
                <div id="results-export-menu-container" class="relative">
                  <button onclick="toggleResultsExportMenu()" class="h-10 px-4 bg-sky-600 text-white rounded-lg font-semibold hover:bg-sky-700 transition flex items-center gap-2 text-sm">
                    <span>📁</span> Export
                  </button>
                  <div id="results-export-menu" class="hidden absolute right-0 mt-2 w-44 bg-white border border-gray-200 rounded-lg shadow-lg z-30 overflow-hidden text-sm">
                    <button onclick="printResultsPDF(); toggleResultsExportMenu();" class="block w-full text-left px-4 py-2 hover:bg-gray-50">📄 Print PDF</button>
                    <button onclick="exportToExcel(); toggleResultsExportMenu();" class="block w-full text-left px-4 py-2 hover:bg-gray-50">📊 Export Excel</button>
                    <button onclick="exportSummaryCSV(); toggleResultsExportMenu();" class="block w-full text-left px-4 py-2 hover:bg-gray-50">📋 Summary CSV</button>
                    <button onclick="copyToClipboard(); toggleResultsExportMenu();" class="block w-full text-left px-4 py-2 hover:bg-gray-50">📑 Copy summary</button>
                  </div>
                </div>
                <button id="submit-report" class="h-10 px-4 bg-sky-600 text-white rounded-lg font-semibold hover:bg-sky-700 transition flex items-center gap-2 text-sm">
                  <span>🚀</span> Submit report
                </button>
              </div>
            </div>
          </div>

          <div id="submission-status" class="hidden"></div>
          ${renderResultsSummary(profile, scores, normalized, status, sections)}
          ${renderSmartRadarPanel(normalized)}
          ${renderSmartSettingsPanel(normalized, profile)}
          ${renderSectionBreakdownTiles(sections)}
          ${renderCompositionBlock(sections, scores.total)}
          ${renderDataChecks(profile, sections, scores.total)}
          ${renderSectionDrilldownModal()}

          <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 class="heading-font text-2xl font-bold mb-4 text-gray-900">🔄 Reset Data</h3>

            <div class="space-y-4">
              <div class="border-2 border-orange-200 bg-orange-50 rounded-lg p-5">
                <h4 class="font-bold text-orange-900 mb-2">Clear Activities (Keep Profile)</h4>
                <p class="text-sm text-orange-800 mb-4">
                  Delete all teaching, research, supervision, and other activity records while keeping your staff profile intact.
                </p>
                <div id="clear-activities-confirm" class="hidden mb-3">
                  <div class="bg-white border-2 border-orange-400 rounded-lg p-4">
                    <p class="text-sm font-bold text-orange-900 mb-3">⚠️ Are you sure? This will delete:</p>
                    <ul class="text-xs text-orange-800 ml-4 list-disc space-y-1 mb-3">
                      <li>All teaching courses</li>
                      <li>All student supervision records</li>
                      <li>All research projects</li>
                      <li>All publications</li>
                      <li>All administrative records</li>
                      <li>All service, laboratory, and professional activities</li>
                    </ul>
                    <p class="text-xs text-orange-700 font-semibold">Your profile will be preserved.</p>
                  </div>
                </div>
                <div class="flex gap-3">
                  <button id="clear-activities-btn" onclick="showClearActivitiesConfirm()" class="px-5 py-2 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition text-sm">
                    Clear Activities
                  </button>
                  <button id="confirm-clear-activities-btn" onclick="confirmClearActivities()" class="hidden px-5 py-2 bg-orange-700 text-white rounded-lg font-bold hover:bg-orange-800 transition text-sm">
                    ✓ Yes, Delete All Activities
                  </button>
                  <button id="cancel-clear-activities-btn" onclick="cancelClearActivities()" class="hidden px-5 py-2 bg-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-400 transition text-sm">
                    Cancel
                  </button>
                </div>
              </div>

              <div class="border-2 border-red-200 bg-red-50 rounded-lg p-5">
                <h4 class="font-bold text-red-900 mb-2">Reset All Data</h4>
                <p class="text-sm text-red-800 mb-4">
                  Permanently delete ALL data including your profile and all activities. This action cannot be undone.
                </p>
                <div id="reset-all-confirm" class="hidden mb-3">
                  <div class="bg-white border-2 border-red-400 rounded-lg p-4">
                    <p class="text-sm font-bold text-red-900 mb-3">🚨 FINAL WARNING: This will delete EVERYTHING:</p>
                    <ul class="text-xs text-red-800 ml-4 list-disc space-y-1 mb-3">
                      <li><strong>Your staff profile</strong></li>
                      <li>All teaching, supervision, research records</li>
                      <li>All publications and administrative data</li>
                      <li>All service, laboratory, and professional activities</li>
                    </ul>
                    <p class="text-xs text-red-700 font-bold">⚠️ Consider exporting your data first using the export menu above.</p>
                  </div>
                </div>
                <div class="flex gap-3">
                  <button id="reset-all-btn" onclick="showResetAllConfirm()" class="px-5 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition text-sm">
                    Reset All Data
                  </button>
                  <button id="confirm-reset-all-btn" onclick="confirmResetAll()" class="hidden px-5 py-2 bg-red-700 text-white rounded-lg font-bold hover:bg-red-800 transition text-sm">
                    ✓ Yes, Delete Everything
                  </button>
                  <button id="cancel-reset-all-btn" onclick="cancelResetAll()" class="hidden px-5 py-2 bg-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-400 transition text-sm">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    async function deleteRecord(backendId) {
      const record = allRecords.find(r => r.__backendId === backendId);
      if (!record) return;
      
      const result = await window.dataSdk.delete(record);
      
      if (result.isOk) {
        showToast('Record deleted successfully!');
      } else {
        showToast('Failed to delete record', 'error');
      }
    }

    document.addEventListener('DOMContentLoaded', () => {
      initializeApp();
      bindSubmitButton();
      setupMobileNav();
    });

    // Reset Functions
    function showClearActivitiesConfirm() {
      document.getElementById('clear-activities-confirm').classList.remove('hidden');
      document.getElementById('clear-activities-btn').classList.add('hidden');
      document.getElementById('confirm-clear-activities-btn').classList.remove('hidden');
      document.getElementById('cancel-clear-activities-btn').classList.remove('hidden');
    }

    function cancelClearActivities() {
      document.getElementById('clear-activities-confirm').classList.add('hidden');
      document.getElementById('clear-activities-btn').classList.remove('hidden');
      document.getElementById('confirm-clear-activities-btn').classList.add('hidden');
      document.getElementById('cancel-clear-activities-btn').classList.add('hidden');
    }

    async function confirmClearActivities() {
      const btn = document.getElementById('confirm-clear-activities-btn');
      btn.disabled = true;
      btn.innerHTML = '<div class="loading-spinner mx-auto"></div>';
      
      // Get all records except profile
      const recordsToDelete = allRecords.filter(r => r.section !== 'profile');
      
      let successCount = 0;
      let errorCount = 0;
      
      for (const record of recordsToDelete) {
        const result = await window.dataSdk.delete(record);
        if (result.isOk) {
          successCount++;
        } else {
          errorCount++;
        }
      }
      
      btn.disabled = false;
      btn.innerHTML = '✓ Yes, Delete All Activities';
      
      if (errorCount === 0) {
        showToast(`Successfully cleared ${successCount} activity records!`);
        cancelClearActivities();
      } else {
        showToast(`Cleared ${successCount} records, ${errorCount} failed`, 'error');
      }
    }

    function showResetAllConfirm() {
      document.getElementById('reset-all-confirm').classList.remove('hidden');
      document.getElementById('reset-all-btn').classList.add('hidden');
      document.getElementById('confirm-reset-all-btn').classList.remove('hidden');
      document.getElementById('cancel-reset-all-btn').classList.remove('hidden');
    }

    function cancelResetAll() {
      document.getElementById('reset-all-confirm').classList.add('hidden');
      document.getElementById('reset-all-btn').classList.remove('hidden');
      document.getElementById('confirm-reset-all-btn').classList.add('hidden');
      document.getElementById('cancel-reset-all-btn').classList.add('hidden');
    }

    async function confirmResetAll() {
      const btn = document.getElementById('confirm-reset-all-btn');
      btn.disabled = true;
      btn.innerHTML = '<div class="loading-spinner mx-auto"></div>';

      const deletedCount = allRecords.length;
      clearAllPersistedState();
      resetInMemoryState();
      
      btn.disabled = false;
      btn.innerHTML = '✓ Yes, Delete Everything';

      showToast(`Successfully reset all data (${deletedCount} records deleted)!`);
      cancelResetAll();
      navigateToSection('profile');
    }

    // Export/Reporting Module
    const ExportReportingModule = (() => {
      const Utilities = {
        csvEscape(value) {
          if (value === null || value === undefined) return '';
          const stringValue = String(value);
          if (/[",\n\r]/.test(stringValue)) {
            return `"${stringValue.replace(/"/g, '""')}"`;
          }
          return stringValue;
        },
        safeText(value, fallback = 'N/A') {
          if (value === null || value === undefined || value === '') {
            return fallback;
          }
          return String(value);
        },
        formatNumber(value, options = {}) {
          if (value === null || value === undefined || value === '') return '';
          const numeric = Number(value);
          if (!Number.isFinite(numeric)) return '';
          const {
            minimumFractionDigits = 0,
            maximumFractionDigits = 2
          } = options;
          return numeric.toLocaleString('en-MY', { minimumFractionDigits, maximumFractionDigits });
        },
        formatValue(value, type = 'text') {
          if (type === 'score') {
            return Utilities.formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          }
          if (type === 'currency') {
            return Utilities.formatNumber(value, { minimumFractionDigits: 2, maximumFractionDigits: 2 });
          }
          if (type === 'number') {
            return Utilities.formatNumber(value, { minimumFractionDigits: 0, maximumFractionDigits: 2 });
          }
          if (type === 'date') {
            return Utilities.safeText(value, '');
          }
          return Utilities.safeText(value, '');
        },
        normalizeValue(value, type = 'text') {
          if (type === 'score' || type === 'currency' || type === 'number') {
            const numeric = Number(value);
            return Number.isFinite(numeric) ? numeric : '';
          }
          return value ?? '';
        },
        downloadBlob(filename, blob) {
          const link = document.createElement('a');
          const url = URL.createObjectURL(blob);
          link.setAttribute('href', url);
          link.setAttribute('download', filename);
          link.style.visibility = 'hidden';
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          URL.revokeObjectURL(url);
        },
        formatDateTime(date = new Date()) {
          return date.toLocaleString('en-MY', {
            year: 'numeric',
            month: 'short',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
          });
        },
        toBOMUTF8() {
          return '\uFEFF';
        }
      };

      const ReportBuilder = {
        buildReportModel(state) {
          const { profile, scores, status, generatedAt, recordsBySection } = state;
          const config = window.elementSdk?.config || defaultConfig;
          const adminPosition = profile
            ? (profile.profile_admin_position === 'Other'
              ? profile.profile_other_admin_position
              : profile.profile_admin_position)
            : 'N/A';
          const summaryByCategory = [
            { category: 'Teaching', score: scores.teaching, count: recordsBySection.teaching.length },
            { category: 'Supervision', score: scores.supervision, count: recordsBySection.supervision.length },
            { category: 'Research', score: scores.research, count: recordsBySection.research.length },
            { category: 'Publications', score: scores.publications, count: recordsBySection.publications.length },
            { category: 'Administration', score: scores.adminLeadership + scores.adminDuties, count: recordsBySection.administration.length + recordsBySection.admin_duties.length },
            { category: 'Service', score: scores.service, count: recordsBySection.service.length },
            { category: 'Laboratory', score: scores.laboratory, count: recordsBySection.laboratory.length },
            { category: 'Professional', score: scores.professional, count: recordsBySection.professional.length }
          ];
          const totalCount = summaryByCategory.reduce((sum, row) => sum + row.count, 0);

          const buildSection = (config) => {
            const rows = config.records.map(record => {
              const rowScore = config.scoreFn ? config.scoreFn(record) : 0;
              return {
                ...config.mapRow(record),
                rowScore: Number.isFinite(rowScore) ? rowScore : 0
              };
            });
            const sectionScoreTotal = rows.reduce((sum, row) => sum + (Number(row.rowScore) || 0), 0);
            return {
              key: config.key,
              title: config.title,
              columns: config.columns,
              rows,
              subtotal: {
                sectionScoreTotal,
                sectionCount: rows.length
              }
            };
          };

          const sections = [
            buildSection({
              key: 'teaching',
              title: 'Teaching',
              records: recordsBySection.teaching,
              scoreFn: calculateCourseScore,
              columns: [
                { key: 'course_code', label: 'Course Code', type: 'text' },
                { key: 'course_name', label: 'Course Name', type: 'text' },
                { key: 'course_credit_hours', label: 'Credit Hours', type: 'number' },
                { key: 'course_lecture', label: 'Lecture Hrs', type: 'number' },
                { key: 'course_tutorial', label: 'Tutorial Hrs', type: 'number' },
                { key: 'course_lab', label: 'Lab Hrs', type: 'number' },
                { key: 'course_fieldwork', label: 'Fieldwork Hrs', type: 'number' },
                { key: 'course_semester', label: 'Semester', type: 'text' },
                { key: 'course_role', label: 'Role', type: 'text' },
                { key: 'teaching_section', label: 'Section', type: 'text' },
                { key: 'rowScore', label: 'Score', type: 'score' }
              ],
              mapRow: (course) => ({
                course_code: course.course_code,
                course_name: course.course_name,
                course_credit_hours: course.course_credit_hours,
                teaching_section: course.teaching_section || 'A',
                course_lecture: course.course_lecture,
                course_tutorial: course.course_tutorial,
                course_lab: course.course_lab,
                course_fieldwork: course.course_fieldwork,
                course_semester: course.course_semester === 'Other' ? course.course_semester_other : course.course_semester,
                course_role: course.course_role
              })
            }),
            buildSection({
              key: 'supervision',
              title: 'Supervision',
              records: recordsBySection.supervision,
              scoreFn: calculateSupervisionScore,
              columns: [
                { key: 'student_name', label: 'Student Name', type: 'text' },
                { key: 'student_matric', label: 'Matric', type: 'text' },
                { key: 'student_level', label: 'Level', type: 'text' },
                { key: 'student_role', label: 'Role', type: 'text' },
                { key: 'student_title', label: 'Research Title', type: 'text' },
                { key: 'student_year', label: 'Year', type: 'number' },
                { key: 'rowScore', label: 'Score', type: 'score' }
              ],
              mapRow: (student) => ({
                student_name: student.student_name,
                student_matric: student.student_matric,
                student_level: student.student_level,
                student_role: student.student_role,
                student_title: student.student_title,
                student_year: student.student_year
              })
            }),
            buildSection({
              key: 'research',
              title: 'Research Projects',
              records: recordsBySection.research,
              scoreFn: calculateResearchScore,
              columns: [
                { key: 'research_title', label: 'Project Title', type: 'text' },
                { key: 'research_grant_code', label: 'Grant Code', type: 'text' },
                { key: 'research_role', label: 'Role', type: 'text' },
                { key: 'research_amount', label: 'Amount (RM)', type: 'currency' },
                { key: 'research_status', label: 'Status', type: 'text' },
                { key: 'research_year', label: 'Year', type: 'number' },
                { key: 'research_duration', label: 'Duration (Years)', type: 'number' },
                { key: 'rowScore', label: 'Score', type: 'score' }
              ],
              mapRow: (project) => ({
                research_title: project.research_title,
                research_grant_code: project.research_grant_code,
                research_role: project.research_role,
                research_amount: project.research_amount,
                research_status: project.research_status,
                research_year: project.research_year,
                research_duration: project.research_duration
              })
            }),
            buildSection({
              key: 'publications',
              title: 'Publications',
              records: recordsBySection.publications,
              scoreFn: calculatePublicationScore,
              columns: [
                { key: 'pub_title', label: 'Title', type: 'text' },
                { key: 'pub_type', label: 'Type', type: 'text' },
                { key: 'indexing', label: 'Indexing', type: 'text' },
                { key: 'pub_venue', label: 'Venue', type: 'text' },
                { key: 'author_position', label: 'Author Position', type: 'text' },
                { key: 'pub_year', label: 'Year', type: 'number' },
                { key: 'pub_status', label: 'Status', type: 'text' },
                { key: 'rowScore', label: 'Score', type: 'score' }
              ],
              mapRow: (pub) => {
                const descriptive = getPublicationDescriptiveMetadata(pub);
                const statusMeta = getPublicationStatusMetadata(pub);
                return {
                  pub_title: pub.pub_title,
                  pub_type: getPublicationItemTypeDisplay(pub),
                  indexing: descriptive.indexing_display,
                  pub_venue: pub.pub_venue,
                  author_position: descriptive.author_position_display,
                  pub_year: pub.pub_year,
                  pub_status: statusMeta.status_display
                };
              }
            }),
            buildSection({
              key: 'administration',
              title: 'Administration',
              records: [...recordsBySection.administration, ...recordsBySection.admin_duties],
              scoreFn: (item) => item.section === 'admin_duties' ? calculateAdminDutyScore(item) : calculateAdministrationScore(item),
              columns: [
                { key: 'admin_type', label: 'Type', type: 'text' },
                { key: 'admin_title', label: 'Title/Position', type: 'text' },
                { key: 'admin_scope', label: 'Faculty/Unit', type: 'text' },
                { key: 'admin_period', label: 'Period/Frequency', type: 'text' },
                { key: 'rowScore', label: 'Score', type: 'score' }
              ],
              mapRow: (admin) => ({
                admin_type: admin.section === 'admin_duties' ? 'Duty' : 'Leadership',
                admin_title: admin.section === 'admin_duties' ? admin.duty_name : (admin.admin_position === 'Other' ? admin.admin_other_position : admin.admin_position),
                admin_scope: admin.section === 'admin_duties' ? (admin.duty_appointment_level || '-') : (admin.admin_faculty || '-'),
                admin_period: admin.section === 'admin_duties' ? (admin.duty_frequency || '-') : `${admin.admin_start_date || '-'} → ${admin.admin_end_date || 'Current'}`
              })
            }),
            buildSection({
              key: 'service',
              title: 'Service & Engagement',
              records: recordsBySection.service,
              scoreFn: calculateServiceScore,
              columns: [
                { key: 'service_title', label: 'Service Title', type: 'text' },
                { key: 'service_type', label: 'Type', type: 'text' },
                { key: 'service_scope', label: 'Scope', type: 'text' },
                { key: 'service_organization', label: 'Organization', type: 'text' },
                { key: 'service_date', label: 'Date', type: 'date' },
                { key: 'service_duration', label: 'Duration (Hours)', type: 'number' },
                { key: 'service_description', label: 'Notes', type: 'text' },
                { key: 'rowScore', label: 'Score', type: 'score' }
              ],
              mapRow: (service) => ({
                service_title: service.service_title,
                service_type: service.service_type,
                service_scope: service.service_scope,
                service_organization: service.service_organization,
                service_date: service.service_date,
                service_duration: service.service_duration,
                service_description: service.service_description
              })
            }),
            buildSection({
              key: 'laboratory',
              title: 'Laboratory Responsibilities',
              records: recordsBySection.laboratory,
              scoreFn: calculateLabScore,
              columns: [
                { key: 'lab_name', label: 'Lab Name', type: 'text' },
                { key: 'lab_responsibility', label: 'Responsibility', type: 'text' },
                { key: 'lab_frequency', label: 'Frequency', type: 'text' },
                { key: 'lab_year', label: 'Year', type: 'number' },
                { key: 'lab_description', label: 'Description', type: 'text' },
                { key: 'rowScore', label: 'Score', type: 'score' }
              ],
              mapRow: (lab) => ({
                lab_name: lab.lab_name,
                lab_responsibility: lab.lab_responsibility,
                lab_frequency: lab.lab_frequency,
                lab_year: lab.lab_year,
                lab_description: lab.lab_description
              })
            }),
            buildSection({
              key: 'professional',
              title: 'Professional Activities',
              records: recordsBySection.professional,
              scoreFn: calculateProfessionalScore,
              columns: [
                { key: 'prof_title', label: 'Title', type: 'text' },
                { key: 'prof_type', label: 'Type', type: 'text' },
                { key: 'prof_scope', label: 'Scope', type: 'text' },
                { key: 'prof_organization', label: 'Organization', type: 'text' },
                { key: 'prof_year', label: 'Year', type: 'number' },
                { key: 'prof_description', label: 'Description', type: 'text' },
                { key: 'rowScore', label: 'Score', type: 'score' }
              ],
              mapRow: (prof) => ({
                prof_title: prof.prof_title,
                prof_type: prof.prof_type,
                prof_scope: prof.prof_scope,
                prof_organization: prof.prof_organization,
                prof_year: prof.prof_year,
                prof_description: prof.prof_description
              })
            })
          ];

          return {
            meta: {
              title: config.app_title || defaultConfig.app_title,
              subtitle: config.app_subtitle || defaultConfig.app_subtitle,
              generatedAt,
              staff: {
                name: profile.profile_name,
                id: profile.profile_staff_id,
                category: getProfileCategoryLabel(profile.profile_category) || 'N/A'
              },
              staffName: profile.profile_name,
              staffId: profile.profile_staff_id,
              staffRank: profile.profile_rank || getProfileCategoryLabel(profile.profile_category),
              staffCategory: getProfileCategoryLabel(profile.profile_category) || 'N/A',
              rank: profile.profile_rank || getProfileCategoryLabel(profile.profile_category),
              programme: profile.profile_programme || 'N/A',
              adminPosition,
              filters: {}
            },
            sections,
            summary: {
              byCategory: summaryByCategory,
              workloadIndex: getWorkloadIndexMetrics(scores.total).displayIndexValue,
              workloadIndexMax: WORKLOAD_INDEX_MAX,
              rawTotalPoints: scores.total,
              totalScore: scores.total,
              totalCount,
              status: {
                label: status.label,
                icon: status.icon
              }
            }
          };
        },
        renderReportHTML(reportModel) {
          const container = document.createElement('div');
          container.id = 'report-print-root';
          container.className = 'report-print-root';

          const headerHtml = `
            <div class="report-header">
              <div class="report-title">${reportModel.meta.title}</div>
              <div class="report-subtitle">${reportModel.meta.subtitle}</div>
              <div class="report-meta">
                <div><strong>Generated:</strong> ${Utilities.formatDateTime(reportModel.meta.generatedAt)}</div>
                <div><strong>Staff:</strong> ${reportModel.meta.staff.name} (${reportModel.meta.staff.id})</div>
                <div><strong>Rank:</strong> ${reportModel.meta.rank}</div>
                <div><strong>Programme:</strong> ${reportModel.meta.programme}</div>
                <div><strong>Admin Position:</strong> ${reportModel.meta.adminPosition}</div>
              </div>
            </div>
          `;

          const summaryRows = reportModel.summary.byCategory.map(row => `
            <tr>
              <td>${row.category}</td>
              <td>${Utilities.formatNumber(row.score, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
              <td>${row.count}</td>
            </tr>
          `).join('');

          const summaryHtml = `
            <section class="report-section">
              <h2>Workload Summary</h2>
              <div class="overflow-x-auto">
                <table>
                  <thead>
                    <tr>
                      <th>Category</th>
                      <th>Score</th>
                      <th>Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${summaryRows}
                    <tr class="report-total-row">
                      <td>Total</td>
                      <td>${Utilities.formatNumber(reportModel.summary.totalScore, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td>${reportModel.summary.totalCount}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
              <div class="report-status">
                <strong>Workload Index:</strong> ${Utilities.formatNumber(reportModel.summary.workloadIndex, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / ${reportModel.summary.workloadIndexMax}
              </div>
              <div class="report-status">
                <strong>Status:</strong> ${reportModel.summary.status.label} ${reportModel.summary.status.icon}
              </div>
            </section>
          `;

          const sectionsHtml = reportModel.sections.map(section => {
            const headers = section.columns.map(col => `<th>${col.label}</th>`).join('');
            const rows = section.rows.length
              ? section.rows.map(row => `
                <tr>
                  ${section.columns.map(col => `
                    <td>${Utilities.formatValue(row[col.key], col.type)}</td>
                  `).join('')}
                </tr>
              `).join('')
              : `
                <tr>
                  <td colspan="${section.columns.length}" class="report-empty">No records.</td>
                </tr>
              `;

            return `
              <section class="report-section">
                <h2>${section.title}</h2>
                <div class="overflow-x-auto">
                  <table>
                    <thead>
                      <tr>${headers}</tr>
                    </thead>
                    <tbody>${rows}</tbody>
                  </table>
                </div>
                <div class="report-subtotal">
                  <strong>Subtotal:</strong>
                  Score Total ${Utilities.formatNumber(section.subtotal.sectionScoreTotal, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  | Count ${section.subtotal.sectionCount}
                </div>
              </section>
            `;
          }).join('');

          const overallTotalsHtml = `
            <section class="report-section">
              <h2>Overall Totals</h2>
              <div class="overflow-x-auto">
                <table>
                  <thead>
                    <tr>
                      <th>Workload Index</th>
                      <th>Total Score</th>
                      <th>Total Count</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr class="report-total-row">
                      <td>${Utilities.formatNumber(reportModel.summary.workloadIndex, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} / ${reportModel.summary.workloadIndexMax}</td>
                      <td>${Utilities.formatNumber(reportModel.summary.totalScore, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td>${reportModel.summary.totalCount}</td>
                      <td>${reportModel.summary.status.label} ${reportModel.summary.status.icon}</td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </section>
          `;

          container.innerHTML = `
            <div class="report-body">
              ${headerHtml}
              ${summaryHtml}
              ${sectionsHtml}
              ${overallTotalsHtml}
            </div>
          `;

          return container;
        },
        renderReportText(reportModel) {
          const lines = [];
          lines.push(`${reportModel.meta.title} - SUMMARY`);
          lines.push('='.repeat(60));
          lines.push(`Generated: ${Utilities.formatDateTime(reportModel.meta.generatedAt)}`);
          lines.push(`Staff: ${reportModel.meta.staff.name} (${reportModel.meta.staff.id})`);
          lines.push(`Rank: ${reportModel.meta.rank}`);
          lines.push('');
          lines.push('WORKLOAD SCORES');
          lines.push('-'.repeat(60));
          reportModel.summary.byCategory.forEach(row => {
            lines.push(`${row.category.padEnd(20)} ${row.score.toFixed(2)}`);
          });
          lines.push('-'.repeat(60));
          lines.push(`WORKLOAD INDEX: ${reportModel.summary.workloadIndex.toFixed(2)} / ${reportModel.summary.workloadIndexMax}`);
          lines.push(`TOTAL SCORE: ${reportModel.summary.rawTotalPoints.toFixed(2)}`);
          lines.push(`TOTAL COUNT: ${reportModel.summary.totalCount}`);
          lines.push(`STATUS: ${reportModel.summary.status.label} ${reportModel.summary.status.icon}`);
          return lines.join('\n');
        }
      };

      const Exporters = {
        exportXLSX(reportModel) {
          if (typeof XLSX === 'undefined') {
            showToast('Excel export unavailable. Please check the XLSX library.', 'error');
            return;
          }

          const workbook = XLSX.utils.book_new();
          const summarySheetData = [
            [reportModel.meta.title],
            [reportModel.meta.subtitle],
            [],
            ['Generated', Utilities.formatDateTime(reportModel.meta.generatedAt)],
            ['Staff Name', reportModel.meta.staff.name],
            ['Staff ID', reportModel.meta.staff.id],
            ['Rank', reportModel.meta.rank],
            ['Programme', reportModel.meta.programme],
            ['Admin Position', reportModel.meta.adminPosition],
            ['Workload Index', `${reportModel.summary.workloadIndex.toFixed(2)} / ${reportModel.summary.workloadIndexMax}`],
            ['Raw Total Points', Utilities.normalizeValue(reportModel.summary.rawTotalPoints, 'score')],
            [],
            ['Category', 'Score', 'Count'],
            ...reportModel.summary.byCategory.map(row => [
              row.category,
              Utilities.normalizeValue(row.score, 'score'),
              row.count
            ]),
            ['Total', Utilities.normalizeValue(reportModel.summary.totalScore, 'score'), reportModel.summary.totalCount],
            [],
            ['Status', reportModel.summary.status.label]
          ];

          const setAutoWidths = (sheet, data) => {
            if (!sheet || !data.length) return;
            const colWidths = data[0].map((_, idx) => {
              const maxLen = data.reduce((max, row) => {
                const cell = row[idx];
                if (cell === null || cell === undefined) return max;
                return Math.max(max, String(cell).length);
              }, 10);
              return { wch: Math.min(Math.max(maxLen + 2, 12), 40) };
            });
            sheet['!cols'] = colWidths;
          };

          const summarySheet = XLSX.utils.aoa_to_sheet(summarySheetData);
          setAutoWidths(summarySheet, summarySheetData);
          XLSX.utils.book_append_sheet(workbook, summarySheet, 'Summary');

          reportModel.sections.forEach(section => {
            const header = section.columns.map(col => col.label);
            const dataRows = section.rows.length
              ? section.rows.map(row => section.columns.map(col => Utilities.normalizeValue(row[col.key], col.type)))
              : [header.map((_, idx) => (idx === 0 ? 'No records' : ''))];
            const subtotalRows = [
              header.map(() => ''),
              header.map((_, idx) => (idx === 0 ? 'Score Total' : idx === 1 ? section.subtotal.sectionScoreTotal : '')),
              header.map((_, idx) => (idx === 0 ? 'Count' : idx === 1 ? section.subtotal.sectionCount : ''))
            ];
            const sheetData = [header, ...dataRows, ...subtotalRows];
            const sheet = XLSX.utils.aoa_to_sheet(sheetData);
            setAutoWidths(sheet, sheetData);
            XLSX.utils.book_append_sheet(workbook, sheet, section.title.substring(0, 30));
          });

          const fileName = `FST_Workload_Report_${reportModel.meta.staffId}_${reportModel.meta.generatedAt.toISOString().split('T')[0]}.xlsx`;
          XLSX.writeFile(workbook, fileName);
          showToast('Excel report downloaded successfully!');
        },
        exportSummaryCSV(reportModel) {
          const formatCsvValue = (value, type) => {
            if (type === 'score') {
              const numeric = Number(value);
              return Number.isFinite(numeric) ? numeric.toFixed(2) : '';
            }
            if (type === 'currency' || type === 'number') {
              const numeric = Number(value);
              return Number.isFinite(numeric) ? numeric : '';
            }
            return Utilities.safeText(value, '');
          };
          const rows = [
            ['GeneratedAt', Utilities.formatDateTime(reportModel.meta.generatedAt)],
            ['Staff', `${reportModel.meta.staff.name} (${reportModel.meta.staff.id})`],
            ['Rank', reportModel.meta.rank],
            ['Programme', reportModel.meta.programme],
            ['Admin Position', reportModel.meta.adminPosition],
            ['Filters', JSON.stringify(reportModel.meta.filters || {})],
            ['Workload Index', `${reportModel.summary.workloadIndex.toFixed(2)} / ${reportModel.summary.workloadIndexMax}`],
            ['Raw Total Points', reportModel.summary.rawTotalPoints.toFixed(2)],
            [],
            ['SUMMARY_BY_CATEGORY'],
            ['Category', 'Score', 'Count'],
            ...reportModel.summary.byCategory.map(row => [
              row.category,
              row.score.toFixed(2),
              row.count
            ]),
            ['TOTAL', reportModel.summary.totalScore.toFixed(2), reportModel.summary.totalCount],
            ['Status', reportModel.summary.status.label],
            []
          ];

          reportModel.sections.forEach(section => {
            rows.push([`SECTION: ${section.title}`]);
            rows.push(section.columns.map(col => col.label));
            if (section.rows.length) {
              section.rows.forEach(row => {
                rows.push(section.columns.map(col => formatCsvValue(row[col.key], col.type)));
              });
            } else {
              rows.push(section.columns.map((_, idx) => (idx === 0 ? 'No records' : '')));
            }
            const subtotalRow = section.columns.map(() => '');
            subtotalRow[0] = 'Subtotal Score';
            subtotalRow[1] = section.subtotal.sectionScoreTotal.toFixed(2);
            subtotalRow[2] = 'Count';
            subtotalRow[3] = section.subtotal.sectionCount;
            rows.push(subtotalRow);
            rows.push([]);
          });

          rows.push(['OVERALL_TOTALS']);
          rows.push(['Workload Index', `${reportModel.summary.workloadIndex.toFixed(2)} / ${reportModel.summary.workloadIndexMax}`]);
          rows.push(['Total Score', reportModel.summary.totalScore.toFixed(2)]);
          rows.push(['Total Count', reportModel.summary.totalCount]);
          rows.push(['Status', reportModel.summary.status.label]);

          const csv = rows.map(row => {
            if (row.length === 0) return '';
            return row.map(Utilities.csvEscape).join(',');
          }).join('\n');

          const blob = new Blob([Utilities.toBOMUTF8(), csv], { type: 'text/csv;charset=utf-8;' });
          const fileName = `FST_Workload_Summary_${reportModel.meta.staffId}_${reportModel.meta.generatedAt.toISOString().split('T')[0]}.csv`;
          Utilities.downloadBlob(fileName, blob);
          showToast('Summary CSV downloaded!');
        },
        printPDF(reportModel) {
          const existing = document.getElementById('report-print-root');
          if (existing) {
            existing.remove();
          }
          const reportElement = ReportBuilder.renderReportHTML(reportModel);
          document.body.appendChild(reportElement);
          document.body.classList.add('printing-report');

          const cleanup = () => {
            document.body.classList.remove('printing-report');
            const node = document.getElementById('report-print-root');
            if (node) {
              node.remove();
            }
            window.removeEventListener('afterprint', cleanup);
          };

          window.addEventListener('afterprint', cleanup);
          requestAnimationFrame(() => {
            window.print();
            showToast('Opening print dialog...');
          });
        }
      };

      function buildState() {
        const scores = calculateScores();
        return {
          profile: getProfile(),
          scores,
          status: getWorkloadStatus(scores.total),
          generatedAt: new Date(),
          recordsBySection: {
            teaching: getRecordsBySection('teaching'),
            supervision: getRecordsBySection('supervision'),
            research: getRecordsBySection('research'),
            publications: getRecordsBySection('publications'),
            administration: getRecordsBySection('administration'),
            admin_duties: getRecordsBySection('admin_duties'),
            service: getRecordsBySection('service'),
            laboratory: getRecordsBySection('laboratory'),
            professional: getRecordsBySection('professional')
          }
        };
      }

      function ensureProfile(state) {
        if (!state.profile) {
          showToast('Please create a profile first', 'error');
          return false;
        }
        return true;
      }

      function getReportModel() {
        const state = buildState();
        if (!ensureProfile(state)) {
          return null;
        }
        return ReportBuilder.buildReportModel(state);
      }

      function copySummaryText() {
        const reportModel = getReportModel();
        if (!reportModel) return;
        const text = ReportBuilder.renderReportText(reportModel);
        if (navigator.clipboard && window.isSecureContext) {
          navigator.clipboard.writeText(text).then(() => {
            showToast('Summary copied to clipboard!');
          }).catch(() => {
            showToast('Failed to copy to clipboard', 'error');
          });
          return;
        }

        const textarea = document.createElement('textarea');
        textarea.value = text;
        textarea.setAttribute('readonly', '');
        textarea.style.position = 'absolute';
        textarea.style.left = '-9999px';
        document.body.appendChild(textarea);
        textarea.select();

        try {
          const success = document.execCommand('copy');
          if (success) {
            showToast('Summary copied to clipboard (fallback)');
          } else {
            showToast('Clipboard not available. Please copy manually.', 'error');
          }
        } catch (error) {
          showToast('Clipboard not available. Please copy manually.', 'error');
        } finally {
          document.body.removeChild(textarea);
        }
      }

      return {
        Utilities,
        ReportBuilder,
        Exporters,
        getReportModel,
        copySummaryText
      };
    })();

    // Export Functions
    function printResultsPDF() {
      const reportModel = ExportReportingModule.getReportModel();
      if (!reportModel) return;
      ExportReportingModule.Exporters.printPDF(reportModel);
    }

    function exportToExcel() {
      const reportModel = ExportReportingModule.getReportModel();
      if (!reportModel) return;
      ExportReportingModule.Exporters.exportXLSX(reportModel);
    }

    function exportSummaryCSV() {
      const reportModel = ExportReportingModule.getReportModel();
      if (!reportModel) return;
      ExportReportingModule.Exporters.exportSummaryCSV(reportModel);
    }

    function copyToClipboard() {
      ExportReportingModule.copySummaryText();
    }
