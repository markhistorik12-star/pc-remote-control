/// <reference types="cypress" />

describe('PC Remote Control E2E', () => {
  const testIp = '192.168.1.100';
  const testToken = 'VALID123';

  beforeEach(() => {
    cy.visit('/');
  });

  it('should show settings modal when settings button clicked', () => {
    cy.get('button[aria-label="Settings"]').click();
    cy.get('h2').should('contain', 'Settings');
  });

  it('should save settings and show power buttons', () => {
    cy.get('button[aria-label="Settings"]').click();
    
    cy.get('input[placeholder="192.168.1.100"]').clear().type(testIp);
    cy.get('input[placeholder="6-character token"]').clear().type(testToken);
    
    cy.get('button').contains('Save').click();
    
    cy.get('button').contains('Shutdown').should('not.be.disabled');
    cy.get('button').contains('Restart').should('not.be.disabled');
    cy.get('button').contains('Lock').should('not.be.disabled');
  });

  it('should disable power buttons when settings not configured', () => {
    // Clear localStorage to simulate fresh install
    cy.clearLocalStorage();
    cy.reload();
    
    cy.get('button').contains('Shutdown').should('be.disabled');
    cy.get('button').contains('Restart').should('be.disabled');
    cy.get('button').contains('Lock').should('be.disabled');
  });

  it('should show common apps list', () => {
    cy.get('button[aria-label="Settings"]').click();
    cy.get('input[placeholder="192.168.1.100"]').clear().type(testIp);
    cy.get('input[placeholder="6-character token"]').clear().type(testToken);
    cy.get('button').contains('Save').click();
    
    cy.contains('Applications').should('be.visible');
    cy.contains('notepad').should('be.visible');
    cy.contains('calc').should('be.visible');
    cy.contains('cmd').should('be.visible');
  });

  it('should allow entering custom app name', () => {
    cy.get('button[aria-label="Settings"]').click();
    cy.get('input[placeholder="192.168.1.100"]').clear().type(testIp);
    cy.get('input[placeholder="6-character token"]').clear().type(testToken);
    cy.get('button').contains('Save').click();
    
    cy.get('input[placeholder="Enter app name (e.g., notepad.exe)"]')
      .should('be.visible')
      .type('customapp.exe');
    
    cy.get('button').contains('Open').click();
    cy.on('window:alert', (text) => {
      expect(text).to.include('customapp.exe');
    });
  });
});

// Integration test with backend (requires backend running)
describe('Backend Integration', () => {
  const testIp = 'localhost';
  const testToken = 'VALID123';

  before(() => {
    // This test requires the backend to be running on localhost:5000
    // with token VALID123
    cy.request({
      method: 'GET',
      url: 'http://localhost:5000/health',
      failOnStatusCode: false,
    }).then((response) => {
      if (response.status !== 200) {
        cy.log('Backend not running, skipping integration tests');
        this.skip();
      }
    });
  });

  it('should successfully call shutdown endpoint with valid token', () => {
    cy.request({
      method: 'POST',
      url: 'http://localhost:5000/api/shutdown',
      headers: {
        'Authorization': `Bearer ${testToken}`,
        'Content-Type': 'application/json',
      },
      body: {},
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.eq(200);
      expect(response.body.success).to.be.true;
    });
  });

  it('should reject request with invalid token', () => {
    cy.request({
      method: 'POST',
      url: 'http://localhost:5000/api/shutdown',
      headers: {
        'Authorization': 'Bearer INVALID',
        'Content-Type': 'application/json',
      },
      body: {},
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.eq(401);
      expect(response.body.success).to.be.false;
    });
  });

  it('should reject request without token', () => {
    cy.request({
      method: 'POST',
      url: 'http://localhost:5000/api/shutdown',
      headers: {
        'Content-Type': 'application/json',
      },
      body: {},
      failOnStatusCode: false,
    }).then((response) => {
      expect(response.status).to.eq(401);
      expect(response.body.success).to.be.false;
    });
  });
});