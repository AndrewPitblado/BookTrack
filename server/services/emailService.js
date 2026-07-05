const nodemailer = require("nodemailer");

let transporter = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.BREVO_SMTP_HOST || "smtp-relay.brevo.com",
      port: Number(process.env.BREVO_SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.BREVO_SMTP_USER,
        pass: process.env.BREVO_SMTP_KEY,
      },
    });
  }
  return transporter;
}

/**
 * Send a password reset email containing a link to the client's reset page.
 */
async function sendPasswordResetEmail(toEmail, resetUrl) {
  const from = process.env.EMAIL_FROM || `"BookTrack" <${process.env.BREVO_SMTP_USER}>`;

  await getTransporter().sendMail({
    from,
    to: toEmail,
    subject: "Reset your BookTrack password",
    html: `
      <p>We received a request to reset your BookTrack password.</p>
      <p><a href="${resetUrl}">Click here to choose a new password</a>. This link expires in 1 hour.</p>
      <p>If you didn't request this, you can safely ignore this email.</p>
    `,
  });
}

module.exports = { sendPasswordResetEmail };
