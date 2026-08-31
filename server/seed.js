const bcrypt = require('bcryptjs');
const db = require('./db');

function seedAdmins() {
  console.log('Seeding admin accounts...');

  const admins = [
    {
      name: 'G. Kamal',
      mobile: '9739142445',
      passwordPlain: 'KAMAL9739142445',
      role: 'admin'
    },
    {
      name: 'Pravin Kumar',
      mobile: '8792044625',
      passwordPlain: 'PRAVIN8792044625',
      role: 'admin'
    }
  ];

  const existingUsers = db.getCollection('users');

  admins.forEach(admin => {
    const found = existingUsers.find(u => u.mobile === admin.mobile && u.role === 'admin');
    if (!found) {
      const hashedPassword = bcrypt.hashSync(admin.passwordPlain, 10);
      const newAdmin = {
        name: admin.name,
        mobile: admin.mobile,
        password: hashedPassword,
        role: admin.role,
        email: admin.mobile === '9739142445' ? 'kamal@ganeshaworks.com' : 'pravin@ganeshaworks.com'
      };
      db.insert('users', newAdmin);
      console.log(`Created admin: ${admin.name} (${admin.mobile})`);
    } else {
      console.log(`Admin ${admin.name} (${admin.mobile}) already exists`);
    }
  });

  console.log('Admin seeding complete.');
}

if (require.main === module) {
  seedAdmins();
}

module.exports = seedAdmins;
