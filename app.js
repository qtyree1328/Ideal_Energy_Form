// Ideal Energy - Main Application
import { checkIdealEligibility, getAvailableAuctionTypes, getStateTooltipInfo, getStateClass, STATE_DATA } from './deregulated-states.js';
import { captureReferral, submitLeadToFirebase, getStoredReferral } from './firebase.js';

// Form steps for Ideal
const STEPS = {
  LOCATION: 'location',
  AUCTION_TYPE: 'auction_type',
  PROPERTY_TYPE: 'property_type',
  ENERGY_BILLS: 'energy_bills',
  PROPERTY_DETAILS: 'property_details',
  CONTACT: 'contact'
};

const STEP_ORDER = [
  STEPS.LOCATION,
  STEPS.AUCTION_TYPE,
  STEPS.PROPERTY_TYPE,
  STEPS.ENERGY_BILLS,
  STEPS.PROPERTY_DETAILS,
  STEPS.CONTACT
];

// Application state
let currentStep = 0;
let userData = {
  location: null,
  auctionType: null,
  propertyType: null,
  portfolioOver5k: null,
  propertyDetails: {
    ownsProperty: null,
    electricUtility: ''
  },
  additionalDetails: {
    hasRetailContract: null,
    retailProvider: '',
    notes: '',
    files: {
      energyBill: null,
      energyContract: null
    }
  },
  contact: { name: '', email: '', phone: '' }
};

// DOM Elements
let landingPage, appContainer, questionContainer, progressFill, stepIndicator;
let nextBtn, backBtn, startOverBtn;
let stateBlockedOverlay, limitedAccessOverlay, successOverlay;
let map, marker;

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
  // Capture referral source from URL params immediately
  captureReferral();

  initElements();
  initLandingPage();
  initMap();
});

function initElements() {
  landingPage = document.getElementById('landing-page');
  appContainer = document.getElementById('app-container');
  questionContainer = document.getElementById('question-container');
  progressFill = document.getElementById('progress-fill');
  stepIndicator = document.getElementById('step-indicator');
  nextBtn = document.getElementById('next-btn');
  backBtn = document.getElementById('back-btn');
  startOverBtn = document.getElementById('start-over-btn');
  stateBlockedOverlay = document.getElementById('state-blocked-overlay');
  limitedAccessOverlay = document.getElementById('limited-access-overlay');
  successOverlay = document.getElementById('success-overlay');

  // Button event listeners
  nextBtn?.addEventListener('click', handleNext);
  backBtn?.addEventListener('click', handleBack);
  startOverBtn?.addEventListener('click', handleStartOver);

  // Modal close buttons
  document.getElementById('state-blocked-close')?.addEventListener('click', () => {
    hideModal(stateBlockedOverlay);
    handleStartOver();
  });

  document.getElementById('limited-access-close')?.addEventListener('click', () => {
    hideModal(limitedAccessOverlay);
  });

  document.getElementById('continue-limited-btn')?.addEventListener('click', () => {
    hideModal(limitedAccessOverlay);
    goToNextStep();
  });

  document.getElementById('residential-close')?.addEventListener('click', () => {
    hideModal(document.getElementById('residential-overlay'));
  });
  document.getElementById('residential-close-btn')?.addEventListener('click', () => {
    hideModal(document.getElementById('residential-overlay'));
  });

  document.getElementById('spend-threshold-close')?.addEventListener('click', () => {
    hideModal(document.getElementById('spend-threshold-overlay'));
  });
  document.getElementById('spend-threshold-close-btn')?.addEventListener('click', () => {
    hideModal(document.getElementById('spend-threshold-overlay'));
  });

  // Signing modal buttons
  document.getElementById('signing-close')?.addEventListener('click', () => {
    hideModal(document.getElementById('signing-overlay'));
    activeSigningDoc = null;
  });
  document.getElementById('signing-cancel')?.addEventListener('click', () => {
    hideModal(document.getElementById('signing-overlay'));
    activeSigningDoc = null;
  });
  document.getElementById('signing-submit')?.addEventListener('click', handleSigningSubmit);
  document.getElementById('signing-name')?.addEventListener('input', updateSigningSubmitButton);

  document.getElementById('download-profile-btn')?.addEventListener('click', downloadProfile);
  document.getElementById('return-home-btn')?.addEventListener('click', () => {
    hideModal(successOverlay);
    handleStartOver();
  });
}

function initLandingPage() {
  // Get Started buttons
  document.getElementById('get-started-btn')?.addEventListener('click', startQuestionnaire);
  document.getElementById('get-started-btn-sticky')?.addEventListener('click', startQuestionnaire);

  // Tab navigation
  const navTabs = document.querySelectorAll('.nav-tab, .footer-link, .landing-logo');
  navTabs.forEach(tab => {
    tab.addEventListener('click', (e) => {
      e.preventDefault();
      const tabName = tab.dataset.tab;
      if (tabName) switchTab(tabName);
    });
  });

  // Sticky button visibility on scroll
  const heroSection = document.querySelector('.hero-section-new');
  const stickyBtn = document.getElementById('get-started-btn-sticky');

  if (heroSection && stickyBtn) {
    window.addEventListener('scroll', () => {
      const heroBottom = heroSection.getBoundingClientRect().bottom;
      if (heroBottom < 100) {
        stickyBtn.classList.add('visible');
      } else {
        stickyBtn.classList.remove('visible');
      }
    });
  }

  // Scroll reveal animation for sections
  const scrollRevealElements = document.querySelectorAll('.scroll-reveal');

  const revealObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('revealed');
        // Once revealed, stop observing (animation only happens once)
        revealObserver.unobserve(entry.target);
      }
    });
  }, {
    threshold: 0.15,
    rootMargin: '0px 0px -50px 0px'
  });

  scrollRevealElements.forEach(el => {
    revealObserver.observe(el);
  });

  // Load US Map SVG
  loadUSMap();
}

function switchTab(tabName) {
  // Update nav tabs
  document.querySelectorAll('.nav-tab').forEach(tab => {
    tab.classList.toggle('active', tab.dataset.tab === tabName);
  });

  // Update tab content
  document.querySelectorAll('.tab-content').forEach(content => {
    const contentId = content.id.replace('-tab', '');
    content.classList.toggle('active', contentId === tabName);
  });

  // Scroll to top
  window.scrollTo(0, 0);
}

async function loadUSMap() {
  const container = document.getElementById('us-map-container');
  if (!container) return;

  try {
    const response = await fetch('assets/us-map.svg');
    const svgText = await response.text();
    container.innerHTML = svgText;

    // Add classes and event listeners to states
    const states = container.querySelectorAll('path[id]');
    states.forEach(state => {
      const stateCode = state.id;
      const stateClass = getStateClass(stateCode);
      state.classList.add('state', stateClass);

      state.addEventListener('mouseenter', (e) => showStateTooltip(e, stateCode));
      state.addEventListener('mouseleave', hideStateTooltip);
      state.addEventListener('mousemove', moveStateTooltip);
    });
  } catch (error) {
    console.error('Failed to load US map:', error);
  }
}

function showStateTooltip(event, stateCode) {
  const tooltip = document.getElementById('state-tooltip');
  const info = getStateTooltipInfo(stateCode);

  if (!tooltip || !info) return;

  // Determine status based on booleans and limited flag
  const getStatus = (hasService, isLimited) => {
    if (!hasService) return { text: 'No', class: 'no' };
    if (isLimited) return { text: 'Limited', class: 'limited' };
    return { text: 'Yes', class: 'yes' };
  };

  const electricStatus = getStatus(info.electricity, info.limited);
  const gasStatus = getStatus(info.gas, info.limited);

  // Get category label for header
  const categoryLabel = {
    'both': 'Full Access (Both)',
    'electric_only': 'Electric Only',
    'gas_only': 'Gas Only',
    'partial': 'Limited Access',
    'none': 'No Energy Choice'
  }[info.category] || 'Unknown';

  tooltip.innerHTML = `
    <div class="tooltip-title">${info.name}</div>
    <div class="tooltip-category">${categoryLabel}</div>
    <div class="tooltip-status">
      <div class="tooltip-item">
        <span class="tooltip-label">Electric:</span>
        <span class="tooltip-value ${electricStatus.class}">${electricStatus.text}</span>
      </div>
      <div class="tooltip-item">
        <span class="tooltip-label">Gas:</span>
        <span class="tooltip-value ${gasStatus.class}">${gasStatus.text}</span>
      </div>
    </div>
    <div class="tooltip-description">${info.description}</div>
  `;

  moveStateTooltip(event);
  tooltip.classList.add('visible');
}

function moveStateTooltip(event) {
  const tooltip = document.getElementById('state-tooltip');
  if (!tooltip) return;

  const wrapper = document.querySelector('.us-map-wrapper');
  if (!wrapper) return;

  const rect = wrapper.getBoundingClientRect();
  const x = event.clientX - rect.left + 15;
  const y = event.clientY - rect.top + 15;

  tooltip.style.left = `${x}px`;
  tooltip.style.top = `${y}px`;
}

function hideStateTooltip() {
  const tooltip = document.getElementById('state-tooltip');
  if (tooltip) tooltip.classList.remove('visible');
}

function startQuestionnaire() {
  landingPage.style.display = 'none';
  appContainer.style.display = 'flex';
  currentStep = 0;
  signedDocuments = { loa: null, loe: null };
  userData = {
    location: null,
    auctionType: null,
    propertyType: null,
    energySource: null,
    bills: { electricity: 200, gas: 100 },
    propertyDetails: {
      ownsProperty: null,
      electricUtility: '',
      retailProvider: ''
    },
    additionalDetails: {
      energyCharges: null,
      demandCharges: null,
      files: {
        loa: null,
        loe: null,
        energyBill: null,
        energyContract: null
      }
    },
    contact: { name: '', email: '', phone: '' }
  };
  renderStep();
}

function renderStep() {
  const step = STEP_ORDER[currentStep];
  updateProgress();

  switch (step) {
    case STEPS.LOCATION:
      renderLocationStep();
      break;
    case STEPS.AUCTION_TYPE:
      renderAuctionTypeStep();
      break;
    case STEPS.PROPERTY_TYPE:
      renderPropertyTypeStep();
      break;
    case STEPS.ENERGY_BILLS:
      renderEnergyBillsStep();
      break;
    case STEPS.PROPERTY_DETAILS:
      renderPropertyDetailsStep();
      break;
    case STEPS.CONTACT:
      renderContactStep();
      break;
  }

  backBtn.disabled = currentStep === 0;
}

function updateProgress() {
  const total = STEP_ORDER.length;
  const progress = ((currentStep + 1) / total) * 100;
  progressFill.style.width = `${progress}%`;
  stepIndicator.textContent = `${currentStep + 1}/${total}`;
}

// STEP 1: Location
function renderLocationStep() {
  questionContainer.innerHTML = `
    <div class="question-header">
      <h2 class="question-title">Where is your property located?</h2>
      <p class="question-subtitle">Enter your address to check if energy choice is available in your area.</p>
    </div>
    <div class="address-section">
      <div class="address-input-wrapper">
        <input type="text" class="address-input" id="address-input" placeholder="Enter your address..." value="${userData.location?.address || ''}">
        <button class="search-button" id="search-btn">Search</button>
      </div>
      <div class="map-container">
        <div id="map"></div>
      </div>
      <div class="map-controls" id="map-controls" style="display: ${userData.location ? 'flex' : 'none'};">
        <button class="map-button" id="modify-pin-btn">Modify Pin</button>
        <button class="map-button primary ${userData.location?.confirmed ? 'confirmed' : ''}" id="confirm-location-btn">
          ${userData.location?.confirmed ? 'Location Confirmed' : 'Confirm Location'}
        </button>
      </div>
      <div class="location-info" id="location-info" style="display: ${userData.location ? 'block' : 'none'};">
        <strong>Selected Location:</strong> <span id="selected-address">${userData.location?.address || ''}</span>
        <div id="deregulation-status"></div>
      </div>
    </div>
  `;

  initMapForStep();

  document.getElementById('search-btn')?.addEventListener('click', searchAddress);
  document.getElementById('address-input')?.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') searchAddress();
  });
  document.getElementById('modify-pin-btn')?.addEventListener('click', enablePinModification);
  document.getElementById('confirm-location-btn')?.addEventListener('click', confirmLocation);

  updateNextButton();
}

function initMapForStep() {
  if (map) {
    map.remove();
  }

  const center = userData.location ? [userData.location.lng, userData.location.lat] : [-98.5795, 39.8283];
  const zoom = userData.location ? 16 : 3;

  // Use ESRI satellite imagery
  map = new maplibregl.Map({
    container: 'map',
    style: {
      version: 8,
      sources: {
        'esri-satellite': {
          type: 'raster',
          tiles: [
            'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'
          ],
          tileSize: 256,
          attribution: 'ESRI World Imagery'
        }
      },
      layers: [
        {
          id: 'esri-satellite-layer',
          type: 'raster',
          source: 'esri-satellite',
          minzoom: 0,
          maxzoom: 19
        }
      ]
    },
    center: center,
    zoom: zoom
  });

  map.addControl(new maplibregl.NavigationControl(), 'top-right');

  if (userData.location) {
    addMarker(userData.location.lng, userData.location.lat);
  }
}

async function searchAddress() {
  const input = document.getElementById('address-input');
  const address = input?.value.trim();

  if (!address) {
    showToast('Please enter an address', 'error');
    return;
  }

  showLoading('Searching address...');

  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address)}&countrycodes=us&limit=1`
    );
    const results = await response.json();

    if (results.length === 0) {
      hideLoading();
      showToast('Address not found. Please try again.', 'error');
      return;
    }

    const result = results[0];
    const lat = parseFloat(result.lat);
    const lng = parseFloat(result.lon);

    // Extract state from address
    const state = extractStateFromAddress(result.display_name);

    userData.location = {
      address: result.display_name,
      lat,
      lng,
      state,
      confirmed: false
    };

    // Update map
    map.flyTo({ center: [lng, lat], zoom: 16 });
    addMarker(lng, lat);

    // Show controls and info
    document.getElementById('map-controls').style.display = 'flex';
    document.getElementById('location-info').style.display = 'block';
    document.getElementById('selected-address').textContent = result.display_name;

    // Check deregulation status
    checkDeregulationStatus(state);

    hideLoading();
  } catch (error) {
    hideLoading();
    showToast('Error searching address. Please try again.', 'error');
    console.error('Search error:', error);
  }
}

function extractStateFromAddress(address) {
  // Common US state abbreviations
  const stateRegex = /\b([A-Z]{2})\b(?:\s+\d{5})?(?:,?\s*(?:USA|United States))?$/i;
  const match = address.match(stateRegex);

  if (match) {
    return match[1].toUpperCase();
  }

  // Try to find state name
  for (const [code, data] of Object.entries(STATE_DATA)) {
    if (address.toLowerCase().includes(data.name.toLowerCase())) {
      return code;
    }
  }

  return null;
}

function addMarker(lng, lat) {
  if (marker) {
    marker.remove();
  }

  const el = document.createElement('div');
  el.className = 'marker';
  el.innerHTML = `
    <svg width="32" height="48" viewBox="0 0 32 48" fill="none" xmlns="http://www.w3.org/2000/svg">
      <path d="M16 0C7.164 0 0 7.164 0 16C0 28 16 48 16 48C16 48 32 28 32 16C32 7.164 24.836 0 16 0Z" fill="#f97316"/>
      <circle cx="16" cy="16" r="8" fill="white"/>
    </svg>
  `;
  el.style.cssText = `
    cursor: pointer;
    transform: translate(-50%, -100%);
  `;

  marker = new maplibregl.Marker({ element: el, draggable: false, anchor: 'bottom' })
    .setLngLat([lng, lat])
    .addTo(map);
}

function enablePinModification() {
  if (!marker) return;

  marker.setDraggable(true);

  marker.on('dragend', () => {
    const lngLat = marker.getLngLat();
    userData.location.lat = lngLat.lat;
    userData.location.lng = lngLat.lng;
    userData.location.confirmed = false;

    document.getElementById('confirm-location-btn').textContent = 'Confirm Location';
    document.getElementById('confirm-location-btn').classList.remove('confirmed');
    updateNextButton();
  });

  showToast('Drag the pin to adjust location', 'info');
}

function confirmLocation() {
  if (!userData.location) return;

  userData.location.confirmed = true;
  marker?.setDraggable(false);

  document.getElementById('confirm-location-btn').textContent = 'Location Confirmed';
  document.getElementById('confirm-location-btn').classList.add('confirmed');

  updateNextButton();
  showToast('Location confirmed!', 'success');
}

function checkDeregulationStatus(stateCode) {
  const statusDiv = document.getElementById('deregulation-status');
  if (!statusDiv) return;

  const eligibility = checkIdealEligibility(stateCode);

  if (eligibility.eligible) {
    const badgeClass = eligibility.isLimited ? 'limited' : 'eligible';
    statusDiv.innerHTML = `
      <div class="deregulated-badge ${badgeClass}">
        ${eligibility.isLimited ? 'Limited' : 'Full'} Energy Choice Available
      </div>
    `;
  } else {
    statusDiv.innerHTML = `
      <div class="deregulated-badge not-eligible">
        No Energy Choice Available
      </div>
    `;
  }
}

// STEP 2: Auction Type
function renderAuctionTypeStep() {
  const auctionTypes = getAvailableAuctionTypes(userData.location?.state);

  let options = [];

  if (auctionTypes.both) {
    options.push({
      value: 'both',
      label: 'Both Electricity & Natural Gas',
      description: 'Auction both your electricity and natural gas contracts for maximum savings'
    });
  }

  if (auctionTypes.electricity) {
    options.push({
      value: 'electricity',
      label: 'Electricity Only',
      description: 'Auction your electricity contract to competitive providers'
    });
  }

  if (auctionTypes.gas) {
    options.push({
      value: 'gas',
      label: 'Natural Gas Only',
      description: 'Auction your natural gas contract to competitive providers'
    });
  }

  const optionsHtml = options.map(opt => `
    <label class="option-card ${userData.auctionType === opt.value ? 'selected' : ''}" data-value="${opt.value}">
      <input type="radio" name="auctionType" value="${opt.value}" ${userData.auctionType === opt.value ? 'checked' : ''}>
      <div class="option-content">
        <div class="option-label">${opt.label}</div>
        <div class="option-description">${opt.description}</div>
      </div>
      <div class="option-indicator"></div>
    </label>
  `).join('');

  questionContainer.innerHTML = `
    <div class="question-header">
      <h2 class="question-title">What would you like to auction?</h2>
      <p class="question-subtitle">Select the energy services you want Ideal to help you with.</p>
    </div>
    <div class="options-grid">
      ${optionsHtml}
    </div>
  `;

  // Add click handlers
  document.querySelectorAll('.option-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.option-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      card.querySelector('input').checked = true;
      userData.auctionType = card.dataset.value;
      updateNextButton();
    });
  });

  updateNextButton();
}

// STEP 3: Property Type
function renderPropertyTypeStep() {
  const options = [
    { value: 'commercial', label: 'Commercial', description: 'Office, retail, or service business' },
    { value: 'residential', label: 'Residential', description: 'Apartment building or housing complex' }
  ];

  const optionsHtml = options.map(opt => `
    <label class="option-card ${userData.propertyType === opt.value ? 'selected' : ''}" data-value="${opt.value}">
      <input type="radio" name="propertyType" value="${opt.value}" ${userData.propertyType === opt.value ? 'checked' : ''}>
      <div class="option-content">
        <div class="option-label">${opt.label}</div>
        <div class="option-description">${opt.description}</div>
      </div>
      <div class="option-indicator"></div>
    </label>
  `).join('');

  questionContainer.innerHTML = `
    <div class="question-header">
      <h2 class="question-title">What type of property is this?</h2>
      <p class="question-subtitle">This helps us match you with the right providers.</p>
    </div>
    <div class="options-grid">
      ${optionsHtml}
    </div>
  `;

  document.querySelectorAll('.option-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.option-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      card.querySelector('input').checked = true;
      userData.propertyType = card.dataset.value;

      if (card.dataset.value === 'residential') {
        showModal(document.getElementById('residential-overlay'));
        // Deselect so they can't proceed
        card.classList.remove('selected');
        card.querySelector('input').checked = false;
        userData.propertyType = null;
      }

      updateNextButton();
    });
  });

  updateNextButton();
}

// STEP 4: Energy Bills
function renderEnergyBillsStep() {
  const options = [
    { value: 'yes', label: 'Yes', description: 'Our monthly energy portfolio spend is greater than $5,000' },
    { value: 'no', label: 'No', description: 'Our monthly energy portfolio spend is less than $5,000' }
  ];

  const optionsHtml = options.map(opt => `
    <label class="option-card ${userData.portfolioOver5k === opt.value ? 'selected' : ''}" data-value="${opt.value}">
      <input type="radio" name="portfolioSpend" value="${opt.value}" ${userData.portfolioOver5k === opt.value ? 'checked' : ''}>
      <div class="option-content">
        <div class="option-label">${opt.label}</div>
        <div class="option-description">${opt.description}</div>
      </div>
      <div class="option-indicator"></div>
    </label>
  `).join('');

  questionContainer.innerHTML = `
    <div class="question-header">
      <h2 class="question-title">What is your monthly portfolio energy spend?</h2>
      <p class="question-subtitle">Is your total monthly energy spend greater than $5,000?</p>
    </div>
    <div class="options-grid">
      ${optionsHtml}
    </div>
  `;

  document.querySelectorAll('.option-card').forEach(card => {
    card.addEventListener('click', () => {
      document.querySelectorAll('.option-card').forEach(c => c.classList.remove('selected'));
      card.classList.add('selected');
      card.querySelector('input').checked = true;
      userData.portfolioOver5k = card.dataset.value;

      if (card.dataset.value === 'no') {
        showModal(document.getElementById('spend-threshold-overlay'));
        card.classList.remove('selected');
        card.querySelector('input').checked = false;
        userData.portfolioOver5k = null;
      }

      updateNextButton();
    });
  });

  updateNextButton();
}

// STEP 5: Property Details & Additional Information
function renderPropertyDetailsStep() {
  const ownershipOptions = [
    { value: '', label: 'Select...' },
    { value: 'own', label: 'Yes, I own this property' },
    { value: 'rent', label: 'No, I rent/lease this property' },
    { value: 'manage', label: 'I manage this property for the owner' }
  ];

  questionContainer.innerHTML = `
    <div class="question-header">
      <h2 class="question-title">Property & Utility Details</h2>
      <p class="question-subtitle">Help us understand your property and current utility setup.</p>
    </div>

    <div class="security-notice">
      <div class="security-notice-icon">
        <svg width="20" height="20" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"/></svg>
      </div>
      <div>
        <strong>Your information is protected.</strong> All documents and data are handled under a strict Non-Disclosure Agreement (NDA). Ideal will never share your proprietary information with third parties without your explicit consent.
      </div>
    </div>

    <!-- Document Signing Section -->
    <div class="docusign-section">
      <h3 class="section-header">Documents to Sign</h3>
      <p class="section-subtext" style="margin-bottom: 20px;">Please review and sign the following documents to authorize Ideal to act on your behalf.</p>

      <div class="docusign-grid">
        <div class="docusign-card" id="loa-card">
          <div class="docusign-card-header">
            <div class="docusign-icon">
              <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            </div>
            <div>
              <h4 class="docusign-title">Letter of Authorization (LOA)</h4>
              <p class="docusign-desc">Authorizes Ideal to request energy pricing on your behalf</p>
            </div>
          </div>
          <div class="docusign-preview">
            <div class="docusign-preview-content">
              <div class="docusign-preview-header">LETTER OF AUTHORIZATION</div>
              <div class="docusign-preview-line" style="width: 80%"></div>
              <div class="docusign-preview-line" style="width: 100%"></div>
              <div class="docusign-preview-line" style="width: 90%"></div>
              <div class="docusign-preview-line" style="width: 95%"></div>
              <div class="docusign-preview-line" style="width: 60%"></div>
              <div class="docusign-preview-spacer"></div>
              <div class="docusign-preview-line" style="width: 100%"></div>
              <div class="docusign-preview-line" style="width: 85%"></div>
              <div class="docusign-preview-line" style="width: 70%"></div>
              <div class="docusign-preview-spacer"></div>
              <div class="docusign-signature-area">
                <div class="docusign-sig-line">
                  <span class="docusign-sig-label">Signature</span>
                  <span class="docusign-sig-x">X ___________________________</span>
                </div>
                <div class="docusign-sig-line">
                  <span class="docusign-sig-label">Date</span>
                  <span class="docusign-sig-x">___________________________</span>
                </div>
              </div>
            </div>
          </div>
          <button class="docusign-btn" id="sign-loa-btn">
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
            Sign Document
          </button>
        </div>

        <div class="docusign-card" id="loe-card">
          <div class="docusign-card-header">
            <div class="docusign-icon">
              <svg width="24" height="24" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"/></svg>
            </div>
            <div>
              <h4 class="docusign-title">Letter of Enrollment (LOE)</h4>
              <p class="docusign-desc">Enrolls your account into the Ideal energy auction platform</p>
            </div>
          </div>
          <div class="docusign-preview">
            <div class="docusign-preview-content">
              <div class="docusign-preview-header">LETTER OF ENROLLMENT</div>
              <div class="docusign-preview-line" style="width: 85%"></div>
              <div class="docusign-preview-line" style="width: 100%"></div>
              <div class="docusign-preview-line" style="width: 75%"></div>
              <div class="docusign-preview-line" style="width: 90%"></div>
              <div class="docusign-preview-line" style="width: 65%"></div>
              <div class="docusign-preview-spacer"></div>
              <div class="docusign-preview-line" style="width: 100%"></div>
              <div class="docusign-preview-line" style="width: 80%"></div>
              <div class="docusign-preview-line" style="width: 55%"></div>
              <div class="docusign-preview-spacer"></div>
              <div class="docusign-signature-area">
                <div class="docusign-sig-line">
                  <span class="docusign-sig-label">Signature</span>
                  <span class="docusign-sig-x">X ___________________________</span>
                </div>
                <div class="docusign-sig-line">
                  <span class="docusign-sig-label">Date</span>
                  <span class="docusign-sig-x">___________________________</span>
                </div>
              </div>
            </div>
          </div>
          <button class="docusign-btn" id="sign-loe-btn">
            <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"/></svg>
            Sign Document
          </button>
        </div>
      </div>

      <!-- Document Uploads (right after signing) -->
      <div class="file-upload-section" style="margin-top: 24px;">
        <h4 class="file-section-title">Upload Supporting Documents</h4>
        <div class="file-upload-grid">
          <div class="file-upload-item">
            <label class="file-upload-label" for="file-energy-bill">
              <span class="file-icon">📄</span>
              <span class="file-name" id="file-energy-bill-name">${userData.additionalDetails.files.energyBill?.name || 'Copy of Last Energy Bill'}</span>
              <span class="file-status ${userData.additionalDetails.files.energyBill ? 'uploaded' : ''}">${userData.additionalDetails.files.energyBill ? '✓' : 'Upload'}</span>
            </label>
            <input type="file" id="file-energy-bill" class="file-input" accept=".pdf,.doc,.docx,.jpg,.png">
          </div>
          <div class="file-upload-item">
            <label class="file-upload-label" for="file-energy-contract">
              <span class="file-icon">📄</span>
              <span class="file-name" id="file-energy-contract-name">${userData.additionalDetails.files.energyContract?.name || 'Copy of Current Energy Contract'}</span>
              <span class="file-status ${userData.additionalDetails.files.energyContract ? 'uploaded' : ''}">${userData.additionalDetails.files.energyContract ? '✓' : 'Upload'}</span>
            </label>
            <input type="file" id="file-energy-contract" class="file-input" accept=".pdf,.doc,.docx,.jpg,.png">
          </div>
        </div>
      </div>
    </div>

    <!-- Additional Details Section -->
    <div class="additional-details-section">
      <div class="section-divider">
        <h3 class="section-header">Additional Details</h3>
        <p class="section-subtext">These are optional — fill out what you can to the best of your ability.</p>
      </div>

      <div class="form-grid">
        <div class="form-field">
          <label class="form-label">Do you own this property?</label>
          <select class="form-select" id="ownership-select">
            ${ownershipOptions.map(opt => `
              <option value="${opt.value}" ${userData.propertyDetails.ownsProperty === opt.value ? 'selected' : ''}>${opt.label}</option>
            `).join('')}
          </select>
        </div>
        <div class="form-field">
          <label class="form-label">Are you in a retail energy contract?</label>
          <div class="toggle-group" id="retail-contract-toggle">
            <button class="toggle-btn ${userData.additionalDetails.hasRetailContract === 'yes' ? 'active' : ''}" data-value="yes">Yes</button>
            <button class="toggle-btn ${userData.additionalDetails.hasRetailContract === 'no' ? 'active' : ''}" data-value="no">No</button>
          </div>
        </div>
        <div class="form-field" id="retail-provider-field" style="display: ${userData.additionalDetails.hasRetailContract === 'yes' ? 'block' : 'none'};">
          <label class="form-label">Retail Energy Provider</label>
          <input type="text" class="form-text-input" id="retail-provider" placeholder="e.g., Direct Energy" value="${userData.additionalDetails.retailProvider}">
        </div>
        <div class="form-field">
          <label class="form-label">Name of Electric Utility</label>
          <input type="text" class="form-text-input" id="electric-utility" placeholder="e.g., Pacific Gas and Electric" value="${userData.propertyDetails.electricUtility}">
        </div>
      </div>

      <div class="form-field" style="margin-top: 24px;">
        <label class="form-label">Additional Notes</label>
        <textarea class="form-textarea" id="additional-notes" rows="4" placeholder="Anything else you'd like us to know about your energy setup, contract timing, or specific needs...">${userData.additionalDetails.notes || ''}</textarea>
      </div>
    </div>
  `;

  // Document signing button handlers
  document.getElementById('sign-loa-btn')?.addEventListener('click', () => {
    if (signedDocuments.loa?.signed) return;
    openSigningModal('loa');
  });
  document.getElementById('sign-loe-btn')?.addEventListener('click', () => {
    if (signedDocuments.loe?.signed) return;
    openSigningModal('loe');
  });

  // Restore signed state if returning to this step
  if (signedDocuments.loa?.signed) updateDocCardUI('loa');
  if (signedDocuments.loe?.signed) updateDocCardUI('loe');

  // Additional details event handlers
  const ownershipSelect = document.getElementById('ownership-select');
  const electricUtilityInput = document.getElementById('electric-utility');
  const retailProviderInput = document.getElementById('retail-provider');
  const additionalNotesInput = document.getElementById('additional-notes');

  ownershipSelect?.addEventListener('change', (e) => {
    userData.propertyDetails.ownsProperty = e.target.value || null;
  });

  electricUtilityInput?.addEventListener('input', (e) => {
    userData.propertyDetails.electricUtility = e.target.value;
  });

  retailProviderInput?.addEventListener('input', (e) => {
    userData.additionalDetails.retailProvider = e.target.value;
  });

  additionalNotesInput?.addEventListener('input', (e) => {
    userData.additionalDetails.notes = e.target.value;
  });

  // Retail contract toggle
  document.querySelectorAll('#retail-contract-toggle .toggle-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('#retail-contract-toggle .toggle-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      userData.additionalDetails.hasRetailContract = btn.dataset.value;
      const providerField = document.getElementById('retail-provider-field');
      if (btn.dataset.value === 'yes') {
        providerField.style.display = 'block';
      } else {
        providerField.style.display = 'none';
        userData.additionalDetails.retailProvider = '';
        if (retailProviderInput) retailProviderInput.value = '';
      }
    });
  });

  // File upload handlers
  const fileInputs = [
    { id: 'file-energy-bill', key: 'energyBill', nameId: 'file-energy-bill-name' },
    { id: 'file-energy-contract', key: 'energyContract', nameId: 'file-energy-contract-name' }
  ];

  fileInputs.forEach(({ id, key, nameId }) => {
    const input = document.getElementById(id);
    input?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        userData.additionalDetails.files[key] = file;
        document.getElementById(nameId).textContent = file.name;
        input.closest('.file-upload-item').querySelector('.file-status').textContent = '✓';
        input.closest('.file-upload-item').querySelector('.file-status').classList.add('uploaded');
      }
    });
  });

  // This step is always valid (all optional)
  nextBtn.disabled = false;
  nextBtn.textContent = 'Next';
}

// STEP 6: Contact Information
function renderContactStep() {
  questionContainer.innerHTML = `
    <div class="question-header">
      <h2 class="question-title">How can we reach you?</h2>
      <p class="question-subtitle">Enter your contact information and our team will be in touch shortly.</p>
    </div>
    <div class="form-grid">
      <div class="form-field">
        <label class="form-label">Full Name *</label>
        <input type="text" class="form-text-input" id="contact-name" placeholder="John Smith" value="${userData.contact.name}">
      </div>
      <div class="form-field">
        <label class="form-label">Email Address *</label>
        <input type="email" class="form-text-input" id="contact-email" placeholder="john@example.com" value="${userData.contact.email}">
      </div>
      <div class="form-field">
        <label class="form-label">Phone Number (optional)</label>
        <input type="tel" class="form-text-input" id="contact-phone" placeholder="(555) 555-5555" value="${userData.contact.phone}">
      </div>
    </div>
    <div class="info-note" style="margin-top: 24px; padding: 16px; background: #dcfce7; border-radius: 8px; font-size: 14px; color: #166534;">
      <strong>What happens next?</strong> An Ideal energy specialist will review your information and contact you within 1-2 business days to discuss your options and potential savings.
    </div>
  `;

  // Add input handlers
  const nameInput = document.getElementById('contact-name');
  const emailInput = document.getElementById('contact-email');
  const phoneInput = document.getElementById('contact-phone');

  const updateContact = () => {
    userData.contact.name = nameInput?.value || '';
    userData.contact.email = emailInput?.value || '';
    userData.contact.phone = phoneInput?.value || '';
    updateNextButton();
  };

  nameInput?.addEventListener('input', updateContact);
  emailInput?.addEventListener('input', updateContact);
  phoneInput?.addEventListener('input', updateContact);

  // Update button for final step
  nextBtn.textContent = 'Submit';
  updateNextButton();
}

function updateNextButton() {
  const step = STEP_ORDER[currentStep];

  switch (step) {
    case STEPS.LOCATION:
      nextBtn.disabled = !userData.location?.confirmed;
      nextBtn.textContent = 'Next';
      break;
    case STEPS.AUCTION_TYPE:
      nextBtn.disabled = !userData.auctionType;
      nextBtn.textContent = 'Next';
      break;
    case STEPS.PROPERTY_TYPE:
      nextBtn.disabled = !userData.propertyType;
      nextBtn.textContent = 'Next';
      break;
    case STEPS.ENERGY_BILLS:
      nextBtn.disabled = !userData.portfolioOver5k;
      nextBtn.textContent = 'Next';
      break;
    case STEPS.CONTACT:
      const hasName = userData.contact.name.trim().length > 0;
      const hasValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(userData.contact.email);
      nextBtn.disabled = !hasName || !hasValidEmail;
      nextBtn.textContent = 'Submit';
      break;
  }
}

function handleNext() {
  const step = STEP_ORDER[currentStep];

  // Special handling for location step - check eligibility
  if (step === STEPS.LOCATION) {
    const eligibility = checkIdealEligibility(userData.location?.state);

    if (!eligibility.eligible) {
      // State not eligible - show blocked modal
      showModal(stateBlockedOverlay);
      return;
    }

    if (eligibility.isLimited) {
      // Limited access - show info modal
      showModal(limitedAccessOverlay);
      return;
    }
  }

  // Final step - submit
  if (step === STEPS.CONTACT) {
    handleSubmit();
    return;
  }

  goToNextStep();
}

function goToNextStep() {
  if (currentStep < STEP_ORDER.length - 1) {
    currentStep++;
    renderStep();
  }
}

function handleBack() {
  if (currentStep > 0) {
    currentStep--;
    renderStep();
  }
}

function handleStartOver() {
  landingPage.style.display = 'block';
  appContainer.style.display = 'none';
  currentStep = 0;
  signedDocuments = { loa: null, loe: null };
  userData = {
    location: null,
    auctionType: null,
    propertyType: null,
    energySource: null,
    bills: { electricity: 200, gas: 100 },
    propertyDetails: {
      ownsProperty: null,
      electricUtility: '',
      retailProvider: ''
    },
    additionalDetails: {
      energyCharges: null,
      demandCharges: null,
      files: {
        loa: null,
        loe: null,
        energyBill: null,
        energyContract: null
      }
    },
    contact: { name: '', email: '', phone: '' }
  };
  window.scrollTo(0, 0);
}

async function handleSubmit() {
  showLoading('Submitting your information...');

  try {
    // Submit to Firebase (include signed documents)
    const result = await submitLeadToFirebase(userData, signedDocuments);

    hideLoading();

    if (result.success) {
      console.log('Lead submitted successfully! ID:', result.leadId);

      // Also save to localStorage as backup
      const submission = {
        id: result.leadId,
        ...userData,
        submittedAt: new Date().toISOString(),
        referral: getStoredReferral()
      };

      const submissions = JSON.parse(localStorage.getItem('ideal_submissions') || '[]');
      submissions.push(submission);
      localStorage.setItem('ideal_submissions', JSON.stringify(submissions));

      // Show success modal
      showModal(successOverlay);
    } else {
      console.error('Submission failed:', result.error);
      showToast('There was an error submitting your information. Please try again.', 'error');
    }
  } catch (error) {
    hideLoading();
    console.error('Submission error:', error);
    showToast('There was an error submitting your information. Please try again.', 'error');
  }
}

async function downloadProfile() {
  const { PDFDocument, rgb, StandardFonts } = PDFLib;
  const eligibility = checkIdealEligibility(userData.location?.state);

  const auctionTypeText = userData.auctionType === 'both' ? 'Electricity & Natural Gas' :
                          userData.auctionType === 'electricity' ? 'Electricity Only' : 'Natural Gas Only';

  const propertyTypeText = {
    commercial: 'Commercial',
    residential: 'Residential'
  }[userData.propertyType] || userData.propertyType;

  const ownershipText = {
    own: 'Yes, owns property',
    rent: 'No, rents/leases property',
    manage: 'Manages property for owner'
  }[userData.propertyDetails?.ownsProperty] || null;

  showLoading('Generating PDF...');

  try {
    const pdfDoc = await PDFDocument.create();
    const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const pageWidth = 612;
    const pageHeight = 792;
    const margin = 50;
    const contentWidth = pageWidth - margin * 2;

    // Colors
    const brandDark = rgb(0.118, 0.227, 0.373);    // #1e3a5f
    const brandAccent = rgb(0.192, 0.463, 0.710);   // #3176b5
    const textDark = rgb(0.18, 0.20, 0.25);
    const textMedium = rgb(0.38, 0.40, 0.45);
    const lineColor = rgb(0.82, 0.84, 0.86);
    const bgLight = rgb(0.95, 0.96, 0.97);

    // Helper: draw text that wraps and returns new Y position
    function drawWrappedText(page, text, x, y, maxWidth, size, usedFont, color) {
      const words = text.split(/\s+/);
      let currentLine = '';
      let currentY = y;
      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        if (usedFont.widthOfTextAtSize(testLine, size) > maxWidth && currentLine) {
          page.drawText(currentLine, { x, y: currentY, size, font: usedFont, color });
          currentY -= size + 4;
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }
      if (currentLine) {
        page.drawText(currentLine, { x, y: currentY, size, font: usedFont, color });
        currentY -= size + 4;
      }
      return currentY;
    }

    // Helper: draw a section header with accent bar
    function drawSectionHeader(page, title, y) {
      page.drawRectangle({
        x: margin,
        y: y - 2,
        width: 3,
        height: 16,
        color: brandAccent
      });
      page.drawText(title.toUpperCase(), {
        x: margin + 12,
        y: y,
        size: 10,
        font: fontBold,
        color: brandDark
      });
      return y - 24;
    }

    // Helper: draw a label-value row
    function drawRow(page, label, value, y) {
      if (!value) return y;
      page.drawText(label, { x: margin + 12, y, size: 9, font: fontBold, color: textMedium });
      page.drawText(String(value), { x: margin + 160, y, size: 9, font: font, color: textDark });
      return y - 16;
    }

    // Helper: check if we need a new page
    function ensureSpace(page, y, needed) {
      if (y - needed < margin) {
        const newPage = pdfDoc.addPage([pageWidth, pageHeight]);
        return { page: newPage, y: pageHeight - margin };
      }
      return { page, y };
    }

    // ===== PAGE 1: LEAD PROFILE =====
    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - margin;

    // Header background
    page.drawRectangle({
      x: 0, y: pageHeight - 100,
      width: pageWidth, height: 100,
      color: brandDark
    });

    // Title
    const title = 'IDEAL ENERGY SOLUTIONS';
    const titleWidth = fontBold.widthOfTextAtSize(title, 18);
    page.drawText(title, {
      x: (pageWidth - titleWidth) / 2,
      y: pageHeight - 48,
      size: 18,
      font: fontBold,
      color: rgb(1, 1, 1)
    });

    // Subtitle
    const subtitle = 'Lead Profile Report';
    const subWidth = font.widthOfTextAtSize(subtitle, 11);
    page.drawText(subtitle, {
      x: (pageWidth - subWidth) / 2,
      y: pageHeight - 68,
      size: 11,
      font: font,
      color: rgb(0.75, 0.82, 0.92)
    });

    // Date and ID line
    const dateLine = `Submitted: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`;
    const dateWidth = font.widthOfTextAtSize(dateLine, 8);
    page.drawText(dateLine, {
      x: (pageWidth - dateWidth) / 2,
      y: pageHeight - 86,
      size: 8,
      font: font,
      color: rgb(0.6, 0.7, 0.82)
    });

    y = pageHeight - 120;

    // --- Contact Information ---
    y = drawSectionHeader(page, 'Contact Information', y);
    y = drawRow(page, 'Name:', userData.contact.name, y);
    y = drawRow(page, 'Email:', userData.contact.email, y);
    y = drawRow(page, 'Phone:', userData.contact.phone || 'Not provided', y);
    y -= 10;

    // Divider
    page.drawLine({ start: { x: margin, y }, end: { x: pageWidth - margin, y }, thickness: 0.5, color: lineColor });
    y -= 18;

    // --- Location ---
    y = drawSectionHeader(page, 'Location', y);
    y = drawRow(page, 'Address:', userData.location?.address || 'N/A', y);
    y = drawRow(page, 'State:', `${eligibility.stateName} (${userData.location?.state})`, y);
    if (userData.location?.lat && userData.location?.lng) {
      y = drawRow(page, 'Coordinates:', `${userData.location.lat.toFixed(6)}, ${userData.location.lng.toFixed(6)}`, y);
    }
    y -= 10;

    page.drawLine({ start: { x: margin, y }, end: { x: pageWidth - margin, y }, thickness: 0.5, color: lineColor });
    y -= 18;

    // --- Market Status ---
    y = drawSectionHeader(page, 'Market Status', y);
    const deregText = eligibility.status === 'full' ? 'Full Access' : eligibility.status === 'limited' ? 'Limited Access' : 'Partial';
    const elecText = eligibility.electricityStatus === 'full' ? 'Yes' : eligibility.electricityStatus === 'partial' ? 'Limited' : 'No';
    const gasText = eligibility.gasStatus === 'full' ? 'Yes' : eligibility.gasStatus === 'partial' ? 'Limited' : 'No';
    y = drawRow(page, 'Deregulation:', deregText, y);
    y = drawRow(page, 'Electricity:', elecText, y);
    y = drawRow(page, 'Gas:', gasText, y);
    if (eligibility.scope) y = drawRow(page, 'Scope:', eligibility.scope, y);
    y -= 10;

    page.drawLine({ start: { x: margin, y }, end: { x: pageWidth - margin, y }, thickness: 0.5, color: lineColor });
    y -= 18;

    // --- Service Request ---
    y = drawSectionHeader(page, 'Service Request', y);
    y = drawRow(page, 'Auction Type:', auctionTypeText, y);
    y = drawRow(page, 'Property Type:', propertyTypeText, y);
    y = drawRow(page, 'Portfolio > $5k/mo:', userData.portfolioOver5k === 'yes' ? 'Yes' : 'No', y);
    y -= 10;

    page.drawLine({ start: { x: margin, y }, end: { x: pageWidth - margin, y }, thickness: 0.5, color: lineColor });
    y -= 18;

    // --- Property Details (if any) ---
    if (ownershipText || userData.propertyDetails?.electricUtility || userData.additionalDetails?.hasRetailContract) {
      ({ page, y } = ensureSpace(page, y, 100));
      y = drawSectionHeader(page, 'Property Details', y);
      if (ownershipText) y = drawRow(page, 'Ownership:', ownershipText, y);
      if (userData.propertyDetails?.electricUtility) y = drawRow(page, 'Electric Utility:', userData.propertyDetails.electricUtility, y);
      if (userData.additionalDetails?.hasRetailContract) {
        y = drawRow(page, 'Retail Contract:', userData.additionalDetails.hasRetailContract === 'yes' ? 'Yes' : 'No', y);
      }
      if (userData.additionalDetails?.retailProvider) y = drawRow(page, 'Retail Provider:', userData.additionalDetails.retailProvider, y);
      y -= 10;

      page.drawLine({ start: { x: margin, y }, end: { x: pageWidth - margin, y }, thickness: 0.5, color: lineColor });
      y -= 18;
    }

    // --- Additional Notes (if any) ---
    if (userData.additionalDetails?.notes) {
      ({ page, y } = ensureSpace(page, y, 80));
      y = drawSectionHeader(page, 'Additional Notes', y);
      y = drawWrappedText(page, userData.additionalDetails.notes, margin + 12, y, contentWidth - 12, 9, font, textDark);
      y -= 10;

      page.drawLine({ start: { x: margin, y }, end: { x: pageWidth - margin, y }, thickness: 0.5, color: lineColor });
      y -= 18;
    }

    // --- Uploaded Documents ---
    const uploadedFiles = [];
    if (userData.additionalDetails?.files?.energyBill) uploadedFiles.push(`Energy Bill: ${userData.additionalDetails.files.energyBill.name}`);
    if (userData.additionalDetails?.files?.energyContract) uploadedFiles.push(`Energy Contract: ${userData.additionalDetails.files.energyContract.name}`);
    if (signedDocuments.loa?.signed) uploadedFiles.push('LOA: Signed');
    if (signedDocuments.loe?.signed) uploadedFiles.push('LOE: Signed');

    if (uploadedFiles.length > 0) {
      ({ page, y } = ensureSpace(page, y, 60));
      y = drawSectionHeader(page, 'Documents', y);
      for (const f of uploadedFiles) {
        page.drawText(`•  ${f}`, { x: margin + 12, y, size: 9, font, color: textDark });
        y -= 16;
      }
      y -= 10;
    }

    // --- Next Steps ---
    ({ page, y } = ensureSpace(page, y, 120));
    y -= 6;
    // Light background box for next steps
    page.drawRectangle({
      x: margin, y: y - 92,
      width: contentWidth, height: 106,
      color: bgLight,
      borderColor: lineColor,
      borderWidth: 0.5
    });
    y -= 4;
    y = drawSectionHeader(page, 'Next Steps', y);
    const steps = [
      'Verify contact information',
      'Confirm service address and utility accounts',
      'Review authorization documents (LOA/LOE)',
      'Obtain recent utility bills for rate analysis',
      'Begin provider outreach and auction process'
    ];
    steps.forEach((step, i) => {
      page.drawText(`${i + 1}.`, { x: margin + 12, y, size: 9, font: fontBold, color: brandAccent });
      page.drawText(step, { x: margin + 28, y, size: 9, font, color: textDark });
      y -= 15;
    });

    // Footer
    const footer = 'Generated via Ideal Energy Solutions  •  idealenergyforms@gmail.com';
    const footerWidth = font.widthOfTextAtSize(footer, 7);
    page.drawText(footer, {
      x: (pageWidth - footerWidth) / 2,
      y: margin - 25,
      size: 7,
      font,
      color: textMedium
    });

    // ===== APPEND SIGNED DOCUMENTS =====
    // Copy signed LOA pages into this PDF
    if (signedDocuments.loa?.pdfBytes) {
      const loaPdf = await PDFDocument.load(signedDocuments.loa.pdfBytes);
      const loaPages = await pdfDoc.copyPages(loaPdf, loaPdf.getPageIndices());
      for (const p of loaPages) pdfDoc.addPage(p);
    }

    // Copy signed LOE pages into this PDF
    if (signedDocuments.loe?.pdfBytes) {
      const loePdf = await PDFDocument.load(signedDocuments.loe.pdfBytes);
      const loePages = await pdfDoc.copyPages(loePdf, loePdf.getPageIndices());
      for (const p of loePages) pdfDoc.addPage(p);
    }

    // Save and download
    const pdfBytes = await pdfDoc.save();
    const blob = new Blob([pdfBytes], { type: 'application/pdf' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Ideal_Lead_${userData.contact.name.replace(/\s+/g, '_')}_${Date.now()}.pdf`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    hideLoading();
    showToast('Lead profile PDF downloaded!', 'success');
  } catch (error) {
    hideLoading();
    console.error('Error generating profile PDF:', error);
    showToast('Error generating PDF. Please try again.', 'error');
  }
}

// ==========================================
// DOCUMENT SIGNING
// ==========================================

const DOCUMENT_CONTENT = {
  loa: {
    title: 'Letter of Authorization',
    html: `
      <h4>Letter of Authorization</h4>
      <p class="doc-subtitle">Ideal Energy Solutions</p>
      <p>This Letter of Authorization ("LOA") is entered into as of the date signed below, by the undersigned customer ("Customer") in favor of Ideal Energy Solutions ("IES" or "Agent").</p>
      <p class="doc-section-title">1. Authorization</p>
      <p>Customer hereby authorizes IES to act as its authorized agent for the sole purpose of soliciting competitive energy supply pricing from retail energy providers on Customer's behalf. This authorization includes, but is not limited to:</p>
      <ol>
        <li>Requesting energy supply pricing and proposals from licensed retail energy providers;</li>
        <li>Obtaining Customer's historical energy usage data from the local utility or distribution company;</li>
        <li>Submitting Customer's load data to retail energy providers for the purpose of receiving competitive bids;</li>
        <li>Facilitating communication between Customer and prospective energy suppliers.</li>
      </ol>
      <p class="doc-section-title">2. Scope of Authority</p>
      <p>This LOA does not authorize IES to enter into any binding energy supply agreement on behalf of Customer. All final purchasing decisions and contract executions remain solely at Customer's discretion. IES will present all qualified bids to Customer for review and approval.</p>
      <p class="doc-section-title">3. Confidentiality</p>
      <p>IES agrees to treat all Customer information obtained pursuant to this authorization as confidential and shall not disclose such information to any party other than prospective energy suppliers for the express purpose of obtaining competitive pricing.</p>
      <p class="doc-section-title">4. Term</p>
      <p>This authorization shall remain in effect for a period of twelve (12) months from the date of execution, unless terminated earlier by written notice from Customer. Customer may revoke this authorization at any time by providing written notice to IES.</p>
      <p class="doc-section-title">5. No Cost to Customer</p>
      <p>Customer acknowledges that IES provides its energy procurement and consulting services at no direct cost to Customer. IES is compensated through supplier commissions, which are disclosed transparently to Customer upon request.</p>
    `
  },
  loe: {
    title: 'Letter of Enrollment',
    html: `
      <h4>Letter of Enrollment</h4>
      <p class="doc-subtitle">Ideal Energy Solutions</p>
      <p>This Letter of Enrollment ("LOE") is entered into as of the date signed below, by the undersigned customer ("Customer") to formally enroll in the Ideal Energy Solutions ("IES") energy procurement platform.</p>
      <p class="doc-section-title">1. Enrollment</p>
      <p>By signing this document, Customer agrees to participate in the IES energy auction platform and acknowledges the following:</p>
      <ol>
        <li>Customer's energy account(s) will be registered on the IES procurement platform for the purpose of conducting competitive energy auctions;</li>
        <li>IES will coordinate with Customer's local utility to obtain necessary account information and usage history;</li>
        <li>Customer's energy load profile will be presented to pre-vetted, licensed retail energy providers through IES's reverse auction process;</li>
        <li>Customer will receive all competitive bids and retains full decision-making authority over any contract execution.</li>
      </ol>
      <p class="doc-section-title">2. Auction Process</p>
      <p>IES will conduct a reverse auction among qualified energy suppliers on Customer's behalf. The auction process is designed to maximize competition and transparency, ensuring Customer receives the lowest available market rate. Customer is under no obligation to accept any bid received through the auction.</p>
      <p class="doc-section-title">3. Account Information</p>
      <p>Customer agrees to provide accurate account information, including but not limited to: utility account numbers, service addresses, current contract details (if applicable), and historical usage data. This information is required to facilitate accurate pricing from energy suppliers.</p>
      <p class="doc-section-title">4. Data Protection</p>
      <p>IES maintains strict data protection protocols. All Customer information is stored securely and shared only with vetted energy suppliers participating in Customer's specific auction. IES complies with all applicable data privacy regulations.</p>
      <p class="doc-section-title">5. Term and Cancellation</p>
      <p>This enrollment remains active for the duration of Customer's energy contract procured through IES, or twelve (12) months from enrollment date, whichever is longer. Customer may cancel enrollment at any time prior to executing an energy supply agreement by providing written notice to IES.</p>
    `
  }
};

// Track signed documents
let signedDocuments = { loa: null, loe: null };
let activeSigningDoc = null;
let signaturePad = null;

function openSigningModal(docType) {
  const doc = DOCUMENT_CONTENT[docType];
  if (!doc) return;

  activeSigningDoc = docType;

  // Set title and content
  document.getElementById('signing-modal-title').textContent = `Sign: ${doc.title}`;
  document.getElementById('signing-document-content').innerHTML = doc.html;

  // Pre-fill name from contact info if available
  const nameInput = document.getElementById('signing-name');
  if (userData.contact.name && nameInput) {
    nameInput.value = userData.contact.name;
  }

  // Set today's date
  const dateInput = document.getElementById('signing-date');
  if (dateInput) {
    dateInput.value = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  // Show the modal
  showModal(document.getElementById('signing-overlay'));

  // Initialize signature pad after modal is visible
  setTimeout(() => {
    initSignaturePad();
    updateSigningSubmitButton();
  }, 100);
}

function initSignaturePad() {
  const canvas = document.getElementById('signature-canvas');
  if (!canvas) return;

  // Size canvas to container
  const container = canvas.parentElement;
  const ratio = Math.max(window.devicePixelRatio || 1, 1);
  canvas.width = container.offsetWidth * ratio;
  canvas.height = container.offsetHeight * ratio;
  canvas.getContext('2d').scale(ratio, ratio);

  signaturePad = new SignaturePad(canvas, {
    backgroundColor: 'rgb(255, 255, 255)',
    penColor: '#1e3a5f',
    minWidth: 1.5,
    maxWidth: 3
  });

  signaturePad.addEventListener('endStroke', updateSigningSubmitButton);

  // Clear button
  document.getElementById('signature-clear')?.addEventListener('click', () => {
    signaturePad.clear();
    updateSigningSubmitButton();
  });
}

function updateSigningSubmitButton() {
  const submitBtn = document.getElementById('signing-submit');
  const nameInput = document.getElementById('signing-name');
  if (!submitBtn) return;

  const hasName = nameInput?.value.trim().length > 0;
  const hasSig = signaturePad && !signaturePad.isEmpty();
  submitBtn.disabled = !(hasName && hasSig);
}

async function handleSigningSubmit() {
  if (!signaturePad || signaturePad.isEmpty() || !activeSigningDoc) return;

  const signerName = document.getElementById('signing-name')?.value.trim();
  const signerTitle = document.getElementById('signing-title')?.value.trim();
  const signDate = document.getElementById('signing-date')?.value;
  const signatureDataUrl = signaturePad.toDataURL('image/png');

  showLoading('Generating signed document...');

  try {
    // Generate signed PDF
    const pdfBytes = await generateSignedPDF(activeSigningDoc, signerName, signerTitle, signDate, signatureDataUrl);

    // Store the signed document
    signedDocuments[activeSigningDoc] = {
      signed: true,
      signerName,
      signerTitle,
      signDate,
      pdfBytes,
      signatureDataUrl
    };

    hideLoading();
    hideModal(document.getElementById('signing-overlay'));

    // Update the card UI
    updateDocCardUI(activeSigningDoc);

    showToast(`${DOCUMENT_CONTENT[activeSigningDoc].title} signed successfully!`, 'success');
    activeSigningDoc = null;
  } catch (error) {
    hideLoading();
    console.error('Error generating signed PDF:', error);
    showToast('Error generating document. Please try again.', 'error');
  }
}

async function generateSignedPDF(docType, signerName, signerTitle, signDate, signatureDataUrl) {
  const { PDFDocument, rgb, StandardFonts } = PDFLib;
  const doc = DOCUMENT_CONTENT[docType];

  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  // Strip HTML tags for PDF text
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = doc.html;
  const plainText = tempDiv.textContent || tempDiv.innerText;

  // Split text into lines that fit the page
  const pageWidth = 612;
  const pageHeight = 792;
  const margin = 60;
  const contentWidth = pageWidth - margin * 2;
  const fontSize = 10;
  const lineHeight = 16;
  const titleFontSize = 16;

  // Word-wrap the text
  const words = plainText.split(/\s+/);
  const lines = [];
  let currentLine = '';

  for (const word of words) {
    const testLine = currentLine ? `${currentLine} ${word}` : word;
    const testWidth = font.widthOfTextAtSize(testLine, fontSize);
    if (testWidth > contentWidth && currentLine) {
      lines.push(currentLine);
      currentLine = word;
    } else {
      currentLine = testLine;
    }
  }
  if (currentLine) lines.push(currentLine);

  // Calculate pages needed (reserve space for signature on last page)
  const linesPerPage = Math.floor((pageHeight - margin * 2 - 40) / lineHeight);
  const signatureBlockHeight = 120;
  const linesOnLastPage = Math.floor((pageHeight - margin * 2 - signatureBlockHeight) / lineHeight);

  // Determine page breaks
  let remainingLines = [...lines];
  const pages = [];
  let isFirstPage = true;

  while (remainingLines.length > 0) {
    const headerOffset = isFirstPage ? 50 : 0;
    const availableLines = pages.length === 0 ? linesPerPage - 3 : linesPerPage;

    // Check if remaining lines fit on one more page with signature
    if (remainingLines.length <= linesOnLastPage) {
      pages.push({ lines: remainingLines, isFirst: isFirstPage, isLast: true });
      remainingLines = [];
    } else {
      const pageLines = remainingLines.splice(0, availableLines);
      pages.push({ lines: pageLines, isFirst: isFirstPage, isLast: false });
    }
    isFirstPage = false;
  }

  // If no pages yet (empty doc), create one
  if (pages.length === 0) {
    pages.push({ lines: [], isFirst: true, isLast: true });
  }

  // Mark last page
  pages[pages.length - 1].isLast = true;

  // Render pages
  for (const pageData of pages) {
    const page = pdfDoc.addPage([pageWidth, pageHeight]);
    let yPos = pageHeight - margin;

    if (pageData.isFirst) {
      // Title
      const titleText = doc.title.toUpperCase();
      const titleWidth = fontBold.widthOfTextAtSize(titleText, titleFontSize);
      page.drawText(titleText, {
        x: (pageWidth - titleWidth) / 2,
        y: yPos,
        size: titleFontSize,
        font: fontBold,
        color: rgb(0.118, 0.231, 0.373)
      });
      yPos -= 20;

      const subtitle = 'Ideal Energy Solutions';
      const subWidth = font.widthOfTextAtSize(subtitle, 10);
      page.drawText(subtitle, {
        x: (pageWidth - subWidth) / 2,
        y: yPos,
        size: 10,
        font: font,
        color: rgb(0.42, 0.45, 0.5)
      });
      yPos -= 30;

      // Divider line
      page.drawLine({
        start: { x: margin, y: yPos },
        end: { x: pageWidth - margin, y: yPos },
        thickness: 0.5,
        color: rgb(0.85, 0.85, 0.85)
      });
      yPos -= 20;
    }

    // Draw text lines
    for (const line of pageData.lines) {
      if (yPos < margin + 20) break;
      page.drawText(line, {
        x: margin,
        y: yPos,
        size: fontSize,
        font: font,
        color: rgb(0.22, 0.25, 0.32)
      });
      yPos -= lineHeight;
    }

    // Signature block on last page
    if (pageData.isLast) {
      yPos = Math.min(yPos - 30, margin + signatureBlockHeight + 20);

      // Divider
      page.drawLine({
        start: { x: margin, y: yPos + 10 },
        end: { x: pageWidth - margin, y: yPos + 10 },
        thickness: 0.5,
        color: rgb(0.85, 0.85, 0.85)
      });

      // Embed signature image
      const sigImage = await pdfDoc.embedPng(signatureDataUrl);
      const sigDims = sigImage.scale(0.4);
      const sigWidth = Math.min(sigDims.width, 200);
      const sigHeight = Math.min(sigDims.height, 50);

      page.drawImage(sigImage, {
        x: margin,
        y: yPos - sigHeight - 5,
        width: sigWidth,
        height: sigHeight
      });

      // Signature line
      const sigLineY = yPos - sigHeight - 10;
      page.drawLine({
        start: { x: margin, y: sigLineY },
        end: { x: margin + 220, y: sigLineY },
        thickness: 0.5,
        color: rgb(0.2, 0.2, 0.2)
      });
      page.drawText('Signature', {
        x: margin,
        y: sigLineY - 14,
        size: 8,
        font: font,
        color: rgb(0.42, 0.45, 0.5)
      });

      // Name
      page.drawText(signerName, {
        x: margin + 260,
        y: yPos - 15,
        size: 11,
        font: fontBold,
        color: rgb(0.22, 0.25, 0.32)
      });
      page.drawLine({
        start: { x: margin + 260, y: yPos - 20 },
        end: { x: pageWidth - margin, y: yPos - 20 },
        thickness: 0.5,
        color: rgb(0.2, 0.2, 0.2)
      });
      page.drawText('Printed Name', {
        x: margin + 260,
        y: yPos - 34,
        size: 8,
        font: font,
        color: rgb(0.42, 0.45, 0.5)
      });

      // Title / Position
      if (signerTitle) {
        page.drawText(signerTitle, {
          x: margin + 260,
          y: yPos - 55,
          size: 11,
          font: font,
          color: rgb(0.22, 0.25, 0.32)
        });
      }
      page.drawLine({
        start: { x: margin + 260, y: yPos - 60 },
        end: { x: pageWidth - margin, y: yPos - 60 },
        thickness: 0.5,
        color: rgb(0.2, 0.2, 0.2)
      });
      page.drawText('Title / Position', {
        x: margin + 260,
        y: yPos - 74,
        size: 8,
        font: font,
        color: rgb(0.42, 0.45, 0.5)
      });

      // Date
      page.drawText(signDate, {
        x: margin,
        y: yPos - 55,
        size: 11,
        font: font,
        color: rgb(0.22, 0.25, 0.32)
      });
      page.drawLine({
        start: { x: margin, y: yPos - 60 },
        end: { x: margin + 220, y: yPos - 60 },
        thickness: 0.5,
        color: rgb(0.2, 0.2, 0.2)
      });
      page.drawText('Date', {
        x: margin,
        y: yPos - 74,
        size: 8,
        font: font,
        color: rgb(0.42, 0.45, 0.5)
      });
    }
  }

  return await pdfDoc.save();
}

function updateDocCardUI(docType) {
  const cardId = docType === 'loa' ? 'loa-card' : 'loe-card';
  const card = document.getElementById(cardId);
  if (!card) return;

  card.classList.add('signed');

  // Update button text
  const btn = card.querySelector('.docusign-btn');
  if (btn) {
    btn.innerHTML = `
      <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/></svg>
      Signed
    `;
  }

  // Add signed badge
  const existing = card.querySelector('.docusign-signed-badge');
  if (!existing) {
    const badge = document.createElement('div');
    badge.className = 'docusign-signed-badge';
    badge.innerHTML = `
      <svg width="14" height="14" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"/></svg>
      Signed by ${signedDocuments[docType].signerName}
    `;
    card.appendChild(badge);
  }
}

// Utility functions
function showModal(overlay) {
  overlay?.classList.add('active');
}

function hideModal(overlay) {
  overlay?.classList.remove('active');
}

function showLoading(text = 'Loading...') {
  const overlay = document.getElementById('loading-overlay');
  const loadingText = document.getElementById('loading-text');
  if (loadingText) loadingText.textContent = text;
  overlay?.classList.add('active');
}

function hideLoading() {
  document.getElementById('loading-overlay')?.classList.remove('active');
}

function showToast(message, type = 'info') {
  const toast = document.getElementById('toast');
  if (!toast) return;

  toast.textContent = message;
  toast.className = `toast ${type} show`;

  setTimeout(() => {
    toast.classList.remove('show');
  }, 3000);
}

function initMap() {
  // Map will be initialized when needed in the form
}
