require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const path = require('path');
const fs = require('fs');

try {
  const dns = require('dns');
  dns.setServers(['8.8.8.8', '1.1.1.1', '8.8.4.4']);
} catch (e) { }

const { MongoClient } = require('mongodb');

const officialItems = [
  // GANESHA (Items 1 - 10)
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
  
  // GOWRI (Items 11 - 19)
  { id: '11', slNo: 11, name: '1.5 FEET GOWRI', category: 'GOWRI', price: 610, wholesalePrice: 610, retailPrice: 610 },
  { id: '12', slNo: 12, name: '1.25 FEET GOWRI', category: 'GOWRI', price: 255, wholesalePrice: 255, retailPrice: 255 },
  { id: '13', slNo: 13, name: '1 FEET GOWRI', category: 'GOWRI', price: 210, wholesalePrice: 210, retailPrice: 210 },
  { id: '14', slNo: 14, name: '3/4 FEET KAMALA GOWRI', category: 'GOWRI', price: 140, wholesalePrice: 140, retailPrice: 140 },
  { id: '15', slNo: 15, name: '1/2 FEET GOWRI', category: 'GOWRI', price: 120, wholesalePrice: 120, retailPrice: 120 },
  { id: '16', slNo: 16, name: '1/4 FEET GOWRI', category: 'GOWRI', price: 92, wholesalePrice: 92, retailPrice: 92 },
  { id: '17', slNo: 17, name: 'NO-6', category: 'GOWRI', price: 60, wholesalePrice: 60, retailPrice: 60 },
  { id: '18', slNo: 18, name: 'NO-5', category: 'GOWRI', price: 38, wholesalePrice: 38, retailPrice: 38 },
  { id: '19', slNo: 19, name: 'NO-4', category: 'GOWRI', price: 34, wholesalePrice: 34, retailPrice: 34 }
];

async function run() {
  console.log('--- MIGRATING CATALOG TO 19 OFFICIAL ITEMS ---');
  
  // 1. Update local db.json
  const dbPath = path.join(__dirname, 'data', 'db.json');
  let data = {};
  if (fs.existsSync(dbPath)) {
    try {
      data = JSON.parse(fs.readFileSync(dbPath, 'utf-8'));
    } catch (e) {
      console.error('Error reading db.json:', e.message);
    }
  }
  
  data.ganesha_items = officialItems;
  fs.writeFileSync(dbPath, JSON.stringify(data, null, 2), 'utf-8');
  console.log(`✓ Updated local db.json with ${officialItems.length} items`);

  // 2. Update MongoDB Atlas if URI is available
  const uri = process.env.MONGODB_URI || process.env.MONGODB_URL;
  if (uri) {
    try {
      console.log('Connecting to MongoDB Atlas...');
      const client = new MongoClient(uri, { serverSelectionTimeoutMS: 8000 });
      await client.connect();
      const db = client.db('ganesha_works');
      const col = db.collection('store');
      
      const doc = await col.findOne({ _id: 'ganesha_main_db' });
      let atlasData = doc && doc.data ? doc.data : data;
      atlasData.ganesha_items = officialItems;
      
      await col.updateOne(
        { _id: 'ganesha_main_db' },
        { $set: { data: atlasData, updatedAt: new Date() } },
        { upsert: true }
      );
      
      console.log(`✓ Successfully updated MongoDB Atlas collection with ${officialItems.length} official items!`);
      await client.close();
    } catch (err) {
      console.error('Error updating MongoDB Atlas:', err.message);
    }
  } else {
    console.log('No MongoDB URI found, skipped Atlas update.');
  }
  
  console.log('--- CATALOG MIGRATION COMPLETE ---');
}

run();
