// Ideal Energy - Main Application
import { checkIdealEligibility, getAvailableAuctionTypes, getStateTooltipInfo, getStateClass, STATE_DATA } from './deregulated-states.js';

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

// DOM Elements
let landingPage, appContainer, questionContainer, progressFill, stepIndicator;
let nextBtn, backBtn, startOverBtn;
let stateBlockedOverlay, limitedAccessOverlay, successOverlay;
let map, marker;

// Initialize the application
document.addEventListener('DOMContentLoaded', () => {
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
    { value: 'residential', label: 'Residential', description: 'Single-family home, apartment, or condo' },
    { value: 'commercial', label: 'Commercial', description: 'Office, retail, or service business' },
    { value: 'industrial', label: 'Industrial', description: 'Manufacturing, warehouse, or distribution' },
    { value: 'multifamily', label: 'Multi-Family', description: 'Apartment building or housing complex' }
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
      updateNextButton();
    });
  });

  updateNextButton();
}

// STEP 4: Energy Bills
function renderEnergyBillsStep() {
  const auctionTypes = getAvailableAuctionTypes(userData.location?.state);
  const showElectricity = userData.auctionType === 'electricity' || userData.auctionType === 'both';
  const showGas = userData.auctionType === 'gas' || userData.auctionType === 'both';

  const energySources = [
    { value: '', label: 'Select energy source...' },
    { value: 'grid_electricity', label: 'Grid Electricity' },
    { value: 'solar', label: 'Solar' },
    { value: 'natural_gas', label: 'Natural Gas' },
    { value: 'propane', label: 'Propane' },
    { value: 'oil', label: 'Oil' },
    { value: 'mixed', label: 'Mixed Sources' }
  ];

  questionContainer.innerHTML = `
    <div class="question-header">
      <h2 class="question-title">What are your current energy costs?</h2>
      <p class="question-subtitle">This helps us estimate your potential savings.</p>
    </div>
    <div class="form-grid">
      <div class="form-field">
        <label class="form-label">Current Primary Energy Source</label>
        <select class="form-select" id="energy-source-select">
          ${energySources.map(src => `
            <option value="${src.value}" ${userData.energySource === src.value ? 'selected' : ''}>${src.label}</option>
          `).join('')}
        </select>
      </div>
      ${showElectricity ? `
        <div class="form-field">
          <label class="form-label">Average Monthly Electricity Bill</label>
          <div class="slider-container">
            <div class="slider-header">
              <span></span>
              <span class="slider-value" id="electricity-value">$${userData.bills.electricity}</span>
            </div>
            <input type="range" class="slider-input" id="electricity-slider" min="50" max="5000" step="10" value="${userData.bills.electricity}">
            <div class="slider-range">
              <span>$50</span>
              <span>$5,000+</span>
            </div>
          </div>
        </div>
      ` : ''}
      ${showGas ? `
        <div class="form-field">
          <label class="form-label">Average Monthly Natural Gas Bill</label>
          <div class="slider-container">
            <div class="slider-header">
              <span></span>
              <span class="slider-value" id="gas-value">$${userData.bills.gas}</span>
            </div>
            <input type="range" class="slider-input" id="gas-slider" min="0" max="2000" step="10" value="${userData.bills.gas}">
            <div class="slider-range">
              <span>$0</span>
              <span>$2,000+</span>
            </div>
          </div>
        </div>
      ` : ''}
    </div>
    <div class="info-note" style="margin-top: 24px; padding: 16px; background: #dbeafe; border-radius: 8px; font-size: 14px; color: #1e3a5f;">
      <strong>Note:</strong> These estimates help us understand your energy profile. We'll get exact figures from your utility bills during the auction process.
    </div>
  `;

  // Add event handlers
  const energySourceSelect = document.getElementById('energy-source-select');
  const electricitySlider = document.getElementById('electricity-slider');
  const gasSlider = document.getElementById('gas-slider');

  energySourceSelect?.addEventListener('change', (e) => {
    userData.energySource = e.target.value || null;
  });

  electricitySlider?.addEventListener('input', (e) => {
    userData.bills.electricity = parseInt(e.target.value);
    document.getElementById('electricity-value').textContent = `$${userData.bills.electricity.toLocaleString()}`;
  });

  gasSlider?.addEventListener('input', (e) => {
    userData.bills.gas = parseInt(e.target.value);
    document.getElementById('gas-value').textContent = `$${userData.bills.gas.toLocaleString()}`;
  });

  // This step is always valid
  nextBtn.disabled = false;
  nextBtn.textContent = 'Next';
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
        <label class="form-label">Name of Electric Utility</label>
        <input type="text" class="form-text-input" id="electric-utility" placeholder="e.g., Pacific Gas and Electric" value="${userData.propertyDetails.electricUtility}">
      </div>
      <div class="form-field">
        <label class="form-label">Retail Energy Provider <span style="color: #64748b; font-weight: 400;">(if different than utility)</span></label>
        <input type="text" class="form-text-input" id="retail-provider" placeholder="e.g., Direct Energy" value="${userData.propertyDetails.retailProvider}">
      </div>
    </div>

    <div class="additional-details-section">
      <div class="section-divider">
        <h3 class="section-header">Additional Details</h3>
        <p class="section-subtext">These help us better prepare paths for your energy procurement. All fields are optional.</p>
      </div>

      <div class="form-grid">
        <div class="form-field">
          <label class="form-label">Energy Charges (per kWh)</label>
          <div class="slider-container">
            <div class="slider-header">
              <span></span>
              <span class="slider-value" id="energy-charges-value">${userData.additionalDetails.energyCharges !== null ? '$' + userData.additionalDetails.energyCharges.toFixed(3) : 'Not set'}</span>
            </div>
            <input type="range" class="slider-input" id="energy-charges-slider" min="0" max="0.5" step="0.001" value="${userData.additionalDetails.energyCharges || 0.1}">
            <div class="slider-range">
              <span>$0.00</span>
              <span>$0.50</span>
            </div>
          </div>
        </div>
        <div class="form-field">
          <label class="form-label">Demand Charges (per kW)</label>
          <div class="slider-container">
            <div class="slider-header">
              <span></span>
              <span class="slider-value" id="demand-charges-value">${userData.additionalDetails.demandCharges !== null ? '$' + userData.additionalDetails.demandCharges.toFixed(2) : 'Not set'}</span>
            </div>
            <input type="range" class="slider-input" id="demand-charges-slider" min="0" max="50" step="0.5" value="${userData.additionalDetails.demandCharges || 10}">
            <div class="slider-range">
              <span>$0</span>
              <span>$50</span>
            </div>
          </div>
        </div>
      </div>

      <div class="file-upload-section">
        <h4 class="file-section-title">Document Uploads</h4>
        <div class="file-upload-grid">
          <div class="file-upload-item">
            <label class="file-upload-label" for="file-loa">
              <span class="file-icon">📄</span>
              <span class="file-name" id="file-loa-name">${userData.additionalDetails.files.loa?.name || 'Letter of Authorization (LOA)'}</span>
              <span class="file-status ${userData.additionalDetails.files.loa ? 'uploaded' : ''}">${userData.additionalDetails.files.loa ? '✓' : 'Upload'}</span>
            </label>
            <input type="file" id="file-loa" class="file-input" accept=".pdf,.doc,.docx,.jpg,.png">
          </div>
          <div class="file-upload-item">
            <label class="file-upload-label" for="file-loe">
              <span class="file-icon">📄</span>
              <span class="file-name" id="file-loe-name">${userData.additionalDetails.files.loe?.name || 'Letter of Enrollment (LOE)'}</span>
              <span class="file-status ${userData.additionalDetails.files.loe ? 'uploaded' : ''}">${userData.additionalDetails.files.loe ? '✓' : 'Upload'}</span>
            </label>
            <input type="file" id="file-loe" class="file-input" accept=".pdf,.doc,.docx,.jpg,.png">
          </div>
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
  `;

  // Add event handlers
  const ownershipSelect = document.getElementById('ownership-select');
  const electricUtilityInput = document.getElementById('electric-utility');
  const retailProviderInput = document.getElementById('retail-provider');
  const energyChargesSlider = document.getElementById('energy-charges-slider');
  const demandChargesSlider = document.getElementById('demand-charges-slider');

  ownershipSelect?.addEventListener('change', (e) => {
    userData.propertyDetails.ownsProperty = e.target.value || null;
  });

  electricUtilityInput?.addEventListener('input', (e) => {
    userData.propertyDetails.electricUtility = e.target.value;
  });

  retailProviderInput?.addEventListener('input', (e) => {
    userData.propertyDetails.retailProvider = e.target.value;
  });

  // Track if sliders have been interacted with
  let energyChargesInteracted = userData.additionalDetails.energyCharges !== null;
  let demandChargesInteracted = userData.additionalDetails.demandCharges !== null;

  energyChargesSlider?.addEventListener('input', (e) => {
    energyChargesInteracted = true;
    userData.additionalDetails.energyCharges = parseFloat(e.target.value);
    document.getElementById('energy-charges-value').textContent = `$${userData.additionalDetails.energyCharges.toFixed(3)}`;
  });

  demandChargesSlider?.addEventListener('input', (e) => {
    demandChargesInteracted = true;
    userData.additionalDetails.demandCharges = parseFloat(e.target.value);
    document.getElementById('demand-charges-value').textContent = `$${userData.additionalDetails.demandCharges.toFixed(2)}`;
  });

  // File upload handlers
  const fileInputs = [
    { id: 'file-loa', key: 'loa', nameId: 'file-loa-name' },
    { id: 'file-loe', key: 'loe', nameId: 'file-loe-name' },
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
      nextBtn.disabled = false;
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

function handleSubmit() {
  showLoading('Submitting your information...');

  // Simulate submission delay
  setTimeout(() => {
    hideLoading();

    // Save to localStorage for demo purposes
    const submission = {
      id: Date.now(),
      ...userData,
      submittedAt: new Date().toISOString()
    };

    const submissions = JSON.parse(localStorage.getItem('ideal_submissions') || '[]');
    submissions.push(submission);
    localStorage.setItem('ideal_submissions', JSON.stringify(submissions));

    // Show success modal
    showModal(successOverlay);
  }, 1500);
}

function downloadProfile() {
  const eligibility = checkIdealEligibility(userData.location?.state);
  const auctionTypes = getAvailableAuctionTypes(userData.location?.state);

  const auctionTypeText = userData.auctionType === 'both' ? 'Electricity & Natural Gas' :
                          userData.auctionType === 'electricity' ? 'Electricity Only' : 'Natural Gas Only';

  const propertyTypeText = {
    residential: 'Residential',
    commercial: 'Commercial',
    industrial: 'Industrial',
    multifamily: 'Multi-Family'
  }[userData.propertyType] || userData.propertyType;

  const energySourceText = {
    grid_electricity: 'Grid Electricity',
    solar: 'Solar',
    natural_gas: 'Natural Gas',
    propane: 'Propane',
    oil: 'Oil',
    mixed: 'Mixed Sources'
  }[userData.energySource] || null;

  const ownershipText = {
    own: 'Yes, owns property',
    rent: 'No, rents/leases property',
    manage: 'Manages property for owner'
  }[userData.propertyDetails?.ownsProperty] || null;

  // Build property details section conditionally
  let propertyDetailsSection = '';
  if (ownershipText || userData.propertyDetails?.electricUtility || userData.propertyDetails?.retailProvider) {
    propertyDetailsSection = `
-------------------------------------------
PROPERTY DETAILS
-------------------------------------------`;
    if (ownershipText) {
      propertyDetailsSection += `\nOwnership: ${ownershipText}`;
    }
    if (userData.propertyDetails?.electricUtility) {
      propertyDetailsSection += `\nElectric Utility: ${userData.propertyDetails.electricUtility}`;
    }
    if (userData.propertyDetails?.retailProvider) {
      propertyDetailsSection += `\nRetail Energy Provider: ${userData.propertyDetails.retailProvider}`;
    }
    propertyDetailsSection += '\n';
  }

  // Build additional details section conditionally
  let additionalDetailsSection = '';
  const hasAdditionalDetails = userData.additionalDetails?.energyCharges !== null ||
                                userData.additionalDetails?.demandCharges !== null ||
                                userData.additionalDetails?.files?.loa ||
                                userData.additionalDetails?.files?.loe ||
                                userData.additionalDetails?.files?.energyBill ||
                                userData.additionalDetails?.files?.energyContract;

  if (hasAdditionalDetails) {
    additionalDetailsSection = `
-------------------------------------------
ADDITIONAL DETAILS
-------------------------------------------`;
    if (userData.additionalDetails?.energyCharges !== null) {
      additionalDetailsSection += `\nEnergy Charges: $${userData.additionalDetails.energyCharges.toFixed(3)}/kWh`;
    }
    if (userData.additionalDetails?.demandCharges !== null) {
      additionalDetailsSection += `\nDemand Charges: $${userData.additionalDetails.demandCharges.toFixed(2)}/kW`;
    }

    // List uploaded documents
    const uploadedFiles = [];
    if (userData.additionalDetails?.files?.loa) uploadedFiles.push(`LOA: ${userData.additionalDetails.files.loa.name}`);
    if (userData.additionalDetails?.files?.loe) uploadedFiles.push(`LOE: ${userData.additionalDetails.files.loe.name}`);
    if (userData.additionalDetails?.files?.energyBill) uploadedFiles.push(`Energy Bill: ${userData.additionalDetails.files.energyBill.name}`);
    if (userData.additionalDetails?.files?.energyContract) uploadedFiles.push(`Energy Contract: ${userData.additionalDetails.files.energyContract.name}`);

    if (uploadedFiles.length > 0) {
      additionalDetailsSection += `\n\nDocuments Uploaded:\n${uploadedFiles.map(f => `  - ${f}`).join('\n')}`;
    }
    additionalDetailsSection += '\n';
  }

  // Create email body content
  const emailBody = `
===========================================
IDEAL ENERGY - NEW LEAD PROFILE
===========================================

SUBMISSION DATE: ${new Date().toLocaleString()}
LEAD ID: ${Date.now()}

-------------------------------------------
CONTACT INFORMATION
-------------------------------------------
Name: ${userData.contact.name}
Email: ${userData.contact.email}
Phone: ${userData.contact.phone || 'Not provided'}

-------------------------------------------
LOCATION
-------------------------------------------
Address: ${userData.location?.address || 'N/A'}
State: ${eligibility.stateName} (${userData.location?.state})
Coordinates: ${userData.location?.lat?.toFixed(6)}, ${userData.location?.lng?.toFixed(6)}

-------------------------------------------
MARKET STATUS
-------------------------------------------
Deregulation Status: ${eligibility.status === 'full' ? 'Full Access' : eligibility.status === 'limited' ? 'Limited Access' : 'Partial'}
Electricity Choice: ${eligibility.electricityStatus === 'full' ? 'Yes' : eligibility.electricityStatus === 'partial' ? 'Limited' : 'No'}
Gas Choice: ${eligibility.gasStatus === 'full' ? 'Yes' : eligibility.gasStatus === 'partial' ? 'Limited' : 'No'}
${eligibility.scope ? `Scope: ${eligibility.scope}` : ''}

-------------------------------------------
SERVICE REQUEST
-------------------------------------------
Auction Type: ${auctionTypeText}
Property Type: ${propertyTypeText}

-------------------------------------------
ENERGY PROFILE
-------------------------------------------
${energySourceText ? `Primary Energy Source: ${energySourceText}` : ''}
${userData.auctionType === 'electricity' || userData.auctionType === 'both' ? `Est. Monthly Electricity: $${userData.bills.electricity.toLocaleString()}` : ''}
${userData.auctionType === 'gas' || userData.auctionType === 'both' ? `Est. Monthly Gas: $${userData.bills.gas.toLocaleString()}` : ''}
${userData.auctionType === 'both' ? `Combined Monthly: $${(userData.bills.electricity + userData.bills.gas).toLocaleString()}` : ''}
${propertyDetailsSection}${additionalDetailsSection}
-------------------------------------------
NEXT STEPS
-------------------------------------------
1. Verify contact information
2. Confirm service address and utility accounts
3. Request authorization documents (LOA/LOE)
4. Obtain recent utility bills for rate analysis
5. Begin provider outreach and auction process

===========================================
This lead was generated via the Ideal website.
===========================================
`.trim();

  // Create and download file
  const blob = new Blob([emailBody], { type: 'text/plain' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `ideal_lead_${userData.contact.name.replace(/\s+/g, '_')}_${Date.now()}.txt`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);

  showToast('Lead profile downloaded!', 'success');
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
