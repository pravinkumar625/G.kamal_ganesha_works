const fs = require('fs');
const path = require('path');

// Ensure DNS resolution succeeds for MongoDB Atlas SRV connection strings
try {
  const dns = require('dns');
  dns.setServers(['8.8.8.8', '1.1.1.1']);
} catch (e) { }

let MongoClient = null;
try {
  MongoClient = require('mongodb').MongoClient;
} catch (e) {
  // MongoDB optional
}

const BUNDLED_DB_FILE = path.join(__dirname, 'data', 'db.json');
const DB_FILE = process.env.VERCEL ? path.join('/tmp', 'db.json') : BUNDLED_DB_FILE;

let memoryCache = null;
let mongoClient = null;
let mongoDb = null;

function getMongoUri() {
  return process.env.MONGODB_URI || 
         process.env.MONGODB_URL || 
         process.env.STORAGE_URL || 
         process.env.DATABASE_URL || 
         null;
}

async function getMongoDb() {
  if (mongoDb) return mongoDb;
  const uri = getMongoUri();
  if (!uri || !MongoClient) return null;

  try {
    mongoClient = new MongoClient(uri, { serverSelectionTimeoutMS: 6000, connectTimeoutMS: 6000 });
    await mongoClient.connect();
    mongoDb = mongoClient.db('ganesha_works');
    console.log('Connected to MongoDB Atlas successfully!');
    return mongoDb;
  } catch (err) {
    console.error('Failed to connect to MongoDB Atlas:', err);
    return null;
  }
}

// Default initial database state
const defaultData = {
  users: [],
  ganesha_items: [
    { id: '1', name: 'Clay Bal Ganesha', size: '1/2 ft', retailPrice: 450, wholesalePrice: 350 },
    { id: '2', name: 'Clay Bal Ganesha', size: '1 ft', retailPrice: 900, wholesalePrice: 750 },
    { id: '3', name: 'Traditional Ganesha', size: '1.5 ft', retailPrice: 1800, wholesalePrice: 1500 },
    { id: '4', name: 'Traditional Ganesha', size: '2 ft', retailPrice: 3200, wholesalePrice: 2700 },
    { id: '5', name: 'Royal Durbar Ganesha', size: '3 ft', retailPrice: 6500, wholesalePrice: 5500 }
  ],
  orders: [],
  login_logs: [],
  settings: {
    smtp: { host: '', port: 587, secure: false, authUser: '', authPass: '', fromEmail: '' },
    whatsapp: { accountSid: '', authToken: '', fromNumber: '' },
    sms: { accountSid: '', authToken: '', fromNumber: '' }
  }
};

// Ensure database directory and file exist, load into memoryCache
function initDB() {
  if (memoryCache) return memoryCache;

  try {
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    if (fs.existsSync(DB_FILE)) {
      const content = fs.readFileSync(DB_FILE, 'utf-8');
      memoryCache = JSON.parse(content);
    } else if (fs.existsSync(BUNDLED_DB_FILE)) {
      const bundledContent = fs.readFileSync(BUNDLED_DB_FILE, 'utf-8');
      memoryCache = JSON.parse(bundledContent);
      try { fs.writeFileSync(DB_FILE, bundledContent, 'utf-8'); } catch (e) { }
    } else {
      memoryCache = JSON.parse(JSON.stringify(defaultData));
      try { fs.writeFileSync(DB_FILE, JSON.stringify(defaultData, null, 2), 'utf-8'); } catch (e) { }
    }
  } catch (err) {
    console.error('initDB error loading file, using defaults/in-memory:', err);
    memoryCache = JSON.parse(JSON.stringify(defaultData));
  }

  // Ensure all collections exist
  if (!Array.isArray(memoryCache.users)) memoryCache.users = [];
  if (!Array.isArray(memoryCache.ganesha_items) || memoryCache.ganesha_items.length === 0) {
    memoryCache.ganesha_items = defaultData.ganesha_items;
  }
  if (!Array.isArray(memoryCache.orders)) memoryCache.orders = [];
  if (!Array.isArray(memoryCache.login_logs)) memoryCache.login_logs = [];
  if (!memoryCache.settings) memoryCache.settings = defaultData.settings;

  return memoryCache;
}

// Read database (returns in-memory state as single source of truth)
function readData() {
  if (!memoryCache) {
    initDB();
  }
  return memoryCache;
}

// Write database to disk safely (and sync to MongoDB / Vercel KV if available)
async function writeData(data) {
  memoryCache = data;
  try {
    const dir = path.dirname(DB_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    const jsonStr = JSON.stringify(data, null, 2);
    fs.writeFileSync(DB_FILE, jsonStr, 'utf-8');

    // Also update bundled file if local
    if (!process.env.VERCEL && DB_FILE !== BUNDLED_DB_FILE) {
      try {
        fs.writeFileSync(BUNDLED_DB_FILE, jsonStr, 'utf-8');
      } catch (e) { }
    }

    // Save to MongoDB Atlas if connected (AWAIT sync to prevent serverless container from freezing before write)
    const uri = getMongoUri();
    if (uri) {
      await syncToMongo(data);
    }

    // Save to Vercel KV if configured
    if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
      await fetch(process.env.KV_REST_API_URL, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(['SET', 'ganesha_db', jsonStr])
      }).catch(err => {
        console.error('Error writing to Vercel KV store in background:', err);
      });
    }

    return true;
  } catch (err) {
    console.error('Error writing DB file to disk:', err);
    return true;
  }
}

// Sync to MongoDB Atlas
async function syncToMongo(data) {
  try {
    const dbInstance = await getMongoDb();
    if (dbInstance) {
      const col = dbInstance.collection('store');
      await col.updateOne(
        { _id: 'ganesha_main_db' },
        { $set: { data, updatedAt: new Date() } },
        { upsert: true }
      );
    }
  } catch (e) {
    console.error('Error syncing to MongoDB Atlas:', e);
  }
}

// Load from MongoDB Atlas
async function loadFromMongo() {
  try {
    const dbInstance = await getMongoDb();
    if (dbInstance) {
      const col = dbInstance.collection('store');
      const doc = await col.findOne({ _id: 'ganesha_main_db' });
      if (doc && doc.data && doc.data.users) {
        memoryCache = doc.data;
        console.log('Database loaded successfully from MongoDB Atlas!');
        return memoryCache;
      } else {
        const initial = memoryCache || initDB();
        await col.updateOne(
          { _id: 'ganesha_main_db' },
          { $set: { data: initial, updatedAt: new Date() } },
          { upsert: true }
        );
      }
    }
  } catch (e) {
    console.error('Error loading from MongoDB Atlas:', e);
  }
  return memoryCache || initDB();
}

// Asynchronously load database from MongoDB or Vercel KV on startup
let storageLoadingPromise = null;
function loadFromStorage() {
  if (storageLoadingPromise) return storageLoadingPromise;

  if (getMongoUri()) {
    console.log('Detected MongoDB Storage URI. Connecting to MongoDB Atlas...');
    storageLoadingPromise = loadFromMongo();
  } else if (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN) {
    console.log('Detected Vercel KV. Initiating DB restore from KV...');
    storageLoadingPromise = fetch(process.env.KV_REST_API_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.KV_REST_API_TOKEN}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(['GET', 'ganesha_db'])
    })
      .then(res => {
        if (!res.ok) throw new Error(`KV REST response code ${res.status}`);
        return res.json();
      })
      .then(data => {
        if (data && data.result) {
          const parsed = JSON.parse(data.result);
          if (parsed && typeof parsed === 'object' && parsed.users) {
            memoryCache = parsed;
            console.log('Database loaded successfully from Vercel KV store!');
          }
        }
        return memoryCache || initDB();
      })
      .catch(err => {
        console.error('Failed to load from Vercel KV, using local files:', err);
        return memoryCache || initDB();
      });
  } else {
    storageLoadingPromise = Promise.resolve(memoryCache || initDB());
  }
  return storageLoadingPromise;
}

// Call on startup
if (process.env.MONGODB_URI || (process.env.KV_REST_API_URL && process.env.KV_REST_API_TOKEN)) {
  loadFromStorage();
}

const db = {
  // Generic collection operations
  getCollection(collectionName) {
    const data = readData();
    if (!data[collectionName]) {
      data[collectionName] = [];
    }
    return data[collectionName];
  },

  saveCollection(collectionName, items) {
    const data = readData();
    data[collectionName] = items;
    return writeData(data);
  },

  find(collectionName, queryFn) {
    const items = this.getCollection(collectionName);
    return queryFn ? items.filter(queryFn) : items;
  },

  findOne(collectionName, queryFn) {
    const items = this.getCollection(collectionName);
    return items.find(queryFn);
  },

  insert(collectionName, item) {
    const items = this.getCollection(collectionName);
    let id;

    if (collectionName === 'orders') {
      const currentYear = new Date().getFullYear().toString();
      const yearOrders = items.filter(o => o.id && o.id.startsWith(`${currentYear}-`));

      let maxSeq = 0;
      yearOrders.forEach(o => {
        const parts = o.id.split('-');
        if (parts.length === 2) {
          const seq = parseInt(parts[1], 10);
          if (!isNaN(seq) && seq > maxSeq) {
            maxSeq = seq;
          }
        }
      });

      const nextSeq = maxSeq + 1;
      const seqString = String(nextSeq).padStart(3, '0');
      id = `${currentYear}-${seqString}`;
    } else {
      id = Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
    }

    const newItem = {
      id,
      createdAt: new Date().toISOString(),
      ...item
    };
    items.push(newItem);
    this.saveCollection(collectionName, items);
    return newItem;
  },

  update(collectionName, id, updates) {
    const items = this.getCollection(collectionName);
    if (!id) return null;
    const cleanId = decodeURIComponent(String(id)).replace(/^#/, '').trim().toLowerCase();
    const index = items.findIndex(item => 
      item.id === id || (item.id && String(item.id).replace(/^#/, '').trim().toLowerCase() === cleanId)
    );
    if (index === -1) return null;

    items[index] = { ...items[index], ...updates, updatedAt: new Date().toISOString() };
    this.saveCollection(collectionName, items);
    return items[index];
  },

  delete(collectionName, id) {
    const items = this.getCollection(collectionName);
    if (!id) return false;
    const cleanId = decodeURIComponent(String(id)).replace(/^#/, '').trim().toLowerCase();
    const index = items.findIndex(item => 
      item.id === id || (item.id && String(item.id).replace(/^#/, '').trim().toLowerCase() === cleanId)
    );
    if (index === -1) return false;

    items.splice(index, 1);
    this.saveCollection(collectionName, items);
    return true;
  },

  // Settings specific helpers
  getSettings() {
    const data = readData();
    return data.settings || { smtp: {}, whatsapp: {}, sms: {} };
  },

  saveSettings(newSettings) {
    const data = readData();
    data.settings = {
      smtp: { ...(data.settings?.smtp || {}), ...(newSettings.smtp || {}) },
      whatsapp: { ...(data.settings?.whatsapp || {}), ...(newSettings.whatsapp || {}) },
      sms: { ...(data.settings?.sms || {}), ...(newSettings.sms || {}) }
    };
    return writeData(data);
  },

  loadFromStorage,
  loadFromKV: loadFromStorage
};

module.exports = db;
