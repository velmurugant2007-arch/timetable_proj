const nodemailer = require('nodemailer');

exports.emailTimetable = async (req, res) => {
  const { email, htmlContent, subject, filename } = req.body;

  if (!email || !htmlContent) {
    return res.status(400).json({ success: false, error: 'Email and content are required' });
  }

  try {
    // Determine transport configuration
    // If user provided real SMTP config in environment variables, use that.
    // Otherwise, log it in console and simulate success.
    
    let transporter;
    
    if (process.env.SMTP_USER && process.env.SMTP_PASS) {
      transporter = nodemailer.createTransport({
        service: 'gmail', // Assuming gmail for the "Real mode" requested
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        }
      });
    } else {
      // Dummy transport if no credentials yet (prevents crashing, allows UI testing)
      console.log(`\n=== MOCK EMAIL SENT ===`);
      console.log(`To: ${email}`);
      console.log(`Subject: ${subject || 'Timetable Export'}`);
      console.log(`[Email body omitted - Contains HTML table]`);
      console.log(`=======================\n`);
      return res.json({ success: true, message: 'Simulated email sent successfully (add SMTP credentials to .env to send real emails)' });
    }

    const mailOptions = {
      from: process.env.SMTP_USER,
      to: email,
      subject: subject || 'Timetable Export',
      html: `
        <div style="font-family: sans-serif; padding: 20px;">
          <h2>Your Timetable</h2>
          <p>Please find the attached timetable below:</p>
          ${htmlContent}
        </div>
      `
    };

    await transporter.sendMail(mailOptions);
    res.json({ success: true, message: 'Email sent successfully!' });
  } catch (error) {
    console.error('Email send error:', error);
    res.status(500).json({ success: false, error: 'Failed to send email' });
  }
};
