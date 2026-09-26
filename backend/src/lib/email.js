const nodemailer = require('nodemailer');

const transporter = (process.env.GMAIL_USER && process.env.GMAIL_APP_PASSWORD)
  ? nodemailer.createTransport({
      service: 'gmail',
      auth: {
        user: process.env.GMAIL_USER,
        pass: process.env.GMAIL_APP_PASSWORD.replace(/\s/g, ''), // strip spaces from app password
      },
    })
  : null;

async function sendInviteEmail({ to, role, inviteLink, squadName }) {
  if (!transporter) {
    console.warn('GMAIL credentials not set — invite email skipped. Link:', inviteLink);
    return false;
  }

  const roleLabel = role === 'athlete' ? 'an athlete' : 'an assistant coach';

  try {
    await transporter.sendMail({
      from: `KickStat <${process.env.GMAIL_USER}>`,
      to,
      subject: `You've been invited to join ${squadName} on KickStat`,
      html: `
        <p>You've been invited to join <strong>${squadName}</strong> as ${roleLabel} on KickStat.</p>
        <p><a href="${inviteLink}">Accept your invite</a></p>
        <p>Or paste this link into your browser:<br>${inviteLink}</p>
      `,
    });
    return true;
  } catch (err) {
    console.error('Failed to send invite email:', err.message);
    return false;
  }
}

module.exports = { sendInviteEmail };