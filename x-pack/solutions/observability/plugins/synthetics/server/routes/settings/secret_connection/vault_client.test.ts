/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Agent, fetch as undiciFetch } from 'undici';
import { loggerMock } from '@kbn/logging-mocks';
import { guardedLookup } from './address_guard';
import { MAX_RESPONSE_BYTES, REQUEST_DEADLINE_MS, testHashiCorpVault } from './vault_client';

jest.mock('undici', () => ({
  Agent: jest.fn().mockImplementation(() => ({ close: jest.fn().mockResolvedValue(undefined) })),
  fetch: jest.fn(),
}));

const fetchMock = undiciFetch as unknown as jest.Mock;
const AgentMock = Agent as unknown as jest.Mock;

const encoder = new TextEncoder();

/** A fetch Response stand-in whose body streams the given chunks. */
const vaultResponse = (status: number, body: string | string[] = '') => {
  const chunks = (Array.isArray(body) ? body : [body])
    .filter(Boolean)
    .map((c) => encoder.encode(c));
  return {
    status,
    ok: status >= 200 && status < 300,
    body: {
      getReader: () => ({
        read: jest.fn(async () => {
          const value = chunks.shift();
          return value ? { done: false, value } : { done: true, value: undefined };
        }),
        cancel: jest.fn().mockResolvedValue(undefined),
      }),
    },
  };
};

const jsonResponse = (status: number, body: unknown) => vaultResponse(status, JSON.stringify(body));

const address = 'https://vault.example.com';
const health = () => jsonResponse(200, { version: '1.15.0' });

describe('testHashiCorpVault', () => {
  const logger = loggerMock.create();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('token auth', () => {
    it('authenticates a valid token and reports the Vault version', async () => {
      fetchMock
        .mockResolvedValueOnce(health())
        .mockResolvedValueOnce(jsonResponse(200, { data: { id: 'tok' } }));

      const result = await testHashiCorpVault(
        { address, authMethod: 'token', token: 'tok' },
        logger
      );

      expect(result).toEqual({ ok: true, message: 'Token authenticated (Vault 1.15.0).' });
      const [healthUrl] = fetchMock.mock.calls[0];
      expect(healthUrl).toBe(
        `${address}/v1/sys/health?standbyok=true&perfstandbyok=true&sealedok=true&uninitcode=200`
      );
      const [lookupUrl, lookupInit] = fetchMock.mock.calls[1];
      expect(lookupUrl).toBe(`${address}/v1/auth/token/lookup-self`);
      expect(lookupInit.headers).toEqual({ 'X-Vault-Token': 'tok' });
    });

    it('sends the namespace header and trims a trailing slash from the address', async () => {
      fetchMock
        .mockResolvedValueOnce(health())
        .mockResolvedValueOnce(jsonResponse(200, { data: {} }));

      await testHashiCorpVault(
        { address: `${address}/`, authMethod: 'token', token: 'tok', namespace: 'team-a' },
        logger
      );

      expect(fetchMock.mock.calls[0][0]).toContain(`${address}/v1/sys/health`);
      expect(fetchMock.mock.calls[1][1].headers).toEqual({
        'X-Vault-Namespace': 'team-a',
        'X-Vault-Token': 'tok',
      });
    });

    it('rejects a token Vault refuses', async () => {
      fetchMock
        .mockResolvedValueOnce(health())
        .mockResolvedValueOnce(jsonResponse(403, { errors: ['permission denied'] }));

      const result = await testHashiCorpVault(
        { address, authMethod: 'token', token: 'bad' },
        logger
      );

      expect(result).toEqual({ ok: false, message: 'Token rejected (HTTP 403) (Vault 1.15.0).' });
    });

    it.each([
      ['an oversized', 'v'.repeat(65)],
      ['a non-version', '1.15.0 <script>alert(1)</script>'],
    ])('leaves out %s version string', async (_label, version) => {
      fetchMock
        .mockResolvedValueOnce(jsonResponse(200, { version }))
        .mockResolvedValueOnce(jsonResponse(200, { data: {} }));

      const result = await testHashiCorpVault({ address, authMethod: 'token', token: 'tok' }, logger);

      expect(result).toEqual({ ok: true, message: 'Token authenticated.' });
    });

    it('does not accept a 200 lookup without data', async () => {
      fetchMock.mockResolvedValueOnce(health()).mockResolvedValueOnce(jsonResponse(200, {}));

      const result = await testHashiCorpVault(
        { address, authMethod: 'token', token: 'tok' },
        logger
      );

      expect(result.ok).toBe(false);
    });

    it('requires a token', async () => {
      fetchMock.mockResolvedValueOnce(health());

      const result = await testHashiCorpVault({ address, authMethod: 'token' }, logger);

      expect(result).toEqual({ ok: false, message: 'Token auth requires a token' });
    });
  });

  describe('approle auth', () => {
    it('posts the role and secret id and accepts a client token', async () => {
      fetchMock
        .mockResolvedValueOnce(health())
        .mockResolvedValueOnce(jsonResponse(200, { auth: { client_token: 's.abc' } }));

      const result = await testHashiCorpVault(
        { address, authMethod: 'approle', roleId: 'role', secretId: 'secret' },
        logger
      );

      expect(result).toEqual({ ok: true, message: 'AppRole authenticated (Vault 1.15.0).' });
      const [url, init] = fetchMock.mock.calls[1];
      expect(url).toBe(`${address}/v1/auth/approle/login`);
      expect(init.method).toBe('POST');
      expect(init.headers).toEqual({ 'Content-Type': 'application/json' });
      expect(JSON.parse(init.body)).toEqual({ role_id: 'role', secret_id: 'secret' });
    });

    it('fails a login without a client token and does not echo Vault errors', async () => {
      fetchMock
        .mockResolvedValueOnce(health())
        .mockResolvedValueOnce(jsonResponse(400, { errors: ['invalid secret id'] }));

      const result = await testHashiCorpVault(
        { address, authMethod: 'approle', roleId: 'role', secretId: 'wrong' },
        logger
      );

      expect(result).toEqual({
        ok: false,
        message: 'AppRole login failed (HTTP 400) (Vault 1.15.0).',
      });
    });

    it('does not accept a 200 login without a client token', async () => {
      fetchMock.mockResolvedValueOnce(health()).mockResolvedValueOnce(jsonResponse(200, {}));

      const result = await testHashiCorpVault(
        { address, authMethod: 'approle', roleId: 'role', secretId: 'secret' },
        logger
      );

      expect(result.ok).toBe(false);
    });

    it('requires role_id and secret_id', async () => {
      fetchMock.mockResolvedValueOnce(health());

      const result = await testHashiCorpVault(
        { address, authMethod: 'approle', roleId: 'role' },
        logger
      );

      expect(result).toEqual({ ok: false, message: 'AppRole auth requires role_id and secret_id' });
    });
  });

  describe('response validation', () => {
    it('does not report success when a non-Vault server answers 200 with HTML', async () => {
      fetchMock.mockResolvedValue(vaultResponse(200, '<html>login</html>'));

      const result = await testHashiCorpVault(
        { address, authMethod: 'token', token: 'tok' },
        logger
      );

      expect(result).toEqual({
        ok: false,
        message: 'The address did not respond like a Vault server.',
      });
      expect(fetchMock).toHaveBeenCalledTimes(1);
    });

    it('rejects a response larger than the cap', async () => {
      const chunk = 'a'.repeat(MAX_RESPONSE_BYTES / 2 + 1);
      fetchMock.mockResolvedValueOnce(vaultResponse(200, [chunk, chunk]));

      const result = await testHashiCorpVault(
        { address, authMethod: 'token', token: 'tok' },
        logger
      );

      expect(result).toEqual({ ok: false, message: 'Could not reach the Vault address.' });
    });
  });

  describe('outbound request hardening', () => {
    it('guards DNS resolution and honours the TLS setting on the dispatcher', async () => {
      fetchMock.mockResolvedValue(health());

      await testHashiCorpVault({ address, authMethod: 'token', token: 'tok' }, logger);
      await testHashiCorpVault(
        { address, authMethod: 'token', token: 'tok', tlsSkipVerify: true },
        logger
      );

      expect(AgentMock.mock.calls[0][0].connect).toEqual({
        lookup: guardedLookup,
        rejectUnauthorized: true,
      });
      expect(AgentMock.mock.calls[1][0].connect).toEqual({
        lookup: guardedLookup,
        rejectUnauthorized: false,
      });
    });

    it('never follows redirects', async () => {
      fetchMock.mockResolvedValue(health());

      await testHashiCorpVault({ address, authMethod: 'token', token: 'tok' }, logger);

      fetchMock.mock.calls.forEach(([, init]) => expect(init.redirect).toBe('manual'));
    });

    it('closes the dispatcher after the test, success or not', async () => {
      fetchMock.mockRejectedValueOnce(new Error('boom'));

      await testHashiCorpVault({ address, authMethod: 'token', token: 'tok' }, logger);

      const agent = AgentMock.mock.results[0].value;
      expect(agent.close).toHaveBeenCalledTimes(1);
    });

    it('aborts the request once the deadline passes', async () => {
      jest.useFakeTimers();
      try {
        fetchMock.mockImplementation(
          (_url: string, init: { signal: AbortSignal }) =>
            new Promise((_resolve, reject) => {
              init.signal.addEventListener('abort', () => reject(new Error('aborted')));
            })
        );

        const pending = testHashiCorpVault({ address, authMethod: 'token', token: 'tok' }, logger);
        await jest.advanceTimersByTimeAsync(REQUEST_DEADLINE_MS);

        await expect(pending).resolves.toEqual({
          ok: false,
          message: 'Could not reach the Vault address.',
        });
      } finally {
        jest.useRealTimers();
      }
    });
  });

  describe('failures', () => {
    it('returns a generic message and logs the cause when the address is unreachable', async () => {
      fetchMock.mockRejectedValueOnce(new TypeError('fetch failed'));

      const result = await testHashiCorpVault(
        { address, authMethod: 'token', token: 'tok' },
        logger
      );

      expect(result).toEqual({ ok: false, message: 'Could not reach the Vault address.' });
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('fetch failed'));
    });

    it('returns a generic message when the authentication request fails', async () => {
      fetchMock
        .mockResolvedValueOnce(health())
        .mockRejectedValueOnce(new Error('ECONNRESET 10.0.0.5'));

      const result = await testHashiCorpVault(
        { address, authMethod: 'token', token: 'tok' },
        logger
      );

      expect(result).toEqual({ ok: false, message: 'Could not authenticate with Vault.' });
      expect(result.message).not.toContain('10.0.0.5');
      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('ECONNRESET'));
    });

    it('requires an address', async () => {
      const result = await testHashiCorpVault({ address: '', authMethod: 'token' }, logger);

      expect(result).toEqual({ ok: false, message: 'Vault address is required' });
      expect(fetchMock).not.toHaveBeenCalled();
    });
  });
});
