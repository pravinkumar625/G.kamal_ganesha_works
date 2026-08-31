const express = require('express');
const cors = require('cors');
const path = require('path');
const db = require('./db');

const authRoutes = require('./routes/auth').router;
const customerRoutes = require('./routes/customer');
const adminRoutes = require('./routes/admin');

const app = express();
const PORT = process.env.PORT || 5000;

// Enable CORS
app.use(cors({
  origin: '*', // Allow all origins for development and API testing
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Setup JSON parsing middleware with increased limit for base64 PDFs
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

// Serve API routes
app.use('/api/auth', authRoutes);
app.use('/api/customer', customerRoutes);
app.use('/api/admin', adminRoutes);

// Public bill download link (triggered via WhatsApp redirection)
app.get('/api/public/bills/:id/download', (req, res) => {
  try {
    const orderId = req.params.id;
    const order = db.findOne('orders', o => o.id === orderId);

    if (!order || order.status !== 'finalized' || !order.originalPdfBase64) {
      return res.status(404).send('<h1>Bill Not Found</h1><p>The requested bill was not found or is not approved yet.</p>');
    }

    const rawPdf = order.originalPdfBase64.split(';base64,').pop();
    const pdfBuffer = Buffer.from(rawPdf, 'base64');

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=Ganesha_Bill_${orderId}.pdf`);
    res.send(pdfBuffer);
  } catch (error) {
    console.error('Error downloading public bill:', error);
    res.status(500).send('Internal Server Error');
  }
});

// Serve frontend static assets (if built)
const fs = require('fs');
const rootDistPath = path.join(__dirname, '..', 'dist');
const clientBuildPath = fs.existsSync(rootDistPath) ? rootDistPath : path.join(__dirname, '..', 'client', 'dist');
app.use(express.static(clientBuildPath));

// SPA fallback for routing - send all non-API requests to React index.html
app.get('*', (req, res) => {
  const indexPath = path.join(clientBuildPath, 'index.html');
  if (require('fs').existsSync(indexPath)) {
    res.sendFile(indexPath);
  } else {
    res.status(200).send(`
      <div style="font-family: sans-serif; text-align: center; margin-top: 100px; padding: 20px;">
        <h1 style="color: #800000;">G.Kamal Ganesha Works API</h1>
        <p style="color: #666;">The backend server is running successfully on port ${PORT}.</p>
        <p style="color: #E76F51; font-weight: bold;">Frontend React client has not been built yet.</p>
        <p style="font-size: 14px;">Run <code>npm run build</code> inside the client directory to bundle the React files.</p>
      </div>
    `);
  }
});

if (!process.env.VERCEL) {
  app.listen(PORT, '0.0.0.0', () => {
    const os = require('os');
    const nets = os.networkInterfaces();
    const ips = [];
    for (const name of Object.keys(nets)) {
      for (const net of nets[name]) {
        if (net.family === 'IPv4' && !net.internal) {
          ips.push(net.address);
        }
      }
    }

    console.log(`==================================================`);
    console.log(`  G.Kamal Ganesha Works Server is active!`);
    console.log(`  Access URLs:`);
    console.log(`  - Local PC:     http://localhost:${PORT}`);
    ips.forEach(ip => {
      console.log(`  - Mobile Phone: http://${ip}:${PORT}`);
      console.log(`  - Mobile Dev:   http://${ip}:8080`);
    });
    console.log(`==================================================`);
  });
}

module.exports = app;
