import nodemailer from 'nodemailer';

const createTransporter = () => {
  if (process.env.NODE_ENV === 'development' || !process.env.SMTP_USER) {
    // Return a stub transporter that logs to console
    return {
      sendMail: async (options) => {
        console.log('\n📧 EMAIL STUB (not sent in dev mode):');
        console.log('  To:', options.to);
        console.log('  Subject:', options.subject);
        console.log('  Body preview:', (options.html || options.text || '').substring(0, 100));
        console.log('---');
        return { messageId: `stub-${Date.now()}` };
      }
    };
  }

  return nodemailer.createTransporter({
    host: process.env.SMTP_HOST,
    port: parseInt(process.env.SMTP_PORT),
    secure: process.env.SMTP_PORT === '465',
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
  });
};

const sendEmail = async ({ to, subject, html, text }) => {
  try {
    const transporter = createTransporter();
    const mailOptions = {
      from: `HRMS <${process.env.EMAIL_FROM || 'noreply@hrms.com'}>`,
      to, subject, html, text
    };
    const result = await transporter.sendMail(mailOptions);
    return { success: true, messageId: result.messageId };
  } catch (error) {
    console.error('Email send error:', error.message);
    return { success: false, error: error.message };
  }
};

export const sendWelcomeEmail = (to, name, password) =>
  sendEmail({
    to, subject: 'Welcome to HRMS - Your Account Details',
    html: `<h2>Welcome, ${name}!</h2><p>Your account has been created.</p><p>Email: ${to}</p><p>Password: ${password}</p><p>Please change your password after first login.</p>`
  });

export const sendLeaveApprovalEmail = (to, name, status, type, dates) =>
  sendEmail({
    to, subject: `Leave Request ${status}`,
    html: `<h2>Hello ${name},</h2><p>Your ${type} leave request for ${dates} has been <strong>${status}</strong>.</p>`
  });

export const sendInterviewEmail = (to, name, date, type, meetLink) =>
  sendEmail({
    to, subject: 'Interview Scheduled - HRMS',
    html: `<h2>Hello ${name},</h2><p>Your ${type} interview has been scheduled for <strong>${date}</strong>.</p>${meetLink ? `<p>Meeting Link: <a href="${meetLink}">${meetLink}</a></p>` : ''}`
  });

export const sendPayrollEmail = (to, name, month, year, netSalary) =>
  sendEmail({
    to, subject: `Salary Slip - ${month}/${year}`,
    html: `<h2>Hello ${name},</h2><p>Your salary for ${month}/${year} has been processed.</p><p>Net Salary: ${netSalary}</p>`
  });

export const sendPasswordResetEmail = (to, name, resetUrl) =>
  sendEmail({
    to, subject: 'Password Reset - HRMS',
    html: `<h2>Hello ${name},</h2><p>Click the link below to reset your password:</p><a href="${resetUrl}">${resetUrl}</a><p>This link expires in 1 hour.</p>`
  });

export default sendEmail;
