const db = require('./db');

function migrate() {
  console.log('Starting phone number normalization migration...');
  
  // 1. Normalize users
  const users = db.getCollection('users');
  let updatedUsersCount = 0;
  
  users.forEach(u => {
    if (u.mobile) {
      const normalized = u.mobile.replace(/\D/g, '').slice(-10);
      if (normalized && u.mobile !== normalized) {
        console.log(`Normalizing user ${u.name || 'Unknown'} mobile: ${u.mobile} -> ${normalized}`);
        u.mobile = normalized;
        updatedUsersCount++;
      }
    }
  });
  
  if (updatedUsersCount > 0) {
    db.saveCollection('users', users);
    console.log(`Successfully normalized ${updatedUsersCount} users.`);
  }

  // 2. Normalize orders
  const orders = db.getCollection('orders');
  let updatedOrdersCount = 0;

  orders.forEach(o => {
    if (o.customerDetails && o.customerDetails.mobile) {
      const normalized = o.customerDetails.mobile.replace(/\D/g, '').slice(-10);
      if (normalized && o.customerDetails.mobile !== normalized) {
        console.log(`Normalizing order #${o.id} customer mobile: ${o.customerDetails.mobile} -> ${normalized}`);
        o.customerDetails.mobile = normalized;
        updatedOrdersCount++;
      }
    }
  });

  if (updatedOrdersCount > 0) {
    db.saveCollection('orders', orders);
    console.log(`Successfully normalized ${updatedOrdersCount} orders.`);
  }

  console.log('Migration complete.');
}

migrate();
