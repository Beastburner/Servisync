const functions = require("firebase-functions");
const admin = require("firebase-admin");
const twilio = require("twilio");
const crypto = require("crypto");

// Ensure Firebase Admin is initialized (usually done in index.js)
if (!admin.apps.length) {
  admin.initializeApp();
}

const db = admin.firestore();

// IMPORTANT: Set these using:
// firebase functions:config:set twilio.sid="YOUR_SID" twilio.token="YOUR_TOKEN" twilio.phone="YOUR_TWILIO_NUMBER"
// For local development, these will need to be in .runtimeconfig.json
const accountSid = functions.config().twilio?.sid || process.env.TWILIO_ACCOUNT_SID;
const authToken = functions.config().twilio?.token || process.env.TWILIO_AUTH_TOKEN;
const twilioNumber = functions.config().twilio?.phone || process.env.TWILIO_PHONE_NUMBER;

const client = (accountSid && authToken) ? twilio(accountSid, authToken) : null;

/**
 * Endpoint to request an OTP.
 * Expects { phoneNumber: string }
 */
exports.requestTwilioOTP = functions.https.onCall(async (data, context) => {
  const { phoneNumber } = data;

  if (!phoneNumber) {
    throw new functions.https.HttpsError("invalid-argument", "Phone number is required");
  }

  if (!client) {
    throw new functions.https.HttpsError("failed-precondition", "Twilio credentials are not configured in Firebase environment variables.");
  }

  // Generate a random 6-digit OTP
  const otp = crypto.randomInt(100000, 999999).toString();
  const expiresAt = admin.firestore.Timestamp.fromMillis(Date.now() + 5 * 60 * 1000); // 5 minutes

  try {
    // 1. Save OTP to Firestore
    await db.collection("otp_requests").doc(phoneNumber).set({
      otp: otp,
      expiresAt: expiresAt,
      attempts: 0
    });

    // 2. Send SMS via Twilio
    await client.messages.create({
      body: `Your ServiSync login code is: ${otp}. This code expires in 5 minutes.`,
      from: twilioNumber,
      to: phoneNumber
    });

    return { success: true, message: "OTP sent successfully via Twilio" };
  } catch (error) {
    console.error("Error in requestTwilioOTP:", error);
    throw new functions.https.HttpsError("internal", error.message || "Failed to send OTP");
  }
});

/**
 * Endpoint to verify the OTP and return a Custom Token.
 * Expects { phoneNumber: string, otp: string }
 */
exports.verifyTwilioOTP = functions.https.onCall(async (data, context) => {
  const { phoneNumber, otp } = data;

  if (!phoneNumber || !otp) {
    throw new functions.https.HttpsError("invalid-argument", "Phone number and OTP are required");
  }

  try {
    const docRef = db.collection("otp_requests").doc(phoneNumber);
    const docSnap = await docRef.get();

    if (!docSnap.exists) {
      throw new functions.https.HttpsError("not-found", "No OTP request found for this number.");
    }

    const otpData = docSnap.data();

    if (otpData.attempts >= 5) {
      throw new functions.https.HttpsError("resource-exhausted", "Too many failed attempts. Request a new OTP.");
    }

    if (otpData.expiresAt.toDate() < new Date()) {
      throw new functions.https.HttpsError("failed-precondition", "OTP has expired.");
    }

    if (otpData.otp !== otp) {
      await docRef.update({ attempts: admin.firestore.FieldValue.increment(1) });
      throw new functions.https.HttpsError("invalid-argument", "Incorrect OTP.");
    }

    // OTP is valid!
    // 1. Delete the OTP record to prevent reuse
    await docRef.delete();

    // 2. Format a valid Firebase user UID for this phone number
    const uid = `phone_${phoneNumber.replace(/\+/g, "")}`;

    // 3. Generate a Firebase Custom Auth Token
    const customToken = await admin.auth().createCustomToken(uid);

    return { success: true, token: customToken };
  } catch (error) {
    console.error("Error in verifyTwilioOTP:", error);
    throw new functions.https.HttpsError("internal", error.message || "Failed to verify OTP");
  }
});
