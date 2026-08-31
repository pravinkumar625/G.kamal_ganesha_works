const fs = require('fs');
const path = require('path');
const db = require('../db');

const LOGS_DIR = path.join(__dirname, '..', 'logs');

// Load Twilio config from environment or default db settings
async function sendBillSMS({ mobileNumber, customerName, orderId, billUrl, grandTotal }) {
  const settings = db.getSettings();
  
  // Use environment variables first, then database settings.sms
  const accountSid = process.env.TWILIO_ACCOUNT_SID || settings.sms?.accountSid || settings.whatsapp?.accountSid || '';
  const authToken = process.env.TWILIO_AUTH_TOKEN || settings.sms?.authToken || settings.whatsapp?.authToken || '';
  const fromNumber = process.env.TWILIO_PHONE_NUMBER || settings.sms?.fromNumber || settings.whatsapp?.fromNumber || '';

  const hasCredentials = accountSid && authToken && fromNumber;

  const smsText = `Thank you for purchasing from G.Kamal Ganesha Works, ${customerName}! 🙏 Your order #${orderId} (Total: ₹${grandTotal}) has been approved. Download your finalized bill here: ${billUrl}`;

  if (hasCredentials) {
    try {
      console.log(`Attempting to send Twilio SMS to ${mobileNumber}...`);
      const twilio = require('twilio');
      const client = twilio(accountSid, authToken);

      const message = await client.messages.create({
        body: smsText,
        from: fromNumber, // Twilio SMS number
        to: mobileNumber.startsWith('+') ? mobileNumber : '+91' + mobileNumber
      });

      console.log(`SMS sent successfully. SID: ${message.sid}`);
      return { success: true, messageSid: message.sid };
    } catch (error) {
      console.error('Twilio SMS sending failed, falling back to mock logger:', error);
      return logMockSMS(mobileNumber, customerName, orderId, billUrl, grandTotal, error.message);
    }
  } else {
    console.log('No Twilio SMS config found in environment. Logging SMS locally (simulation).');
    return logMockSMS(mobileNumber, customerName, orderId, billUrl, grandTotal, 'Twilio SMS Not Configured');
  }
}

function logMockSMS(mobileNumber, customerName, orderId, billUrl, grandTotal, reason) {
  try {
    if (!fs.existsSync(LOGS_DIR)) {
      fs.mkdirSync(LOGS_DIR, { recursive: true });
    }

    const logFile = path.join(LOGS_DIR, 'sms.log');
    const timestamp = new Date().toISOString();

    const logEntry = `
=============================================
Timestamp: ${timestamp}
To: ${mobileNumber}
Customer: ${customerName}
Order ID: ${orderId}
Grand Total: ₹${grandTotal}
Status: Simulated Send (Reason: ${reason})
Message: Thank you for purchasing from G.Kamal Ganesha Works, ${customerName}! 🙏 Your order #${orderId} (Total: ₹${grandTotal}) has been approved. Download your finalized bill here: ${billUrl}
=============================================
`;

    fs.appendFileSync(logFile, logEntry, 'utf-8');
    console.log(`Simulated SMS logged in ${logFile}`);
  } catch (logErr) {
    console.warn('Logging simulated SMS to file skipped:', logErr.message);
  }
  return { success: true, simulated: true };
}

module.exports = { sendBillSMS };
