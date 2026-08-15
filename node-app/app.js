const express = require('express');
const app = express();
const PORT = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'Node.js application deployed via Jenkins pipeline!',
    timestamp: new Date()
  });
});

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
  });
}

module.exports = app;