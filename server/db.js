const fs = require('fs');
const path = require('path');

const DB_FILE = path.join(__dirname, 'data', 'db.json');

// Ensure database directory and file exist
function initDB() {
  const dir = path.dirname(DB_FILE);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  if (!fs.existsSync(DB_FILE)) {
    const initialData = {
      users: [],
      ganesha_items: [
        // Seed some default items for ease of initial load
        { id: '1', name: 'Clay Bal Ganesha', size: '1/2 ft', retailPrice: 450, wholesalePrice: 350 },
        { id: '2', name: 'Clay Bal Ganesha', size: '1 ft', retailPrice: 900, wholesalePrice: 750 },
        { id: '3', name: 'Traditional Ganesha', size: '1.5 ft', retailPrice: 1800, wholesalePrice: 1500 },
        { id: '4', name: 'Traditional Ganesha', size: '2 ft', retailPrice: 3200, wholesalePrice: 2700 },
        { id: '5', name: 'Royal Durbar Ganesha', size: '3 ft', retailPrice: 6500, wholesalePrice: 5500 }
      ],
      orders: [],
      login_logs: [],
      settings: {
        smtp: {
          host: '',
          port: 587,
          secure: false,
          authUser: '',
          authPass: '',
          fromEmail: ''
        },
        whatsapp: {
          accountSid: '',
          authToken: '',
          fromNumber: ''
        }
      }
    };
    fs.writeFileSync(DB_FILE, JSON.stringify(initialData, null, 2), 'utf-8');
  }
}

// Read database
function readData() {
  initDB();
  try {
    const content = fs.readFileSync(DB_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    console.error('Error reading DB file:', err);
    return {};
  }
}

// Write database
function writeData(data) {
  initDB();
  try {
    fs.writeFileSync(DB_FILE, JSON.stringify(data, null, 2), 'utf-8');
    return true;
  } catch (err) {
    console.error('Error writing DB file:', err);
    return false;
  }
}

const db = {
  // Generic collection operations
  getCollection(collectionName) {
    const data = readData();
    return data[collectionName] || [];
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
      // Filter existing orders that start with current year prefix
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
    const index = items.findIndex(item => item.id === id);
    if (index === -1) return null;

    items[index] = { ...items[index], ...updates, updatedAt: new Date().toISOString() };
    this.saveCollection(collectionName, items);
    return items[index];
  },

  delete(collectionName, id) {
    const items = this.getCollection(collectionName);
    const index = items.findIndex(item => item.id === id);
    if (index === -1) return false;

    items.splice(index, 1);
    this.saveCollection(collectionName, items);
    return true;
  },

  // Settings specific helpers
  getSettings() {
    const data = readData();
    return data.settings || { smtp: {}, whatsapp: {} };
  },

  saveSettings(newSettings) {
    const data = readData();
    data.settings = {
      smtp: { ...(data.settings?.smtp || {}), ...(newSettings.smtp || {}) },
      whatsapp: { ...(data.settings?.whatsapp || {}), ...(newSettings.whatsapp || {}) }
    };
    return writeData(data);
  }
};

module.exports = db;
