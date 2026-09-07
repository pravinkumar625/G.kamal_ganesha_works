const fs = require('fs');
const path = require('path');

// Ensure DNS resolution succeeds for MongoDB Atlas SRV connection strings across all environments
try {
  const dns = require('dns');
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
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
let isConnectedToMongo = false;
let isStorageLoaded = false;
let loadPromise = null;

function getMongoUri() {
  return process.env.MONGODB_URI || 
         process.env.MONGODB_URL || 
         process.env.STORAGE_URL || 
         process.env.DATABASE_URL || 
         null;
}

async function getMongoDb() {
  if (mongoDb && isConnectedToMongo) return mongoDb;
  const uri = getMongoUri();
  if (!uri || !MongoClient) return null;

  try {
    mongoClient = new MongoClient(uri, { 
      serverSelectionTimeoutMS: 8000, 
      connectTimeoutMS: 8000,
      maxPoolSize: 10
    });
    await mongoClient.connect();
    mongoDb = mongoClient.db('ganesha_works');
    isConnectedToMongo = true;
    console.log('Connected to MongoDB Atlas successfully!');
    return mongoDb;
  } catch (err) {
    isConnectedToMongo = false;
    console.error('Failed to connect to MongoDB Atlas:', err.message || err);
    return null;
  }
}

// Default initial database state
const defaultData = {
  users: [
    {
      id: "mtgp4ts005wdw",
      createdAt: "2026-08-31T03:46:12.288Z",
      name: "G. Kamal",
      mobile: "9739142445",
      password: "$2a$10$ibFqCERWuZENhW9AKxcKre3PvvIGBIrd0RCXGfW4i.cMh6J7u6Yde",
      role: "admin",
      email: "kamal@ganeshaworks.com"
    },
    {
      id: "mtgp4tuufashc",
      createdAt: "2026-08-31T03:46:12.390Z",
      name: "Pravin Kumar",
      mobile: "8792044625",
      password: "$2a$10$yGP4R3/kEJYwZVoB2x1ZJOkwh04TvcZs8AFaz8Ap49kTjAK7n/8W6",
      role: "admin",
      email: "pravin@ganeshaworks.com"
    }
  ],
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

// Initialize DB from local file if needed
function initDB() {
  if (memoryCache && isStorageLoaded) return memoryCache;

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

// Write database to memory, local disk, and sync to MongoDB Atlas
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

    // Save to MongoDB Atlas if connected (AWAIT sync to prevent serverless container from freezing)
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

// Sync current data to MongoDB Atlas
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
      isConnectedToMongo = true;
    }
  } catch (e) {
    isConnectedToMongo = false;
    console.error('Error syncing to MongoDB Atlas:', e.message || e);
  }
}

// Load database from MongoDB Atlas
async function loadFromMongo() {
  try {
    const dbInstance = await getMongoDb();
    if (dbInstance) {
      const col = dbInstance.collection('store');
      const doc = await col.findOne({ _id: 'ganesha_main_db' });
      if (doc && doc.data && Array.isArray(doc.data.users)) {
        memoryCache = doc.data;
        isStorageLoaded = true;
        isConnectedToMongo = true;
        console.log(`Database loaded successfully from MongoDB Atlas! (${memoryCache.orders?.length || 0} orders, ${memoryCache.users?.length || 0} users)`);
        
        // Also persist to local file for fast fallback
        try {
          fs.writeFileSync(DB_FILE, JSON.stringify(memoryCache, null, 2), 'utf-8');
        } catch (e) { }
        
        return memoryCache;
      } else {
        // Document does not exist in Atlas yet, initialize it
        const initial = memoryCache || initDB();
        await col.updateOne(
          { _id: 'ganesha_main_db' },
          { $set: { data: initial, updatedAt: new Date() } },
          { upsert: true }
        );
        isStorageLoaded = true;
        isConnectedToMongo = true;
        return memoryCache;
      }
    }
  } catch (e) {
    isConnectedToMongo = false;
    console.error('Error loading from MongoDB Atlas:', e.message || e);
  }
  return memoryCache || initDB();
}

// Asynchronously load database from MongoDB on startup or request
function loadFromStorage(force = false) {
  if (isStorageLoaded && !force && memoryCache) {
    return Promise.resolve(memoryCache);
  }

  if (loadPromise && !force) {
    return loadPromise;
  }

  if (getMongoUri()) {
    loadPromise = loadFromMongo().then(res => {
      loadPromise = null;
      return res;
    });
  } else {
    isStorageLoaded = true;
    loadPromise = null;
    return Promise.resolve(memoryCache || initDB());
  }

  return loadPromise;
}

// Initial boot load
initDB();
if (getMongoUri()) {
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

  // 100% COMPLETE HARD DELETE (Removes item permanently from memory, file, and MongoDB Atlas)
  delete(collectionName, id) {
    const data = readData();
    if (!data[collectionName] || !Array.isArray(data[collectionName]) || !id) return false;
    
    const cleanId = decodeURIComponent(String(id)).replace(/^#/, '').trim().toLowerCase();
    const initialLen = data[collectionName].length;
    
    // Purge item completely from array
    data[collectionName] = data[collectionName].filter(item => {
      if (!item || !item.id) return false;
      const itemId = String(item.id).replace(/^#/, '').trim().toLowerCase();
      return item.id !== id && itemId !== cleanId;
    });

    const deleted = data[collectionName].length < initialLen;
    if (deleted) {
      writeData(data);
    }
    return deleted;
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

  isMongoConnected() {
    return isConnectedToMongo;
  },
  getMongoDb,
  syncToMongo,
  loadFromStorage,
  loadFromKV: loadFromStorage
};

module.exports = db;
