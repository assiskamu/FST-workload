// Encoding: UTF-8
let currentSection = 'home';
    let allRecords = [];

    const sections = [
      { id: 'home', label: '🏠 Home', showBadge: false },
      { id: 'profile', label: '👤 Staff Profile', showBadge: false },
      { id: 'teaching', label: '📚 Teaching', showBadge: true },
      { id: 'supervision', label: '🎓 Supervision', showBadge: true },
      { id: 'research', label: '🔬 Research', showBadge: true },
      { id: 'publications', label: '📄 Publications', showBadge: true },
      { id: 'administration', label: '🏛️ Admin Leadership', showBadge: true },
      { id: 'admin_duties', label: '📋 Admin Duties', showBadge: true },
      { id: 'service', label: '🤝 Service', showBadge: false },
      { id: 'laboratory', label: '🧪 Laboratory', showBadge: false },
      { id: 'professional', label: '💼 Professional', showBadge: false },
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
      app_title: 'FST UMS Workload Calculator',
      app_subtitle: 'Faculty of Science and Technology, Universiti Malaysia Sabah'
    };

    async function initializeApp() {
      const dataHandler = {
        onDataChanged(data) {
          allRecords = data;
          updateTotalEntries();
          renderNavigation();
          renderSection(currentSection);
        }
      };

      const initResult = await window.dataSdk.init(dataHandler);
      
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

    function updateTotalEntries() {
      const counter = document.getElementById('total-entries');
      if (counter) {
        counter.textContent = allRecords.length;
      }
    }

    function toggleQuickActions() {
      const menu = document.getElementById('quick-actions-menu');
      menu.classList.toggle('hidden');
      document.getElementById('notifications-menu').classList.add('hidden');
      document.getElementById('profile-menu').classList.add('hidden');
    }

    function toggleNotifications() {
      const menu = document.getElementById('notifications-menu');
      menu.classList.toggle('hidden');
      document.getElementById('quick-actions-menu').classList.add('hidden');
      document.getElementById('profile-menu').classList.add('hidden');
    }

    function toggleProfileMenu() {
      const menu = document.getElementById('profile-menu');
      menu.classList.toggle('hidden');
      document.getElementById('quick-actions-menu').classList.add('hidden');
      document.getElementById('notifications-menu').classList.add('hidden');
    }

    function updateLiveScore() {
      const scores = calculateScores();
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
        rankDisplay.textContent = profile.profile_rank || profile.profile_category || 'Staff';
        
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
                <div class="text-xs text-gray-500">${profile.profile_rank || profile.profile_category}</div>
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
      
      if (scores.total >= 100 && !notifications.some(n => n.message.includes('workload has reached overload'))) {
        addNotification('Your workload has reached overload level (100+). Consider rebalancing your activities.', 'warning');
      }
      
      if (allRecords.length >= 900 && !notifications.some(n => n.message.includes('approaching the 999 record limit'))) {
        addNotification(`You're approaching the 999 record limit (${allRecords.length}/999).`, 'warning');
      }
      
      if (allRecords.length >= 999) {
        addNotification('Maximum record limit reached (999/999). Please delete some records to add new ones.', 'warning');
      }
    }

    function renderNavigation() {
      const nav = document.getElementById('sidebar-nav');
      
      const counts = {
        teaching: allRecords.filter(r => r.section === 'teaching').length,
        supervision: allRecords.filter(r => r.section === 'supervision').length,
        research: allRecords.filter(r => r.section === 'research').length,
        publications: allRecords.filter(r => r.section === 'publications').length,
        administration: allRecords.filter(r => r.section === 'administration').length,
        admin_duties: allRecords.filter(r => r.section === 'admin_duties').length
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
          break;
        case 'research':
          contentArea.innerHTML = renderResearch();
          break;
        case 'publications':
          contentArea.innerHTML = renderPublications();
          break;
        case 'administration':
          contentArea.innerHTML = renderAdministration();
          break;
        case 'admin_duties':
          contentArea.innerHTML = renderAdminDuties();
          break;
        case 'service':
          contentArea.innerHTML = renderService();
          break;
        case 'laboratory':
          contentArea.innerHTML = renderLaboratory();
          break;
        case 'professional':
          contentArea.innerHTML = renderProfessional();
          break;
        case 'assistants':
          contentArea.innerHTML = renderAssistants();
          break;
        case 'results':
          contentArea.innerHTML = renderResults();
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
      return allRecords.filter(r => r.section === section);
    }

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

    // TEACHING: Weekly hours × class size factor
    function calculateCourseScore(course) {
      const totalHours = (course.course_lecture || 0) + (course.course_tutorial || 0) + 
                        (course.course_lab || 0) + (course.course_fieldwork || 0);
      const weeklyHours = totalHours / 14;
      
      let classSizeFactor = 1.0;
      const classSize = course.course_class_size || 0;
      if (classSize > 100) classSizeFactor = 1.5;
      else if (classSize > 50) classSizeFactor = 1.3;
      
      return Math.round(weeklyHours * classSizeFactor * 10) / 10;
    }

    // SUPERVISION: Fixed points by level and role
    function calculateSupervisionScore(student) {
      const level = student.student_level;
      const role = student.student_role;
      
      if (level === 'phd') {
        return role === 'main' ? 8 : 4;
      } else if (level === 'masters') {
        return role === 'main' ? 5 : 2.5;
      } else {
        // undergraduate - always 1, role ignored
        return 1;
      }
    }

    // ADMIN DUTIES: Base points 🧮 frequency factor
    function calculateAdminDutyScore(duty) {
      let basePoints = 0;
      if (duty.duty_type === 'Accreditation Work') basePoints = 8;
      else if (duty.duty_type === 'Curriculum Development') basePoints = 6;
      else if (duty.duty_type === 'Committee Chair') basePoints = 5;
      else if (duty.duty_type === 'Event Organizer') basePoints = 4;
      else if (duty.duty_type === 'Exam Coordinator') basePoints = 3;
      else if (duty.duty_type === 'Committee Member') basePoints = 2;
      else basePoints = 2; // Other
      
      let frequencyFactor = 1.0;
      if (duty.duty_frequency === 'Per Semester') frequencyFactor = 0.5;
      else if (duty.duty_frequency === 'One-Time Event') frequencyFactor = 0.3;
      
      return Math.round(basePoints * frequencyFactor * 100) / 100;
    }

    function calculateResearchScore(research) {
      const basePoints = 5;
      
      let roleFactor = 1.0;
      if (research.research_role === 'lead') roleFactor = 1.0;
      else if (research.research_role === 'co-lead') roleFactor = 0.7;
      else if (research.research_role === 'member') roleFactor = 0.5;
      
      let statusFactor = 1.0;
      if (research.research_status === 'ongoing') statusFactor = 1.0;
      else if (research.research_status === 'completed') statusFactor = 0.8;
      else if (research.research_status === 'pending') statusFactor = 0.3;
      
      return Math.round(basePoints * roleFactor * statusFactor * 100) / 100;
    }

    function calculatePublicationScore(pub) {
      let basePoints = 0;
      if (pub.pub_type === 'journal') basePoints = 10;
      else if (pub.pub_type === 'conference') basePoints = 6;
      else if (pub.pub_type === 'book') basePoints = 15;
      else if (pub.pub_type === 'chapter') basePoints = 8;
      else if (pub.pub_type === 'proceeding') basePoints = 5;
      
      let indexFactor = 1.0;
      if (pub.pub_index === 'Q1') indexFactor = 2.0;
      else if (pub.pub_index === 'Q2') indexFactor = 1.5;
      else if (pub.pub_index === 'Q3') indexFactor = 1.3;
      else if (pub.pub_index === 'Q4') indexFactor = 1.1;
      else if (pub.pub_index === 'Scopus' || pub.pub_index === 'WoS') indexFactor = 1.2;
      else if (pub.pub_index === 'Other') indexFactor = 0.8;
      
      let positionFactor = 1.0;
      if (pub.pub_position === 'first') positionFactor = 1.0;
      else if (pub.pub_position === 'corresponding') positionFactor = 0.9;
      else if (pub.pub_position === 'co-author') positionFactor = 0.5;
      
      let statusFactor = 1.0;
      if (pub.pub_status === 'published') statusFactor = 1.0;
      else if (pub.pub_status === 'accepted') statusFactor = 0.8;
      else if (pub.pub_status === 'under-review') statusFactor = 0.3;
      
      return Math.round(basePoints * indexFactor * positionFactor * statusFactor * 100) / 100;
    }

    function calculateAdministrationScore(admin) {
      const position = admin.admin_position;
      
      if (position === 'Dean') return 20;
      else if (position === 'Deputy Dean') return 15;
      else if (position === 'Centre Director') return 12;
      else if (position === 'Head of Programme') return 10;
      else if (position === 'Postgraduate Coordinator') return 8;
      else if (position === 'Programme Coordinator') return 6;
      else return 5;
    }

    function calculateServiceScore(service) {
      let basePoints = 0;
      if (service.service_type === 'Community Outreach') basePoints = 8;
      else if (service.service_type === 'Volunteer Teaching') basePoints = 7;
      else if (service.service_type === 'Public Lecture') basePoints = 6;
      else if (service.service_type === 'Consulting') basePoints = 5;
      else if (service.service_type === 'Mentorship') basePoints = 4;
      else basePoints = 3;
      
      let scopeFactor = 1.0;
      if (service.service_scope === 'International') scopeFactor = 1.5;
      else if (service.service_scope === 'National') scopeFactor = 1.2;
      else if (service.service_scope === 'Regional') scopeFactor = 1.0;
      else if (service.service_scope === 'Local') scopeFactor = 0.8;
      
      const durationHours = service.service_hours || 0;
      const hoursFactor = Math.min(durationHours / 20, 2.0);
      
      return Math.round(basePoints * scopeFactor * hoursFactor * 100) / 100;
    }

    function calculateLabScore(lab) {
      let basePoints = 0;
      if (lab.lab_responsibility === 'Lab Coordinator') basePoints = 10;
      else if (lab.lab_responsibility === 'Safety Officer') basePoints = 8;
      else if (lab.lab_responsibility === 'Equipment Manager') basePoints = 7;
      else if (lab.lab_responsibility === 'Inventory Manager') basePoints = 6;
      else if (lab.lab_responsibility === 'SOP Development') basePoints = 5;
      else if (lab.lab_responsibility === 'Lab Supervisor') basePoints = 4;
      else basePoints = 3;
      
      let frequencyFactor = 1.0;
      if (lab.lab_frequency === 'Full-Time') frequencyFactor = 1.0;
      else if (lab.lab_frequency === 'Per Semester') frequencyFactor = 0.5;
      else if (lab.lab_frequency === 'Per Course') frequencyFactor = 0.3;
      
      return Math.round(basePoints * frequencyFactor * 100) / 100;
    }

    function calculateProfessionalScore(prof) {
      let basePoints = 0;
      if (prof.prof_type === 'Professional Body Leadership') basePoints = 10;
      else if (prof.prof_type === 'Professional Certification') basePoints = 8;
      else if (prof.prof_type === 'Conference Organizer') basePoints = 7;
      else if (prof.prof_type === 'Editorial Board') basePoints = 6;
      else if (prof.prof_type === 'Professional Training') basePoints = 5;
      else if (prof.prof_type === 'Membership') basePoints = 3;
      else basePoints = 3;
      
      let scopeFactor = 1.0;
      if (prof.prof_scope === 'International') scopeFactor = 1.5;
      else if (prof.prof_scope === 'National') scopeFactor = 1.2;
      else if (prof.prof_scope === 'Regional') scopeFactor = 1.0;
      
      return Math.round(basePoints * scopeFactor * 100) / 100;
    }

    function getWorkloadStatus(totalScore) {
      if (totalScore >= 100) return { label: 'Overloaded', color: 'red', icon: '⚠️' };
      if (totalScore >= 70) return { label: 'Balanced', color: 'green', icon: '✅' };
      if (totalScore >= 40) return { label: 'Moderate', color: 'yellow', icon: '⚡' };
      return { label: 'Light', color: 'blue', icon: '💡' };
    }

    function renderHome() {
      const profile = getProfile();
      const scores = calculateScores();
      const status = getWorkloadStatus(scores.total);
      
      const courseCount = getRecordsBySection('teaching').length;
      const projectCount = getRecordsBySection('research').length;
      const publicationCount = getRecordsBySection('publications').length;
      const supervisionCount = getRecordsBySection('supervision').length;
      
      return `
        <div class="space-y-6">
          <!-- Hero Section -->
          <div class="bg-gradient-to-r from-sky-500 to-cyan-500 rounded-2xl shadow-xl p-8 text-white text-center">
            <h2 class="heading-font text-4xl font-bold mb-2">FST UMS Workload Calculator</h2>
            <p class="text-sky-100 text-lg">Faculty of Science and Technology</p>
            <p class="text-sky-100 text-base">Universiti Malaysia Sabah</p>
            
            ${profile ? `
              <div class="mt-6 bg-white bg-opacity-20 rounded-lg p-4 inline-block">
                <div class="text-sm text-sky-100 mb-1">Current User</div>
                <div class="text-xl font-bold">${profile.profile_name}</div>
                <div class="text-sm text-sky-100 mt-1">${profile.profile_rank || 'Staff'}</div>
              </div>
            ` : ''}
          </div>

          ${profile ? `
            <!-- Workload Index System -->
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-6">
              <h3 class="heading-font text-2xl font-bold mb-4 text-gray-900">📊 Workload Index</h3>
              
              <!-- Index Score with Visual Meter -->
              <div class="mb-6">
                <div class="flex items-end justify-between mb-2">
                  <div>
                    <div class="text-sm text-gray-600 mb-1">Your Workload Index</div>
                    <div class="text-5xl font-bold text-gray-900">${Math.min(Math.round(scores.total), 100)}<span class="text-2xl text-gray-500">/100</span></div>
                  </div>
                  <div class="text-right">
                    <div class="flex items-center gap-2 mb-1">
                      <span class="text-3xl">${status.icon}</span>
                      <span class="px-3 py-1 bg-${status.color}-100 text-${status.color}-700 rounded-full text-sm font-semibold">
                        ${status.label}
                      </span>
                    </div>
                    <div class="text-xs text-gray-500">Workload Status</div>
                  </div>
                </div>
                
                <!-- Visual Progress Bar -->
                <div class="relative w-full h-8 bg-gray-200 rounded-full overflow-hidden">
                  <div class="absolute inset-y-0 left-0 transition-all duration-500 ${
                    scores.total >= 100 ? 'bg-gradient-to-r from-red-500 to-red-600' :
                    scores.total >= 70 ? 'bg-gradient-to-r from-green-500 to-emerald-600' :
                    scores.total >= 40 ? 'bg-gradient-to-r from-yellow-500 to-amber-600' :
                    'bg-gradient-to-r from-blue-500 to-sky-600'
                  }" style="width: ${Math.min(scores.total, 100)}%"></div>
                  <div class="absolute inset-0 flex items-center justify-center">
                    <span class="text-xs font-bold ${scores.total > 50 ? 'text-white' : 'text-gray-700'}">${scores.total.toFixed(1)} points</span>
                  </div>
                </div>
                
                <!-- Zone Markers -->
                <div class="flex justify-between text-xs text-gray-500 mt-1 px-1">
                  <span>0</span>
                  <span class="text-blue-600 font-semibold">40</span>
                  <span class="text-yellow-600 font-semibold">70</span>
                  <span class="text-red-600 font-semibold">100</span>
                </div>
              </div>
              
              <!-- Interpretation Guide -->
              <div class="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div class="p-3 rounded-lg border-2 ${scores.total < 40 ? 'border-blue-400 bg-blue-50' : 'border-gray-200 bg-gray-50'}">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="text-xl">💡</span>
                    <span class="font-bold text-sm text-gray-900">Light (0-39)</span>
                  </div>
                  <div class="text-xs text-gray-600">Below recommended workload</div>
                </div>
                
                <div class="p-3 rounded-lg border-2 ${scores.total >= 40 && scores.total < 70 ? 'border-yellow-400 bg-yellow-50' : 'border-gray-200 bg-gray-50'}">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="text-xl">⚡</span>
                    <span class="font-bold text-sm text-gray-900">Moderate (40-69)</span>
                  </div>
                  <div class="text-xs text-gray-600">Healthy activity level</div>
                </div>
                
                <div class="p-3 rounded-lg border-2 ${scores.total >= 70 && scores.total < 100 ? 'border-green-400 bg-green-50' : 'border-gray-200 bg-gray-50'}">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="text-xl">✅</span>
                    <span class="font-bold text-sm text-gray-900">Balanced (70-99)</span>
                  </div>
                  <div class="text-xs text-gray-600">Optimal productivity zone</div>
                </div>
                
                <div class="p-3 rounded-lg border-2 ${scores.total >= 100 ? 'border-red-400 bg-red-50' : 'border-gray-200 bg-gray-50'}">
                  <div class="flex items-center gap-2 mb-1">
                    <span class="text-xl">⚠️</span>
                    <span class="font-bold text-sm text-gray-900">Overloaded (100+)</span>
                  </div>
                  <div class="text-xs text-gray-600">Consider rebalancing</div>
                </div>
              </div>
              
              <!-- Contextual Advice -->
              <div class="mt-4 p-4 rounded-lg ${
                scores.total >= 100 ? 'bg-red-50 border-l-4 border-red-500' :
                scores.total >= 70 ? 'bg-green-50 border-l-4 border-green-500' :
                scores.total >= 40 ? 'bg-yellow-50 border-l-4 border-yellow-500' :
                'bg-blue-50 border-l-4 border-blue-500'
              }">
                <p class="text-sm font-semibold ${
                  scores.total >= 100 ? 'text-red-900' :
                  scores.total >= 70 ? 'text-green-900' :
                  scores.total >= 40 ? 'text-yellow-900' :
                  'text-blue-900'
                } mb-1">
                  ${
                    scores.total >= 100 ? '⚠️ Workload Alert' :
                    scores.total >= 70 ? '✅ Well-Balanced Profile' :
                    scores.total >= 40 ? '⚡ Moderate Activity Level' :
                    '💡 Growing Your Profile'
                  }
                </p>
                <p class="text-xs ${
                  scores.total >= 100 ? 'text-red-800' :
                  scores.total >= 70 ? 'text-green-800' :
                  scores.total >= 40 ? 'text-yellow-800' :
                  'text-blue-800'
                }">
                  ${
                    scores.total >= 100 ? 'Your workload exceeds recommended levels. Consider discussing task delegation or timeline adjustments with your supervisor.' :
                    scores.total >= 70 ? 'Your workload is well-balanced across teaching, research, and service. You\'re in the optimal productivity zone!' :
                    scores.total >= 40 ? 'You have a healthy activity level. Consider adding more activities to strengthen your academic profile.' :
                    'Your current workload is light. This is a great opportunity to take on additional teaching, research, or service activities.'
                  }
                </p>
              </div>
            </div>

            <!-- Stats Grid -->
            <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
              <!-- Total Score -->
              <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div class="text-sm text-gray-600 mb-2">Total Score</div>
                <div class="text-4xl font-bold text-gray-900 mb-2">${scores.total.toFixed(1)}</div>
                <div class="flex items-center gap-2">
                  <span class="text-xl">${status.icon}</span>
                  <span class="px-2 py-1 bg-${status.color}-100 text-${status.color}-700 rounded-full text-xs font-semibold">
                    ${status.label}
                  </span>
                </div>
              </div>

              <!-- Courses -->
              <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div class="text-sm text-gray-600 mb-2">Courses</div>
                <div class="text-4xl font-bold text-sky-600">${courseCount}</div>
                <div class="text-xs text-gray-500 mt-2">Teaching load</div>
              </div>

              <!-- Projects -->
              <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div class="text-sm text-gray-600 mb-2">Projects</div>
                <div class="text-4xl font-bold text-green-600">${projectCount}</div>
                <div class="text-xs text-gray-500 mt-2">Research</div>
              </div>

              <!-- Publications -->
              <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
                <div class="text-sm text-gray-600 mb-2">Publications</div>
                <div class="text-4xl font-bold text-indigo-600">${publicationCount}</div>
                <div class="text-xs text-gray-500 mt-2">Scholarly work</div>
              </div>
            </div>
          ` : ''}

          <!-- Understanding Workload vs Performance -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 class="heading-font text-2xl font-bold mb-4 text-gray-900">💡 Understanding Workload vs Performance</h3>
            
            <div class="space-y-4">
              <div class="bg-blue-50 border-l-4 border-blue-500 p-4 rounded">
                <h4 class="font-bold text-blue-900 mb-2">📊 Workload (Beban Tugas)</h4>
                <p class="text-sm text-gray-700 mb-2">
                  <strong>Definition:</strong> The quantity and distribution of tasks assigned to academic staff.
                </p>
                <p class="text-sm text-gray-600">
                  <strong>Example:</strong> Teaching 3 courses, supervising 5 students, leading 2 research projects.
                </p>
              </div>

              <div class="bg-green-50 border-l-4 border-green-500 p-4 rounded">
                <h4 class="font-bold text-green-900 mb-2">🏆 Performance (Prestasi Kerja)</h4>
                <p class="text-sm text-gray-700 mb-2">
                  <strong>Definition:</strong> The quality and impact of work delivered by academic staff.
                </p>
                <p class="text-sm text-gray-600">
                  <strong>Example:</strong> High student satisfaction scores, Q1 journal publications, successful grant acquisitions.
                </p>
              </div>

              <div class="bg-amber-50 border-l-4 border-amber-500 p-4 rounded">
                <h4 class="font-bold text-amber-900 mb-2">🔑 Key Difference</h4>
                <p class="text-sm text-gray-700 mb-2">
                  <strong>Workload = Quantity</strong> (How much work you do) <br>
                  <strong>Performance = Quality</strong> (How well you do the work)
                </p>
                <p class="text-sm text-gray-600 mt-2">
                  <em>Note:</em> This calculator focuses on workload distribution and task allocation. 
                  Performance is assessed separately through KPIs, evaluations, and institutional assessments.
                </p>
              </div>
            </div>
          </div>

          <!-- Quick Start Cards -->
          <div class="grid grid-cols-1 md:grid-cols-3 gap-6">
            <!-- Profile Card -->
            <div class="bg-gradient-to-br from-blue-50 to-sky-50 rounded-xl shadow-sm border border-blue-200 p-6">
              <div class="text-3xl mb-3">👤</div>
              <h4 class="font-bold text-lg text-gray-900 mb-2">
                ${profile ? 'Update Profile' : 'Create Profile'}
              </h4>
              <p class="text-sm text-gray-600 mb-4">
                ${profile ? 'Update your information' : 'Start by entering your profile'}
              </p>
              <button onclick="navigateToSection('profile')" 
                      class="w-full px-4 py-2 bg-sky-600 text-white rounded-lg font-semibold hover:bg-sky-700 transition text-sm">
                ${profile ? 'Edit Profile →' : 'Get Started →'}
              </button>
            </div>

            <!-- Add Activities Card -->
            <div class="bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl shadow-sm border border-purple-200 p-6">
              <div class="text-3xl mb-3">📝</div>
              <h4 class="font-bold text-lg text-gray-900 mb-2">Add Activities</h4>
              <p class="text-sm text-gray-600 mb-4">Document teaching and research work</p>
              <button onclick="navigateToSection('teaching')" 
                      class="w-full px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition text-sm">
                Add Now →
              </button>
            </div>

            <!-- View Results Card -->
            <div class="bg-gradient-to-br from-green-50 to-emerald-50 rounded-xl shadow-sm border border-green-200 p-6">
              <div class="text-3xl mb-3">📊</div>
              <h4 class="font-bold text-lg text-gray-900 mb-2">View Results</h4>
              <p class="text-sm text-gray-600 mb-4">Comprehensive workload analysis</p>
              <button onclick="navigateToSection('results')" 
                      class="w-full px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition text-sm">
                View Analysis →
              </button>
            </div>
          </div>

          <!-- Smart Recommendations -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 class="heading-font text-2xl font-bold mb-4">💡 Recommendations & Insights</h3>
            
            ${scores.total >= 100 ? `
              <div class="bg-red-50 border-l-4 border-red-500 p-5 rounded-lg">
                <h4 class="font-bold text-red-900 text-lg mb-3">⚠️ Workload Overload Detected</h4>
                <p class="text-sm text-red-800 mb-3">Your workload score exceeds the recommended threshold. Consider these strategies:</p>
                <ul class="text-sm text-red-800 space-y-2 ml-4 list-disc">
                  <li><strong>Delegate tasks:</strong> Discuss with your supervisor about redistributing some responsibilities</li>
                  <li><strong>Timeline adjustments:</strong> Request deadline extensions for non-critical projects</li>
                  <li><strong>Work-life balance:</strong> Prioritize essential activities and reduce optional commitments</li>
                  <li><strong>Seek support:</strong> Consider requesting teaching assistants or research support staff</li>
                  <li><strong>Administrative relief:</strong> Explore temporary reduction in committee duties if possible</li>
                </ul>
              </div>
            ` : scores.total >= 70 ? `
              <div class="bg-green-50 border-l-4 border-green-500 p-5 rounded-lg">
                <h4 class="font-bold text-green-900 text-lg mb-3">✅ Well-Balanced Workload</h4>
                <p class="text-sm text-green-800 mb-3">Your workload is in the optimal productivity zone. To maintain this balance:</p>
                <ul class="text-sm text-green-800 space-y-2 ml-4 list-disc">
                  <li><strong>Maintain momentum:</strong> Continue your current pace without taking on major new commitments</li>
                  <li><strong>Quality focus:</strong> Invest time in deepening the impact of existing projects</li>
                  <li><strong>Mentorship opportunities:</strong> Share your balanced approach with junior colleagues</li>
                  <li><strong>Strategic planning:</strong> Use this stable period to plan long-term research directions</li>
                  <li><strong>Professional development:</strong> Attend workshops or conferences to enhance skills</li>
                </ul>
              </div>
            ` : scores.total >= 40 ? `
              <div class="bg-yellow-50 border-l-4 border-yellow-500 p-5 rounded-lg">
                <h4 class="font-bold text-yellow-900 text-lg mb-3">⚡ Moderate Workload - Growth Opportunities</h4>
                <p class="text-sm text-yellow-800 mb-3">You have capacity to expand your academic profile. Consider:</p>
                <ul class="text-sm text-yellow-800 space-y-2 ml-4 list-disc">
                  <li><strong>Increase teaching:</strong> Offer to teach an additional elective or take on coordinator roles</li>
                  <li><strong>Expand research:</strong> Apply for new grants or join collaborative research projects</li>
                  <li><strong>Supervision:</strong> Take on additional postgraduate or undergraduate supervisees</li>
                  <li><strong>Publication pipeline:</strong> Convert existing research into journal publications</li>
                  <li><strong>Committee participation:</strong> Join faculty or university-level committees</li>
                </ul>
              </div>
            ` : `
              <div class="bg-blue-50 border-l-4 border-blue-500 p-5 rounded-lg">
                <h4 class="font-bold text-blue-900 text-lg mb-3">💡 Light Workload - Profile Building Phase</h4>
                <p class="text-sm text-blue-800 mb-3">Great opportunity to build your academic profile. Focus on:</p>
                <ul class="text-sm text-blue-800 space-y-2 ml-4 list-disc">
                  <li><strong>Teaching expansion:</strong> Volunteer to teach core courses or develop new course materials</li>
                  <li><strong>Research initiation:</strong> Start or join research projects, apply for seed grants</li>
                  <li><strong>Student supervision:</strong> Actively recruit postgraduate and FYP students</li>
                  <li><strong>Publication drive:</strong> Target 2-3 publications per year in indexed journals</li>
                  <li><strong>Administrative roles:</strong> Express interest in programme coordinator or committee positions</li>
                  <li><strong>Professional networking:</strong> Join professional bodies and attend conferences</li>
                </ul>
              </div>
            `}
          </div>

          <!-- Reset Data Section -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 class="heading-font text-2xl font-bold mb-4 text-gray-900">🔄 Reset Data</h3>
            
            <div class="space-y-4">
              <!-- Clear Activities Only -->
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
                  <button id="clear-activities-btn" onclick="showClearActivitiesConfirm()" 
                          class="px-5 py-2 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition text-sm">
                    Clear Activities
                  </button>
                  <button id="confirm-clear-activities-btn" onclick="confirmClearActivities()" 
                          class="hidden px-5 py-2 bg-orange-700 text-white rounded-lg font-bold hover:bg-orange-800 transition text-sm">
                    ✓ Yes, Delete All Activities
                  </button>
                  <button id="cancel-clear-activities-btn" onclick="cancelClearActivities()" 
                          class="hidden px-5 py-2 bg-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-400 transition text-sm">
                    Cancel
                  </button>
                </div>
              </div>

              <!-- Reset All Data -->
              <div class="border-2 border-red-200 bg-red-50 rounded-lg p-5">
                <h4 class="font-bold text-red-900 mb-2">Reset All Data</h4>
                <p class="text-sm text-red-800 mb-4">
                  Permanently delete ALL data including your profile and all activities. This action cannot be undone.
                </p>
                <div id="reset-all-confirm" class="hidden mb-3">
                  <div class="bg-white border-2 border-red-400 rounded-lg p-4">
                    <p class="text-sm font-bold text-red-900 mb-3">⚠️ FINAL WARNING: This will delete EVERYTHING:</p>
                    <ul class="text-xs text-red-800 ml-4 list-disc space-y-1 mb-3">
                      <li><strong>Your staff profile</strong></li>
                      <li>All teaching, supervision, research records</li>
                      <li>All publications and administrative data</li>
                      <li>All service, laboratory, and professional activities</li>
                    </ul>
                    <p class="text-xs text-red-700 font-bold">⚠️ Consider exporting your data first using the buttons above!</p>
                  </div>
                </div>
                <div class="flex gap-3">
                  <button id="reset-all-btn" onclick="showResetAllConfirm()" 
                          class="px-5 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition text-sm">
                    Reset All Data
                  </button>
                  <button id="confirm-reset-all-btn" onclick="confirmResetAll()" 
                          class="hidden px-5 py-2 bg-red-700 text-white rounded-lg font-bold hover:bg-red-800 transition text-sm">
                    ✓ Yes, Delete Everything
                  </button>
                  <button id="cancel-reset-all-btn" onclick="cancelResetAll()" 
                          class="hidden px-5 py-2 bg-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-400 transition text-sm">
                    Cancel
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      `;
    }

    function renderProfile() {
      const profile = getProfile();
      
      if (profile) {
        const isAcademic = profile.profile_category === 'Academic Staff';
        
        return `
          <div class="max-w-2xl mx-auto">
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 class="heading-font text-2xl font-bold mb-6">👤 Staff Profile</h2>
              
              <div class="bg-gradient-to-r from-sky-50 to-blue-50 rounded-lg p-6 mb-6 border-l-4 border-sky-500">
                <div class="space-y-3">
                  <div>
                    <label class="text-sm font-semibold text-gray-600">Full Name</label>
                    <p class="text-lg font-semibold text-gray-900">${profile.profile_name}</p>
                  </div>
                  <div>
                    <label class="text-sm font-semibold text-gray-600">Staff ID</label>
                    <p class="text-gray-900">${profile.profile_staff_id}</p>
                  </div>
                  <div>
                    <label class="text-sm font-semibold text-gray-600">Staff Category</label>
                    <p class="text-gray-900">${profile.profile_category}</p>
                  </div>
                  ${isAcademic ? `
                    <div>
                      <label class="text-sm font-semibold text-gray-600">Programme</label>
                      <p class="text-gray-900">${profile.profile_programme}</p>
                    </div>
                    <div>
                      <label class="text-sm font-semibold text-gray-600">Academic Rank</label>
                      <p class="text-gray-900">${profile.profile_rank}</p>
                    </div>
                  ` : ''}
                  <div>
                    <label class="text-sm font-semibold text-gray-600">Administrative Position</label>
                    <p class="text-gray-900">${profile.profile_admin_position === 'Other' ? profile.profile_other_admin_position : profile.profile_admin_position}</p>
                  </div>
                </div>
                <button type="button" onclick="deleteProfile('${profile.__backendId}')" 
                        class="mt-4 px-4 py-2 text-red-600 hover:bg-red-50 rounded-lg font-medium text-sm border border-red-200">
                  Delete Profile
                </button>
              </div>
            </div>
          </div>
        `;
      }
      
      return `
        <div class="max-w-2xl mx-auto">
          <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 class="heading-font text-2xl font-bold mb-6">👤 Staff Profile</h2>
            
            <form id="profile-form" onsubmit="saveProfile(event)" class="space-y-6">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="md:col-span-2">
                  <label for="profile-name" class="block text-sm font-semibold text-gray-700 mb-2">Full Name *</label>
                  <input type="text" id="profile-name" required 
                         class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"
                         placeholder="Assis Kamu">
                </div>
                
                <div>
                  <label for="profile-staffId" class="block text-sm font-semibold text-gray-700 mb-2">Staff ID *</label>
                  <input type="text" id="profile-staffId" required
                         class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"
                         placeholder="250505-05050">
                </div>
                
                <div>
                  <label for="profile-category" class="block text-sm font-semibold text-gray-700 mb-2">Staff Category *</label>
                  <select id="profile-category" required onchange="toggleAcademicFields()" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none">
                    <option value="">Select Category</option>
                    <option value="Academic Staff">Academic Staff</option>
                    <option value="Administration Staff">Administration Staff</option>
                    <option value="Lab Staff">Lab Staff</option>
                  </select>
                </div>
                
                <div id="programme-field" class="md:col-span-2" style="display: none;">
                  <label for="profile-programme" class="block text-sm font-semibold text-gray-700 mb-2">Programme *</label>
                  <select id="profile-programme" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none">
                    <option value="">Select Programme</option>
                    <option value="UH6011 Environmental Science (Resources Management)">UH6011 Environmental Science (Resources Management)</option>
                    <option value="UH6021 Environmental Science (Conservation)">UH6021 Environmental Science (Conservation)</option>
                    <option value="UH6031 Environmental Science (Eco-Tourism)">UH6031 Environmental Science (Eco-Tourism)</option>
                    <option value="UH6041 Marine Science">UH6041 Marine Science</option>
                    <option value="UH6051 Plant Technology">UH6051 Plant Technology</option>
                    <option value="UH6061 Animal Science and Agribusiness">UH6061 Animal Science and Agribusiness</option>
                    <option value="UH6071 Food Science and Nutrition">UH6071 Food Science and Nutrition</option>
                    <option value="UH6081 Biotechnology">UH6081 Biotechnology</option>
                    <option value="UH6091 Chemistry with Marketing">UH6091 Chemistry with Marketing</option>
                    <option value="UH6101 Geology">UH6101 Geology</option>
                    <option value="UH6111 Industrial Chemistry">UH6111 Industrial Chemistry</option>
                    <option value="UH6121 Aquaculture">UH6121 Aquaculture</option>
                  </select>
                </div>
                
                <div id="rank-field" class="md:col-span-2" style="display: none;">
                  <label for="profile-rank" class="block text-sm font-semibold text-gray-700 mb-2">Academic Rank *</label>
                  <select id="profile-rank" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none">
                    <option value="">Select Rank</option>
                    <option value="Professor">Professor</option>
                    <option value="Associate Professor">Associate Professor</option>
                    <option value="Senior Lecturer">Senior Lecturer</option>
                    <option value="Lecturer">Lecturer</option>
                  </select>
                </div>
                
                <div class="md:col-span-2">
                  <label for="profile-admin-position" class="block text-sm font-semibold text-gray-700 mb-2">Administrative Position (Allowance)</label>
                  <select id="profile-admin-position" onchange="toggleOtherAdminPosition()" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none">
                    <option value="None">None</option>
                    <option value="Dean">Dean</option>
                    <option value="Deputy Dean">Deputy Dean</option>
                    <option value="Head of Programme">Head of Programme</option>
                    <option value="Postgraduate Coordinator">Postgraduate Coordinator</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                
                <div id="other-admin-position-field" class="md:col-span-2" style="display: none;">
                  <label for="profile-other-admin-position" class="block text-sm font-semibold text-gray-700 mb-2">Specify Position</label>
                  <input type="text" id="profile-other-admin-position"
                         class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"
                         placeholder="Enter administrative position">
                </div>
              </div>
              
              <button type="submit" id="save-profile-btn" class="w-full px-6 py-3 bg-sky-600 text-white rounded-lg font-semibold hover:bg-sky-700">
                📝 Save Profile
              </button>
            </form>
          </div>
        </div>
      `;
    }

    function setupProfileEventListeners() {
      // Event listeners set up via onchange attributes
    }

    function toggleAcademicFields() {
      const category = document.getElementById('profile-category').value;
      const programmeField = document.getElementById('programme-field');
      const rankField = document.getElementById('rank-field');
      const programmeSelect = document.getElementById('profile-programme');
      const rankSelect = document.getElementById('profile-rank');
      
      if (category === 'Academic Staff') {
        programmeField.style.display = 'block';
        rankField.style.display = 'block';
        programmeSelect.required = true;
        rankSelect.required = true;
      } else {
        programmeField.style.display = 'none';
        rankField.style.display = 'none';
        programmeSelect.required = false;
        rankSelect.required = false;
        programmeSelect.value = '';
        rankSelect.value = '';
      }
    }

    function toggleOtherAdminPosition() {
      const adminPosition = document.getElementById('profile-admin-position').value;
      const otherField = document.getElementById('other-admin-position-field');
      const otherInput = document.getElementById('profile-other-admin-position');
      
      if (adminPosition === 'Other') {
        otherField.style.display = 'block';
      } else {
        otherField.style.display = 'none';
        otherInput.value = '';
      }
    }

    async function saveProfile(event) {
      event.preventDefault();
      
      if (allRecords.length >= 999) {
        showToast('Maximum limit of 999 records reached', 'error');
        return;
      }
      
      const btn = document.getElementById('save-profile-btn');
      btn.disabled = true;
      btn.innerHTML = '<div class="loading-spinner mx-auto"></div>';
      
      const category = document.getElementById('profile-category').value;
      const isAcademic = category === 'Academic Staff';
      const adminPosition = document.getElementById('profile-admin-position').value;
      
      const profileData = {
        section: 'profile',
        profile_name: document.getElementById('profile-name').value,
        profile_staff_id: document.getElementById('profile-staffId').value,
        profile_category: category,
        profile_programme: isAcademic ? document.getElementById('profile-programme').value : '',
        profile_rank: isAcademic ? document.getElementById('profile-rank').value : '',
        profile_admin_position: adminPosition,
        profile_other_admin_position: adminPosition === 'Other' ? document.getElementById('profile-other-admin-position').value : '',
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
        showToast('Profile deleted successfully!');
      } else {
        showToast('Failed to delete profile', 'error');
      }
    }

    function renderTeaching() {
      const courses = getRecordsBySection('teaching');
      
      return `
        <div class="space-y-6">
          <!-- Formula Card -->
          <div class="bg-gradient-to-r from-blue-50 to-sky-50 rounded-xl shadow-sm border-2 border-blue-200 p-6">
            <h3 class="font-bold text-lg text-blue-900 mb-3">🧮 Teaching Workload Score Calculation</h3>
            
            <div class="bg-white rounded-lg p-4 mb-4">
              <p class="text-sm text-gray-700 mb-3">
                <strong>Formula:</strong> Weekly Hours × Class Size Factor
              </p>
              <div class="text-xs text-gray-600 space-y-2">
                <p><strong>Step 1:</strong> Total semester hours = Lecture + Tutorial + Lab + Fieldwork</p>
                <p><strong>Step 2:</strong> Weekly hours = Total semester hours ÷ 14 weeks</p>
                <p><strong>Step 3:</strong> Class Size Factor: >100 → 1.5, >50 → 1.3, else → 1.0</p>
                <p><strong>Step 4:</strong> Course Score = Weekly hours × Class size factor (rounded to 1 decimal)</p>
              </div>
            </div>
            
            <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
              <p class="text-sm font-semibold text-yellow-900 mb-2">Example:</p>
              <p class="text-xs text-gray-700">
                Course with 22L + 6T + 0Lab + 0F = 28 hours total<br>
                Weekly = 28 ÷ 14 = 2.0 hours/week<br>
                Class size 45 students → factor 1.0<br>
                <strong class="text-green-700">Score = 2.0 × 1.0 = 2.0 points</strong>
              </p>
            </div>
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
                         placeholder="e.g., CS101">
                </div>
                
                <div>
                  <label for="course-name" class="block text-sm font-semibold text-gray-700 mb-2">Course Name *</label>
                  <input type="text" id="course-name" required 
                         class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"
                         placeholder="e.g., Introduction to Programming">
                </div>
                
                <div>
                  <label for="course-credit-hours" class="block text-sm font-semibold text-gray-700 mb-2">Credit Hours *</label>
                  <input type="number" id="course-credit-hours" required min="0" step="1"
                         class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"
                         placeholder="3">
                </div>
                
                <div>
                  <label for="course-class-size" class="block text-sm font-semibold text-gray-700 mb-2">Class Size *</label>
                  <input type="number" id="course-class-size" required min="1"
                         class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"
                         placeholder="45">
                </div>
                
                <div>
                  <label for="course-lecture" class="block text-sm font-semibold text-gray-700 mb-2">Lecture Hours (per semester) *</label>
                  <input type="number" id="course-lecture" required min="0" step="0.5"
                         class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"
                         placeholder="42">
                </div>
                
                <div>
                  <label for="course-tutorial" class="block text-sm font-semibold text-gray-700 mb-2">Tutorial Hours (per semester)</label>
                  <input type="number" id="course-tutorial" min="0" step="0.5" value="0"
                         class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"
                         placeholder="14">
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
                
                <div>
                  <label for="course-semester" class="block text-sm font-semibold text-gray-700 mb-2">Semester *</label>
                  <select id="course-semester" required onchange="toggleOtherSemester()" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none">
                    <option value="">Select Semester</option>
                    <option value="Semester 1 2024/2025">Semester 1 2024/2025</option>
                    <option value="Semester 2 2024/2025">Semester 2 2024/2025</option>
                    <option value="Semester 1 2023/2024">Semester 1 2023/2024</option>
                    <option value="Semester 2 2023/2024">Semester 2 2023/2024</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                
                <div id="other-semester-field" style="display: none;">
                  <label for="course-semester-other" class="block text-sm font-semibold text-gray-700 mb-2">Specify Semester *</label>
                  <input type="text" id="course-semester-other"
                         class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"
                         placeholder="e.g., Summer 2024">
                </div>
                
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
                  const score = calculateCourseScore(course);
                  const totalHours = (course.course_lecture || 0) + (course.course_tutorial || 0) + 
                                    (course.course_lab || 0) + (course.course_fieldwork || 0);
                  const weeklyHours = (totalHours / 14).toFixed(1);
                  const semester = course.course_semester === 'Other' ? course.course_semester_other : course.course_semester;
                  
                  return `
                    <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div class="flex-1">
                        <div class="font-semibold text-gray-900">${course.course_code} - ${course.course_name}</div>
                        <div class="text-sm text-gray-600 mt-1">
                          ${course.course_credit_hours} credits • ${course.course_class_size} students • ${course.course_role}
                        </div>
                        <div class="text-sm text-gray-600 mt-1">
                          Total: ${totalHours}h (L:${course.course_lecture || 0}, T:${course.course_tutorial || 0}, Lab:${course.course_lab || 0}, F:${course.course_fieldwork || 0}) • 
                          Weekly: ${weeklyHours}h
                        </div>
                        ${semester ? `<div class="text-xs text-gray-500 mt-1">${semester}</div>` : ''}
                        <div class="text-xs text-gray-500 mt-1">
                          <span class="font-semibold text-green-700">Score: ${score}</span>
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
      // Event listeners set up via onchange attributes
    }

    function toggleOtherSemester() {
      const semester = document.getElementById('course-semester').value;
      const otherField = document.getElementById('other-semester-field');
      const otherInput = document.getElementById('course-semester-other');
      
      if (semester === 'Other') {
        otherField.style.display = 'block';
        otherInput.required = true;
      } else {
        otherField.style.display = 'none';
        otherInput.required = false;
        otherInput.value = '';
      }
    }

    function toggleOtherAdminPositionField() {
      const position = document.getElementById('admin-position').value;
      const otherField = document.getElementById('other-admin-position-field');
      const otherInput = document.getElementById('admin-other-position');
      
      if (position === 'Other') {
        otherField.style.display = 'block';
        otherInput.required = true;
      } else {
        otherField.style.display = 'none';
        otherInput.required = false;
        otherInput.value = '';
      }
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
      
      const semester = document.getElementById('course-semester').value;
      
      const courseData = {
        section: 'teaching',
        course_code: document.getElementById('course-code').value,
        course_name: document.getElementById('course-name').value,
        course_credit_hours: parseInt(document.getElementById('course-credit-hours').value),
        course_lecture: parseFloat(document.getElementById('course-lecture').value) || 0,
        course_tutorial: parseFloat(document.getElementById('course-tutorial').value) || 0,
        course_lab: parseFloat(document.getElementById('course-lab').value) || 0,
        course_fieldwork: parseFloat(document.getElementById('course-fieldwork').value) || 0,
        course_class_size: parseInt(document.getElementById('course-class-size').value),
        course_semester: semester,
        course_semester_other: semester === 'Other' ? document.getElementById('course-semester-other').value : '',
        course_role: document.getElementById('course-role').value,
        created_at: new Date().toISOString()
      };
      
      const result = await window.dataSdk.create(courseData);
      
      btn.disabled = false;
      btn.innerHTML = '➕ Add Course';
      
      if (result.isOk) {
        showToast('Course added successfully!');
        document.getElementById('teaching-form').reset();
        document.getElementById('other-semester-field').style.display = 'none';
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
      
      return `
        <div class="space-y-6">
          <!-- Formula Card -->
          <div class="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl shadow-sm border-2 border-purple-200 p-6">
            <h3 class="font-bold text-lg text-purple-900 mb-3">🧮 Supervision Score Calculation Formula</h3>
            
            <div class="bg-white rounded-lg p-4 mb-4">
              <p class="text-sm text-gray-700 mb-3">
                <strong>Score per Student = Points based on Level × Role</strong>
              </p>
              <div class="text-xs text-gray-600 space-y-2">
                <p><strong>PhD:</strong> Main Supervisor = 8 points, Co-Supervisor = 4 points</p>
                <p><strong>Masters:</strong> Main Supervisor = 5 points, Co-Supervisor = 2.5 points</p>
                <p><strong>Undergraduate (FYP):</strong> 1 point (role doesn't affect score)</p>
              </div>
            </div>
            
            <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
              <p class="text-sm font-semibold text-yellow-900 mb-2">Example:</p>
              <p class="text-xs text-gray-700">
                • 1 PhD (Main) = 8.0<br>
                • 2 Masters (1 Main + 1 Co) = 5.0 + 2.5 = 7.5<br>
                • 3 Undergraduate = 3 × 1.0 = 3.0<br>
                <strong class="text-green-700">Total: 18.5 points</strong>
              </p>
            </div>
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
                         placeholder="e.g., John Smith">
                </div>
                
                <div>
                  <label for="student-matric" class="block text-sm font-semibold text-gray-700 mb-2">Matric Number *</label>
                  <input type="text" id="student-matric" required
                         class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"
                         placeholder="e.g., A12345678">
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
                  <label for="student-role" class="block text-sm font-semibold text-gray-700 mb-2">Supervision Role *</label>
                  <select id="student-role" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none">
                    <option value="">Select Role</option>
                    <option value="main">Main Supervisor</option>
                    <option value="co">Co-Supervisor</option>
                  </select>
                </div>
                
                <div class="md:col-span-2">
                  <label for="student-title" class="block text-sm font-semibold text-gray-700 mb-2">Research Title *</label>
                  <input type="text" id="student-title" required
                         class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"
                         placeholder="e.g., Machine Learning Applications in Healthcare">
                </div>
                
                <div>
                  <label for="student-year" class="block text-sm font-semibold text-gray-700 mb-2">Start Year *</label>
                  <input type="number" id="student-year" required min="2000" max="2030"
                         class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"
                         placeholder="2024">
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
                  const score = calculateSupervisionScore(student);
                  const roleLabel = student.student_role === 'main' ? 'Main Supervisor' : 'Co-Supervisor';
                  
                  return `
                    <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div class="flex-1">
                        <div class="font-semibold text-gray-900">${student.student_name} (${student.student_matric})</div>
                        <div class="text-sm text-gray-600 mt-1">
                          ${student.student_level.toUpperCase()} • ${roleLabel} • Started ${student.student_year}
                        </div>
                        <div class="text-xs text-gray-500 mt-1">${student.student_title}</div>
                        <div class="text-xs text-gray-500 mt-1">
                          <span class="font-semibold text-green-700">Score: ${score}</span>
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

    async function saveStudent(event) {
      event.preventDefault();
      
      if (allRecords.length >= 999) {
        showToast('Maximum limit of 999 records reached', 'error');
        return;
      }
      
      const btn = document.getElementById('save-student-btn');
      btn.disabled = true;
      btn.innerHTML = '<div class="loading-spinner mx-auto"></div>';
      
      const studentData = {
        section: 'supervision',
        student_name: document.getElementById('student-name').value,
        student_matric: document.getElementById('student-matric').value,
        student_level: document.getElementById('student-level').value,
        student_role: document.getElementById('student-role').value,
        student_title: document.getElementById('student-title').value,
        student_year: parseInt(document.getElementById('student-year').value),
        created_at: new Date().toISOString()
      };
      
      const result = await window.dataSdk.create(studentData);
      
      btn.disabled = false;
      btn.innerHTML = '➕ Add Student';
      
      if (result.isOk) {
        showToast('Student added successfully!');
        document.getElementById('supervision-form').reset();
      } else {
        showToast('Failed to add student', 'error');
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

    function renderResearch() {
      const projects = getRecordsBySection('research');
      
      return `
        <div class="space-y-6">
          <!-- Scoring Formula Card -->
          <div class="bg-gradient-to-r from-green-50 to-emerald-50 rounded-xl shadow-sm border-2 border-green-200 p-6">
            <h3 class="font-bold text-lg text-green-900 mb-3">🧮 Research Score Calculation Formula</h3>
            
            <div class="bg-white rounded-lg p-4 mb-4">
              <p class="text-sm text-gray-700 mb-3">
                <strong>Score = Base Points × Role Factor × Status Factor</strong>
              </p>
              <div class="text-xs text-gray-600 space-y-2">
                <p><strong>Base Points:</strong> 5 (fixed for all projects)</p>
                
                <p class="mt-2"><strong>Role Factor:</strong></p>
                <p>• Lead Researcher = 1.0</p>
                <p>• Co-Lead Researcher = 0.7</p>
                <p>• Research Member = 0.5</p>
                
                <p class="mt-2"><strong>Status Factor:</strong></p>
                <p>• Ongoing = 1.0</p>
                <p>• Completed = 0.8</p>
                <p>• Pending Approval = 0.3</p>
              </div>
            </div>
            
            <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
              <p class="text-sm font-semibold text-yellow-900 mb-2">Example Calculation:</p>
              <p class="text-xs text-gray-700">
                💡 Lead, Ongoing: 5 × 1.0 × 1.0 = <strong>5.00</strong><br>
                • Co-Lead, Completed: 5 × 0.7 × 0.8 = <strong>2.80</strong><br>
                • Member, Pending: 5 × 0.5 × 0.3 = <strong>0.75</strong><br>
                <strong class="text-green-700">Total: 8.55 points</strong>
              </p>
            </div>
          </div>

          <!-- Add Research Project Form -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 class="heading-font text-2xl font-bold mb-6">🔬 Research Projects</h2>
            
            <form id="research-form" onsubmit="saveResearch(event)" class="space-y-6">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="md:col-span-2">
                  <label for="research-title" class="block text-sm font-semibold text-gray-700 mb-2">Project Title *</label>
                  <input type="text" id="research-title" required 
                         class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"
                         placeholder="e.g., AI for Healthcare Diagnostics">
                </div>
                
                <div>
                  <label for="research-grant-code" class="block text-sm font-semibold text-gray-700 mb-2">Grant Code *</label>
                  <input type="text" id="research-grant-code" required 
                         class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"
                         placeholder="e.g., SDK0123-2024">
                </div>
                
                <div>
                  <label for="research-role" class="block text-sm font-semibold text-gray-700 mb-2">Your Role *</label>
                  <select id="research-role" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none">
                    <option value="">Select Role</option>
                    <option value="lead">Lead Researcher</option>
                    <option value="co-lead">Co-Lead Researcher</option>
                    <option value="member">Research Member</option>
                  </select>
                </div>
                
                <div>
                  <label for="research-amount" class="block text-sm font-semibold text-gray-700 mb-2">Grant Amount (RM) *</label>
                  <input type="number" id="research-amount" required min="0" step="0.01"
                         class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"
                         placeholder="50000.00">
                </div>
                
                <div>
                  <label for="research-status" class="block text-sm font-semibold text-gray-700 mb-2">Status *</label>
                  <select id="research-status" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none">
                    <option value="">Select Status</option>
                    <option value="ongoing">Ongoing</option>
                    <option value="completed">Completed</option>
                    <option value="pending">Pending Approval</option>
                  </select>
                </div>
                
                <div>
                  <label for="research-year" class="block text-sm font-semibold text-gray-700 mb-2">Start Year *</label>
                  <input type="number" id="research-year" required min="2000" max="2030"
                         class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"
                         placeholder="2024">
                </div>
                
                <div>
                  <label for="research-duration" class="block text-sm font-semibold text-gray-700 mb-2">Duration (years) *</label>
                  <input type="number" id="research-duration" required min="1" max="10" step="0.5"
                         class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"
                         placeholder="2.0">
                </div>
              </div>
              
              <div class="flex justify-between">
                <button type="button" onclick="navigateToSection('supervision')" class="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300">
                  ← Previous
                </button>
                <button type="submit" id="save-research-btn" class="px-6 py-3 bg-sky-600 text-white rounded-lg font-semibold hover:bg-sky-700">
                  ➕ Add Project
                </button>
              </div>
            </form>
          </div>
          
          ${projects.length > 0 ? `
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 class="font-bold text-lg mb-4">Research Projects (${projects.length})</h3>
              <div class="space-y-3">
                ${projects.map(proj => {
                  const score = calculateResearchScore(proj);
                  const roleLabel = proj.research_role === 'lead' ? 'Lead Researcher' : 
                                   proj.research_role === 'co-lead' ? 'Co-Lead Researcher' : 'Research Member';
                  const statusLabel = proj.research_status === 'ongoing' ? 'Ongoing' : 
                                     proj.research_status === 'completed' ? 'Completed' : 'Pending Approval';
                  
                  return `
                    <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div class="flex-1">
                        <div class="font-semibold text-gray-900">${proj.research_title}</div>
                        <div class="text-sm text-gray-600 mt-1">
                          ${proj.research_grant_code} • ${roleLabel} • RM ${parseFloat(proj.research_amount).toLocaleString('en-MY', {minimumFractionDigits: 2, maximumFractionDigits: 2})}
                        </div>
                        <div class="text-xs text-gray-500 mt-1">
                          ${proj.research_year} • ${proj.research_duration} years • ${statusLabel}
                        </div>
                        <div class="text-xs text-gray-500 mt-1">
                          <span class="font-semibold text-green-700">Score: ${score.toFixed(2)}</span>
                        </div>
                      </div>
                      <button type="button" onclick="deleteResearchProject('${proj.__backendId}')" 
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
            <button onclick="navigateToSection('publications')" class="px-6 py-3 bg-sky-600 text-white rounded-lg font-semibold hover:bg-sky-700">
              Next: Publications →
            </button>
          </div>
        </div>
      `;
    }

    async function saveResearch(event) {
      event.preventDefault();
      
      if (allRecords.length >= 999) {
        showToast('Maximum limit of 999 records reached', 'error');
        return;
      }
      
      const btn = document.getElementById('save-research-btn');
      btn.disabled = true;
      btn.innerHTML = '<div class="loading-spinner mx-auto"></div>';
      
      const researchData = {
        section: 'research',
        research_title: document.getElementById('research-title').value,
        research_grant_code: document.getElementById('research-grant-code').value,
        research_role: document.getElementById('research-role').value,
        research_amount: parseFloat(document.getElementById('research-amount').value),
        research_status: document.getElementById('research-status').value,
        research_year: parseInt(document.getElementById('research-year').value),
        research_duration: parseFloat(document.getElementById('research-duration').value),
        created_at: new Date().toISOString()
      };
      
      const result = await window.dataSdk.create(researchData);
      
      btn.disabled = false;
      btn.innerHTML = '➕ Add Project';
      
      if (result.isOk) {
        showToast('Research project added successfully!');
        document.getElementById('research-form').reset();
      } else {
        showToast('Failed to add research project', 'error');
      }
    }

    async function deleteResearchProject(backendId) {
      const project = allRecords.find(r => r.__backendId === backendId);
      if (!project) return;
      
      const result = await window.dataSdk.delete(project);
      
      if (result.isOk) {
        showToast('Research project deleted successfully!');
      } else {
        showToast('Failed to delete research project', 'error');
      }
    }

    function renderPublications() {
      const publications = getRecordsBySection('publications');
      
      return `
        <div class="space-y-6">
          <!-- Scoring Formula Card -->
          <div class="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl shadow-sm border-2 border-emerald-200 p-6">
            <h3 class="font-bold text-lg text-emerald-900 mb-3">🧮 Publications Score Calculation Formula</h3>
            
            <div class="bg-white rounded-lg p-4 mb-4">
              <p class="text-sm text-gray-700 mb-3">
                <strong>Score = Base Points × Indexing Factor × Author Position Factor × Status Factor</strong>
              </p>
              <div class="text-xs text-gray-600 space-y-2">
                <p><strong>Base Points (by type):</strong></p>
                <p>• Journal Article = 10 | Conference Paper = 6 | Book = 15 | Book Chapter = 8 | Proceeding = 5</p>
                
                <p class="mt-2"><strong>Indexing Factor:</strong></p>
                <p>• Q1 = 2.0 | Q2 = 1.5 | Q3 = 1.3 | Q4 = 1.1 | Scopus = 1.2 | WoS = 1.2 | Other Indexed = 0.8</p>
                
                <p class="mt-2"><strong>Author Position Factor:</strong></p>
                <p>• First Author = 1.0 | Corresponding Author = 1.0 | Co-Author = 0.5</p>
                
                <p class="mt-2"><strong>Status Factor:</strong></p>
                <p>• Published = 1.0 | Accepted = 0.8 | Under Review = 0.3</p>
              </div>
            </div>
            
            <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
              <p class="text-sm font-semibold text-yellow-900 mb-2">Example Calculation:</p>
              <p class="text-xs text-gray-700">
                • Journal (Q1, First Author, Published): 10 × 2.0 × 1.0 × 1.0 = <strong>20.0</strong><br>
                • Conference (Scopus, Co-Author, Accepted): 6 × 1.2 × 0.5 × 0.8 = <strong>2.88</strong><br>
                • Book Chapter (Other, Corresponding, Published): 8 × 0.8 × 1.0 × 1.0 = <strong>6.4</strong><br>
                <strong class="text-green-700">Total: 29.28 points</strong>
              </p>
            </div>
          </div>

          <!-- Add Publication Form -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 class="heading-font text-2xl font-bold mb-6">📝 Scholarly Writing & Publications</h2>
            
            <form id="publication-form" onsubmit="savePublication(event)" class="space-y-6">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="md:col-span-2">
                  <label for="pub-title" class="block text-sm font-semibold text-gray-700 mb-2">Publication Title *</label>
                  <input type="text" id="pub-title" required 
                         class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"
                         placeholder="e.g., Machine Learning Applications in Marine Biology">
                </div>
                
                <div>
                  <label for="pub-type" class="block text-sm font-semibold text-gray-700 mb-2">Publication Type *</label>
                  <select id="pub-type" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none">
                    <option value="">Select Type</option>
                    <option value="journal">Journal Article</option>
                    <option value="conference">Conference Paper</option>
                    <option value="book">Book</option>
                    <option value="chapter">Book Chapter</option>
                    <option value="proceeding">Proceeding</option>
                  </select>
                </div>
                
                <div>
                  <label for="pub-index" class="block text-sm font-semibold text-gray-700 mb-2">Indexing *</label>
                  <select id="pub-index" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none">
                    <option value="">Select Indexing</option>
                    <option value="Q1">Q1</option>
                    <option value="Q2">Q2</option>
                    <option value="Q3">Q3</option>
                    <option value="Q4">Q4</option>
                    <option value="Scopus">Scopus</option>
                    <option value="WoS">Web of Science (WoS)</option>
                    <option value="Other">Other Indexed</option>
                  </select>
                </div>
                
                <div>
                  <label for="pub-venue" class="block text-sm font-semibold text-gray-700 mb-2">Journal/Conference Name *</label>
                  <input type="text" id="pub-venue" required 
                         class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"
                         placeholder="e.g., Journal of Marine Science">
                </div>
                
                <div>
                  <label for="pub-position" class="block text-sm font-semibold text-gray-700 mb-2">Author Position *</label>
                  <select id="pub-position" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none">
                    <option value="">Select Position</option>
                    <option value="first">First Author</option>
                    <option value="corresponding">Corresponding Author</option>
                    <option value="co-author">Co-Author</option>
                  </select>
                </div>
                
                <div>
                  <label for="pub-year" class="block text-sm font-semibold text-gray-700 mb-2">Publication Year *</label>
                  <input type="number" id="pub-year" required min="2000" max="2030"
                         class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"
                         placeholder="2024">
                </div>
                
                <div>
                  <label for="pub-status" class="block text-sm font-semibold text-gray-700 mb-2">Status *</label>
                  <select id="pub-status" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none">
                    <option value="">Select Status</option>
                    <option value="published">Published</option>
                    <option value="accepted">Accepted</option>
                    <option value="under-review">Under Review</option>
                  </select>
                </div>
              </div>
              
              <div class="flex justify-between">
                <button type="button" onclick="navigateToSection('research')" class="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300">
                  ← Previous
                </button>
                <button type="submit" id="save-pub-btn" class="px-6 py-3 bg-sky-600 text-white rounded-lg font-semibold hover:bg-sky-700">
                  ➕ Add Publication
                </button>
              </div>
            </form>
          </div>
          
          ${publications.length > 0 ? `
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 class="font-bold text-lg mb-4">Publications (${publications.length})</h3>
              <div class="space-y-3">
                ${publications.map(pub => {
                  const score = calculatePublicationScore(pub);
                  
                  // Format type name
                  const typeNames = {
                    'journal': 'Journal',
                    'conference': 'Conference',
                    'book': 'Book',
                    'chapter': 'Chapter',
                    'proceeding': 'Proceeding'
                  };
                  
                  // Format position
                  const positionNames = {
                    'first': 'First Author',
                    'corresponding': 'Corresponding',
                    'co-author': 'Co-Author'
                  };
                  
                  // Format status
                  const statusNames = {
                    'published': 'Published',
                    'accepted': 'Accepted',
                    'under-review': 'Under Review'
                  };
                  
                  return `
                    <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div class="flex-1">
                        <div class="font-semibold text-gray-900">${pub.pub_title}</div>
                        <div class="text-sm text-gray-600 mt-1">
                          <span class="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs font-semibold mr-2">${typeNames[pub.pub_type] || pub.pub_type}</span>
                          <span class="inline-block px-2 py-1 bg-purple-100 text-purple-800 rounded text-xs font-semibold">${pub.pub_index}</span>
                        </div>
                        <div class="text-sm text-gray-600 mt-1">
                          ${pub.pub_venue} • ${pub.pub_year}
                        </div>
                        <div class="text-xs text-gray-500 mt-1">
                          ${statusNames[pub.pub_status] || pub.pub_status} • ${positionNames[pub.pub_position] || pub.pub_position}
                          • <span class="font-semibold text-green-700">Score: ${score.toFixed(2)}</span>
                        </div>
                      </div>
                      <button type="button" onclick="deletePublication('${pub.__backendId}')" 
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
            <button onclick="navigateToSection('administration')" class="px-6 py-3 bg-sky-600 text-white rounded-lg font-semibold hover:bg-sky-700">
              Next: Admin Leadership →
            </button>
          </div>
        </div>
      `;
    }

    async function savePublication(event) {
      event.preventDefault();
      
      if (allRecords.length >= 999) {
        showToast('Maximum limit of 999 records reached', 'error');
        return;
      }
      
      const btn = document.getElementById('save-pub-btn');
      btn.disabled = true;
      btn.innerHTML = '<div class="loading-spinner mx-auto"></div>';
      
      const publicationData = {
        section: 'publications',
        pub_title: document.getElementById('pub-title').value,
        pub_type: document.getElementById('pub-type').value,
        pub_index: document.getElementById('pub-index').value,
        pub_venue: document.getElementById('pub-venue').value,
        pub_position: document.getElementById('pub-position').value,
        pub_year: parseInt(document.getElementById('pub-year').value),
        pub_status: document.getElementById('pub-status').value,
        created_at: new Date().toISOString()
      };
      
      const result = await window.dataSdk.create(publicationData);
      
      btn.disabled = false;
      btn.innerHTML = '➕ Add Publication';
      
      if (result.isOk) {
        showToast('Publication added successfully!');
        document.getElementById('publication-form').reset();
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
      } else {
        showToast('Failed to delete publication', 'error');
      }
    }

    function renderAdministration() {
      const positions = getRecordsBySection('administration');
      
      return `
        <div class="space-y-6">
          <!-- Scoring Guide Card -->
          <div class="bg-gradient-to-r from-rose-50 to-red-50 rounded-xl shadow-sm border-2 border-rose-200 p-6">
            <h3 class="font-bold text-lg text-rose-900 mb-3">🧮 Admin Leadership Scoring (Fixed Points)</h3>
            
            <div class="bg-white rounded-lg p-4 mb-4">
              <p class="text-sm text-gray-700 mb-3">
                <strong>Score = Position Points (Fixed)</strong>
              </p>
              <div class="text-xs text-gray-600 space-y-1">
                <p>• Dean = <strong>20</strong> | Deputy Dean = <strong>15</strong> | Centre Director = <strong>12</strong></p>
                <p>• Head of Programme = <strong>10</strong> | Postgraduate Coordinator = <strong>8</strong></p>
                <p>• Programme Coordinator = <strong>6</strong> | Other = <strong>5</strong></p>
              </div>
            </div>
            
            <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded mb-4">
              <p class="text-sm font-semibold text-yellow-900 mb-2">⚠️ Important Guidelines:</p>
              <div class="text-xs text-gray-700 space-y-1">
                <p>✓ Only record <strong>formal leadership positions with allowance/trust</strong></p>
                <p>✓ Choose the correct position category (don't use "Other" if your position is listed)</p>
                <p>✗ Don't record committee memberships here (use Admin Duties instead)</p>
                <p>✗ Avoid double counting the same position</p>
              </div>
            </div>
            
            <div class="bg-emerald-50 border-l-4 border-emerald-400 p-4 rounded">
              <p class="text-sm font-semibold text-emerald-900 mb-2">Example:</p>
              <p class="text-xs text-gray-700">
                • Head of Programme (UH6461001) = 10.0<br>
                • Postgraduate Coordinator (FST) = 8.0<br>
                <strong class="text-green-700">Total Admin Leadership Score = 18.0 points</strong>
              </p>
            </div>
          </div>

          <!-- Add Position Form -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 class="heading-font text-2xl font-bold mb-6">🏛️ Administrative Leadership Positions</h2>
            
            <form id="administration-form" onsubmit="saveAdministration(event)" class="space-y-6">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div class="md:col-span-2">
                  <label for="admin-position" class="block text-sm font-semibold text-gray-700 mb-2">Leadership Position *</label>
                  <select id="admin-position" required onchange="toggleOtherAdminPositionField()" class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none">
                    <option value="">Select Position</option>
                    <option value="Dean">Dean (20 points)</option>
                    <option value="Deputy Dean">Deputy Dean (15 points)</option>
                    <option value="Centre Director">Centre Director (12 points)</option>
                    <option value="Head of Programme">Head of Programme (10 points)</option>
                    <option value="Postgraduate Coordinator">Postgraduate Coordinator (8 points)</option>
                    <option value="Programme Coordinator">Programme Coordinator (6 points)</option>
                    <option value="Other">Other Position (5 points)</option>
                  </select>
                </div>
                
                <div id="other-admin-position-field" class="md:col-span-2" style="display: none;">
                  <label for="admin-other-position" class="block text-sm font-semibold text-gray-700 mb-2">Specify Position *</label>
                  <input type="text" id="admin-other-position"
                         class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"
                         placeholder="Enter exact position title">
                </div>
                
                <div>
                  <label for="admin-faculty" class="block text-sm font-semibold text-gray-700 mb-2">Faculty/Department/Unit *</label>
                  <input type="text" id="admin-faculty" required
                         class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"
                         placeholder="e.g., Faculty of Science and Technology">
                </div>
                
                <div>
                  <label for="admin-allowance" class="block text-sm font-semibold text-gray-700 mb-2">Monthly Allowance (RM)</label>
                  <input type="number" id="admin-allowance" min="0" step="0.01"
                         class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"
                         placeholder="0.00">
                </div>
                
                <div>
                  <label for="admin-start-date" class="block text-sm font-semibold text-gray-700 mb-2">Start Date *</label>
                  <input type="date" id="admin-start-date" required
                         class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none">
                </div>
                
                <div>
                  <label for="admin-end-date" class="block text-sm font-semibold text-gray-700 mb-2">End Date (leave blank if current)</label>
                  <input type="date" id="admin-end-date"
                         class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none">
                </div>
              </div>
              
              <div class="flex justify-between">
                <button type="button" onclick="navigateToSection('publications')" class="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300">
                  ← Previous
                </button>
                <button type="submit" id="save-administration-btn" class="px-6 py-3 bg-sky-600 text-white rounded-lg font-semibold hover:bg-sky-700">
                  ➕ Add Leadership Position
                </button>
              </div>
            </form>
          </div>
          
          ${positions.length > 0 ? `
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 class="font-bold text-lg mb-4">Your Leadership Positions (${positions.length})</h3>
              <div class="space-y-3">
                ${positions.map(pos => {
                  const score = calculateAdministrationScore(pos);
                  const position = pos.admin_position === 'Other' ? pos.admin_other_position : pos.admin_position;
                  
                  return `
                    <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div class="flex-1">
                        <div class="font-semibold text-gray-900">${position}</div>
                        <div class="text-sm text-gray-600 mt-1">
                          ${pos.admin_faculty}${pos.admin_allowance ? ` • RM${pos.admin_allowance.toFixed(2)}/month` : ''}
                        </div>
                        <div class="text-xs text-gray-500 mt-1">
                          ${pos.admin_start_date}${pos.admin_end_date ? ` to ${pos.admin_end_date}` : ' (Current)'}
                        </div>
                        <div class="text-xs text-gray-500 mt-1">
                          <span class="font-semibold text-green-700">Score: ${score.toFixed(1)}</span>
                        </div>
                      </div>
                      <button type="button" onclick="deleteAdministration('${pos.__backendId}')" 
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
            <button onclick="navigateToSection('admin_duties')" class="px-6 py-3 bg-sky-600 text-white rounded-lg font-semibold hover:bg-sky-700">
              Next: Admin Duties →
            </button>
          </div>
        </div>
      `;
    }

    async function saveAdministration(event) {
      event.preventDefault();
      
      if (allRecords.length >= 999) {
        showToast('Maximum limit of 999 records reached', 'error');
        return;
      }
      
      const btn = document.getElementById('save-administration-btn');
      btn.disabled = true;
      btn.innerHTML = '<div class="loading-spinner mx-auto"></div>';
      
      const position = document.getElementById('admin-position').value;
      
      const administrationData = {
        section: 'administration',
        admin_position: position,
        admin_other_position: position === 'Other' ? document.getElementById('admin-other-position').value : '',
        admin_faculty: document.getElementById('admin-faculty').value,
        admin_allowance: parseFloat(document.getElementById('admin-allowance').value) || null,
        admin_start_date: document.getElementById('admin-start-date').value,
        admin_end_date: document.getElementById('admin-end-date').value,
        created_at: new Date().toISOString()
      };
      
      const result = await window.dataSdk.create(administrationData);
      
      btn.disabled = false;
      btn.innerHTML = '➕ Add Leadership Position';
      
      if (result.isOk) {
        showToast('Leadership position added successfully!');
        document.getElementById('administration-form').reset();
        document.getElementById('other-admin-position-field').style.display = 'none';
      } else {
        showToast('Failed to add leadership position', 'error');
      }
    }

    async function deleteAdministration(backendId) {
      const admin = allRecords.find(r => r.__backendId === backendId);
      if (!admin) return;
      
      const result = await window.dataSdk.delete(admin);
      
      if (result.isOk) {
        showToast('Leadership position deleted successfully!');
      } else {
        showToast('Failed to delete leadership position', 'error');
      }
    }

    function renderAdminDuties() {
      const duties = getRecordsBySection('admin_duties');
      
      return `
        <div class="space-y-6">
          <!-- Calculation Formula Card -->
          <div class="bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl shadow-sm border-2 border-amber-200 p-6">
            <h3 class="font-bold text-lg text-amber-900 mb-3">🧮 Administrative Duties Scoring Formula</h3>
            
            <div class="bg-white rounded-lg p-4 mb-4">
              <p class="text-sm text-gray-700 mb-3">
                <strong>Score = Base Points × Frequency Factor</strong>
              </p>
              <div class="text-xs text-gray-600 space-y-2">
                <p><strong>Base Points by Duty Type:</strong></p>
                <p>• Accreditation Work = 8</p>
                <p>• Curriculum Development = 6</p>
                <p>• Committee Chair = 5</p>
                <p>• Event Organizer = 4</p>
                <p>• Exam Coordinator = 3</p>
                <p>• Committee Member = 2</p>
                <p>• Other = 2</p>
                <p class="mt-2"><strong>Frequency Factor:</strong></p>
                <p>• Ongoing (Year-round) = 1.0</p>
                <p>• Per Semester = 0.5</p>
                <p>• One-Time Event = 0.3</p>
              </div>
            </div>
            
            <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
              <p class="text-sm font-semibold text-yellow-900 mb-2">Example:</p>
              <p class="text-xs text-gray-700">
                • Accreditation Work (Ongoing): 8 × 1.0 = 8.0<br>
                • Committee Chair (Per Semester): 5 × 0.5 = 2.5<br>
                • Event Organizer (One-Time): 4 × 0.3 = 1.2<br>
                <strong class="text-green-700">Total: 11.7 points</strong>
              </p>
            </div>
          </div>

          <!-- Add Duty Form -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 class="heading-font text-2xl font-bold mb-6">📋 Administrative Duties & Committees</h2>
            
            <form id="admin-duty-form" onsubmit="saveAdminDuty(event)" class="space-y-6">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label for="duty-type" class="block text-sm font-semibold text-gray-700 mb-2">Duty Type *</label>
                  <select id="duty-type" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none">
                    <option value="">Select Type</option>
                    <option value="Accreditation Work">Accreditation Work</option>
                    <option value="Curriculum Development">Curriculum Development</option>
                    <option value="Committee Chair">Committee Chair</option>
                    <option value="Event Organizer">Event Organizer</option>
                    <option value="Exam Coordinator">Exam Coordinator</option>
                    <option value="Committee Member">Committee Member</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                
                <div>
                  <label for="duty-name" class="block text-sm font-semibold text-gray-700 mb-2">Duty Name/Description *</label>
                  <input type="text" id="duty-name" required 
                         class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"
                         placeholder="e.g., MQA Accreditation Committee">
                </div>
                
                <div>
                  <label for="duty-frequency" class="block text-sm font-semibold text-gray-700 mb-2">Frequency *</label>
                  <select id="duty-frequency" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none">
                    <option value="">Select Frequency</option>
                    <option value="Ongoing">Ongoing (Year-round) – 1.0</option>
                    <option value="Per Semester">Per Semester – 0.5</option>
                    <option value="One-Time Event">One-Time Event – 0.3</option>
                  </select>
                </div>
                
                <div>
                  <label for="duty-year" class="block text-sm font-semibold text-gray-700 mb-2">Academic Year *</label>
                  <input type="text" id="duty-year" required
                         class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"
                         placeholder="e.g., 2024/2025">
                </div>
                
                <div class="md:col-span-2">
                  <label for="duty-notes" class="block text-sm font-semibold text-gray-700 mb-2">Additional Notes</label>
                  <textarea id="duty-notes" rows="3"
                         class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"
                         placeholder="Brief description of duties and responsibilities"></textarea>
                </div>
              </div>
              
              <div class="flex justify-between">
                <button type="button" onclick="navigateToSection('administration')" class="px-6 py-3 bg-gray-200 text-gray-700 rounded-lg font-semibold hover:bg-gray-300">
                  ← Previous
                </button>
                <button type="submit" id="save-duty-btn" class="px-6 py-3 bg-sky-600 text-white rounded-lg font-semibold hover:bg-sky-700">
                  ➕ Add Duty
                </button>
              </div>
            </form>
          </div>
          
          ${duties.length > 0 ? `
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 class="font-bold text-lg mb-4">Administrative Duties (${duties.length})</h3>
              <div class="space-y-3">
                ${duties.map(duty => {
                  const score = calculateAdminDutyScore(duty);
                  
                  return `
                    <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div class="flex-1">
                        <div class="font-semibold text-gray-900">${duty.duty_name}</div>
                        <div class="text-sm text-gray-600 mt-1">
                          ${duty.duty_type} • ${duty.duty_frequency} • ${duty.duty_year}
                        </div>
                        ${duty.duty_notes ? `<div class="text-xs text-gray-500 mt-1">${duty.duty_notes}</div>` : ''}
                        <div class="text-xs text-gray-500 mt-1">
                          <span class="font-semibold text-green-700">Score: ${score}</span>
                        </div>
                      </div>
                      <button type="button" onclick="deleteAdminDuty('${duty.__backendId}')" 
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
            <button onclick="navigateToSection('results')" class="px-6 py-3 bg-sky-600 text-white rounded-lg font-semibold hover:bg-sky-700">
              View Results →
            </button>
          </div>
        </div>
      `;
    }

    async function saveAdminDuty(event) {
      event.preventDefault();
      
      if (allRecords.length >= 999) {
        showToast('Maximum limit of 999 records reached', 'error');
        return;
      }
      
      const btn = document.getElementById('save-duty-btn');
      btn.disabled = true;
      btn.innerHTML = '<div class="loading-spinner mx-auto"></div>';
      
      const dutyData = {
        section: 'admin_duties',
        duty_type: document.getElementById('duty-type').value,
        duty_name: document.getElementById('duty-name').value,
        duty_frequency: document.getElementById('duty-frequency').value,
        duty_year: document.getElementById('duty-year').value,
        duty_notes: document.getElementById('duty-notes').value,
        created_at: new Date().toISOString()
      };
      
      const result = await window.dataSdk.create(dutyData);
      
      btn.disabled = false;
      btn.innerHTML = '➕ Add Duty';
      
      if (result.isOk) {
        showToast('Administrative duty added successfully!');
        document.getElementById('admin-duty-form').reset();
      } else {
        showToast('Failed to add administrative duty', 'error');
      }
    }

    async function deleteAdminDuty(backendId) {
      const duty = allRecords.find(r => r.__backendId === backendId);
      if (!duty) return;
      
      const result = await window.dataSdk.delete(duty);
      
      if (result.isOk) {
        showToast('Administrative duty deleted successfully!');
      } else {
        showToast('Failed to delete administrative duty', 'error');
      }
    }

    function renderService() {
      const services = getRecordsBySection('service');
      
      return `
        <div class="space-y-6">
          <!-- Formula Card -->
          <div class="bg-gradient-to-r from-rose-50 to-pink-50 rounded-xl shadow-sm border-2 border-rose-200 p-6">
            <h3 class="font-bold text-lg text-rose-900 mb-3">🧮 Service & Engagement Score Calculation Formula</h3>
            
            <div class="bg-white rounded-lg p-4 mb-4">
              <p class="text-sm text-gray-700 mb-3">
                <strong>Score = Base Points × Scope Factor</strong>
              </p>
              <div class="text-xs text-gray-600 space-y-2">
                <p><strong>Base Points by Service Type:</strong></p>
                <p>• External Examiner = 8 | Keynote Speaker = 7 | Invited Speaker = 5</p>
                <p>• Journal Reviewer = 4 | Conference Reviewer = 3 | Community Outreach = 3</p>
                <p>• Media Engagement = 2 | Other = 2</p>
                
                <p class="mt-2"><strong>Scope Factor:</strong></p>
                <p>• International = 1.5 | National = 1.2 | Regional = 1.0 | Institutional = 0.8</p>
              </div>
            </div>
            
            <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
              <p class="text-sm font-semibold text-yellow-900 mb-2">Example Calculation:</p>
              <p class="text-xs text-gray-700">
                • External Examiner (International): 8 × 1.5 = <strong>12.0</strong><br>
                • Keynote Speaker (National): 7 × 1.2 = <strong>8.4</strong><br>
                • Journal Reviewer (International): 4 × 1.5 = <strong>6.0</strong><br>
                <strong class="text-green-700">Total: 26.4 points</strong>
              </p>
            </div>
          </div>

          <!-- Add Service Form -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 class="heading-font text-2xl font-bold mb-6">🤝 Service & Engagement</h2>
            
            <form id="service-form" onsubmit="saveService(event)" class="space-y-6">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label for="service-type" class="block text-sm font-semibold text-gray-700 mb-2">Service Type *</label>
                  <select id="service-type" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none">
                    <option value="">Select Type</option>
                    <option value="External Examiner">External Examiner</option>
                    <option value="Keynote Speaker">Keynote Speaker</option>
                    <option value="Invited Speaker">Invited Speaker</option>
                    <option value="Journal Reviewer">Journal Reviewer</option>
                    <option value="Conference Reviewer">Conference Reviewer</option>
                    <option value="Community Outreach">Community Outreach</option>
                    <option value="Media Engagement">Media Engagement</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                
                <div>
                  <label for="service-scope" class="block text-sm font-semibold text-gray-700 mb-2">Scope *</label>
                  <select id="service-scope" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none">
                    <option value="">Select Scope</option>
                    <option value="International">International</option>
                    <option value="National">National</option>
                    <option value="Regional">Regional</option>
                    <option value="Institutional">Institutional</option>
                  </select>
                </div>
                
                <div class="md:col-span-2">
                  <label for="service-title" class="block text-sm font-semibold text-gray-700 mb-2">Service Title *</label>
                  <input type="text" id="service-title" required 
                         class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"
                         placeholder="e.g., External Examiner for PhD Viva">
                </div>
                
                <div>
                  <label for="service-organization" class="block text-sm font-semibold text-gray-700 mb-2">Organization *</label>
                  <input type="text" id="service-organization" required
                         class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"
                         placeholder="e.g., Universiti Malaya">
                </div>
                
                <div>
                  <label for="service-date" class="block text-sm font-semibold text-gray-700 mb-2">Date *</label>
                  <input type="date" id="service-date" required
                         class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none">
                </div>
                
                <div>
                  <label for="service-duration" class="block text-sm font-semibold text-gray-700 mb-2">Duration (hours)</label>
                  <input type="number" id="service-duration" min="0" step="0.5" value="0"
                         class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"
                         placeholder="0">
                </div>
                
                <div class="md:col-span-2">
                  <label for="service-description" class="block text-sm font-semibold text-gray-700 mb-2">Description</label>
                  <textarea id="service-description" rows="3"
                         class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"
                         placeholder="Brief description of the service activity"></textarea>
                </div>
              </div>
              
              <button type="submit" id="save-service-btn" class="px-6 py-3 bg-sky-600 text-white rounded-lg font-semibold hover:bg-sky-700">
                ➕ Add Service
              </button>
            </form>
          </div>
          
          ${services.length > 0 ? `
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 class="font-bold text-lg mb-4">Service Activities (${services.length})</h3>
              <div class="space-y-3">
                ${services.map(service => {
                  const score = calculateServiceScore(service);
                  
                  return `
                    <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div class="flex-1">
                        <div class="font-semibold text-gray-900">${service.service_title}</div>
                        <div class="text-sm text-gray-600 mt-1">
                          ${service.service_type} • ${service.service_scope} • ${service.service_organization}
                        </div>
                        <div class="text-xs text-gray-500 mt-1">
                          ${service.service_date}${service.service_duration > 0 ? ` • ${service.service_duration} hours` : ''}
                          • <span class="font-semibold text-green-700">Score: ${score.toFixed(2)}</span>
                        </div>
                        ${service.service_description ? `<div class="text-xs text-gray-500 mt-1">${service.service_description}</div>` : ''}
                      </div>
                      <button type="button" onclick="deleteService('${service.__backendId}')" 
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
            <button onclick="navigateToSection('laboratory')" class="px-6 py-3 bg-sky-600 text-white rounded-lg font-semibold hover:bg-sky-700">
              Next: Laboratory →
            </button>
          </div>
        </div>
      `;
    }

    async function saveService(event) {
      event.preventDefault();
      
      if (allRecords.length >= 999) {
        showToast('Maximum limit of 999 records reached', 'error');
        return;
      }
      
      const btn = document.getElementById('save-service-btn');
      btn.disabled = true;
      btn.innerHTML = '<div class="loading-spinner mx-auto"></div>';
      
      const serviceData = {
        section: 'service',
        service_type: document.getElementById('service-type').value,
        service_title: document.getElementById('service-title').value,
        service_scope: document.getElementById('service-scope').value,
        service_organization: document.getElementById('service-organization').value,
        service_date: document.getElementById('service-date').value,
        service_duration: parseFloat(document.getElementById('service-duration').value) || 0,
        service_description: document.getElementById('service-description').value,
        created_at: new Date().toISOString()
      };
      
      const result = await window.dataSdk.create(serviceData);
      
      btn.disabled = false;
      btn.innerHTML = '➕ Add Service';
      
      if (result.isOk) {
        showToast('Service activity added successfully!');
        document.getElementById('service-form').reset();
      } else {
        showToast('Failed to add service activity', 'error');
      }
    }

    async function deleteService(backendId) {
      const service = allRecords.find(r => r.__backendId === backendId);
      if (!service) return;
      
      const result = await window.dataSdk.delete(service);
      
      if (result.isOk) {
        showToast('Service activity deleted successfully!');
      } else {
        showToast('Failed to delete service activity', 'error');
      }
    }

    function renderLaboratory() {
      const labs = getRecordsBySection('laboratory');
      
      return `
        <div class="space-y-6">
          <!-- Formula Card -->
          <div class="bg-gradient-to-r from-cyan-50 to-teal-50 rounded-xl shadow-sm border-2 border-cyan-200 p-6">
            <h3 class="font-bold text-lg text-cyan-900 mb-3">🧮 Laboratory Score Calculation Formula</h3>
            
            <div class="bg-white rounded-lg p-4 mb-4">
              <p class="text-sm text-gray-700 mb-3">
                <strong>Score = Base Points × Frequency Factor</strong>
              </p>
              <div class="text-xs text-gray-600 space-y-2">
                <p><strong>Base Points by Responsibility:</strong></p>
                <p>• Lab Coordinator = 10 | Safety Officer = 8 | Equipment Manager = 7</p>
                <p>• Inventory Manager = 6 | SOP Development = 5 | Lab Supervisor = 4 | Other = 3</p>
                
                <p class="mt-2"><strong>Frequency Factor:</strong></p>
                <p>• Full-Time = 1.0 | Per Semester = 0.5 | Per Course = 0.3</p>
              </div>
            </div>
            
            <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
              <p class="text-sm font-semibold text-yellow-900 mb-2">Example Calculation:</p>
              <p class="text-xs text-gray-700">
                • Lab Coordinator (Full-Time): 10 × 1.0 = <strong>10.0</strong><br>
                • Safety Officer (Per Semester): 8 × 0.5 = <strong>4.0</strong><br>
                • Equipment Manager (Per Course): 7 × 0.3 = <strong>2.1</strong><br>
                <strong class="text-green-700">Total: 16.1 points</strong>
              </p>
            </div>
          </div>

          <!-- Add Laboratory Form -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 class="heading-font text-2xl font-bold mb-6">🧪 Laboratory Responsibilities</h2>
            
            <form id="laboratory-form" onsubmit="saveLaboratory(event)" class="space-y-6">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label for="lab-responsibility" class="block text-sm font-semibold text-gray-700 mb-2">Responsibility Type *</label>
                  <select id="lab-responsibility" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none">
                    <option value="">Select Responsibility</option>
                    <option value="Lab Coordinator">Lab Coordinator</option>
                    <option value="Safety Officer">Safety Officer</option>
                    <option value="Equipment Manager">Equipment Manager</option>
                    <option value="Inventory Manager">Inventory Manager</option>
                    <option value="SOP Development">SOP Development</option>
                    <option value="Lab Supervisor">Lab Supervisor</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                
                <div>
                  <label for="lab-name" class="block text-sm font-semibold text-gray-700 mb-2">Laboratory Name *</label>
                  <input type="text" id="lab-name" required 
                         class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"
                         placeholder="e.g., Microbiology Lab">
                </div>
                
                <div>
                  <label for="lab-frequency" class="block text-sm font-semibold text-gray-700 mb-2">Frequency *</label>
                  <select id="lab-frequency" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none">
                    <option value="">Select Frequency</option>
                    <option value="Full-Time">Full-Time (Year-round)</option>
                    <option value="Per Semester">Per Semester</option>
                    <option value="Per Course">Per Course</option>
                  </select>
                </div>
                
                <div>
                  <label for="lab-year" class="block text-sm font-semibold text-gray-700 mb-2">Academic Year *</label>
                  <input type="text" id="lab-year" required
                         class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"
                         placeholder="e.g., 2024/2025">
                </div>
                
                <div class="md:col-span-2">
                  <label for="lab-description" class="block text-sm font-semibold text-gray-700 mb-2">Description of Responsibilities</label>
                  <textarea id="lab-description" rows="3"
                         class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"
                         placeholder="Describe key tasks such as equipment maintenance, safety protocols, inventory management, etc."></textarea>
                </div>
              </div>
              
              <button type="submit" id="save-laboratory-btn" class="px-6 py-3 bg-sky-600 text-white rounded-lg font-semibold hover:bg-sky-700">
                ➕ Add Laboratory Responsibility
              </button>
            </form>
          </div>
          
          ${labs.length > 0 ? `
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 class="font-bold text-lg mb-4">Laboratory Responsibilities (${labs.length})</h3>
              <div class="space-y-3">
                ${labs.map(lab => {
                  const score = calculateLabScore(lab);
                  
                  return `
                    <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div class="flex-1">
                        <div class="font-semibold text-gray-900">${lab.lab_name}</div>
                        <div class="text-sm text-gray-600 mt-1">
                          ${lab.lab_responsibility} • ${lab.lab_frequency} • ${lab.lab_year}
                        </div>
                        ${lab.lab_description ? `<div class="text-xs text-gray-500 mt-1">${lab.lab_description}</div>` : ''}
                        <div class="text-xs text-gray-500 mt-1">
                          <span class="font-semibold text-green-700">Score: ${score.toFixed(2)}</span>
                        </div>
                      </div>
                      <button type="button" onclick="deleteLaboratory('${lab.__backendId}')" 
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
            <button onclick="navigateToSection('professional')" class="px-6 py-3 bg-sky-600 text-white rounded-lg font-semibold hover:bg-sky-700">
              Next: Professional →
            </button>
          </div>
        </div>
      `;
    }

    async function saveLaboratory(event) {
      event.preventDefault();
      
      if (allRecords.length >= 999) {
        showToast('Maximum limit of 999 records reached', 'error');
        return;
      }
      
      const btn = document.getElementById('save-laboratory-btn');
      btn.disabled = true;
      btn.innerHTML = '<div class="loading-spinner mx-auto"></div>';
      
      const labData = {
        section: 'laboratory',
        lab_responsibility: document.getElementById('lab-responsibility').value,
        lab_name: document.getElementById('lab-name').value,
        lab_frequency: document.getElementById('lab-frequency').value,
        lab_year: document.getElementById('lab-year').value,
        lab_description: document.getElementById('lab-description').value,
        created_at: new Date().toISOString()
      };
      
      const result = await window.dataSdk.create(labData);
      
      btn.disabled = false;
      btn.innerHTML = '➕ Add Laboratory Responsibility';
      
      if (result.isOk) {
        showToast('Laboratory responsibility added successfully!');
        document.getElementById('laboratory-form').reset();
      } else {
        showToast('Failed to add laboratory responsibility', 'error');
      }
    }

    async function deleteLaboratory(backendId) {
      const lab = allRecords.find(r => r.__backendId === backendId);
      if (!lab) return;
      
      const result = await window.dataSdk.delete(lab);
      
      if (result.isOk) {
        showToast('Laboratory responsibility deleted successfully!');
      } else {
        showToast('Failed to delete laboratory responsibility', 'error');
      }
    }

    function renderProfessional() {
      const professional = getRecordsBySection('professional');
      
      return `
        <div class="space-y-6">
          <!-- Formula Card -->
          <div class="bg-gradient-to-r from-violet-50 to-purple-50 rounded-xl shadow-sm border-2 border-violet-200 p-6">
            <h3 class="font-bold text-lg text-violet-900 mb-3">🧮 Professional Activities Score Calculation Formula</h3>
            
            <div class="bg-white rounded-lg p-4 mb-4">
              <p class="text-sm text-gray-700 mb-3">
                <strong>Score = Base Points × Scope Factor</strong>
              </p>
              <div class="text-xs text-gray-600 space-y-2">
                <p><strong>Base Points by Activity Type:</strong></p>
                <p>• Professional Body Leadership = 10 | Professional Certification = 8 | Conference Organizer = 7</p>
                <p>• Editorial Board = 6 | Professional Training = 5 | Consultancy = 5 | Membership = 3 | Other = 3</p>
                
                <p class="mt-2"><strong>Scope Factor:</strong></p>
                <p>• International = 1.5 | National = 1.2 | Regional = 1.0 | Institutional = 0.8</p>
              </div>
            </div>
            
            <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
              <p class="text-sm font-semibold text-yellow-900 mb-2">Example Calculation:</p>
              <p class="text-xs text-gray-700">
                • Professional Body Leadership (National): 10 × 1.2 = <strong>12.0</strong><br>
                • Conference Organizer (International): 7 × 1.5 = <strong>10.5</strong><br>
                • Consultancy (Regional): 5 × 1.0 = <strong>5.0</strong><br>
                <strong class="text-green-700">Total: 27.5 points</strong>
              </p>
            </div>
          </div>

          <!-- Add Professional Activity Form -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h2 class="heading-font text-2xl font-bold mb-6">💼 Professional Activities & Memberships</h2>
            
            <form id="professional-form" onsubmit="saveProfessional(event)" class="space-y-6">
              <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label for="prof-type" class="block text-sm font-semibold text-gray-700 mb-2">Activity Type *</label>
                  <select id="prof-type" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none">
                    <option value="">Select Type</option>
                    <option value="Professional Body Leadership">Professional Body Leadership</option>
                    <option value="Professional Certification">Professional Certification</option>
                    <option value="Conference Organizer">Conference Organizer</option>
                    <option value="Editorial Board">Editorial Board</option>
                    <option value="Professional Training">Professional Training</option>
                    <option value="Consultancy">Consultancy</option>
                    <option value="Membership">Professional Membership</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
                
                <div>
                  <label for="prof-scope" class="block text-sm font-semibold text-gray-700 mb-2">Scope *</label>
                  <select id="prof-scope" required class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none">
                    <option value="">Select Scope</option>
                    <option value="International">International</option>
                    <option value="National">National</option>
                    <option value="Regional">Regional</option>
                    <option value="Institutional">Institutional</option>
                  </select>
                </div>
                
                <div class="md:col-span-2">
                  <label for="prof-title" class="block text-sm font-semibold text-gray-700 mb-2">Title/Position *</label>
                  <input type="text" id="prof-title" required 
                         class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"
                         placeholder="e.g., President, Staff Welfare and Recreation Club">
                </div>
                
                <div>
                  <label for="prof-organization" class="block text-sm font-semibold text-gray-700 mb-2">Organization *</label>
                  <input type="text" id="prof-organization" required
                         class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"
                         placeholder="e.g., Malaysian Mathematical Society">
                </div>
                
                <div>
                  <label for="prof-year" class="block text-sm font-semibold text-gray-700 mb-2">Year *</label>
                  <input type="text" id="prof-year" required
                         class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"
                         placeholder="e.g., 2024 or 2023-2025">
                </div>
                
                <div class="md:col-span-2">
                  <label for="prof-description" class="block text-sm font-semibold text-gray-700 mb-2">Description of Activities</label>
                  <textarea id="prof-description" rows="3"
                         class="w-full px-4 py-3 border border-gray-300 rounded-lg focus:border-sky-500 focus:outline-none"
                         placeholder="Describe key responsibilities, contributions, or achievements"></textarea>
                </div>
              </div>
              
              <button type="submit" id="save-professional-btn" class="px-6 py-3 bg-sky-600 text-white rounded-lg font-semibold hover:bg-sky-700">
                ➕ Add Professional Activity
              </button>
            </form>
          </div>
          
          ${professional.length > 0 ? `
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h3 class="font-bold text-lg mb-4">Professional Activities (${professional.length})</h3>
              <div class="space-y-3">
                ${professional.map(prof => {
                  const score = calculateProfessionalScore(prof);
                  
                  return `
                    <div class="flex items-center justify-between p-4 bg-gray-50 rounded-lg border border-gray-200">
                      <div class="flex-1">
                        <div class="font-semibold text-gray-900">${prof.prof_title}</div>
                        <div class="text-sm text-gray-600 mt-1">
                          ${prof.prof_type} • ${prof.prof_scope} • ${prof.prof_organization}
                        </div>
                        <div class="text-xs text-gray-500 mt-1">
                          ${prof.prof_year}
                          📊 <span class="font-semibold text-green-700">Score: ${score.toFixed(2)}</span>
                        </div>
                        ${prof.prof_description ? `<div class="text-xs text-gray-500 mt-1">${prof.prof_description}</div>` : ''}
                      </div>
                      <button type="button" onclick="deleteProfessional('${prof.__backendId}')" 
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
            <button onclick="navigateToSection('assistants')" class="px-6 py-3 bg-sky-600 text-white rounded-lg font-semibold hover:bg-sky-700">
              Next: Assistants →
            </button>
          </div>
        </div>
      `;
    }

    async function saveProfessional(event) {
      event.preventDefault();
      
      if (allRecords.length >= 999) {
        showToast('Maximum limit of 999 records reached', 'error');
        return;
      }
      
      const btn = document.getElementById('save-professional-btn');
      btn.disabled = true;
      btn.innerHTML = '<div class="loading-spinner mx-auto"></div>';
      
      const professionalData = {
        section: 'professional',
        prof_type: document.getElementById('prof-type').value,
        prof_title: document.getElementById('prof-title').value,
        prof_scope: document.getElementById('prof-scope').value,
        prof_organization: document.getElementById('prof-organization').value,
        prof_year: document.getElementById('prof-year').value,
        prof_description: document.getElementById('prof-description').value,
        created_at: new Date().toISOString()
      };
      
      const result = await window.dataSdk.create(professionalData);
      
      btn.disabled = false;
      btn.innerHTML = '➕ Add Professional Activity';
      
      if (result.isOk) {
        showToast('Professional activity added successfully!');
        document.getElementById('professional-form').reset();
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
      } else {
        showToast('Failed to delete professional activity', 'error');
      }
    }

    function renderAssistants() {
      const profile = getProfile();
      const scores = calculateScores();
      
      // Calculate combined Teaching + Supervision score
      const combinedScore = scores.teaching + scores.supervision;
      
      // Determine if staff has admin position with allowance
      const hasAdminPosition = profile && profile.profile_admin_position && profile.profile_admin_position !== 'None';
      
      // Set thresholds
      const NON_ADMIN_THRESHOLD = 30;
      const ADMIN_THRESHOLD = NON_ADMIN_THRESHOLD / 2; // Half of non-admin
      
      const applicableThreshold = hasAdminPosition ? ADMIN_THRESHOLD : NON_ADMIN_THRESHOLD;
      const isQualified = combinedScore >= applicableThreshold;
      const staffType = hasAdminPosition ? 'Admin Academic Staff' : 'Non-Admin Academic Staff';
      
      return `
        <div class="space-y-6">
          <!-- Eligibility Formula Card -->
          <div class="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl shadow-sm border-2 border-indigo-200 p-6">
            <h3 class="font-bold text-lg text-indigo-900 mb-3">🧮 Teaching Assistant Eligibility Criteria</h3>
            
            <div class="bg-white rounded-lg p-4 mb-4">
              <p class="text-sm text-gray-700 mb-3">
                <strong>Eligibility Score = Teaching Score + Supervision Score</strong>
              </p>
              <div class="text-xs text-gray-600 space-y-2">
                <p><strong>Qualification Thresholds:</strong></p>
                <p>• <strong>Non-Admin Academic Staff:</strong> 📌 ${NON_ADMIN_THRESHOLD} points</p>
                <p>• <strong>Admin Academic Staff (with allowance):</strong> ≥ ${ADMIN_THRESHOLD} points</p>
                <p class="mt-3 text-gray-500 italic">
                  Note: Admin academic staff are those who hold administrative positions with allowance as recorded in the Staff Profile section.
                </p>
              </div>
            </div>
            
            <div class="bg-yellow-50 border-l-4 border-yellow-400 p-4 rounded">
              <p class="text-sm font-semibold text-yellow-900 mb-2">📋 Requirements:</p>
              <p class="text-xs text-gray-700">
                To qualify for teaching assistant (Tutor/Demonstrator) allocation, academic staff must achieve the minimum combined score from their teaching load and student supervision activities.
              </p>
            </div>
          </div>

          ${profile ? `
            <!-- Eligibility Status Card -->
            <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <h2 class="heading-font text-2xl font-bold mb-6">👨‍🏫 Your Teaching Assistant Eligibility</h2>
              
              <!-- Staff Information -->
              <div class="bg-gray-50 rounded-lg p-5 mb-6">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <div class="text-sm font-semibold text-gray-600 mb-1">Staff Name</div>
                    <div class="text-lg font-bold text-gray-900">${profile.profile_name}</div>
                  </div>
                  <div>
                    <div class="text-sm font-semibold text-gray-600 mb-1">Staff Category</div>
                    <div class="text-lg font-bold text-gray-900">${staffType}</div>
                  </div>
                  ${hasAdminPosition ? `
                    <div class="md:col-span-2">
                      <div class="text-sm font-semibold text-gray-600 mb-1">Administrative Position</div>
                      <div class="text-base text-gray-900">
                        ${profile.profile_admin_position === 'Other' ? profile.profile_other_admin_position : profile.profile_admin_position}
                      </div>
                    </div>
                  ` : ''}
                </div>
              </div>

              <!-- Score Calculation -->
              <div class="bg-gradient-to-r from-blue-50 to-cyan-50 rounded-lg p-6 mb-6">
                <h4 class="font-bold text-lg text-gray-900 mb-4">Score Calculation</h4>
                
                <div class="space-y-3">
                  <div class="flex items-center justify-between p-3 bg-white rounded-lg">
                    <div>
                      <div class="font-semibold text-gray-900">📚 Teaching Score</div>
                      <div class="text-xs text-gray-500">${getRecordsBySection('teaching').length} courses</div>
                    </div>
                    <div class="text-2xl font-bold text-blue-600">${scores.teaching.toFixed(2)}</div>
                  </div>
                  
                  <div class="flex items-center justify-between p-3 bg-white rounded-lg">
                    <div>
                      <div class="font-semibold text-gray-900">🎓 Supervision Score</div>
                      <div class="text-xs text-gray-500">${getRecordsBySection('supervision').length} students</div>
                    </div>
                    <div class="text-2xl font-bold text-purple-600">${scores.supervision.toFixed(2)}</div>
                  </div>
                  
                  <div class="border-t-2 border-gray-300 pt-3">
                    <div class="flex items-center justify-between p-4 bg-white rounded-lg border-2 border-indigo-300">
                      <div>
                        <div class="font-bold text-lg text-gray-900">Combined Eligibility Score</div>
                        <div class="text-xs text-gray-500">Teaching + Supervision</div>
                      </div>
                      <div class="text-4xl font-bold text-indigo-600">${combinedScore.toFixed(2)}</div>
                    </div>
                  </div>
                </div>
              </div>

              <!-- Eligibility Result -->
              <div class="bg-gradient-to-r ${isQualified ? 'from-green-500 to-emerald-500' : 'from-red-500 to-rose-500'} rounded-xl shadow-lg p-8 text-white text-center">
                <div class="text-6xl mb-4">${isQualified ? '✅' : '❌'}</div>
                <h3 class="text-3xl font-bold mb-2">${isQualified ? 'QUALIFIED' : 'NOT QUALIFIED'}</h3>
                <p class="text-lg mb-4">for Teaching Assistant Allocation</p>
                
                <div class="bg-white bg-opacity-20 rounded-lg p-4 inline-block">
                  <div class="text-sm mb-1">Your Score vs Required Threshold</div>
                  <div class="text-3xl font-bold">
                    ${combinedScore.toFixed(2)} / ${applicableThreshold.toFixed(2)}
                  </div>
                  ${!isQualified ? `
                    <div class="text-sm mt-2">
                      Need ${(applicableThreshold - combinedScore).toFixed(2)} more points
                    </div>
                  ` : `
                    <div class="text-sm mt-2">
                      Exceeded by ${(combinedScore - applicableThreshold).toFixed(2)} points
                    </div>
                  `}
                </div>
              </div>

              ${!isQualified ? `
                <div class="mt-6 bg-blue-50 border-l-4 border-blue-400 p-4 rounded">
                  <p class="text-sm text-blue-900">
                    <strong>💡 Tip:</strong> To qualify for teaching assistant allocation, you can increase your combined score by:
                  </p>
                  <ul class="text-xs text-blue-800 mt-2 ml-4 list-disc space-y-1">
                    <li>Adding more teaching courses (each course contributes to your teaching score)</li>
                    <li>Supervising more students (PhD main = 8, Masters main = 5, Undergrad = 1)</li>
                  </ul>
                </div>
              ` : ''}
            </div>
          ` : `
            <!-- No Profile Message -->
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
          `}

          <!-- Navigation -->
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

    function renderResults() {
      const scores = calculateScores();
      const status = getWorkloadStatus(scores.total);
      const profile = getProfile();
      
      return `
        <div class="space-y-6">
          <!-- Export Actions Bar -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
            <div class="flex flex-wrap items-center justify-between gap-3">
              <h3 class="font-bold text-lg text-gray-900">📊 Export Options</h3>
              <div class="flex flex-wrap gap-3">
                <button onclick="printResultsPDF()" class="px-4 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition flex items-center gap-2 text-sm">
                  <span>📄</span> Print PDF
                </button>
                <button onclick="exportToExcel()" class="px-4 py-2 bg-green-600 text-white rounded-lg font-semibold hover:bg-green-700 transition flex items-center gap-2 text-sm">
                  <span>📊</span> Export to Excel
                </button>
                <button onclick="exportSummaryCSV()" class="px-4 py-2 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition flex items-center gap-2 text-sm">
                  <span>📋</span> Summary CSV
                </button>
                <button onclick="copyToClipboard()" class="px-4 py-2 bg-purple-600 text-white rounded-lg font-semibold hover:bg-purple-700 transition flex items-center gap-2 text-sm">
                  <span>📑</span> Copy Summary
                </button>
              </div>
            </div>
          </div>

          <!-- Total Score Card -->
          <div class="bg-gradient-to-r from-sky-500 to-blue-600 rounded-2xl shadow-xl p-8 text-white text-center">
            <h2 class="heading-font text-3xl font-bold mb-2">Total Workload Score</h2>
            <div class="text-7xl font-bold mb-4">${scores.total}</div>
            <div class="flex items-center justify-center gap-3">
              <span class="text-4xl">${status.icon}</span>
              <span class="px-6 py-2 bg-white bg-opacity-20 rounded-full text-xl font-semibold">
                ${status.label}
              </span>
            </div>
          </div>

          <!-- Score Breakdown -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 class="heading-font text-2xl font-bold mb-6">Score Breakdown by Category</h3>
            
            <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div class="bg-gradient-to-br from-blue-50 to-sky-50 rounded-lg p-5 border-l-4 border-blue-500">
                <div class="text-sm font-semibold text-gray-600 mb-1">📚 Teaching</div>
                <div class="text-3xl font-bold text-blue-600">${scores.teaching.toFixed(2)}</div>
                <div class="text-xs text-gray-500 mt-2">${getRecordsBySection('teaching').length} courses</div>
              </div>
              
              <div class="bg-gradient-to-br from-purple-50 to-pink-50 rounded-lg p-5 border-l-4 border-purple-500">
                <div class="text-sm font-semibold text-gray-600 mb-1">🧑‍🏫 Supervision</div>
                <div class="text-3xl font-bold text-purple-600">${scores.supervision.toFixed(2)}</div>
                <div class="text-xs text-gray-500 mt-2">${getRecordsBySection('supervision').length} students</div>
              </div>
              
              <div class="bg-gradient-to-br from-green-50 to-emerald-50 rounded-lg p-5 border-l-4 border-green-500">
                <div class="text-sm font-semibold text-gray-600 mb-1">🔬 Research</div>
                <div class="text-3xl font-bold text-green-600">${scores.research.toFixed(2)}</div>
                <div class="text-xs text-gray-500 mt-2">${getRecordsBySection('research').length} projects</div>
              </div>
              
              <div class="bg-gradient-to-br from-indigo-50 to-blue-50 rounded-lg p-5 border-l-4 border-indigo-500">
                <div class="text-sm font-semibold text-gray-600 mb-1">📝 Publications</div>
                <div class="text-3xl font-bold text-indigo-600">${scores.publications.toFixed(2)}</div>
                <div class="text-xs text-gray-500 mt-2">${getRecordsBySection('publications').length} works</div>
              </div>
              
              <div class="bg-gradient-to-br from-rose-50 to-red-50 rounded-lg p-5 border-l-4 border-rose-500">
                <div class="text-sm font-semibold text-gray-600 mb-1">🏛️ Admin Leadership</div>
                <div class="text-3xl font-bold text-rose-600">${scores.adminLeadership.toFixed(2)}</div>
                <div class="text-xs text-gray-500 mt-2">${getRecordsBySection('administration').length} positions</div>
              </div>
              
              <div class="bg-gradient-to-br from-amber-50 to-yellow-50 rounded-lg p-5 border-l-4 border-amber-500">
                <div class="text-sm font-semibold text-gray-600 mb-1">📌 Admin Duties</div>
                <div class="text-3xl font-bold text-amber-600">${scores.adminDuties.toFixed(2)}</div>
                <div class="text-xs text-gray-500 mt-2">${getRecordsBySection('admin_duties').length} duties</div>
              </div>
              
              <div class="bg-gradient-to-br from-cyan-50 to-teal-50 rounded-lg p-5 border-l-4 border-cyan-500">
                <div class="text-sm font-semibold text-gray-600 mb-1">🧪 Laboratory</div>
                <div class="text-3xl font-bold text-cyan-600">${scores.laboratory.toFixed(2)}</div>
                <div class="text-xs text-gray-500 mt-2">${getRecordsBySection('laboratory').length} responsibilities</div>
              </div>
              
              <div class="bg-gradient-to-br from-violet-50 to-purple-50 rounded-lg p-5 border-l-4 border-violet-500">
                <div class="text-sm font-semibold text-gray-600 mb-1">💼 Professional</div>
                <div class="text-3xl font-bold text-violet-600">${scores.professional.toFixed(2)}</div>
                <div class="text-xs text-gray-500 mt-2">${getRecordsBySection('professional').length} activities</div>
              </div>
            </div>
          </div>

          <!-- Smart Recommendations -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 class="heading-font text-2xl font-bold mb-4">💡 Recommendations & Insights</h3>
            
            ${scores.total >= 100 ? `
              <div class="bg-red-50 border-l-4 border-red-500 p-5 rounded-lg">
                <h4 class="font-bold text-red-900 text-lg mb-3">⚠️ Workload Overload Detected</h4>
                <p class="text-sm text-red-800 mb-3">Your workload score exceeds the recommended threshold. Consider these strategies:</p>
                <ul class="text-sm text-red-800 space-y-2 ml-4 list-disc">
                  <li><strong>Delegate tasks:</strong> Discuss with your supervisor about redistributing some responsibilities</li>
                  <li><strong>Timeline adjustments:</strong> Request deadline extensions for non-critical projects</li>
                  <li><strong>Work-life balance:</strong> Prioritize essential activities and reduce optional commitments</li>
                  <li><strong>Seek support:</strong> Consider requesting teaching assistants or research support staff</li>
                  <li><strong>Administrative relief:</strong> Explore temporary reduction in committee duties if possible</li>
                </ul>
              </div>
            ` : scores.total >= 70 ? `
              <div class="bg-green-50 border-l-4 border-green-500 p-5 rounded-lg">
                <h4 class="font-bold text-green-900 text-lg mb-3">✅ Well-Balanced Workload</h4>
                <p class="text-sm text-green-800 mb-3">Your workload is in the optimal productivity zone. To maintain this balance:</p>
                <ul class="text-sm text-green-800 space-y-2 ml-4 list-disc">
                  <li><strong>Maintain momentum:</strong> Continue your current pace without taking on major new commitments</li>
                  <li><strong>Quality focus:</strong> Invest time in deepening the impact of existing projects</li>
                  <li><strong>Mentorship opportunities:</strong> Share your balanced approach with junior colleagues</li>
                  <li><strong>Strategic planning:</strong> Use this stable period to plan long-term research directions</li>
                  <li><strong>Professional development:</strong> Attend workshops or conferences to enhance skills</li>
                </ul>
              </div>
            ` : scores.total >= 40 ? `
              <div class="bg-yellow-50 border-l-4 border-yellow-500 p-5 rounded-lg">
                <h4 class="font-bold text-yellow-900 text-lg mb-3">⚡ Moderate Workload - Growth Opportunities</h4>
                <p class="text-sm text-yellow-800 mb-3">You have capacity to expand your academic profile. Consider:</p>
                <ul class="text-sm text-yellow-800 space-y-2 ml-4 list-disc">
                  <li><strong>Increase teaching:</strong> Offer to teach an additional elective or take on coordinator roles</li>
                  <li><strong>Expand research:</strong> Apply for new grants or join collaborative research projects</li>
                  <li><strong>Supervision:</strong> Take on additional postgraduate or undergraduate supervisees</li>
                  <li><strong>Publication pipeline:</strong> Convert existing research into journal publications</li>
                  <li><strong>Committee participation:</strong> Join faculty or university-level committees</li>
                </ul>
              </div>
            ` : `
              <div class="bg-blue-50 border-l-4 border-blue-500 p-5 rounded-lg">
                <h4 class="font-bold text-blue-900 text-lg mb-3">💡 Light Workload - Profile Building Phase</h4>
                <p class="text-sm text-blue-800 mb-3">Great opportunity to build your academic profile. Focus on:</p>
                <ul class="text-sm text-blue-800 space-y-2 ml-4 list-disc">
                  <li><strong>Teaching expansion:</strong> Volunteer to teach core courses or develop new course materials</li>
                  <li><strong>Research initiation:</strong> Start or join research projects, apply for seed grants</li>
                  <li><strong>Student supervision:</strong> Actively recruit postgraduate and FYP students</li>
                  <li><strong>Publication drive:</strong> Target 2-3 publications per year in indexed journals</li>
                  <li><strong>Administrative roles:</strong> Express interest in programme coordinator or committee positions</li>
                  <li><strong>Professional networking:</strong> Join professional bodies and attend conferences</li>
                </ul>
              </div>
            `}
          </div>

          <!-- Reset Data Section -->
          <div class="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
            <h3 class="heading-font text-2xl font-bold mb-4 text-gray-900">🔄 Reset Data</h3>
            
            <div class="space-y-4">
              <!-- Clear Activities Only -->
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
                  <button id="clear-activities-btn" onclick="showClearActivitiesConfirm()" 
                          class="px-5 py-2 bg-orange-600 text-white rounded-lg font-semibold hover:bg-orange-700 transition text-sm">
                    Clear Activities
                  </button>
                  <button id="confirm-clear-activities-btn" onclick="confirmClearActivities()" 
                          class="hidden px-5 py-2 bg-orange-700 text-white rounded-lg font-bold hover:bg-orange-800 transition text-sm">
                    ✓ Yes, Delete All Activities
                  </button>
                  <button id="cancel-clear-activities-btn" onclick="cancelClearActivities()" 
                          class="hidden px-5 py-2 bg-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-400 transition text-sm">
                    Cancel
                  </button>
                </div>
              </div>

              <!-- Reset All Data -->
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
                    <p class="text-xs text-red-700 font-bold">⚠️ Consider exporting your data first using the buttons above!</p>
                  </div>
                </div>
                <div class="flex gap-3">
                  <button id="reset-all-btn" onclick="showResetAllConfirm()" 
                          class="px-5 py-2 bg-red-600 text-white rounded-lg font-semibold hover:bg-red-700 transition text-sm">
                    Reset All Data
                  </button>
                  <button id="confirm-reset-all-btn" onclick="confirmResetAll()" 
                          class="hidden px-5 py-2 bg-red-700 text-white rounded-lg font-bold hover:bg-red-800 transition text-sm">
                    ✓ Yes, Delete Everything
                  </button>
                  <button id="cancel-reset-all-btn" onclick="cancelResetAll()" 
                          class="hidden px-5 py-2 bg-gray-300 text-gray-700 rounded-lg font-semibold hover:bg-gray-400 transition text-sm">
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

    document.addEventListener('DOMContentLoaded', initializeApp);

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
      
      let successCount = 0;
      let errorCount = 0;
      
      for (const record of allRecords) {
        const result = await window.dataSdk.delete(record);
        if (result.isOk) {
          successCount++;
        } else {
          errorCount++;
        }
      }
      
      btn.disabled = false;
      btn.innerHTML = '✓ Yes, Delete Everything';
      
      if (errorCount === 0) {
        showToast(`Successfully reset all data (${successCount} records deleted)!`);
        cancelResetAll();
        // Navigate to home after reset
        setTimeout(() => {
          navigateToSection('home');
        }, 1500);
      } else {
        showToast(`Deleted ${successCount} records, ${errorCount} failed`, 'error');
      }
    }

    // Export Functions
    function printResultsPDF() {
      window.print();
      showToast('Opening print dialog...');
    }

    function exportToExcel() {
      const scores = calculateScores();
      const profile = getProfile();
      
      if (!profile) {
        showToast('Please create a profile first', 'error');
        return;
      }

      // Create CSV content (Excel-compatible)
      let csv = '\uFEFF'; // UTF-8 BOM for Excel
      csv += 'FST UMS Workload Calculator - Full Report\n\n';
      
      // Profile Information
      csv += 'STAFF PROFILE\n';
      csv += `Name,${profile.profile_name}\n`;
      csv += `Staff ID,${profile.profile_staff_id}\n`;
      csv += `Category,${profile.profile_category}\n`;
      csv += `Programme,${profile.profile_programme || 'N/A'}\n`;
      csv += `Rank,${profile.profile_rank || 'N/A'}\n`;
      csv += `Admin Position,${profile.profile_admin_position === 'Other' ? profile.profile_other_admin_position : profile.profile_admin_position}\n`;
      csv += '\n';
      
      // Summary Scores
      csv += 'WORKLOAD SUMMARY\n';
      csv += 'Category,Score,Count\n';
      csv += `Teaching,${scores.teaching.toFixed(2)},${getRecordsBySection('teaching').length}\n`;
      csv += `Supervision,${scores.supervision.toFixed(2)},${getRecordsBySection('supervision').length}\n`;
      csv += `Research,${scores.research.toFixed(2)},${getRecordsBySection('research').length}\n`;
      csv += `Publications,${scores.publications.toFixed(2)},${getRecordsBySection('publications').length}\n`;
      csv += `Admin Leadership,${scores.adminLeadership.toFixed(2)},${getRecordsBySection('administration').length}\n`;
      csv += `Admin Duties,${scores.adminDuties.toFixed(2)},${getRecordsBySection('admin_duties').length}\n`;
      csv += `Service,${scores.service.toFixed(2)},${getRecordsBySection('service').length}\n`;
      csv += `Laboratory,${scores.laboratory.toFixed(2)},${getRecordsBySection('laboratory').length}\n`;
      csv += `Professional,${scores.professional.toFixed(2)},${getRecordsBySection('professional').length}\n`;
      csv += `TOTAL,${scores.total.toFixed(2)},${allRecords.length}\n`;
      csv += '\n';
      
      // Teaching Details
      const courses = getRecordsBySection('teaching');
      if (courses.length > 0) {
        csv += 'TEACHING COURSES\n';
        csv += 'Course Code,Course Name,Credit Hours,Class Size,Lecture Hrs,Tutorial Hrs,Lab Hrs,Fieldwork Hrs,Semester,Role,Score\n';
        courses.forEach(course => {
          const score = calculateCourseScore(course);
          const semester = course.course_semester === 'Other' ? course.course_semester_other : course.course_semester;
          csv += `"${course.course_code}","${course.course_name}",${course.course_credit_hours},${course.course_class_size},`;
          csv += `${course.course_lecture},${course.course_tutorial},${course.course_lab},${course.course_fieldwork},"${semester}","${course.course_role}",${score.toFixed(2)}\n`;
        });
        csv += '\n';
      }
      
      // Supervision Details
      const students = getRecordsBySection('supervision');
      if (students.length > 0) {
        csv += 'STUDENT SUPERVISION\n';
        csv += 'Student Name,Matric,Level,Role,Research Title,Year,Score\n';
        students.forEach(student => {
          const score = calculateSupervisionScore(student);
          csv += `"${student.student_name}","${student.student_matric}","${student.student_level}","${student.student_role}","${student.student_title}",${student.student_year},${score.toFixed(2)}\n`;
        });
        csv += '\n';
      }
      
      // Research Details
      const projects = getRecordsBySection('research');
      if (projects.length > 0) {
        csv += 'RESEARCH PROJECTS\n';
        csv += 'Project Title,Grant Code,Role,Amount (RM),Status,Year,Duration,Score\n';
        projects.forEach(proj => {
          const score = calculateResearchScore(proj);
          csv += `"${proj.research_title}","${proj.research_grant_code}","${proj.research_role}",${proj.research_amount},"${proj.research_status}",${proj.research_year},${proj.research_duration},${score.toFixed(2)}\n`;
        });
        csv += '\n';
      }
      
      // Publications Details
      const publications = getRecordsBySection('publications');
      if (publications.length > 0) {
        csv += 'PUBLICATIONS\n';
        csv += 'Title,Type,Index,Venue,Position,Year,Status,Score\n';
        publications.forEach(pub => {
          const score = calculatePublicationScore(pub);
          csv += `"${pub.pub_title}","${pub.pub_type}","${pub.pub_index}","${pub.pub_venue}","${pub.pub_position}",${pub.pub_year},"${pub.pub_status}",${score.toFixed(2)}\n`;
        });
        csv += '\n';
      }
      
      // Download
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `FST_Workload_Report_${profile.profile_staff_id}_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showToast('Excel file downloaded successfully!');
    }

    function exportSummaryCSV() {
      const scores = calculateScores();
      const profile = getProfile();
      const status = getWorkloadStatus(scores.total);
      
      if (!profile) {
        showToast('Please create a profile first', 'error');
        return;
      }

      let csv = '\uFEFF'; // UTF-8 BOM
      csv += 'FST UMS Workload Calculator - Summary Report\n\n';
      csv += `Staff Name,${profile.profile_name}\n`;
      csv += `Staff ID,${profile.profile_staff_id}\n`;
      csv += `Generated,${new Date().toLocaleString()}\n\n`;
      
      csv += 'Category,Score,Percentage\n';
      const total = scores.total || 1; // Avoid division by zero
      csv += `Teaching,${scores.teaching.toFixed(2)},${((scores.teaching / total) * 100).toFixed(1)}%\n`;
      csv += `Supervision,${scores.supervision.toFixed(2)},${((scores.supervision / total) * 100).toFixed(1)}%\n`;
      csv += `Research,${scores.research.toFixed(2)},${((scores.research / total) * 100).toFixed(1)}%\n`;
      csv += `Publications,${scores.publications.toFixed(2)},${((scores.publications / total) * 100).toFixed(1)}%\n`;
      csv += `Admin Leadership,${scores.adminLeadership.toFixed(2)},${((scores.adminLeadership / total) * 100).toFixed(1)}%\n`;
      csv += `Admin Duties,${scores.adminDuties.toFixed(2)},${((scores.adminDuties / total) * 100).toFixed(1)}%\n`;
      csv += `Service,${scores.service.toFixed(2)},${((scores.service / total) * 100).toFixed(1)}%\n`;
      csv += `Laboratory,${scores.laboratory.toFixed(2)},${((scores.laboratory / total) * 100).toFixed(1)}%\n`;
      csv += `Professional,${scores.professional.toFixed(2)},${((scores.professional / total) * 100).toFixed(1)}%\n`;
      csv += `\nTOTAL,${scores.total.toFixed(2)},100%\n`;
      csv += `Status,${status.label}\n`;
      
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', `FST_Workload_Summary_${profile.profile_staff_id}_${new Date().toISOString().split('T')[0]}.csv`);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      showToast('Summary CSV downloaded!');
    }

    function copyToClipboard() {
      const scores = calculateScores();
      const profile = getProfile();
      const status = getWorkloadStatus(scores.total);
      
      if (!profile) {
        showToast('Please create a profile first', 'error');
        return;
      }

      let text = 'FST UMS WORKLOAD CALCULATOR - SUMMARY\n';
      text += '='.repeat(50) + '\n\n';
      text += `Staff: ${profile.profile_name} (${profile.profile_staff_id})\n`;
      text += `Rank: ${profile.profile_rank || profile.profile_category}\n`;
      text += `Date: ${new Date().toLocaleDateString()}\n\n`;
      
      text += 'WORKLOAD SCORES:\n';
      text += '-'.repeat(50) + '\n';
      text += `Teaching:          ${scores.teaching.toFixed(2)}\n`;
      text += `Supervision:       ${scores.supervision.toFixed(2)}\n`;
      text += `Research:          ${scores.research.toFixed(2)}\n`;
      text += `Publications:      ${scores.publications.toFixed(2)}\n`;
      text += `Admin Leadership:  ${scores.adminLeadership.toFixed(2)}\n`;
      text += `Admin Duties:      ${scores.adminDuties.toFixed(2)}\n`;
      text += `Service:           ${scores.service.toFixed(2)}\n`;
      text += `Laboratory:        ${scores.laboratory.toFixed(2)}\n`;
      text += `Professional:      ${scores.professional.toFixed(2)}\n`;
      text += '-'.repeat(50) + '\n';
      text += `TOTAL SCORE:       ${scores.total.toFixed(2)}\n`;
      text += `STATUS:            ${status.label} ${status.icon}\n`;
      
      // Copy to clipboard
      navigator.clipboard.writeText(text).then(() => {
        showToast('Summary copied to clipboard!');
      }).catch(err => {
        showToast('Failed to copy to clipboard', 'error');
      });
    }
