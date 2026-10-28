import { describe, it, expect, beforeEach, afterEach, afterAll } from 'vitest';
import { setupServer } from 'msw/node';
import { http, HttpResponse } from 'msw';
import { shutdown, restart, lock, openApp, closeApp } from '../api';

const testIp = '192.168.1.100';
const testToken = 'ABC123';

const server = setupServer(
  http.post('http://192.168.1.100:5000/api/shutdown', ({ request }) => {
    const auth = request.headers.get('Authorization');
    if (auth !== `Bearer ${testToken}`) {
      return HttpResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    return HttpResponse.json({ success: true, message: 'Shutdown initiated' });
  }),
  http.post('http://192.168.1.100:5000/api/restart', ({ request }) => {
    const auth = request.headers.get('Authorization');
    if (auth !== `Bearer ${testToken}`) {
      return HttpResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    return HttpResponse.json({ success: true, message: 'Restart initiated' });
  }),
  http.post('http://192.168.1.100:5000/api/lock', ({ request }) => {
    const auth = request.headers.get('Authorization');
    if (auth !== `Bearer ${testToken}`) {
      return HttpResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    return HttpResponse.json({ success: true, message: 'Workstation locked' });
  }),
  http.post('http://192.168.1.100:5000/api/apps/open', async ({ request }) => {
    const auth = request.headers.get('Authorization');
    if (auth !== `Bearer ${testToken}`) {
      return HttpResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json() as { appName?: string };
    if (!body.appName) {
      return HttpResponse.json({ success: false, message: 'appName is required' }, { status: 400 });
    }
    if (body.appName === 'notepad') {
      return HttpResponse.json({ success: true, message: "Application 'notepad' started" });
    }
    return HttpResponse.json({ success: false, message: `Application '${body.appName}' not found` }, { status: 404 });
  }),
  http.post('http://192.168.1.100:5000/api/apps/close', async ({ request }) => {
    const auth = request.headers.get('Authorization');
    if (auth !== `Bearer ${testToken}`) {
      return HttpResponse.json({ success: false, message: 'Unauthorized' }, { status: 401 });
    }
    const body = await request.json() as { appName?: string };
    if (!body.appName) {
      return HttpResponse.json({ success: false, message: 'appName is required' }, { status: 400 });
    }
    if (body.appName === 'notepad') {
      return HttpResponse.json({ success: true, message: "Application 'notepad' closed" });
    }
    return HttpResponse.json({ success: false, message: `Application '${body.appName}' not found` }, { status: 404 });
  })
);
 
beforeAll(() => server.listen());
afterEach(() => server.resetHandlers());
afterAll(() => server.close());
 
describe('api.ts - fetch wrapper with auth', () => {
  describe('shutdown', () => {
    it('posts to /api/shutdown with Bearer token', async () => {
      const result = await shutdown(testIp, testToken);
      expect(result).toEqual({ success: true, message: 'Shutdown initiated' });
    });

    it('returns error on 401', async () => {
      const result = await shutdown(testIp, 'WRONG_TOKEN');
      expect(result.success).toBe(false);
      expect(result.message).toBe('Unauthorized');
    });
  });

  describe('restart', () => {
    it('posts to /api/restart with Bearer token', async () => {
      const result = await restart(testIp, testToken);
      expect(result).toEqual({ success: true, message: 'Restart initiated' });
    });

    it('returns error on 401', async () => {
      const result = await restart(testIp, 'WRONG_TOKEN');
      expect(result.success).toBe(false);
    });
  });

  describe('lock', () => {
    it('posts to /api/lock with Bearer token', async () => {
      const result = await lock(testIp, testToken);
      expect(result).toEqual({ success: true, message: 'Workstation locked' });
    });

    it('returns error on 401', async () => {
      const result = await lock(testIp, 'WRONG_TOKEN');
      expect(result.success).toBe(false);
    });
  });

  describe('openApp', () => {
    it('posts to /api/apps/open with appName and Bearer token', async () => {
      const result = await openApp(testIp, testToken, 'notepad');
      expect(result).toEqual({ success: true, message: "Application 'notepad' started" });
    });

    it('returns 404 for unknown app', async () => {
      const result = await openApp(testIp, testToken, 'unknownapp');
      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });

    it('returns error on 401', async () => {
      const result = await openApp(testIp, 'WRONG_TOKEN', 'notepad');
      expect(result.success).toBe(false);
    });
  });

  describe('closeApp', () => {
    it('posts to /api/apps/close with appName and Bearer token', async () => {
      const result = await closeApp(testIp, testToken, 'notepad');
      expect(result).toEqual({ success: true, message: "Application 'notepad' closed" });
    });

    it('returns 404 for unknown app', async () => {
      const result = await closeApp(testIp, testToken, 'unknownapp');
      expect(result.success).toBe(false);
      expect(result.message).toContain('not found');
    });

    it('returns error on 401', async () => {
      const result = await closeApp(testIp, 'WRONG_TOKEN', 'notepad');
      expect(result.success).toBe(false);
    });
  });
});

