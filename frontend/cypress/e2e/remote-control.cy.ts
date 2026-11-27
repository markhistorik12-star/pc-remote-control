/// <reference types="cypress" />

describe('PC Remote Control E2E', () => {
  const testIp = '192.168.1.100';
  const testToken = 'VALID123';

  beforeEach(() => {
    cy.visit('/');
  });

  it('should show settings modal when settings button clicked', () => {
    cy.get('button[aria-label="Settings"]').click();
    cy.get('h2').should('contain', 'Configuración');
  });

  it('should save settings and show power buttons', () => {
    cy.get('button[aria-label="Settings"]').click();
    
    cy.get('input[placeholder="192.168.1.100"]').clear().type(testIp);
    cy.get('input[placeholder="ABC123"]').clear().type(testToken);
    
    cy.get('button').contains('Guardar').click();
    
    cy.get('button').contains('Apagar').should('not.be.disabled');
    cy.get('button').contains('Reiniciar').should('not.be.disabled');
    cy.get('button').contains('Bloquear').should('not.be.disabled');
  });

  it('should disable power buttons when settings not configured', () => {
    // Clear localStorage to simulate fresh install
    cy.clearLocalStorage();
    cy.reload();
    
    cy.get('button:contains("Apagar")', { timeout: 10000 }).should('be.disabled');
    cy.get('button:contains("Reiniciar")').should('be.disabled');
    cy.get('button:contains("Bloquear")').should('be.disabled');
  });

  it('should show common apps list', () => {
    cy.get('button[aria-label="Settings"]').click();
    cy.get('input[placeholder="192.168.1.100"]').clear().type(testIp);
    cy.get('input[placeholder="ABC123"]').clear().type(testToken);
    cy.get('button').contains('Guardar').click();
    
    cy.contains('Aplicaciones').should('be.visible');
    cy.contains('Bloc de notas').should('be.visible');
    cy.contains('Calculadora').should('be.visible');
    cy.contains('Símbolo del sistema').should('be.visible');
  });

  it.skip('should allow entering custom app name', () => {
    cy.get('button[aria-label="Settings"]').click();
    cy.get('input[placeholder="192.168.1.100"]').clear().type(testIp);
    cy.get('input[placeholder="ABC123"]').clear().type(testToken);
    cy.get('button').contains('Guardar').click();
    
    // Wait for modal to close and settings to be saved
    cy.get('button[aria-label="Settings"]').should('be.visible');
    cy.wait(2000); // Allow time for localStorage and state update
    cy.get('button:contains("Apagar")', { timeout: 15000 }).should('not.be.disabled');
    
    cy.get('button').contains('Añadir aplicación').click();
    
    cy.get('input[placeholder="Ej: notepad.exe, chrome, code..."]')
      .should('be.visible')
      .type('customapp.exe');
    
    cy.get('button').contains('Abrir').click();
    cy.on('window:alert', (text) => {
      expect(text).to.include('customapp.exe');
    });
  });
});

// Integration test with backend (requires backend running)
describe('Backend Integration', () => {
  const testIp = 'localhost';
  let testToken = '';

  before(() => {
    // Read the actual token from backend's appsettings.json
    cy.task('readBackendToken').then((token) => {
      if (token) {
        testToken = token;
        cy.log(`Using backend token: ${testToken}`);
      }
    });
    
    // Verify backend is running
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

  it('should successfully call lock endpoint with valid token', () => {
    expect(testToken).to.not.be.empty;
    cy.request({
      method: 'POST',
      url: 'http://localhost:5000/api/lock',
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