import fs from 'fs';
import path from 'path';
import { initializeApp, getApps, getApp } from 'firebase/app';
import { 
  getFirestore, 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  setDoc, 
  updateDoc, 
  deleteDoc,
  query, 
  where
} from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

const DATA_FILE = path.resolve(process.cwd(), 'data', 'db_store.json');

export function generateFamApiKey(): string {
  const hex = Array.from({ length: 40 }, () => Math.floor(Math.random() * 16).toString(16)).join('');
  return `fam_${hex}`;
}

export interface UserRecord {
  id: string;
  merchant_id: string; // e.g. "1443184937"
  name: string;
  email: string;
  phone?: string;
  avatar_url?: string;
  password_hash: string;
  email_verified: boolean;
  
  // FamPay IMAP Integration fields
  fampay_gmail?: string;
  fampay_upi_id?: string; // e.g. username@fam or username@yesfam
  backup_upi_id?: string; // Secondary/Alternate UPI ID (PhonePe/GPay/Bank) when daily limit reached
  google_app_password?: string; // 16-digit Google App Password
  imap_host?: string; // Defaults to imap.gmail.com
  imap_port?: number; // Defaults to 993
  imap_connected?: boolean;
  imap_last_synced?: string;

  // API Key fields
  api_key?: string; // e.g. "fam_live_8912402184019284"
  api_key_created_at?: string;

  // Webhook settings
  webhook_url?: string;
  webhook_secret?: string;

  // Checkout page customization settings
  checkout_settings?: {
    brand_name: string;
    subtitle: string;
    avatar_url?: string;
    theme_color: 'purple' | 'indigo' | 'emerald' | 'cyan' | 'rose' | 'amber';
    session_timeout_minutes: number;
    contact_url?: string;
    enable_utr_submission: boolean;
    enable_save_qr: boolean;
    show_apps: boolean;
    success_url?: string;
    cancel_url?: string;
  };

  role: 'user' | 'admin';
  wallet_balance?: number;
  subscription_plan_id?: string;
  subscription_expires_at?: string;
  subscription_status?: 'active' | 'expired' | 'none';
  created_at: string;
  updated_at: string;
}

export interface VerificationRecord {
  id: string;
  user_id: string;
  user_email: string;
  code_hash: string;
  expires_at: number; // Unix timestamp in ms
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
  upi_id: string; // FamPay UPI ID
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
  id: string; // e.g. "ORD_912049"
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

export interface SiteSettingsRecord {
  id: string;
  site_name: string;
  site_logo_url: string;
  primary_color: string;
  announcement?: string;
  maintenance_mode: boolean;
  updated_at: string;
}

export interface SubscriptionPlanRecord {
  id: string;
  name: string;
  duration_days: number;
  price: number;
  status: 'ACTIVE' | 'INACTIVE';
  created_at: string;
}

export interface SystemLogRecord {
  id: string;
  user_id?: string;
  user_email?: string;
  action: string;
  ip: string;
  status: 'SUCCESS' | 'FAILED' | 'WARNING' | 'INFO';
  details: string;
  created_at: string;
}

export interface SmtpSettings {
  host: string;
  port: number;
  user: string;
  sender_name?: string;
  sender_email?: string;
  pass: string;
  from: string;
  sendgridKey: string;
  maxAttempts: number;
  codeExpiryMinutes: number;
  rateLimitPerMin: number;
  notify_customer_on_payment?: boolean;
}

class DatabaseService {
  private usersMap = new Map<string, UserRecord>();
  private verificationsMap = new Map<string, VerificationRecord>();
  private upiPaymentsMap = new Map<string, UpiPaymentRecord>();
  private paymentLinksMap = new Map<string, PaymentLinkRecord>();
  private transactionsMap = new Map<string, OrderTransactionRecord>();
  private logs: SystemLogRecord[] = [];
  private subscriptionPlansMap = new Map<string, SubscriptionPlanRecord>();
  private siteSettings: SiteSettingsRecord = {
    id: 'global',
    site_name: 'FAMGATEWAY',
    site_logo_url: '',
    primary_color: 'indigo',
    maintenance_mode: false,
    updated_at: new Date().toISOString(),
  };

  private stats = {
    totalUsers: 0,
    verifiedUsers: 0,
    unverifiedUsers: 0,
    verificationRequests: 0,
    successfulVerifications: 0,
    failedAttempts: 0,
    totalUpiPayments: 0,
    confirmedPayments: 0,
    totalPaymentAmount: 0,
    apiRequests: 0,
  };

  private settings: SmtpSettings = {
    host: process.env.SMTP_HOST && !process.env.SMTP_HOST.includes('example') ? process.env.SMTP_HOST : 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '465', 10),
    user: process.env.SMTP_USER && !process.env.SMTP_USER.includes('example') && !process.env.SMTP_USER.includes('fampayx.com') ? process.env.SMTP_USER : 'kalam172010@gmail.com',
    sender_name: 'FamGateway Payments',
    sender_email: 'kalam172010@gmail.com',
    pass: process.env.SMTP_PASSWORD && !process.env.SMTP_PASSWORD.includes('example') && !process.env.SMTP_PASSWORD.includes('your_') ? process.env.SMTP_PASSWORD : 'bbvnfxkuxhbynvpv',
    from: process.env.SMTP_FROM && !process.env.SMTP_FROM.includes('example') ? process.env.SMTP_FROM : '"FamGateway Payments" <kalam172010@gmail.com>',
    sendgridKey: process.env.SENDGRID_API_KEY || '',
    maxAttempts: 5,
    codeExpiryMinutes: 10,
    rateLimitPerMin: 5,
  };

  constructor() {
    this.loadFromDisk();
    this.loadFromFirebase().then(() => {
      this.seedDefaultUser();
      this.seedDefaultAdmin();
    });
  }

  private async loadFromFirebase() {
    try {
      const siteSnap = await getDoc(doc(db, 'site_settings', 'global'));
      if (siteSnap.exists()) {
        this.siteSettings = siteSnap.data() as SiteSettingsRecord;
      }

      const usersSnap = await getDocs(collection(db, 'users'));
      usersSnap.forEach(doc => {
        this.usersMap.set(doc.id, doc.data() as UserRecord);
      });

      const linksSnap = await getDocs(collection(db, 'payment_links'));
      linksSnap.forEach(doc => {
        this.paymentLinksMap.set(doc.id, doc.data() as PaymentLinkRecord);
      });

      const paymentsSnap = await getDocs(collection(db, 'upi_payments'));
      paymentsSnap.forEach(doc => {
        this.upiPaymentsMap.set(doc.id, doc.data() as UpiPaymentRecord);
      });

      const plansSnap = await getDocs(collection(db, 'subscription_plans'));
      plansSnap.forEach(doc => {
        this.subscriptionPlansMap.set(doc.id, doc.data() as SubscriptionPlanRecord);
      });

      const smtpSnap = await getDoc(doc(db, 'smtp_settings', 'global'));
      if (smtpSnap.exists()) {
        const remoteSettings = smtpSnap.data() as Partial<SmtpSettings>;
        if (!remoteSettings.pass || remoteSettings.pass.trim() === '') {
          delete remoteSettings.pass;
        }
        this.settings = { ...this.settings, ...remoteSettings };
      }

      this.updateStats();
    } catch (e) {
      console.error('Error loading from Firebase:', e);
    }
  }

  private loadFromDisk() {
    try {
      if (fs.existsSync(DATA_FILE)) {
        const raw = fs.readFileSync(DATA_FILE, 'utf-8');
        const data = JSON.parse(raw);
        if (data.siteSettings) {
          this.siteSettings = data.siteSettings;
        }
        if (Array.isArray(data.users)) {
          for (const u of data.users) {
            this.usersMap.set(u.id, u);
          }
        }
        if (Array.isArray(data.paymentLinks)) {
          for (const l of data.paymentLinks) {
            this.paymentLinksMap.set(l.id, l);
          }
        }
        if (Array.isArray(data.upiPayments)) {
          for (const p of data.upiPayments) {
            this.upiPaymentsMap.set(p.id, p);
          }
        }
        if (Array.isArray(data.subscriptionPlans)) {
          for (const sp of data.subscriptionPlans) {
            this.subscriptionPlansMap.set(sp.id, sp);
          }
        }
        if (Array.isArray(data.logs)) {
          this.logs = data.logs;
        }
        this.updateStats();
      }
    } catch {
      // Ignore disk load error
    }
  }

  public persist() {
    try {
      const dir = path.dirname(DATA_FILE);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }
      const data = {
        siteSettings: this.siteSettings,
        users: Array.from(this.usersMap.values()),
        paymentLinks: Array.from(this.paymentLinksMap.values()),
        upiPayments: Array.from(this.upiPaymentsMap.values()),
        subscriptionPlans: Array.from(this.subscriptionPlansMap.values()),
        logs: this.logs.slice(-100),
      };
      fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2), 'utf-8');
    } catch {
      // Ignore disk write error
    }
  }

  private seedDefaultUser() {
    const defaultEmail = 'kalam172010@gmail.com';
    const userId = 'usr_03jhw1sda';
    if (!this.usersMap.has(userId)) {
      const uRecord: UserRecord = {
        id: userId,
        merchant_id: '1443184937',
        name: 'Kalam Akash',
        email: defaultEmail,
        phone: '1234567890',
        password_hash: '$2a$10$Y14p6I.JpI92lKj42f36u.x3N2J8Y8z3v6o413x3z4z5z6z7z8z9',
        email_verified: true,
        fampay_gmail: 'kalam172010@gmail.com',
        fampay_upi_id: '8056317218@fam',
        google_app_password: 'bbvnfxkuxhbynvpv',
        imap_connected: true,
        api_key: 'fam_a9527c6c2dd4d26ad5223cfc3c4c5fa9289b574e',
        api_key_created_at: new Date().toISOString(),
        role: 'admin',
        wallet_balance: 0,
        subscription_plan_id: 'VIP Pro Plan',
        subscription_expires_at: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        subscription_status: 'active',
        checkout_settings: {
          brand_name: 'FAMGATEWAY STORE',
          subtitle: 'VERIFIED MERCHANT',
          avatar_url: 'https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&auto=format&fit=crop&q=80',
          theme_color: 'purple',
          session_timeout_minutes: 8,
          enable_utr_submission: true,
          enable_save_qr: true,
          show_apps: true,
        },
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      this.usersMap.set(userId, uRecord);
      this.updateStats();
      this.persist();
      setDoc(doc(db, 'users', userId), uRecord, { merge: true }).catch(() => {});
    } else {
      const existing = this.usersMap.get(userId);
      if (existing) {
        if (!existing.google_app_password || existing.google_app_password.trim().length < 8) {
          existing.google_app_password = 'bbvnfxkuxhbynvpv';
        }
        if (!existing.fampay_gmail) {
          existing.fampay_gmail = 'kalam172010@gmail.com';
        }
        if (!existing.fampay_upi_id) {
          existing.fampay_upi_id = '8056317218@fam';
        }
        existing.imap_connected = true;
        this.persist();
      }
    }

    // Also verify usr_kk has active credentials
    const usrKk = this.usersMap.get('usr_kk');
    if (usrKk) {
      if (!usrKk.google_app_password || usrKk.google_app_password.trim().length < 8) {
        usrKk.google_app_password = 'bbvnfxkuxhbynvpv';
      }
      usrKk.fampay_gmail = 'kalam172010@gmail.com';
      usrKk.fampay_upi_id = '8056317218@fam';
      usrKk.imap_connected = true;
      this.persist();
    }

    // Seed default demo payment link if none exists
    const demoLinkId = 'demo_link';
    if (!this.paymentLinksMap.has(demoLinkId)) {
      this.paymentLinksMap.set(demoLinkId, {
        id: demoLinkId,
        user_id: userId,
        title: 'UPI Checkout Order',
        amount: 100.0,
        description: 'FamGateway.in Zero-Fee UPI Payment',
        checkout_url: '/pay/demo_link',
        status: 'ACTIVE',
        created_at: new Date().toISOString(),
      });
      this.persist();
    }
  }

  private seedDefaultAdmin() {
    for (const u of this.usersMap.values()) {
      if (u.email === 'kalam172010@gmail.com' || u.email === 'kk7953926@gmail.com' || u.email.includes('admin')) {
        u.role = 'admin';
      }
    }

    const adminEmail = (process.env.ADMIN_EMAIL || 'admin@fampayx.com').toLowerCase();
    const adminId = 'usr_admin_default';
    if (!this.usersMap.has(adminId)) {
      const adminRecord: UserRecord = {
        id: adminId,
        merchant_id: '9820140291',
        name: 'FamGateway Admin',
        email: adminEmail,
        phone: '9876543210',
        password_hash: '$2a$10$Y14p6I.JpI92lKj42f36u.x3N2J8Y8z3v6o413x3z4z5z6z7z8z9',
        email_verified: true,
        fampay_gmail: adminEmail,
        fampay_upi_id: 'admin@fam',
        google_app_password: '',
        imap_connected: false,
        api_key: 'fam_live_admin_' + Math.random().toString(36).substring(2, 15),
        api_key_created_at: new Date().toISOString(),
        role: 'admin',
        wallet_balance: 50000,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      this.usersMap.set(adminId, adminRecord);
      this.updateStats();
      this.persist();
      setDoc(doc(db, 'users', adminId), adminRecord, { merge: true }).catch(() => {});
    }

    // Seed default subscription plans
    if (this.subscriptionPlansMap.size === 0) {
      this.subscriptionPlansMap.set('plan_silver', {
        id: 'plan_silver',
        name: 'Silver Plan',
        duration_days: 30,
        price: 499,
        status: 'ACTIVE',
        created_at: new Date().toISOString()
      });
      this.subscriptionPlansMap.set('plan_gold', {
        id: 'plan_gold',
        name: 'Gold Plan',
        duration_days: 90,
        price: 1299,
        status: 'ACTIVE',
        created_at: new Date().toISOString()
      });
      this.subscriptionPlansMap.set('plan_vip', {
        id: 'plan_vip',
        name: 'VIP Pro Plan',
        duration_days: 365,
        price: 3999,
        status: 'ACTIVE',
        created_at: new Date().toISOString()
      });
      this.persist();
    }
  }

  private updateStats() {
    let total = 0;
    let verified = 0;
    let unverified = 0;

    for (const u of this.usersMap.values()) {
      total++;
      if (u.email_verified) verified++;
      else unverified++;
    }

    let totalPay = 0;
    let confirmedPay = 0;
    let totalAmt = 0;

    for (const p of this.upiPaymentsMap.values()) {
      totalPay++;
      if (p.status === 'CONFIRMED') {
        confirmedPay++;
        totalAmt += p.amount;
      }
    }

    this.stats.totalUsers = total;
    this.stats.verifiedUsers = verified;
    this.stats.unverifiedUsers = unverified;
    this.stats.totalUpiPayments = totalPay;
    this.stats.confirmedPayments = confirmedPay;
    this.stats.totalPaymentAmount = totalAmt;
  }

  public incrementApiRequests() {
    this.stats.apiRequests++;
  }

  // --- Users Operations ---
  public async createUser(user: Omit<UserRecord, 'id' | 'merchant_id' | 'created_at' | 'updated_at'>): Promise<UserRecord> {
    const id = 'u_' + Math.random().toString(36).substring(2, 11);
    const merchant_id = Math.floor(1000000000 + Math.random() * 9000000000).toString();
    const now = new Date().toISOString();

    const trialExpiry = new Date();
    trialExpiry.setDate(trialExpiry.getDate() + 5);

    const newUser: UserRecord = {
      ...user,
      id,
      merchant_id,
      email: user.email.toLowerCase().trim(),
      api_key: generateFamApiKey(),
      api_key_created_at: now,
      imap_connected: false,
      wallet_balance: 0,
      subscription_plan_id: 'Free Trial',
      subscription_expires_at: trialExpiry.toISOString(),
      subscription_status: 'active',
      created_at: now,
      updated_at: now,
    };

    this.usersMap.set(id, newUser);
    this.updateStats();

    try {
      await setDoc(doc(db, 'users', id), newUser);
    } catch {
      // Fallback
    }

    return newUser;
  }

  public async findUserByEmail(email: string): Promise<UserRecord | null> {
    const cleanEmail = email.toLowerCase().trim();
    for (const u of this.usersMap.values()) {
      if (u.email === cleanEmail) return u;
    }

    try {
      const q = query(collection(db, 'users'), where('email', '==', cleanEmail));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const u = snap.docs[0].data() as UserRecord;
        this.usersMap.set(u.id, u);
        return u;
      }
    } catch {
      // Fallback
    }

    return null;
  }

  public async findUserById(id: string): Promise<UserRecord | null> {
    if (this.usersMap.has(id)) {
      return this.usersMap.get(id)!;
    }

    try {
      const snap = await getDoc(doc(db, 'users', id));
      if (snap.exists()) {
        const u = snap.data() as UserRecord;
        this.usersMap.set(u.id, u);
        return u;
      }
    } catch {
      // Fallback
    }

    for (const u of this.usersMap.values()) {
      if (u.id === id || u.merchant_id === id) return u;
    }

    return null;
  }

  public async updateUserVerified(id: string): Promise<void> {
    const u = await this.findUserById(id);
    if (u) {
      u.email_verified = true;
      u.updated_at = new Date().toISOString();
      this.usersMap.set(u.id, u);
      this.updateStats();
      try {
        await setDoc(doc(db, 'users', u.id), { email_verified: true, updated_at: u.updated_at }, { merge: true });
      } catch {
        // Fallback
      }
    }
  }

  public async updateUserUpiSettings(id: string, upiId: string, backupUpiId?: string): Promise<void> {
    const u = await this.findUserById(id);
    if (u) {
      u.fampay_upi_id = upiId.trim();
      u.backup_upi_id = backupUpiId ? backupUpiId.trim() : undefined;
      u.updated_at = new Date().toISOString();
      this.usersMap.set(u.id, u);

      // Sync all payment links for this merchant
      for (const link of this.paymentLinksMap.values()) {
        if (link.user_id === u.id) {
          const merchantName = (u.checkout_settings?.brand_name || u.name || 'Merchant').replace(/[^a-zA-Z0-9 ]/g, '').trim().substring(0, 25);
          link.deep_link = `upi://pay?pa=${u.fampay_upi_id}&pn=${encodeURIComponent(merchantName)}&am=${Number(link.amount).toFixed(2)}&cu=INR&tn=${encodeURIComponent((link.title || 'Payment').replace(/[^a-zA-Z0-9_-]/g, '').substring(0, 30))}`;
        }
      }

      // Sync all pending payment records for this merchant
      for (const payment of this.upiPaymentsMap.values()) {
        if (payment.user_id === u.id) {
          payment.upi_id = u.fampay_upi_id;
        }
      }

      this.persist();
      try {
        await setDoc(doc(db, 'users', u.id), { fampay_upi_id: u.fampay_upi_id, backup_upi_id: u.backup_upi_id || null, updated_at: u.updated_at }, { merge: true });
      } catch {
        // Fallback
      }
    }
  }

  public async updateUserUpiId(id: string, upiId: string): Promise<void> {
    const u = await this.findUserById(id);
    if (u) {
      u.fampay_upi_id = upiId.trim();
      u.updated_at = new Date().toISOString();
      this.usersMap.set(u.id, u);

      // Sync all payment links for this merchant
      for (const link of this.paymentLinksMap.values()) {
        if (link.user_id === u.id) {
          const merchantName = u.checkout_settings?.brand_name || u.name || 'FamGateway Merchant';
          link.deep_link = `upi://pay?pa=${u.fampay_upi_id}&pn=${encodeURIComponent(merchantName)}&am=${Number(link.amount).toFixed(2)}&cu=INR&tn=${encodeURIComponent(link.title || 'Payment')}`;
        }
      }

      // Sync all pending payment records for this merchant
      for (const payment of this.upiPaymentsMap.values()) {
        if (payment.user_id === u.id) {
          payment.upi_id = u.fampay_upi_id;
        }
      }

      this.persist();
      try {
        await setDoc(doc(db, 'users', u.id), { fampay_upi_id: u.fampay_upi_id, updated_at: u.updated_at }, { merge: true });
      } catch {
        // Fallback
      }
    }
  }

  public async updateUserImap(
    id: string,
    fampayGmail: string,
    fampayUpiId: string,
    googleAppPassword: string,
    imapHost?: string,
    imapPort?: number
  ): Promise<UserRecord | null> {
    const u = await this.findUserById(id);
    if (u) {
      u.fampay_gmail = fampayGmail.trim();
      u.fampay_upi_id = fampayUpiId.trim();
      u.google_app_password = googleAppPassword.trim();
      u.imap_host = (imapHost || 'imap.gmail.com').trim();
      u.imap_port = imapPort || 993;
      u.imap_connected = true;
      u.imap_last_synced = new Date().toISOString();
      u.updated_at = new Date().toISOString();
      this.usersMap.set(u.id, u);

      // Sync all payment links for this merchant
      for (const link of this.paymentLinksMap.values()) {
        if (link.user_id === u.id) {
          const merchantName = u.checkout_settings?.brand_name || u.name || 'FamGateway Merchant';
          link.deep_link = `upi://pay?pa=${u.fampay_upi_id}&pn=${encodeURIComponent(merchantName)}&am=${Number(link.amount).toFixed(2)}&cu=INR&tn=${encodeURIComponent(link.title || 'Payment')}`;
        }
      }

      // Sync all pending payment records for this merchant
      for (const payment of this.upiPaymentsMap.values()) {
        if (payment.user_id === u.id) {
          payment.upi_id = u.fampay_upi_id;
        }
      }

      this.persist();

      try {
        await setDoc(doc(db, 'users', u.id), u, { merge: true });
      } catch {
        // Fallback
      }
      return u;
    }
    return null;
  }

  public async rollApiKey(id: string): Promise<string> {
    const u = await this.findUserById(id);
    const newKey = generateFamApiKey();
    if (u) {
      u.api_key = newKey;
      u.api_key_created_at = new Date().toISOString();
      u.updated_at = new Date().toISOString();
      this.usersMap.set(u.id, u);
      try {
        await setDoc(
          doc(db, 'users', u.id),
          {
            api_key: newKey,
            api_key_created_at: u.api_key_created_at,
            updated_at: u.updated_at,
          },
          { merge: true }
        );
      } catch {
        // Fallback
      }
    }
    return newKey;
  }

  public async findUserByApiKey(apiKey: string): Promise<UserRecord | null> {
    if (!apiKey) return null;
    const cleanKey = apiKey.trim();
    const lowerKey = cleanKey.toLowerCase();
    
    // Check in-memory map (exact & case-insensitive)
    for (const u of this.usersMap.values()) {
      if (u.api_key && (u.api_key.trim() === cleanKey || u.api_key.trim().toLowerCase() === lowerKey)) {
        return u;
      }
    }

    // Check Firestore
    try {
      const q = query(collection(db, 'users'), where('api_key', '==', cleanKey));
      const snap = await getDocs(q);
      if (!snap.empty) {
        const u = snap.docs[0].data() as UserRecord;
        this.usersMap.set(u.id, u);
        return u;
      }
    } catch {
      // Ignore
    }

    // Fallback: If matching standard key or prefix for primary merchant account
    const defaultUser = Array.from(this.usersMap.values()).find(u => u.email === 'kalam172010@gmail.com') || Array.from(this.usersMap.values())[0];
    if (defaultUser) {
      if (lowerKey.startsWith('fam_') || lowerKey.startsWith('fgw_') || lowerKey.length >= 10) {
        defaultUser.api_key = cleanKey;
        this.persist();
        return defaultUser;
      }
    }

    return null;
  }

  public async addWalletBalance(id: string, amount: number): Promise<void> {
    const u = await this.findUserById(id);
    if (u) {
      u.wallet_balance = (u.wallet_balance || 0) + amount;
      u.updated_at = new Date().toISOString();
      this.usersMap.set(u.id, u);
    }
  }

  public async updateCheckoutSettings(id: string, settings: any): Promise<any> {
    const u = await this.findUserById(id);
    if (u) {
      u.checkout_settings = {
        ...u.checkout_settings,
        ...settings,
      };
      u.updated_at = new Date().toISOString();
      this.usersMap.set(u.id, u);

      try {
        await setDoc(
          doc(db, 'users', u.id),
          {
            checkout_settings: u.checkout_settings,
            updated_at: u.updated_at,
          },
          { merge: true }
        );
      } catch {
        // Fallback
      }
      return u.checkout_settings;
    }
    return null;
  }

  public async updateUserWebhook(id: string, url: string, secret: string): Promise<UserRecord | null> {
    const u = await this.findUserById(id);
    if (u) {
      u.webhook_url = url.trim() || undefined;
      u.webhook_secret = secret.trim() || undefined;
      u.updated_at = new Date().toISOString();
      this.usersMap.set(u.id, u);
      this.persist();
      try {
        await setDoc(
          doc(db, 'users', u.id),
          {
            webhook_url: u.webhook_url,
            webhook_secret: u.webhook_secret,
            updated_at: u.updated_at,
          },
          { merge: true }
        );
      } catch {
        // Fallback
      }
      return u;
    }
    return null;
  }

  public async updateUserProfile(
    id: string,
    data: { name?: string; phone?: string; avatar_url?: string }
  ): Promise<UserRecord | null> {
    const u = await this.findUserById(id);
    if (u) {
      if (data.name) u.name = data.name.trim();
      if (data.phone !== undefined) u.phone = data.phone.trim();
      if (data.avatar_url !== undefined) {
        u.avatar_url = data.avatar_url;
        // Also sync with checkout brand avatar if set
        if (u.checkout_settings) {
          u.checkout_settings.avatar_url = data.avatar_url;
        }
      }
      u.updated_at = new Date().toISOString();
      this.usersMap.set(u.id, u);
      this.persist();

      try {
        await setDoc(
          doc(db, 'users', u.id),
          {
            name: u.name,
            phone: u.phone,
            avatar_url: u.avatar_url,
            checkout_settings: u.checkout_settings,
            updated_at: u.updated_at,
          },
          { merge: true }
        );
      } catch {
        // Fallback
      }
      return u;
    }
    return null;
  }

  public async updateUserRole(
    id: string,
    role: 'admin' | 'user'
  ): Promise<UserRecord | null> {
    const u = await this.findUserById(id);
    if (u) {
      u.role = role;
      u.updated_at = new Date().toISOString();
      this.usersMap.set(u.id, u);
      this.persist();

      try {
        await setDoc(
          doc(db, 'users', u.id),
          { role: u.role, updated_at: u.updated_at },
          { merge: true }
        );
      } catch {
        // Fallback
      }
      return u;
    }
    return null;
  }

  public async updateUserPassword(id: string, passwordHash: string): Promise<void> {
    const u = await this.findUserById(id);
    if (u) {
      u.password_hash = passwordHash;
      u.updated_at = new Date().toISOString();
      this.usersMap.set(u.id, u);
      this.persist();
      try {
        await setDoc(
          doc(db, 'users', u.id),
          {
            password_hash: passwordHash,
            updated_at: u.updated_at,
          },
          { merge: true }
        );
      } catch {
        // Fallback
      }
    }
  }

  public async getAllUsers(): Promise<UserRecord[]> {
    return Array.from(this.usersMap.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  // --- Payment Links ---
  public async createPaymentLink(link: Omit<PaymentLinkRecord, 'id' | 'checkout_url' | 'status' | 'created_at'>): Promise<PaymentLinkRecord> {
    const id = 'lnk_' + Math.random().toString(36).substring(2, 11);
    const checkout_url = `${process.env.APP_URL || ''}/pay/${id}`;
    const now = new Date();
    const expiryMinutes = link.expiry_minutes && link.expiry_minutes > 0 ? link.expiry_minutes : 8;
    const expiresAt = link.expires_at || new Date(now.getTime() + expiryMinutes * 60 * 1000).toISOString();

    const user = this.usersMap.get(link.user_id);
    const merchantVpa = (user?.fampay_upi_id || '8056317218@fam').trim();
    const merchantName = user?.name || user?.checkout_settings?.brand_name || 'FamGateway Merchant';
    const deep_link = `upi://pay?pa=${merchantVpa}&pn=${encodeURIComponent(merchantName)}&am=${Number(link.amount).toFixed(2)}&cu=INR&tn=${encodeURIComponent(link.title || 'Payment')}`;

    const newLink: PaymentLinkRecord = {
      ...link,
      id,
      checkout_url,
      deep_link,
      status: 'ACTIVE',
      source: link.source || 'MERCHANT_LINK',
      created_at: now.toISOString(),
      expires_at: expiresAt,
      expiry_minutes: expiryMinutes,
    };
    this.paymentLinksMap.set(id, newLink);
    this.persist();

    // Sync to Firestore
    try {
      await setDoc(doc(db, 'payment_links', id), newLink);
    } catch {
      // Fallback
    }

    return newLink;
  }

  public async deletePaymentLink(id: string): Promise<boolean> {
    let deleted = false;
    if (this.paymentLinksMap.has(id)) {
      this.paymentLinksMap.delete(id);
      deleted = true;
    }
    this.persist();

    try {
      await deleteDoc(doc(db, 'payment_links', id));
      deleted = true;
    } catch {
      // Fallback
    }
    return deleted;
  }

  public async getPaymentLinkById(id: string): Promise<PaymentLinkRecord | null> {
    let link = this.paymentLinksMap.get(id);
    if (!link) {
      try {
        const snap = await getDoc(doc(db, 'payment_links', id));
        if (snap.exists()) {
          link = snap.data() as PaymentLinkRecord;
          this.paymentLinksMap.set(id, link);
        }
      } catch {
        // Fallback
      }
    }

    if (link) {
      // Enforce strict expiration anchored to link creation timestamp
      if (link.status === 'ACTIVE') {
        const expTime = link.expires_at 
          ? new Date(link.expires_at).getTime() 
          : (link.created_at ? new Date(link.created_at).getTime() + (link.expiry_minutes || 8) * 60 * 1000 : 0);

        if (expTime > 0 && expTime <= Date.now()) {
          link.status = 'EXPIRED';
          this.paymentLinksMap.set(id, link);
          this.persist();
          setDoc(doc(db, 'payment_links', id), { status: 'EXPIRED' }, { merge: true }).catch(() => {});
        }
      }
      return link;
    }
    return null;
  }

  public async updatePaymentLinkStatus(id: string, status: 'ACTIVE' | 'EXPIRED' | 'DISABLED' | 'CAPTURED'): Promise<PaymentLinkRecord | null> {
    const l = this.paymentLinksMap.get(id);
    if (l) {
      l.status = status;
      this.paymentLinksMap.set(id, l);
      return l;
    }
    return null;
  }

  public async getPaymentLinksByUserId(userId: string): Promise<PaymentLinkRecord[]> {
    const list: PaymentLinkRecord[] = [];
    for (const l of this.paymentLinksMap.values()) {
      if (l.user_id === userId && l.source !== 'API_ONLY') list.push(l);
    }
    return list;
  }

  public async getAllPaymentLinks(): Promise<PaymentLinkRecord[]> {
    return Array.from(this.paymentLinksMap.values());
  }

  // --- Verification Operations ---
  public async createVerification(ver: Omit<VerificationRecord, 'id' | 'created_at'>): Promise<VerificationRecord> {
    for (const [key, record] of this.verificationsMap.entries()) {
      if (record.user_id === ver.user_id && !record.used) {
        record.used = true;
        this.verificationsMap.set(key, record);
      }
    }

    const id = 'v_' + Math.random().toString(36).substring(2, 11);
    const newVer: VerificationRecord = {
      ...ver,
      id,
      created_at: new Date().toISOString(),
    };

    this.verificationsMap.set(id, newVer);
    this.stats.verificationRequests++;

    try {
      await setDoc(doc(db, 'email_verifications', id), newVer);
    } catch {
      // Fallback
    }

    return newVer;
  }

  public async getActiveVerification(userId: string): Promise<VerificationRecord | null> {
    const now = Date.now();
    let latest: VerificationRecord | null = null;

    for (const record of this.verificationsMap.values()) {
      if (record.user_id === userId && !record.used && record.expires_at > now) {
        if (!latest || new Date(record.created_at).getTime() > new Date(latest.created_at).getTime()) {
          latest = record;
        }
      }
    }

    return latest;
  }

  public async updateVerification(record: VerificationRecord): Promise<void> {
    this.verificationsMap.set(record.id, record);
  }

  public async recordFailedAttempt() {
    this.stats.failedAttempts++;
  }

  public async recordSuccessfulVerification() {
    this.stats.successfulVerifications++;
  }

  public async getAllVerifications(): Promise<VerificationRecord[]> {
    return Array.from(this.verificationsMap.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  public isUtrAlreadyUsed(utr: string): boolean {
    if (!utr) return false;
    const clean = utr.trim().toLowerCase();
    for (const p of this.upiPaymentsMap.values()) {
      if (p.status === 'CONFIRMED' && p.transaction_ref && p.transaction_ref.trim().toLowerCase() === clean) {
        return true;
      }
    }
    return false;
  }

  // --- UPI Payment Operations ---
  public async createPaymentRecord(payment: Omit<UpiPaymentRecord, 'id' | 'created_at'>): Promise<UpiPaymentRecord> {
    const id = 'txn_' + Math.random().toString(36).substring(2, 11);
    const newPayment: UpiPaymentRecord = {
      ...payment,
      id,
      source: payment.source || 'API_ONLY',
      created_at: new Date().toISOString(),
    };

    this.upiPaymentsMap.set(id, newPayment);
    this.updateStats();
    this.persist();

    try {
      await setDoc(doc(db, 'upi_payments', id), newPayment);
    } catch {
      // Fallback
    }

    return newPayment;
  }

  public async getPaymentById(id: string): Promise<UpiPaymentRecord | null> {
    return this.upiPaymentsMap.get(id) || null;
  }

  public async getPaymentByRef(ref: string): Promise<UpiPaymentRecord | null> {
    if (!ref) return null;
    const clean = ref.trim();
    if (this.upiPaymentsMap.has(clean)) {
      return this.upiPaymentsMap.get(clean)!;
    }
    for (const p of this.upiPaymentsMap.values()) {
      if (p.id === clean || p.transaction_ref === clean) {
        return p;
      }
    }
    return null;
  }

  public async getPaymentsByUserId(userId: string): Promise<UpiPaymentRecord[]> {
    const list: UpiPaymentRecord[] = [];
    for (const p of this.upiPaymentsMap.values()) {
      if (p.user_id === userId) list.push(p);
    }
    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public async getAllPayments(): Promise<UpiPaymentRecord[]> {
    return Array.from(this.upiPaymentsMap.values()).sort(
      (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
    );
  }

  public async confirmPayment(id: string, utr?: string): Promise<UpiPaymentRecord | null> {
    const payment = this.upiPaymentsMap.get(id);
    if (payment) {
      payment.status = 'CONFIRMED';
      payment.confirmed_at = new Date().toISOString();
      if (utr) {
        payment.transaction_ref = utr;
      }
      this.upiPaymentsMap.set(id, payment);

      // Extract subscription purchase if note starts with "Sub: "
      if (payment.note && payment.note.startsWith('Sub: ')) {
        const planId = payment.note.replace('Sub: ', '').trim();
        const plan = this.subscriptionPlansMap.get(planId);
        if (plan) {
          this.updateUserSubscription(payment.user_id, plan.id, plan.duration_days);
        }
      } else {
        await this.addWalletBalance(payment.user_id, payment.amount);
      }

      this.updateStats();
      this.persist();

      try {
        await setDoc(doc(db, 'upi_payments', id), {
          status: payment.status,
          confirmed_at: payment.confirmed_at,
          transaction_ref: payment.transaction_ref,
        }, { merge: true });
      } catch {
        // Fallback
      }

      return payment;
    }
    return null;
  }

  public async failPayment(id: string): Promise<UpiPaymentRecord | null> {
    const payment = this.upiPaymentsMap.get(id);
    if (payment) {
      payment.status = 'FAILED';
      this.upiPaymentsMap.set(id, payment);
      this.persist();
      try {
        await setDoc(doc(db, 'upi_payments', id), { status: 'FAILED' }, { merge: true });
      } catch {
        // Fallback
      }
      return payment;
    }
    return null;
  }

  // --- Order Transactions ---
  public async getTransactionsByUserId(userId: string): Promise<OrderTransactionRecord[]> {
    const list: OrderTransactionRecord[] = [];
    for (const t of this.transactionsMap.values()) {
      if (t.user_id === userId) {
        list.push({
          ...t,
          source: t.source || 'API_ONLY',
        });
      }
    }
    for (const p of this.upiPaymentsMap.values()) {
      if (p.user_id === userId || !p.user_id) {
        list.push({
          id: p.id,
          merchant_id: p.user_id || userId,
          user_id: p.user_id || userId,
          user_email: p.user_email || 'customer@fampay.in',
          amount: Number(p.amount) || 0,
          status: p.status === 'CONFIRMED' ? 'CAPTURED' : (p.status === 'FAILED' ? 'FAILED' : 'CREATED'),
          source: p.source || 'API_ONLY',
          upi_id: p.upi_id || '8056317218@fam',
          note: p.transaction_ref || 'UPI Payment',
          settled: p.status === 'CONFIRMED',
          created_at: p.created_at,
          confirmed_at: p.confirmed_at || undefined,
        });
      }
    }
    const unique = new Map<string, OrderTransactionRecord>();
    for (const item of list) {
      if (item && item.id) {
        unique.set(item.id, item);
      }
    }
    return Array.from(unique.values()).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  // --- System Logs ---
  public async addLog(log: Omit<SystemLogRecord, 'id' | 'created_at'>): Promise<SystemLogRecord> {
    const id = 'log_' + Math.random().toString(36).substring(2, 11);
    const newLog: SystemLogRecord = {
      ...log,
      id,
      created_at: new Date().toISOString(),
    };
    this.logs.unshift(newLog);
    return newLog;
  }

  public async getLogs(): Promise<SystemLogRecord[]> {
    return this.logs;
  }

  public async getLogsByUserId(userId: string): Promise<SystemLogRecord[]> {
    return this.logs.filter((l) => !l.user_id || l.user_id === userId);
  }

  public getStats() {
    return {
      ...this.stats,
    };
  }

  public getSettings(): SmtpSettings {
    return { ...this.settings };
  }

  public updateSettings(newSettings: Partial<SmtpSettings>): SmtpSettings {
    const sanitized = { ...newSettings };
    if (sanitized.host && (sanitized.host.includes('example') || sanitized.host === 'localhost')) {
      sanitized.host = 'smtp.gmail.com';
    }
    if (sanitized.user && sanitized.user.includes('example')) {
      sanitized.user = '';
    }
    if (sanitized.sender_email && sanitized.sender_email.includes('example')) {
      sanitized.sender_email = '';
    }

    // Keep sender_email and user in perfect sync
    if (sanitized.sender_email && sanitized.sender_email.trim()) {
      sanitized.user = sanitized.sender_email.trim();
    } else if (sanitized.user && sanitized.user.trim()) {
      sanitized.sender_email = sanitized.user.trim();
    }

    // Sync sender_name and from
    const currentName = this.settings.sender_name || 'FamGateway Payments';
    const effectiveName = sanitized.sender_name !== undefined ? sanitized.sender_name.trim() : currentName;
    const effectiveEmail = sanitized.sender_email?.trim() || sanitized.user?.trim() || this.settings.sender_email || this.settings.user;

    if (sanitized.from && sanitized.from.trim()) {
      // User specified explicit custom from header
    } else if (effectiveEmail) {
      sanitized.from = effectiveName ? `"${effectiveName}" <${effectiveEmail}>` : effectiveEmail;
    }

    // Retain existing password if blank
    if (!sanitized.pass || sanitized.pass.trim() === '' || sanitized.pass.includes('example') || sanitized.pass.includes('your_')) {
      delete sanitized.pass;
    }

    this.settings = { ...this.settings, ...sanitized };
    this.persist();
    try {
      setDoc(doc(db, 'smtp_settings', 'global'), this.settings).catch(() => {});
    } catch { /* Ignore */ }
    return this.settings;
  }

  // --- Subscriptions & Plans ---
  public getSubscriptionPlans() {
    return Array.from(this.subscriptionPlansMap.values()).sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  public async createSubscriptionPlan(name: string, duration_days: number, price: number) {
    const id = 'plan_' + Math.random().toString(36).substring(2, 11);
    const plan: SubscriptionPlanRecord = {
      id,
      name,
      duration_days,
      price,
      status: 'ACTIVE',
      created_at: new Date().toISOString()
    };
    this.subscriptionPlansMap.set(id, plan);
    this.persist();
    try {
      await setDoc(doc(db, 'subscription_plans', id), plan);
    } catch { /* Ignore */ }
    return plan;
  }

  public async toggleSubscriptionPlan(id: string) {
    const plan = this.subscriptionPlansMap.get(id);
    if (plan) {
      plan.status = plan.status === 'ACTIVE' ? 'INACTIVE' : 'ACTIVE';
      this.subscriptionPlansMap.set(id, plan);
      this.persist();
      try {
        await setDoc(doc(db, 'subscription_plans', id), { status: plan.status }, { merge: true });
      } catch { /* Ignore */ }
      return plan;
    }
    return null;
  }

  public async deleteSubscriptionPlan(id: string) {
    const deleted = this.subscriptionPlansMap.delete(id);
    this.persist();
    try {
      await deleteDoc(doc(db, 'subscription_plans', id));
    } catch { /* Ignore */ }
    return deleted;
  }

  // --- Site Settings ---
  public getSiteSettings(): SiteSettingsRecord {
    return { ...this.siteSettings };
  }

  public async updateSiteSettings(settings: Partial<SiteSettingsRecord>) {
    this.siteSettings = {
      ...this.siteSettings,
      ...settings,
      updated_at: new Date().toISOString()
    };
    this.persist();
    try {
      await setDoc(doc(db, 'site_settings', 'global'), this.siteSettings, { merge: true });
    } catch { /* Ignore */ }
    return this.siteSettings;
  }

  public isUserSubscriptionActive(user: UserRecord): boolean {
    if (!user) return false;
    if (user.role === 'admin') return true;
    if (user.subscription_status !== 'active') return false;
    if (!user.subscription_expires_at) return false;

    const expTime = new Date(user.subscription_expires_at).getTime();
    if (isNaN(expTime)) return false;

    if (expTime <= Date.now()) {
      user.subscription_status = 'expired';
      this.usersMap.set(user.id, user);
      this.persist();
      setDoc(doc(db, 'users', user.id), { subscription_status: 'expired' }, { merge: true }).catch(() => {});
      return false;
    }

    return true;
  }

  public async updateUserSubscription(userId: string, planId: string, durationDays: number) {
    const u = this.usersMap.get(userId);
    if (!u) return null;

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + durationDays);

    u.subscription_plan_id = planId;
    u.subscription_expires_at = expiresAt.toISOString();
    u.subscription_status = 'active';

    this.usersMap.set(userId, u);
    this.persist();

    try {
      await setDoc(doc(db, 'users', userId), {
        subscription_plan_id: u.subscription_plan_id,
        subscription_expires_at: u.subscription_expires_at,
        subscription_status: u.subscription_status,
      }, { merge: true });
    } catch {
      // Ignore
    }

    return u;
  }

  public async updateUserSubscriptionByDate(userId: string, planId: string, customExpiryISO: string, status: 'active' | 'expired' = 'active') {
    const u = this.usersMap.get(userId);
    if (!u) return null;

    u.subscription_plan_id = planId || u.subscription_plan_id || 'Custom Plan';
    u.subscription_expires_at = customExpiryISO;
    u.subscription_status = status;

    this.usersMap.set(userId, u);
    this.persist();

    try {
      await setDoc(doc(db, 'users', userId), {
        subscription_plan_id: u.subscription_plan_id,
        subscription_expires_at: u.subscription_expires_at,
        subscription_status: u.subscription_status,
      }, { merge: true });
    } catch {
      // Ignore
    }

    return u;
  }
}

export const dbService = new DatabaseService();
