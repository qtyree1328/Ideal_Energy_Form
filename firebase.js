// Firebase Configuration for Ideal Energy
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js';
import { getFirestore, collection, addDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js';
import { getStorage, ref, uploadBytes, getDownloadURL } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-storage.js';
import { getAnalytics } from 'https://www.gstatic.com/firebasejs/10.8.0/firebase-analytics.js';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyArTuHoqqfjRcZllZDHCA1Tknri_XIqlQs",
  authDomain: "ideal-energy-form.firebaseapp.com",
  projectId: "ideal-energy-form",
  storageBucket: "ideal-energy-form.firebasestorage.app",
  messagingSenderId: "567074663760",
  appId: "1:567074663760:web:8c758bf1b483bb181cd055",
  measurementId: "G-WH0X663J5B"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);
const analytics = getAnalytics(app);

// Get referral source from URL parameters
export function getReferralSource() {
  const urlParams = new URLSearchParams(window.location.search);
  return {
    ref: urlParams.get('ref') || null,
    partner: urlParams.get('partner') || null,
    source: urlParams.get('source') || null,
    utm_source: urlParams.get('utm_source') || null,
    utm_medium: urlParams.get('utm_medium') || null,
    utm_campaign: urlParams.get('utm_campaign') || null
  };
}

// Store referral in session storage so it persists through the form
export function captureReferral() {
  const referral = getReferralSource();
  if (referral.ref || referral.partner || referral.source || referral.utm_source) {
    sessionStorage.setItem('idealEnergy_referral', JSON.stringify(referral));
  }
}

// Get stored referral
export function getStoredReferral() {
  const stored = sessionStorage.getItem('idealEnergy_referral');
  return stored ? JSON.parse(stored) : getReferralSource();
}

// Generate a unique ID for the lead (before document creation)
function generateLeadId() {
  const timestamp = Date.now().toString(36);
  const randomPart = Math.random().toString(36).substring(2, 10);
  return `${timestamp}${randomPart}`;
}

// Upload a file to Firebase Storage
async function uploadFile(file, leadId, fileType) {
  if (!file) return null;

  const timestamp = Date.now();
  const sanitizedName = file.name.replace(/[^a-zA-Z0-9.-]/g, '_');
  const filePath = `leads/${leadId}/${fileType}_${timestamp}_${sanitizedName}`;
  const storageRef = ref(storage, filePath);

  try {
    const snapshot = await uploadBytes(storageRef, file);
    const downloadURL = await getDownloadURL(snapshot.ref);
    return {
      name: file.name,
      path: filePath,
      url: downloadURL,
      size: file.size,
      type: file.type
    };
  } catch (error) {
    console.error(`Error uploading ${fileType}:`, error);
    return null;
  }
}

// Submit lead to Firebase
export async function submitLeadToFirebase(userData) {
  try {
    // Get referral data
    const referral = getStoredReferral();

    // Generate a lead ID upfront so we can upload files first
    const leadId = generateLeadId();

    // Upload files FIRST (before creating the document)
    const files = userData.additionalDetails?.files || {};
    const uploadedFiles = {};

    if (files.loa) {
      uploadedFiles.loa = await uploadFile(files.loa, leadId, 'loa');
    }
    if (files.loe) {
      uploadedFiles.loe = await uploadFile(files.loe, leadId, 'loe');
    }
    if (files.energyBill) {
      uploadedFiles.energyBill = await uploadFile(files.energyBill, leadId, 'energy_bill');
    }
    if (files.energyContract) {
      uploadedFiles.energyContract = await uploadFile(files.energyContract, leadId, 'energy_contract');
    }

    // Now create the lead document WITH files already included
    const leadData = {
      // Contact info
      contact: {
        name: userData.contact.name,
        email: userData.contact.email,
        phone: userData.contact.phone || null
      },

      // Location
      location: {
        address: userData.location?.address || null,
        state: userData.location?.state || null,
        city: userData.location?.city || null,
        zipCode: userData.location?.zipCode || null,
        coordinates: userData.location?.coordinates || null,
        isDeregulated: userData.location?.isDeregulated || false,
        deregulationStatus: userData.location?.deregulationStatus || null
      },

      // Service details
      service: {
        auctionType: userData.auctionType || null,
        propertyType: userData.propertyType || null,
        energySource: userData.energySource || null
      },

      // Bills
      bills: {
        electricity: userData.bills?.electricity || null,
        gas: userData.bills?.gas || null
      },

      // Property details
      propertyDetails: {
        ownsProperty: userData.propertyDetails?.ownsProperty || null,
        electricUtility: userData.propertyDetails?.electricUtility || null,
        retailProvider: userData.propertyDetails?.retailProvider || null
      },

      // Additional details
      additionalDetails: {
        energyCharges: userData.additionalDetails?.energyCharges || null,
        demandCharges: userData.additionalDetails?.demandCharges || null
      },

      // Referral tracking
      referral: referral,

      // Metadata
      metadata: {
        submittedAt: serverTimestamp(),
        userAgent: navigator.userAgent,
        screenSize: `${window.innerWidth}x${window.innerHeight}`,
        language: navigator.language,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      },

      // Files (already uploaded)
      files: uploadedFiles,

      // Status
      status: 'new'
    };

    // Add the lead to Firestore with our generated ID
    const { doc, setDoc } = await import('https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js');
    await setDoc(doc(db, 'leads', leadId), leadData);

    console.log('Lead created with ID:', leadId);

    return {
      success: true,
      leadId: leadId
    };

  } catch (error) {
    console.error('Error submitting lead:', error);
    return {
      success: false,
      error: error.message
    };
  }
}

// Export for use in app.js
export { db, storage, analytics };
