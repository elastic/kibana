/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { request as httpsRequest } from 'https';
import { request as httpRequest } from 'http';
import { guardedLookup } from './address_guard';

export interface TestResult {
  ok: boolean;
  message: string;
}

// Bounds for a response from a caller-controlled endpoint: a Vault reply is a small JSON
// document, and the socket timeout alone doesn't stop a server that keeps streaming.
const MAX_RESPONSE_BYTES = 1024 * 1024;
const REQUEST_DEADLINE_MS = 15000;

const errText = (e: unknown): string => (e instanceof Error ? e.message : String(e));

interface VaultHttpResponse {
  status: number;
  body: Record<string, unknown>;
}

/**
 * Minimal Vault HTTP call using Node's http(s) client — there is no official Node
 * Vault client, and new Kibana code must use fetch/node http rather than axios.
 * Resolves on any HTTP status (a sealed/standby Vault is still "reachable"); only
 * transport failures reject.
 */
const vaultHttp = (
  urlStr: string,
  opts: {
    method?: string;
    headers?: Record<string, string>;
    body?: string;
    tlsSkipVerify?: boolean;
  }
): Promise<VaultHttpResponse> =>
  new Promise((resolve, reject) => {
    let url: URL;
    try {
      url = new URL(urlStr);
    } catch (e) {
      reject(new Error('invalid Vault address'));
      return;
    }
    const isHttps = url.protocol === 'https:';
    const doRequest = isHttps ? httpsRequest : httpRequest;
    const req = doRequest(
      url,
      {
        method: opts.method ?? 'GET',
        headers: {
          ...(opts.body ? { 'Content-Type': 'application/json' } : {}),
          ...opts.headers,
        },
        timeout: 8000,
        lookup: guardedLookup,
        ...(isHttps && opts.tlsSkipVerify ? { rejectUnauthorized: false } : {}),
      },
      (res) => {
        let data = '';
        res.on('data', (chunk) => {
          data += chunk;
          if (data.length > MAX_RESPONSE_BYTES) {
            req.destroy(new Error('response too large'));
          }
        });
        res.on('end', () => {
          clearTimeout(deadline);
          let body: Record<string, unknown> = {};
          try {
            body = data ? JSON.parse(data) : {};
          } catch (e) {
            body = {};
          }
          resolve({ status: res.statusCode ?? 0, body });
        });
      }
    );
    const deadline = setTimeout(
      () => req.destroy(new Error('request deadline exceeded')),
      REQUEST_DEADLINE_MS
    );
    req.on('error', (e) => {
      clearTimeout(deadline);
      reject(e);
    });
    req.on('timeout', () => req.destroy(new Error('request timed out')));
    if (opts.body) req.write(opts.body);
    req.end();
  });

/**
 * Verifies Kibana can reach the Vault address and authenticate with the given
 * credentials. This checks reachability *from Kibana*; the agent (Heartbeat)
 * resolves from its own network at runtime, which may differ. Secrets are never
 * returned or logged — only a pass/fail plus the Vault version.
 */
export const testHashiCorpVault = async (c: {
  address: string;
  authMethod: 'token' | 'approle';
  namespace?: string;
  tlsSkipVerify?: boolean;
  roleId?: string;
  token?: string;
  secretId?: string;
}): Promise<TestResult> => {
  if (!c.address) return { ok: false, message: 'Vault address is required' };

  const base = c.address.replace(/\/+$/, '');
  const nsHeader: Record<string, string> = c.namespace ? { 'X-Vault-Namespace': c.namespace } : {};
  const call = (path: string, opts: Parameters<typeof vaultHttp>[1] = {}) =>
    vaultHttp(`${base}${path}`, {
      ...opts,
      tlsSkipVerify: c.tlsSkipVerify,
      headers: { ...nsHeader, ...opts.headers },
    });

  // 1) Reachability + version (unauthenticated health endpoint).
  let versionNote = '';
  try {
    const health = await call(
      '/v1/sys/health?standbyok=true&perfstandbyok=true&sealedok=true&uninitcode=200'
    );
    const version = health.body?.version;
    if (typeof version === 'string') versionNote = ` (Vault ${version})`;
  } catch (e) {
    return { ok: false, message: `Could not reach ${base}: ${errText(e)}` };
  }

  // 2) Authenticate with the configured method.
  try {
    if (c.authMethod === 'token') {
      if (!c.token) return { ok: false, message: 'Token auth requires a token' };
      const res = await call('/v1/auth/token/lookup-self', {
        headers: { 'X-Vault-Token': c.token },
      });
      return res.status >= 200 && res.status < 300
        ? { ok: true, message: `Token authenticated${versionNote}.` }
        : { ok: false, message: `Token rejected (HTTP ${res.status})${versionNote}.` };
    }

    if (!c.roleId || !c.secretId) {
      return { ok: false, message: 'AppRole auth requires role_id and secret_id' };
    }
    const res = await call('/v1/auth/approle/login', {
      method: 'POST',
      body: JSON.stringify({ role_id: c.roleId, secret_id: c.secretId }),
    });
    const auth = res.body?.auth as { client_token?: string } | undefined;
    if (res.status >= 200 && res.status < 300 && auth?.client_token) {
      return { ok: true, message: `AppRole authenticated${versionNote}.` };
    }
    const errs = Array.isArray(res.body?.errors) ? (res.body.errors as string[]).join('; ') : '';
    return {
      ok: false,
      message: `AppRole login failed (HTTP ${res.status})${errs ? `: ${errs}` : ''}${versionNote}.`,
    };
  } catch (e) {
    return { ok: false, message: `Authentication error: ${errText(e)}` };
  }
};
