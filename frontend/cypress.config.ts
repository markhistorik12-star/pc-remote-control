import { defineConfig } from 'cypress';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  e2e: {
    baseUrl: 'http://localhost:5173',
    specPattern: 'cypress/e2e/**/*.cy.{js,jsx,ts,tsx}',
    video: false,
    screenshotOnRunFailure: true,
    defaultCommandTimeout: 10000,
    setupNodeEvents(on, config) {
      on('task', {
        readBackendToken() {
          // Try multiple possible locations for the published appsettings.json
          const possiblePaths = [
            path.resolve(__dirname, '../../backend/PCControl.Api/publish/appsettings.json'),
            path.resolve(__dirname, '../../../backend/PCControl.Api/publish/appsettings.json'),
            path.resolve(process.cwd(), '../backend/PCControl.Api/publish/appsettings.json'),
          ];
          
          for (const tokenPath of possiblePaths) {
            try {
              if (fs.existsSync(tokenPath)) {
                const content = fs.readFileSync(tokenPath, 'utf-8');
                const config = JSON.parse(content);
                if (config.Token) {
                  return config.Token;
                }
              }
            } catch (e) {
              // Ignore errors, try next path
            }
          }
          return '';
        },
      });
    },
  },
  component: {
    devServer: {
      framework: 'react',
      bundler: 'vite',
    },
  },
});