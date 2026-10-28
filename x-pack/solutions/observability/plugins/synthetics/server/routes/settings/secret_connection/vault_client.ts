/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { Agent, fetch as undiciFetch } from 'undici';
import type {
  HashiCorpVaultConfig,
  HashiCorpVaultSecrets,
  SecretConnectionTestResult,
} from '../../../../common/runtime_types';
import { guardedLookup } from './address_guard';

// Bounds for a response from a caller-controlled endpoint: a Vault reply is a small JSON
// document, and the socket timeouts alone don't stop a server that keeps streaming.
export const MAX_RESPONSE_BYTES = 1024 * 1024;
export const REQUEST_DEADLINE_MS = 15000;
const SOCKET_TIMEOUT_MS = 8000;

const HEALTH_PATH = '/v1/sys/health';
// Report a standby, sealed or uninitialized Vault as reachable instead of via a status code.
const HEALTH_QUERY = new URLSearchParams({
  standbyok: 'true',
  perfstandbyok: 'true',
  sealedok: 'true',
  uninitcode: '200',
}).toString();
const TOKEN_LOOKUP_PATH = '/v1/auth/token/lookup-self';
const APPROLE_LOGIN_PATH = '/v1/auth/approle/login';

// The version comes from a caller-chosen address, so only a plain version string is shown.
const VERSION_PATTERN = /^[0-9A-Za-z.+_-]{1,64}$/;

const NOT_VAULT_MESSAGE = 'The address did not respond like a Vault server.';
const UNREACHABLE_MESSAGE = 'Could not reach the Vault address.';
const AUTH_ERROR_MESSAGE = 'Could not authenticate with Vault.';

type VaultTestInput = Pick<
  HashiCorpVaultConfig,
  'address' | 'authMethod' | 'namespace' | 'tlsSkipVerify' | 'roleId'
> &
  HashiCorpVaultSecrets;

interface VaultResponse {
  status: number;
  ok: boolean;
  // Undefined unless the body was a JSON object, so a proxy's HTML page can't pass for Vault.
  body?: Record<string, unknown>;
}

const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

type UndiciResponseBody = Awaited<ReturnType<typeof undiciFetch>>['body'];

const readCappedText = async (body: UndiciResponseBody): Promise<string> => {
  if (!body) return '';
  const reader = body.getReader();
  const decoder = new TextDecoder();
  let text = '';
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    const chunk: Uint8Array = value;
    received += chunk.byteLength;
    if (received > MAX_RESPONSE_BYTES) {
      await reader.cancel();
      throw new Error('response too large');
    }
    text += decoder.decode(chunk, { stream: true });
  }
  return text + decoder.decode();
};

const parseJsonObject = (text: string): Record<string, unknown> | undefined => {
  try {
    const parsed: unknown = JSON.parse(text);
    return isRecord(parsed) ? parsed : undefined;
  } catch (e) {
    return undefined;
  }
};

/**
 * Resolves on any HTTP status (a sealed or standby Vault is still reachable); only
 * transport failures reject. Redirects are not followed, so a reply can't steer the
 * request to a host the allow-list and address guard never saw.
 */
const callVault = async (
  agent: Agent,
  url: string,
  init: { method?: string; headers?: Record<string, string>; body?: string }
): Promise<VaultResponse> => {
  const controller = new AbortController();
  const deadline = setTimeout(() => controller.abort(), REQUEST_DEADLINE_MS);
  try {
    const response = await undiciFetch(url, {
      method: init.method ?? 'GET',
      headers: {
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
        ...init.headers,
      },
      body: init.body,
      dispatcher: agent,
      redirect: 'manual',
      signal: controller.signal,
    });
    const text = await readCappedText(response.body);
    return { status: response.status, ok: response.ok, body: parseJsonObject(text) };
  } finally {
    clearTimeout(deadline);
  }
};

/**
 * Verifies Kibana can reach the Vault address and authenticate with the given
 * credentials. This checks reachability *from Kibana*; the agent (Heartbeat)
 * resolves from its own network at runtime, which may differ. Secrets are never
 * returned or logged — only a pass/fail plus the Vault version. Failure details
 * are logged, not returned, since the address is caller-controlled.
 */
export const testHashiCorpVault = async (
  input: VaultTestInput,
  logger: Logger
): Promise<SecretConnectionTestResult> => {
  const { address, authMethod, namespace, tlsSkipVerify, roleId, token, secretId } = input;
  if (!address) return { ok: false, message: 'Vault address is required' };

  const base = address.replace(/\/+$/, '');
  const namespaceHeader: Record<string, string> = namespace
    ? { 'X-Vault-Namespace': namespace }
    : {};
  const agent = new Agent({
    connect: { lookup: guardedLookup, rejectUnauthorized: !tlsSkipVerify },
    headersTimeout: SOCKET_TIMEOUT_MS,
    bodyTimeout: SOCKET_TIMEOUT_MS,
  });
  const call = (path: string, init: Parameters<typeof callVault>[2] = {}) =>
    callVault(agent, `${base}${path}`, {
      ...init,
      headers: { ...namespaceHeader, ...init.headers },
    });

  try {
    // 1) Reachability + version (unauthenticated health endpoint).
    let versionNote = '';
    try {
      const health = await call(`${HEALTH_PATH}?${HEALTH_QUERY}`);
      if (!health.body) return { ok: false, message: NOT_VAULT_MESSAGE };
      const { version } = health.body;
      if (typeof version === 'string' && VERSION_PATTERN.test(version)) {
        versionNote = ` (Vault ${version})`;
      }
    } catch (e) {
      logger.warn(`Vault connection test could not reach ${base}: ${e}`);
      return { ok: false, message: UNREACHABLE_MESSAGE };
    }

    // 2) Authenticate with the configured method.
    try {
      if (authMethod === 'token') {
        if (!token) return { ok: false, message: 'Token auth requires a token' };
        const res = await call(TOKEN_LOOKUP_PATH, { headers: { 'X-Vault-Token': token } });
        return res.ok && isRecord(res.body?.data)
          ? { ok: true, message: `Token authenticated${versionNote}.` }
          : { ok: false, message: `Token rejected (HTTP ${res.status})${versionNote}.` };
      }

      if (!roleId || !secretId) {
        return { ok: false, message: 'AppRole auth requires role_id and secret_id' };
      }
      const res = await call(APPROLE_LOGIN_PATH, {
        method: 'POST',
        body: JSON.stringify({ role_id: roleId, secret_id: secretId }),
      });
      const auth = res.body?.auth;
      if (res.ok && isRecord(auth) && typeof auth.client_token === 'string') {
        return { ok: true, message: `AppRole authenticated${versionNote}.` };
      }
      logger.debug(`Vault AppRole login failed with HTTP ${res.status} at ${base}`);
      return { ok: false, message: `AppRole login failed (HTTP ${res.status})${versionNote}.` };
    } catch (e) {
      logger.warn(`Vault connection test authentication error at ${base}: ${e}`);
      return { ok: false, message: AUTH_ERROR_MESSAGE };
    }
  } finally {
    await agent.close();
  }
};
