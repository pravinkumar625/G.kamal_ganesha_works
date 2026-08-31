const http = require('http');

const PORT = 5000;

function request(options, body = null) {
  const bodyStr = body ? JSON.stringify(body) : '';
  return new Promise((resolve, reject) => {
    const req = http.request({
      hostname: 'localhost',
      port: PORT,
      ...options,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(bodyStr),
        ...(options.headers || {})
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(data);
          resolve({ status: res.statusCode, body: json });
        } catch (e) {
          resolve({ status: res.statusCode, body: data });
        }
      });
    });

    req.on('error', reject);
    if (body) {
      req.write(bodyStr);
    }
    req.end();
  });
}

async function runTests() {
  console.log('=== RUNNING BACKEND INTEGRATION TESTS WITH CUSTOM ORDER IDs ===');
  
  try {
    // 1. Customer Log In / Register
    console.log('\n[TEST 1] Logging in as Customer...');
    const custLoginRes = await request({
      path: '/api/auth/login/customer',
      method: 'POST'
    }, {
      email: 'testcustomer@gmail.com',
      mobile: '9888877777'
    });

    if (custLoginRes.status !== 200 || !custLoginRes.body.token) {
      console.log('❌ Customer login failed:', custLoginRes.body);
      return;
    }
    const customerToken = custLoginRes.body.token;
    console.log('✔ Customer logged in successfully!');

    // 2. Customer Places a New Order
    console.log('\n[TEST 2] Customer placing a new order...');
    const placeOrderRes = await request({
      path: '/api/customer/orders',
      method: 'POST',
      headers: { 'Authorization': `Bearer ${customerToken}` }
    }, {
      items: [
        { itemId: '1', name: 'Clay Bal Ganesha', size: '1/2 ft', rate: 450, quantity: 2, lineTotal: 900 }
      ],
      grandTotal: 900,
      advancePayment: 200,
      balanceDue: 700
    });

    if (placeOrderRes.status !== 201 || !placeOrderRes.body.id) {
      console.log('❌ Customer place order failed:', placeOrderRes.body);
      return;
    }
    
    const newOrderId = placeOrderRes.body.id;
    console.log(`✔ Order placed successfully! Generated Order ID: ${newOrderId}`);
    
    // Check ID pattern: YYYY-XXX
    const currentYear = new Date().getFullYear().toString();
    const idPattern = new RegExp(`^${currentYear}-\\d{3}$`);
    if (idPattern.test(newOrderId)) {
      console.log(`✔ Order ID matches the required Year-Seq format: ${currentYear}-00X!`);
    } else {
      console.log(`❌ Order ID DOES NOT match format! Expected ${currentYear}-001 shape, got: ${newOrderId}`);
    }

    // 3. Admin Log In
    console.log('\n[TEST 3] Logging in as Admin (G. Kamal)...');
    const adminLoginRes = await request({
      path: '/api/auth/login/admin',
      method: 'POST'
    }, {
      mobile: '9739142445',
      password: 'KAMAL9739142445'
    });

    if (adminLoginRes.status !== 200 || !adminLoginRes.body.token) {
      console.log('❌ Admin login failed:', adminLoginRes.body);
      return;
    }
    const adminToken = adminLoginRes.body.token;
    console.log('✔ Admin logged in successfully!');

    // 4. Admin Finalizes and Approves the New Order
    console.log(`\n[TEST 4] Admin approving the new order: ${newOrderId}...`);
    const approveRes = await request({
      path: `/api/admin/orders/${newOrderId}/approve`,
      method: 'POST',
      headers: { 'Authorization': `Bearer ${adminToken}` }
    }, {
      pdfBase64: 'data:application/pdf;base64,JVBERi0xLjQKJdPr68c...', // Mock PDF base64
      sendMethods: { email: true, whatsapp: true }
    });

    if (approveRes.status === 200 && approveRes.body.order.status === 'finalized') {
      console.log('✔ Order approved and status updated to "finalized" successfully!');
      console.log(`Dispatch Logs:`, approveRes.body.order.billSentLogs);
    } else {
      console.log('❌ Order approval failed:', approveRes.body);
    }

  } catch (error) {
    console.error('Integration test failed with error:', error);
  }
}

runTests();
