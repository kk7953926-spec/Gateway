export interface EmailTemplateData {
  templateId: 'payment_success' | 'payment_request' | 'refund_processed' | 'subscription_alert' | 'gateway_alert';
  merchantName: string;
  merchantEmail: string;
  merchantUpi: string;
  customerName: string;
  customerEmail: string;
  amount: number;
  currency?: string;
  orderId: string;
  utrRef?: string;
  dateStr?: string;
  paymentMethod?: string;
  invoiceUrl?: string;
  supportPhone?: string;
  themeColor?: string; // hex e.g. #4f46e5
  lang?: 'en' | 'ta';
}

export function generateEmailHtml(data: EmailTemplateData): { subject: string; html: string; preheader: string } {
  const currency = data.currency || 'INR';
  const symbol = currency === 'INR' ? '₹' : '$';
  const color = data.themeColor || '#4f46e5';
  const dateStr = data.dateStr || new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' });
  const utr = data.utrRef || '428910492817';
  const lang = data.lang || 'en';

  let subject = '';
  let preheader = '';
  let contentHtml = '';

  switch (data.templateId) {
    case 'payment_success':
      subject = `Payment Receipt: ${symbol}${data.amount} successfully paid to ${data.merchantName}`;
      preheader = `UTR: ${utr} • Order: ${data.orderId} • Thank you for your payment!`;
      contentHtml = `
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; background-color: #ecfdf5; border-radius: 50%; padding: 12px; margin-bottom: 12px;">
            <svg style="width: 36px; height: 36px; color: #059669; display: block;" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7"></path>
            </svg>
          </div>
          <h2 style="margin: 0 0 6px 0; color: #0f172a; font-size: 22px; font-weight: 800;">
            Payment Successful!
          </h2>
          <p style="margin: 0; color: #64748b; font-size: 13px;">
            Your UPI transaction has been verified in real-time
          </p>
          <div style="margin-top: 16px; font-size: 36px; font-weight: 900; color: #0f172a; letter-spacing: -0.5px;">
            ${symbol}${data.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; background-color: #f8fafc; border-radius: 12px; overflow: hidden; margin-bottom: 24px;">
          <tr>
            <td style="padding: 12px 16px; font-size: 12px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Merchant</td>
            <td style="padding: 12px 16px; font-size: 12px; font-weight: 700; color: #0f172a; text-align: right; border-bottom: 1px solid #e2e8f0;">${data.merchantName}</td>
          </tr>
          <tr>
            <td style="padding: 12px 16px; font-size: 12px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Order Reference</td>
            <td style="padding: 12px 16px; font-size: 12px; font-family: monospace; font-weight: 700; color: #0f172a; text-align: right; border-bottom: 1px solid #e2e8f0;">${data.orderId}</td>
          </tr>
          <tr>
            <td style="padding: 12px 16px; font-size: 12px; color: #64748b; border-bottom: 1px solid #e2e8f0;">UPI UTR / Bank Ref</td>
            <td style="padding: 12px 16px; font-size: 12px; font-family: monospace; font-weight: 700; color: #4f46e5; text-align: right; border-bottom: 1px solid #e2e8f0;">${utr}</td>
          </tr>
          <tr>
            <td style="padding: 12px 16px; font-size: 12px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Date & Time</td>
            <td style="padding: 12px 16px; font-size: 12px; color: #0f172a; text-align: right; border-bottom: 1px solid #e2e8f0;">${dateStr}</td>
          </tr>
          <tr>
            <td style="padding: 12px 16px; font-size: 12px; color: #64748b;">Status</td>
            <td style="padding: 12px 16px; font-size: 12px; font-weight: 800; color: #059669; text-align: right;">COMPLETED ✓</td>
          </tr>
        </table>

        <div style="text-align: center; margin-bottom: 16px;">
          <a href="${data.invoiceUrl || '#'}" style="display: inline-block; background-color: ${color}; color: #ffffff; text-decoration: none; font-size: 13px; font-weight: 700; padding: 12px 28px; border-radius: 8px; box-shadow: 0 4px 6px -1px rgba(79, 70, 229, 0.2);">
            View & Download Receipt
          </a>
        </div>
      `;
      break;

    case 'payment_request':
      subject = `Payment Request: Invoice for ${symbol}${data.amount} from ${data.merchantName}`;
      preheader = `Please complete your payment of ${symbol}${data.amount} for Order #${data.orderId}`;
      contentHtml = `
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; background-color: #eff6ff; border-radius: 50%; padding: 12px; margin-bottom: 12px;">
            <svg style="width: 36px; height: 36px; color: #2563eb; display: block;" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M17 9V7a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2m2 4h10a2 2 0 002-2v-6a2 2 0 00-2-2H9a2 2 0 00-2 2v6a2 2 0 002 2zm7-5a2 2 0 11-4 0 2 2 0 014 0z"></path>
            </svg>
          </div>
          <h2 style="margin: 0 0 6px 0; color: #0f172a; font-size: 22px; font-weight: 800;">
            Payment Request / Invoice
          </h2>
          <p style="margin: 0; color: #64748b; font-size: 13px;">
            ${data.merchantName} has sent you a UPI payment request
          </p>
          <div style="margin-top: 16px; font-size: 36px; font-weight: 900; color: #2563eb; letter-spacing: -0.5px;">
            ${symbol}${data.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <div style="background-color: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 12px; padding: 16px; margin-bottom: 24px; text-align: center;">
          <div style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 4px;">Merchant UPI ID</div>
          <div style="font-size: 14px; font-family: monospace; font-weight: 800; color: #0f172a;">${data.merchantUpi}</div>
        </div>

        <div style="text-align: center; margin-bottom: 20px;">
          <a href="${data.invoiceUrl || '#'}" style="display: inline-block; background-color: ${color}; color: #ffffff; text-decoration: none; font-size: 14px; font-weight: 700; padding: 14px 32px; border-radius: 8px; box-shadow: 0 4px 10px rgba(79, 70, 229, 0.25);">
            Pay Now via UPI / QR
          </a>
        </div>
      `;
      break;

    case 'refund_processed':
      subject = `Refund Processed: ${symbol}${data.amount} credited to your UPI account`;
      preheader = `Refund of ${symbol}${data.amount} for Order #${data.orderId} has been credited.`;
      contentHtml = `
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; background-color: #fdf2f8; border-radius: 50%; padding: 12px; margin-bottom: 12px;">
            <svg style="width: 36px; height: 36px; color: #db2777; display: block;" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6"></path>
            </svg>
          </div>
          <h2 style="margin: 0 0 6px 0; color: #0f172a; font-size: 22px; font-weight: 800;">
            Refund Initiated & Completed
          </h2>
          <p style="margin: 0; color: #64748b; font-size: 13px;">
            The amount has been successfully returned to your payment account
          </p>
          <div style="margin-top: 16px; font-size: 36px; font-weight: 900; color: #db2777; letter-spacing: -0.5px;">
            ${symbol}${data.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
          </div>
        </div>

        <table style="width: 100%; border-collapse: collapse; background-color: #f8fafc; border-radius: 12px; overflow: hidden; margin-bottom: 24px;">
          <tr>
            <td style="padding: 12px 16px; font-size: 12px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Original Order</td>
            <td style="padding: 12px 16px; font-size: 12px; font-family: monospace; font-weight: 700; color: #0f172a; text-align: right; border-bottom: 1px solid #e2e8f0;">${data.orderId}</td>
          </tr>
          <tr>
            <td style="padding: 12px 16px; font-size: 12px; color: #64748b; border-bottom: 1px solid #e2e8f0;">Refund Reference</td>
            <td style="padding: 12px 16px; font-size: 12px; font-family: monospace; font-weight: 700; color: #0f172a; text-align: right; border-bottom: 1px solid #e2e8f0;">RFND-${utr.slice(-6)}</td>
          </tr>
          <tr>
            <td style="padding: 12px 16px; font-size: 12px; color: #64748b;">Processing Mode</td>
            <td style="padding: 12px 16px; font-size: 12px; font-weight: 800; color: #059669; text-align: right;">Instant Real-Time IMAP/UPI</td>
          </tr>
        </table>
      `;
      break;

    case 'subscription_alert':
    default:
      subject = `Subscription Plan Active: ${data.merchantName} Gateway`;
      preheader = `Your gateway plan has been activated for Order #${data.orderId}`;
      contentHtml = `
        <div style="text-align: center; margin-bottom: 24px;">
          <div style="display: inline-block; background-color: #f5f3ff; border-radius: 50%; padding: 12px; margin-bottom: 12px;">
            <svg style="width: 36px; height: 36px; color: #7c3aed; display: block;" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
              <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M13 10V3L4 14h7v7l9-11h-7z"></path>
            </svg>
          </div>
          <h2 style="margin: 0 0 6px 0; color: #0f172a; font-size: 22px; font-weight: 800;">Plan Activated</h2>
          <p style="margin: 0; color: #64748b; font-size: 13px;">Pro Merchant Tier • Instant UPI Daemon Enabled</p>
        </div>
      `;
      break;
  }

  const fullHtml = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${subject}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f1f5f9; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; -webkit-font-smoothing: antialiased;">
  <!-- Preview Preheader text -->
  <div style="display: none; max-height: 0px; overflow: hidden; opacity: 0;">
    ${preheader}
  </div>

  <table width="100%" border="0" cellpadding="0" cellspacing="0" style="background-color: #f1f5f9; padding: 32px 16px;">
    <tr>
      <td align="center">
        <!-- Main Email Container -->
        <table width="100%" border="0" cellpadding="0" cellspacing="0" style="max-width: 560px; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 20px rgba(15, 23, 42, 0.06); border: 1px solid #e2e8f0;">
          <!-- Brand Header -->
          <tr>
            <td style="background-color: #0f172a; padding: 24px 32px; text-align: center;">
              <table width="100%" border="0" cellpadding="0" cellspacing="0">
                <tr>
                  <td align="left">
                    <span style="display: inline-block; font-size: 18px; font-weight: 800; color: #ffffff; letter-spacing: -0.5px;">
                      ${data.merchantName}
                    </span>
                  </td>
                  <td align="right">
                    <span style="display: inline-block; background-color: rgba(255, 255, 255, 0.12); color: #38bdf8; font-size: 10px; font-family: monospace; font-weight: 700; padding: 4px 10px; border-radius: 9999px; text-transform: uppercase;">
                      VERIFIED GATEWAY
                    </span>
                  </td>
                </tr>
              </table>
            </td>
          </tr>

          <!-- Dynamic Body Content -->
          <tr>
            <td style="padding: 32px 32px 24px 32px;">
              ${contentHtml}
            </td>
          </tr>

          <!-- Security Footer & Help -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 32px; border-top: 1px solid #e2e8f0; text-align: center;">
              <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748b; line-height: 1.5;">
                Need help with this transaction? Contact <strong>${data.merchantEmail}</strong>${data.supportPhone ? ` or call <strong>${data.supportPhone}</strong>` : ''}.
              </p>
              <p style="margin: 0; font-size: 11px; color: #94a3b8; font-family: monospace;">
                Powered by FamGateway 24/7 IMAP & UPI Router • 100% Real-Time
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `;

  return { subject, html: fullHtml, preheader };
}
