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
    { id: '1', slNo: 1, name: 'DARBAR', category: 'GANESHA', price: 505, wholesalePrice: 505, retailPrice: 505 },
    { id: '2', slNo: 2, name: '1.5 FEET', category: 'GANESHA', price: 385, wholesalePrice: 385, retailPrice: 385 },
    { id: '3', slNo: 3, name: '1.25 FEET', category: 'GANESHA', price: 305, wholesalePrice: 305, retailPrice: 305 },
    { id: '4', slNo: 4, name: '1 FEET', category: 'GANESHA', price: 205, wholesalePrice: 205, retailPrice: 205 },
    { id: '5', slNo: 5, name: '3/4 FEET', category: 'GANESHA', price: 175, wholesalePrice: 175, retailPrice: 175 },
    { id: '6', slNo: 6, name: '3/4 MOULD', category: 'GANESHA', price: 110, wholesalePrice: 110, retailPrice: 110 },
    { id: '7', slNo: 7, name: '1/2 MOULD', category: 'GANESHA', price: 80, wholesalePrice: 80, retailPrice: 80 },
    { id: '8', slNo: 8, name: '1/4 MOULD', category: 'GANESHA', price: 60, wholesalePrice: 60, retailPrice: 60 },
    { id: '9', slNo: 9, name: 'DESGIN', category: 'GANESHA', price: 610, wholesalePrice: 610, retailPrice: 610 },
    { id: '10', slNo: 10, name: 'KALVET', category: 'GANESHA', price: 1200, wholesalePrice: 1200, retailPrice: 1200 },
    { id: '11', slNo: 11, name: '1.5 FEET GOWRI', category: 'GOWRI', price: 610, wholesalePrice: 610, retailPrice: 610 },
    { id: '12', slNo: 12, name: '1.25 FEET GOWRI', category: 'GOWRI', price: 255, wholesalePrice: 255, retailPrice: 255 },
    { id: '13', slNo: 13, name: '1 FEET GOWRI', category: 'GOWRI', price: 210, wholesalePrice: 210, retailPrice: 210 },
    { id: '14', slNo: 14, name: '3/4 FEET KAMALA GOWRI', category: 'GOWRI', price: 140, wholesalePrice: 140, retailPrice: 140 },
    { id: '15', slNo: 15, name: '1/2 FEET GOWRI', category: 'GOWRI', price: 120, wholesalePrice: 120, retailPrice: 120 },
    { id: '16', slNo: 16, name: '1/4 FEET GOWRI', category: 'GOWRI', price: 92, wholesalePrice: 92, retailPrice: 92 },
    { id: '17', slNo: 17, name: 'NO-6', category: 'GOWRI', price: 60, wholesalePrice: 60, retailPrice: 60 },
    { id: '18', slNo: 18, name: 'NO-5', category: 'GOWRI', price: 38, wholesalePrice: 38, retailPrice: 38 },
    { id: '19', slNo: 19, name: 'NO-4', category: 'GOWRI', price: 34, wholesalePrice: 34, retailPrice: 34 }
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
