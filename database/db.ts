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
  status: 'ACTIVE' | 'EXPIRED' | 'DISABLED' | 'CAPTURED';
  success_url?: string;
  cancel_url?: string;
  created_at: string;
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
  qr_data_url?: string;
  settled: boolean;
  success_url?: string;
  cancel_url?: string;
  confirmed_at?: string;
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
  pass: string;
  from: string;
  sendgridKey: string;
  maxAttempts: number;
  codeExpiryMinutes: number;
  rateLimitPerMin: number;
}

class DatabaseService {
  private usersMap = new Map<string, UserRecord>();
  private verificationsMap = new Map<string, VerificationRecord>();
  private upiPaymentsMap = new Map<string, UpiPaymentRecord>();
  private paymentLinksMap = new Map<string, PaymentLinkRecord>();
  private transactionsMap = new Map<string, OrderTransactionRecord>();
  private logs: SystemLogRecord[] = [];
  private subscriptionPlansMap = new Map<string, {
    id: string;
    name: string;
    duration_days: number;
    price: number;
    created_at: string;
  }>();

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
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || 'notifications@famgateway.in',
    pass: process.env.SMTP_PASSWORD || '',
    from: process.env.SMTP_FROM || '"FamGateway.in Verification" <notifications@famgateway.in>',
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
    const defaultEmail = 'kk7953926@gmail.com';
    const userId = 'usr_kk';
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
        fampay_upi_id: 'kalamakash@fam',
        google_app_password: '',
        imap_connected: false,
        api_key: 'fam_live_' + Math.random().toString(36).substring(2, 15),
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
        created_at: new Date().toISOString()
      });
      this.subscriptionPlansMap.set('plan_gold', {
        id: 'plan_gold',
        name: 'Gold Plan',
        duration_days: 90,
        price: 1299,
        created_at: new Date().toISOString()
      });
      this.subscriptionPlansMap.set('plan_vip', {
        id: 'plan_vip',
        name: 'VIP Pro Plan',
        duration_days: 365,
        price: 3999,
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
      api_key: 'fgw_live_' + Math.random().toString(36).substring(2, 15),
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

  public async updateUserUpiId(id: string, upiId: string): Promise<void> {
    const u = await this.findUserById(id);
    if (u) {
      u.fampay_upi_id = upiId.trim();
      u.updated_at = new Date().toISOString();
      this.usersMap.set(u.id, u);
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
    const newKey = 'fgw_live_' + Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
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
    const newLink: PaymentLinkRecord = {
      ...link,
      id,
      checkout_url,
      status: 'ACTIVE',
      created_at: new Date().toISOString(),
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
    if (this.paymentLinksMap.has(id)) {
      this.paymentLinksMap.delete(id);
      this.persist();

      try {
        await deleteDoc(doc(db, 'payment_links', id));
      } catch {
        // Fallback
      }
      return true;
    }
    return false;
  }

  public async getPaymentLinkById(id: string): Promise<PaymentLinkRecord | null> {
    return this.paymentLinksMap.get(id) || null;
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
      if (l.user_id === userId) list.push(l);
    }
    return list;
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

  public async confirmPayment(id: string): Promise<UpiPaymentRecord | null> {
    const payment = this.upiPaymentsMap.get(id);
    if (payment) {
      payment.status = 'CONFIRMED';
      payment.confirmed_at = new Date().toISOString();
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

  // --- Order Transactions ---
  public async getTransactionsByUserId(userId: string): Promise<OrderTransactionRecord[]> {
    const list: OrderTransactionRecord[] = [];
    for (const t of this.transactionsMap.values()) {
      if (t.user_id === userId) list.push(t);
    }
    return list.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
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
    this.settings = { ...this.settings, ...newSettings };
    return this.settings;
  }

  // --- Subscriptions & Plans ---
  public getSubscriptionPlans() {
    return Array.from(this.subscriptionPlansMap.values());
  }

  public createSubscriptionPlan(name: string, duration_days: number, price: number) {
    const id = 'plan_' + Math.random().toString(36).substring(2, 11);
    const plan = {
      id,
      name,
      duration_days,
      price,
      created_at: new Date().toISOString()
    };
    this.subscriptionPlansMap.set(id, plan);
    this.persist();
    return plan;
  }

  public deleteSubscriptionPlan(id: string) {
    const deleted = this.subscriptionPlansMap.delete(id);
    this.persist();
    return deleted;
  }

  public updateUserSubscription(userId: string, planId: string, durationDays: number) {
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
      setDoc(doc(db, 'users', userId), u, { merge: true }).catch(() => {});
    } catch {
      // Ignore
    }

    return u;
  }
}

export const dbService = new DatabaseService();
