const express = require('express');
const nodemailer = require('nodemailer');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());

// Gmail SMTP configuration
const transporter = nodemailer.createTransport({
  service: 'gmail',
  auth: {
    user: process.env.GMAIL_USER,
    pass: process.env.GMAIL_APP_PASSWORD
  }
});

// Health check endpoint
app.get('/', (req, res) => {
  res.json({ 
    status: 'OK', 
    message: 'CRM Email API is running',
    timestamp: new Date().toISOString()
  });
});

// Send email endpoint
app.post('/api/send-email', async (req, res) => {
  try {
    const { to, subject, message, fromName } = req.body;

    if (!to || !subject || !message) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields: to, subject, message' 
      });
    }

    const mailOptions = {
      from: `${fromName || 'CRM Avocats'} <${process.env.GMAIL_USER}>`,
      to: to,
      subject: subject,
      text: message,
      html: `<div style="font-family: Arial, sans-serif; line-height: 1.6;">${message.replace(/\n/g, '<br>')}</div>`
    };

    const info = await transporter.sendMail(mailOptions);

    res.json({ 
      success: true, 
      messageId: info.messageId,
      message: 'Email sent successfully'
    });

  } catch (error) {
    console.error('Email error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

// Batch email endpoint (max 10 emails)
app.post('/api/send-batch', async (req, res) => {
  try {
    const { emails, subject, message, fromName } = req.body;

    if (!emails || !Array.isArray(emails) || emails.length === 0) {
      return res.status(400).json({ 
        success: false, 
        error: 'emails array is required' 
      });
    }

    if (emails.length > 10) {
      return res.status(400).json({ 
        success: false, 
        error: 'Maximum 10 emails per batch' 
      });
    }

    const results = [];
    
    for (const email of emails) {
      try {
        const mailOptions = {
          from: `${fromName || 'CRM Avocats'} <${process.env.GMAIL_USER}>`,
          to: email.to,
          subject: email.subject || subject,
          text: email.message || message,
          html: `<div style="font-family: Arial, sans-serif; line-height: 1.6;">${(email.message || message).replace(/\n/g, '<br>')}</div>`
        };

        const info = await transporter.sendMail(mailOptions);
        
        results.push({ 
          to: email.to, 
          success: true, 
          messageId: info.messageId 
        });

        // Wait 3 seconds between emails
        await new Promise(resolve => setTimeout(resolve, 3000));

      } catch (error) {
        results.push({ 
          to: email.to, 
          success: false, 
          error: error.message 
        });
      }
    }

    const successCount = results.filter(r => r.success).length;
    const failCount = results.length - successCount;

    res.json({ 
      success: true,
      sent: successCount,
      failed: failCount,
      results: results
    });

  } catch (error) {
    console.error('Batch email error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});

app.listen(PORT, () => {
  console.log(`✅ CRM Email API running on port ${PORT}`);
  console.log(`📧 Gmail user: ${process.env.GMAIL_USER}`);
});
