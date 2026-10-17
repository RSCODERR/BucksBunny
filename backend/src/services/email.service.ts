import https from 'https';
import { env } from '../config/env';

interface SendVerificationEmailOptions {
  toEmail: string;
  username: string;
  code: string;
}

export const sendVerificationEmail = async ({
  toEmail,
  username,
  code,
}: SendVerificationEmailOptions): Promise<boolean> => {
  if (!env.BREVO_API_KEY) {
    console.warn('[Email Service Warning] BREVO_API_KEY is not set. Verification code for', toEmail, 'is:', code);
    return false;
  }

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Verify your BucksBunny account</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F7F8F5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #17211D;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F7F8F5; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 520px; background-color: #FFFFFF; border-radius: 12px; border: 1px solid #E2E8E0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 20px 32px; border-bottom: 1px solid #F0F2EE; text-align: left;">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="vertical-align: middle;">
                    <div style="width: 36px; height: 36px; border-radius: 8px; background-color: #064E3B; display: inline-block; text-align: center; line-height: 36px; color: #FFFFFF; font-weight: bold; font-size: 18px;">
                      B
                    </div>
                  </td>
                  <td style="vertical-align: middle; padding-left: 12px;">
                    <span style="font-size: 20px; font-weight: 700; color: #17211D; letter-spacing: -0.02em;">BucksBunny</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px; text-align: left;">
              <h1 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 700; color: #17211D; line-height: 1.3;">
                Verify your email address
              </h1>
              <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: #4B5563;">
                Hello <strong>${username}</strong>,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #4B5563;">
                Thank you for creating an account with BucksBunny. Enter the 6-digit verification code below to confirm your email address and activate your account.
              </p>

              <!-- Code Box -->
              <div style="background-color: #F2F7F4; border: 1px solid #D1E3D7; border-radius: 8px; padding: 20px; text-align: center; margin: 28px 0;">
                <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #064E3B; margin-bottom: 8px;">
                  Verification Code
                </div>
                <div style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace; font-size: 34px; font-weight: 700; letter-spacing: 10px; color: #064E3B; padding-left: 10px;">
                  ${code}
                </div>
              </div>

              <p style="margin: 0 0 16px 0; font-size: 13px; line-height: 1.5; color: #6B7280;">
                This code will expire in 15 minutes. For your security, never share this code with anyone.
              </p>
              <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #9CA3AF;">
                If you did not request this verification, you can safely ignore this email.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #FBFBFA; border-top: 1px solid #F0F2EE; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #9CA3AF; line-height: 1.5;">
                BucksBunny Personal Finance
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const postData = JSON.stringify({
    sender: {
      name: env.BREVO_SENDER_NAME,
      email: env.BREVO_SENDER_EMAIL,
    },
    to: [
      {
        email: toEmail,
        name: username,
      },
    ],
    subject: `${code} is your BucksBunny verification code`,
    htmlContent,
  });

  return new Promise((resolve, reject) => {
    const options = {
      hostname: 'api.brevo.com',
      path: '/v3/smtp/email',
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': env.BREVO_API_KEY,
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(postData),
      },
      timeout: 10000,
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`[Email Service] Verification email sent to ${toEmail}`);
          resolve(true);
        } else {
          console.error(`[Email Service Error] Brevo returned status ${res.statusCode}:`, body);
          resolve(false);
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      console.error('[Email Service Error] Request to Brevo timed out.');
      resolve(false);
    });

    req.on('error', (err) => {
      console.error('[Email Service Error] Network error contacting Brevo:', err.message);
      resolve(false);
    });

    req.write(postData);
    req.end();
  });
};

interface SendPasswordResetEmailOptions {
  toEmail: string;
  username: string;
  code: string;
}

export const sendPasswordResetEmail = async ({
  toEmail,
  username,
  code,
}: SendPasswordResetEmailOptions): Promise<boolean> => {
  if (!env.BREVO_API_KEY) {
    console.warn('[Email Service Warning] BREVO_API_KEY is not set. Reset code for', toEmail, 'is:', code);
    return false;
  }

  const htmlContent = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Reset your BucksBunny password</title>
</head>
<body style="margin: 0; padding: 0; background-color: #F7F8F5; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #17211D;">
  <table role="presentation" width="100%" cellspacing="0" cellpadding="0" style="background-color: #F7F8F5; padding: 40px 16px;">
    <tr>
      <td align="center">
        <table role="presentation" width="100%" style="max-width: 520px; background-color: #FFFFFF; border-radius: 12px; border: 1px solid #E2E8E0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05);">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 20px 32px; border-bottom: 1px solid #F0F2EE; text-align: left;">
              <table role="presentation" cellspacing="0" cellpadding="0">
                <tr>
                  <td style="vertical-align: middle;">
                    <div style="width: 36px; height: 36px; border-radius: 8px; background-color: #064E3B; display: inline-block; text-align: center; line-height: 36px; color: #FFFFFF; font-weight: bold; font-size: 18px;">
                      B
                    </div>
                  </td>
                  <td style="vertical-align: middle; padding-left: 12px;">
                    <span style="font-size: 20px; font-weight: 700; color: #17211D; letter-spacing: -0.02em;">BucksBunny</span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding: 32px; text-align: left;">
              <h1 style="margin: 0 0 16px 0; font-size: 22px; font-weight: 700; color: #17211D; line-height: 1.3;">
                Reset your password
              </h1>
              <p style="margin: 0 0 20px 0; font-size: 15px; line-height: 1.6; color: #4B5563;">
                Hello <strong>${username}</strong>,
              </p>
              <p style="margin: 0 0 24px 0; font-size: 15px; line-height: 1.6; color: #4B5563;">
                We received a request to reset your BucksBunny password. Enter the 6-digit code below to set a new password for your account:
              </p>

              <!-- Code Box -->
              <div style="background-color: #F2F7F4; border: 1px solid #D1E3D7; border-radius: 8px; padding: 20px; text-align: center; margin: 28px 0;">
                <div style="font-size: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.08em; color: #064E3B; margin-bottom: 8px;">
                  Password Reset Code
                </div>
                <div style="font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', Menlo, Courier, monospace; font-size: 34px; font-weight: 700; letter-spacing: 10px; color: #064E3B; padding-left: 10px;">
                  ${code}
                </div>
              </div>

              <p style="margin: 0 0 16px 0; font-size: 13px; line-height: 1.5; color: #6B7280;">
                This password reset code will expire in 15 minutes.
              </p>
              <p style="margin: 0; font-size: 13px; line-height: 1.5; color: #9CA3AF;">
                If you did not request a password reset, you can safely ignore this email. Your account remains secure and your password will not change.
              </p>
            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td style="padding: 24px 32px; background-color: #FBFBFA; border-top: 1px solid #F0F2EE; text-align: center;">
              <p style="margin: 0; font-size: 12px; color: #9CA3AF; line-height: 1.5;">
                BucksBunny Personal Finance
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();

  const postData = JSON.stringify({
    sender: {
      name: env.BREVO_SENDER_NAME,
      email: env.BREVO_SENDER_EMAIL,
    },
    to: [
      {
        email: toEmail,
        name: username,
      },
    ],
    subject: `${code} is your BucksBunny password reset code`,
    htmlContent,
  });

  return new Promise((resolve) => {
    const options = {
      hostname: 'api.brevo.com',
      path: '/v3/smtp/email',
      method: 'POST',
      headers: {
        accept: 'application/json',
        'api-key': env.BREVO_API_KEY,
        'content-type': 'application/json',
        'content-length': Buffer.byteLength(postData),
      },
      timeout: 10000,
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        if (res.statusCode && res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`[Email Service] Password reset email sent to ${toEmail}`);
          resolve(true);
        } else {
          console.error(`[Email Service Error] Brevo returned status ${res.statusCode}:`, body);
          resolve(false);
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      console.error('[Email Service Error] Password reset request to Brevo timed out.');
      resolve(false);
    });

    req.on('error', (err) => {
      console.error('[Email Service Error] Network error contacting Brevo for reset email:', err.message);
      resolve(false);
    });

    req.write(postData);
    req.end();
  });
};

