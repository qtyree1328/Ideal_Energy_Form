/**
 * Ideal Energy - Cloud Functions
 * Sends email notifications when new leads are submitted
 */

const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { defineSecret } = require("firebase-functions/params");
const { getStorage } = require("firebase-admin/storage");
const admin = require("firebase-admin");
const nodemailer = require("nodemailer");

// Initialize Firebase Admin
admin.initializeApp();

// Define the secret
const emailPass = defineSecret("EMAIL_PASS");

// Trigger when a new lead is created
exports.sendLeadEmail = onDocumentCreated(
  {
    document: "leads/{leadId}",
    secrets: [emailPass],
  },
  async (event) => {
  const snapshot = event.data;
  if (!snapshot) {
    console.log("No data associated with the event");
    return;
  }

  const leadData = snapshot.data();
  const leadId = event.params.leadId;

  console.log(`New lead received: ${leadId}`);

  try {
    // Create transporter inside the function where the secret is available
    const transporter = nodemailer.createTransport({
      service: "gmail",
      auth: {
        user: "idealenergyforms@gmail.com",
        pass: emailPass.value(),
      },
    });

    // Format the email
    const emailHtml = formatLeadEmail(leadData, leadId);

    // Get file attachments if any
    const attachments = await getAttachments(leadData.files);

    // Send the email
    const mailOptions = {
      from: '"Ideal Energy Leads" <idealenergyforms@gmail.com>',
      to: "idealenergyforms@gmail.com, Andy@automate.my",
      subject: `New Lead: ${leadData.contact?.name || "Unknown"} - ${leadData.location?.state || "Unknown State"}`,
      html: emailHtml,
      attachments: attachments,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Email sent successfully for lead: ${leadId}`);

    // Update the lead document to mark email as sent
    await snapshot.ref.update({
      emailSent: true,
      emailSentAt: admin.firestore.FieldValue.serverTimestamp(),
    });

  } catch (error) {
    console.error("Error sending email:", error);

    // Update the lead document with error
    await snapshot.ref.update({
      emailSent: false,
      emailError: error.message,
    });
  }
});

// Format lead data as a nice HTML email
function formatLeadEmail(lead, leadId) {
  const referralInfo = lead.referral?.ref || lead.referral?.partner || lead.referral?.source || "Direct";

  const auctionTypeMap = {
    electricity: "Electricity Only",
    gas: "Natural Gas Only",
    both: "Electricity & Natural Gas",
  };

  const propertyTypeMap = {
    commercial: "Commercial",
    industrial: "Industrial",
    multifamily: "Multi-Family",
  };

  return `
<!DOCTYPE html>
<html>
<head>
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; }
    .header { background: #1e3a5f; color: white; padding: 20px; text-align: center; }
    .header h1 { margin: 0; font-size: 24px; }
    .content { padding: 20px; }
    .section { margin-bottom: 25px; border-bottom: 1px solid #eee; padding-bottom: 15px; }
    .section:last-child { border-bottom: none; }
    .section-title { color: #1e3a5f; font-size: 16px; font-weight: bold; margin-bottom: 10px; text-transform: uppercase; letter-spacing: 1px; }
    .field { margin-bottom: 8px; }
    .label { color: #666; font-size: 12px; text-transform: uppercase; }
    .value { font-size: 15px; color: #333; font-weight: 500; }
    .highlight { background: #f97316; color: white; padding: 3px 8px; border-radius: 4px; font-size: 12px; }
    .referral-badge { background: #dcfce7; color: #166534; padding: 5px 12px; border-radius: 20px; display: inline-block; font-weight: bold; }
    .footer { background: #f5f5f5; padding: 15px; text-align: center; font-size: 12px; color: #666; }
    .lead-id { font-family: monospace; background: #eee; padding: 2px 6px; border-radius: 3px; }
  </style>
</head>
<body>
  <div class="header">
    <h1>🔋 New Lead Submission</h1>
  </div>

  <div class="content">
    <!-- Referral Source -->
    <div class="section">
      <div class="section-title">Referral Source</div>
      <div class="referral-badge">${referralInfo}</div>
      ${lead.referral?.utm_source ? `<div class="field" style="margin-top: 10px;"><span class="label">UTM Source:</span> ${lead.referral.utm_source}</div>` : ""}
      ${lead.referral?.utm_campaign ? `<div class="field"><span class="label">UTM Campaign:</span> ${lead.referral.utm_campaign}</div>` : ""}
    </div>

    <!-- Contact Information -->
    <div class="section">
      <div class="section-title">Contact Information</div>
      <div class="field">
        <div class="label">Name</div>
        <div class="value">${lead.contact?.name || "N/A"}</div>
      </div>
      <div class="field">
        <div class="label">Email</div>
        <div class="value"><a href="mailto:${lead.contact?.email}">${lead.contact?.email || "N/A"}</a></div>
      </div>
      <div class="field">
        <div class="label">Phone</div>
        <div class="value">${lead.contact?.phone || "Not provided"}</div>
      </div>
    </div>

    <!-- Location -->
    <div class="section">
      <div class="section-title">Location</div>
      <div class="field">
        <div class="label">Address</div>
        <div class="value">${lead.location?.address || "N/A"}</div>
      </div>
      <div class="field">
        <div class="label">State</div>
        <div class="value">${lead.location?.state || "N/A"} ${lead.location?.isDeregulated ? '<span class="highlight">Deregulated</span>' : ""}</div>
      </div>
      ${lead.location?.deregulationStatus ? `<div class="field"><div class="label">Status</div><div class="value">${lead.location.deregulationStatus}</div></div>` : ""}
    </div>

    <!-- Service Details -->
    <div class="section">
      <div class="section-title">Service Details</div>
      <div class="field">
        <div class="label">Auction Type</div>
        <div class="value">${auctionTypeMap[lead.service?.auctionType] || lead.service?.auctionType || "N/A"}</div>
      </div>
      <div class="field">
        <div class="label">Property Type</div>
        <div class="value">${propertyTypeMap[lead.service?.propertyType] || lead.service?.propertyType || "N/A"}</div>
      </div>
    </div>

    <!-- Bills -->
    <div class="section">
      <div class="section-title">Estimated Monthly Bills</div>
      <div class="field">
        <div class="label">Electricity</div>
        <div class="value">$${lead.bills?.electricity || "N/A"}/month</div>
      </div>
      <div class="field">
        <div class="label">Natural Gas</div>
        <div class="value">$${lead.bills?.gas || "N/A"}/month</div>
      </div>
    </div>

    <!-- Property Details -->
    <div class="section">
      <div class="section-title">Property Details</div>
      <div class="field">
        <div class="label">Owns Property</div>
        <div class="value">${lead.propertyDetails?.ownsProperty || "N/A"}</div>
      </div>
      ${lead.propertyDetails?.electricUtility ? `<div class="field"><div class="label">Electric Utility</div><div class="value">${lead.propertyDetails.electricUtility}</div></div>` : ""}
      ${lead.propertyDetails?.retailProvider ? `<div class="field"><div class="label">Retail Provider</div><div class="value">${lead.propertyDetails.retailProvider}</div></div>` : ""}
    </div>

    <!-- Additional Details -->
    ${lead.additionalDetails?.energyCharges || lead.additionalDetails?.demandCharges ? `
    <div class="section">
      <div class="section-title">Additional Details</div>
      ${lead.additionalDetails?.energyCharges ? `<div class="field"><div class="label">Energy Charges</div><div class="value">$${lead.additionalDetails.energyCharges}</div></div>` : ""}
      ${lead.additionalDetails?.demandCharges ? `<div class="field"><div class="label">Demand Charges</div><div class="value">$${lead.additionalDetails.demandCharges}</div></div>` : ""}
    </div>
    ` : ""}

    <!-- Files -->
    ${Object.keys(lead.files || {}).length > 0 ? `
    <div class="section">
      <div class="section-title">Uploaded Documents</div>
      <p style="color: #666; font-size: 14px;">Documents are attached to this email.</p>
      <ul style="margin: 0; padding-left: 20px;">
        ${lead.files?.loa ? `<li>Letter of Authorization (LOA): ${lead.files.loa.name}</li>` : ""}
        ${lead.files?.loe ? `<li>Letter of Enrollment (LOE): ${lead.files.loe.name}</li>` : ""}
        ${lead.files?.energyBill ? `<li>Energy Bill: ${lead.files.energyBill.name}</li>` : ""}
        ${lead.files?.energyContract ? `<li>Energy Contract: ${lead.files.energyContract.name}</li>` : ""}
      </ul>
    </div>
    ` : ""}

  </div>

  <div class="footer">
    <p>Lead ID: <span class="lead-id">${leadId}</span></p>
    <p>Submitted: ${new Date().toLocaleString("en-US", { timeZone: "America/New_York" })} ET</p>
    <p>View in Firebase Console: <a href="https://console.firebase.google.com/project/ideal-energy-form/firestore/data/leads/${leadId}">Open Lead</a></p>
  </div>
</body>
</html>
  `;
}

// Download files from Firebase Storage and prepare as attachments
async function getAttachments(files) {
  if (!files || Object.keys(files).length === 0) {
    return [];
  }

  const attachments = [];
  const storage = getStorage();
  const bucket = storage.bucket();

  for (const [key, fileInfo] of Object.entries(files)) {
    if (fileInfo && fileInfo.path) {
      try {
        const file = bucket.file(fileInfo.path);
        const [buffer] = await file.download();

        attachments.push({
          filename: fileInfo.name || `${key}.pdf`,
          content: buffer,
          contentType: fileInfo.type || "application/octet-stream",
        });

        console.log(`Attached file: ${fileInfo.name}`);
      } catch (error) {
        console.error(`Error downloading file ${key}:`, error);
      }
    }
  }

  return attachments;
}
