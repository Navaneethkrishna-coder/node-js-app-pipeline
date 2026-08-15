const request = require('supertest');
const app = require('./app');

describe('GET /', () => {
  it('should return a 200 OK status and JSON response', async () => {
    const response = await request(app).get('/');
    expect(response.statusCode).toBe(200);
    expect(response.body.status).toBe('success');
  });

  it('should pass health check endpoint', async () => {
    const response = await request(app).get('/health');
    expect(response.statusCode).toBe(200);
    expect(response.text).toBe('OK');
  });
});