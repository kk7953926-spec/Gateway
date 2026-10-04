export interface CheckoutCustomizationSettings {
  brand_name: string; // e.g. "UNKNOWN GATEWAY"
  subtitle: string; // e.g. "VERIFIED MERCHANT"
  avatar_url?: string;
  banner_url?: string;
  theme_color: 'purple' | 'indigo' | 'emerald' | 'cyan' | 'rose' | 'amber';
  primary_color?: string;
  session_timeout_minutes: number;
  contact_url?: string;
  support_phone?: string;
  support_email?: string;
  custom_message?: string;
  enable_utr_submission: boolean;
  enable_save_qr: boolean;
  show_apps: boolean;
  success_url?: string;
  cancel_url?: string;
}

export interface User {
  id: string;
  merchant_id?: string;
  name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  email_verified: boolean;
  
  fampay_gmail?: string;
  fampay_upi_id?: string;
  backup_upi_id?: string;
  google_app_password?: string;
  imap_host?: string;
  imap_port?: number;
  imap_connected?: boolean;
  imap_last_synced?: string;

  api_key?: string;
  api_key_created_at?: string;

  webhook_url?: string;
  webhook_secret?: string;

  checkout_settings?: CheckoutCustomizationSettings;

  wallet_balance?: number;
  subscription_plan_id?: string;
  subscription_expires_at?: string;
  subscription_status?: 'active' | 'expired' | 'none';
  role: 'user' | 'admin';
  created_at?: string;
  updated_at?: string;
}

export interface VerificationLog {
  id: string;
  user_id: string;
  user_email: string;
  code_hash: string;
  expires_at: number;
  attempts: number;
  max_attempts: number;
  used: boolean;
  created_at: string;
}

export interface UpiPaymentRecord {
  id: string;
  transaction_ref: string;
  user_id: string;
  user_email: string;
  upi_id: string;
  amount: number;
  note: string;
  qr_data_url: string;
  status: 'PENDING' | 'VERIFYING' | 'CONFIRMED' | 'FAILED';
  source?: 'API_ONLY' | 'MERCHANT_LINK';
  success_url?: string;
  cancel_url?: string;
  confirmed_at?: string;
  created_at: string;
}

export interface PaymentLinkRecord {
  id: string;
  user_id: string;
  title: string;
  amount: number;
  description?: string;
  checkout_url: string;
  deep_link?: string;
  status: 'ACTIVE' | 'EXPIRED' | 'DISABLED' | 'CAPTURED';
  source?: 'API_ONLY' | 'MERCHANT_LINK';
  success_url?: string;
  cancel_url?: string;
  created_at: string;
  expires_at?: string;
  expiry_minutes?: number;
}

export interface OrderTransactionRecord {
  id: string;
  merchant_id: string;
  user_id: string;
  user_email: string;
  amount: number;
  upi_id: string;
  note: string;
  status: 'CREATED' | 'CAPTURED' | 'EXPIRED' | 'FAILED' | 'PENDING';
  source?: 'API_ONLY' | 'MERCHANT_LINK';
  qr_data_url?: string;
  settled: boolean;
  success_url?: string;
  cancel_url?: string;
  confirmed_at?: string;
  created_at: string;
}

export interface SystemLog {
  id: string;
  user_id?: string;
  user_email?: string;
  action: string;
  ip: string;
  status: 'SUCCESS' | 'FAILED' | 'WARNING' | 'INFO';
  details: string;
  created_at: string;
}

export interface GatewayStats {
  totalUsers: number;
  verifiedUsers: number;
  unverifiedUsers: number;
  verificationRequests: number;
  successfulVerifications: number;
  failedAttempts: number;
  totalUpiPayments?: number;
  confirmedPayments?: number;
  totalPaymentAmount?: number;
  apiRequests: number;
}

export interface LiveVisitor {
  id: string;
  ip: string;
  page: string;
  referrer?: string;
  device: string;
  browser: string;
  isCheckout: boolean;
  orderAmount?: number;
  lastPing: number;
  joinedAt: number;
}

export interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  sender_name?: string;
  sender_email?: string;
  from: string;
  maxAttempts: number;
  codeExpiryMinutes: number;
  rateLimitPerMin: number;
  passConfigured: boolean;
  sendgridKeyConfigured: boolean;
  notify_customer_on_payment?: boolean;
}
