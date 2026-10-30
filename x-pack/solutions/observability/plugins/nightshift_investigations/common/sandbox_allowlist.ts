/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const SANDBOX_ALLOWLIST_API_PATH = '/internal/nightshift/sandbox_allowlist';

/** Upper bound on rules in a space's egress firewall policy. */
export const MAX_SANDBOX_ALLOWLIST_HOSTS = 32;
/** Longest DNS name, and the credential proxy's `MaxHostLen`. */
export const MAX_SANDBOX_ALLOWLIST_HOST_LENGTH = 253;
/** Bound on raw input per entry, before normalization (IDN names grow when encoded). */
export const MAX_SANDBOX_ALLOWLIST_RAW_HOST_LENGTH = 1024;

const MAX_LABEL_LENGTH = 63;
const LABEL_REGEX = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
const NON_HOSTNAME_CHARS_REGEX = /[\s/:?#@*[\]\%]/;
const ALLOWED_HTTP_METHODS = new Set(['GET', 'HEAD', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']);

export type SandboxAllowlistHostResult = { host: string } | { error: string };

const normalizeExactHostname = (raw: string): SandboxAllowlistHostResult => {
  if (raw.length === 0) {
    return { error: 'must not be empty' };
  }
  if (NON_HOSTNAME_CHARS_REGEX.test(raw)) {
    return { error: 'must be a bare hostname without scheme, port, path or spaces' };
  }
  const withoutTrailingDot = raw.endsWith('.') ? raw.slice(0, -1) : raw;
  let host: string;
  try {
    host = new URL(`http://${withoutTrailingDot}`).hostname;
  } catch {
    return { error: 'is not a valid hostname' };
  }
  if (host.length === 0 || host.length > MAX_SANDBOX_ALLOWLIST_HOST_LENGTH) {
    return { error: `must be 1 to ${MAX_SANDBOX_ALLOWLIST_HOST_LENGTH} characters long` };
  }
  const labels = host.split('.');
  const hasInvalidLabel = labels.some(
    (label) => label.length === 0 || label.length > MAX_LABEL_LENGTH || !LABEL_REGEX.test(label)
  );
  if (hasInvalidLabel) {
    return { error: 'is not a valid hostname' };
  }
  return { host };
};

/**
 * Normalizes one allowlist or egress firewall DSL rule to the canonical form expected by
 * `credproxy`:
 * - Bare hostname:         `api.github.com` -> `api.github.com`
 * - Subdomain wildcard:    `*.datadoghq.com` -> `*.datadoghq.com`
 * - Egress DSL rule:       `[allow|deny] [http|https] <host|*.domain>[:port] [METHOD1,METHOD2] [/pathPrefix]`
 */
export const normalizeSandboxAllowlistHost = (raw: string): SandboxAllowlistHostResult => {
  const withoutComment = raw.includes('#') ? raw.slice(0, raw.indexOf('#')) : raw;
  const trimmed = withoutComment.trim();
  if (trimmed.length === 0) {
    return { error: 'must not be empty' };
  }
  if (trimmed === '*') {
    return { error: 'must not be a bare wildcard; list a hostname or *.domain.com' };
  }

  const tokens = trimmed.split(/\s+/);
  let idx = 0;

  let action: 'allow' | 'deny' = 'allow';
  const firstLower = tokens[idx].toLowerCase();
  if (firstLower === 'allow' || firstLower === 'deny') {
    action = firstLower;
    idx++;
    if (idx >= tokens.length) {
      return { error: 'is missing a hostname after action' };
    }
  }

  let scheme = '';
  const schemeLower = tokens[idx].toLowerCase();
  if (schemeLower === 'http' || schemeLower === 'https') {
    scheme = schemeLower;
    idx++;
    if (idx >= tokens.length) {
      return { error: 'is missing a hostname after scheme' };
    }
  }

  const hostPortToken = tokens[idx];
  idx++;
  if (hostPortToken.includes('://')) {
    return { error: 'must not include a URL scheme prefix (://)' };
  }
  if (hostPortToken.includes('[') || hostPortToken.includes(']')) {
    return { error: 'must be a bare hostname without IPv6 brackets' };
  }

  let rawHost = hostPortToken;
  let port = '';
  const colonIdx = hostPortToken.lastIndexOf(':');
  if (colonIdx >= 0) {
    rawHost = hostPortToken.slice(0, colonIdx);
    port = hostPortToken.slice(colonIdx + 1);
    const portNum = Number(port);
    if (!Number.isInteger(portNum) || portNum < 1 || portNum > 65535 || String(portNum) !== port) {
      return { error: `has an invalid port '${port}'` };
    }
  }

  let normalizedHost: string;
  if (rawHost.startsWith('*.')) {
    const suffixRes = normalizeExactHostname(rawHost.slice(2));
    if ('error' in suffixRes || !suffixRes.host.includes('.')) {
      return { error: 'wildcard must be of the form *.example.com' };
    }
    normalizedHost = `*.${suffixRes.host}`;
  } else {
    const hostRes = normalizeExactHostname(rawHost);
    if ('error' in hostRes) {
      return hostRes;
    }
    normalizedHost = hostRes.host;
  }

  let methods: string[] = [];
  if (idx < tokens.length && !tokens[idx].startsWith('/')) {
    const methodToken = tokens[idx];
    idx++;
    if (methodToken !== '*') {
      const parsed = methodToken.split(',').map((m) => m.trim().toUpperCase());
      if (parsed.some((m) => !ALLOWED_HTTP_METHODS.has(m))) {
        return { error: `has an unsupported HTTP method in '${methodToken}'` };
      }
      methods = [...new Set(parsed)].sort();
    }
  }

  let pathPrefix = '';
  if (idx < tokens.length) {
    const pathToken = tokens[idx];
    idx++;
    if (pathToken !== '*') {
      if (!pathToken.startsWith('/')) {
        return { error: `path prefix '${pathToken}' must start with '/'` };
      }
      if (pathToken !== '/') {
        pathPrefix = pathToken;
      }
    }
  }

  if (idx !== tokens.length) {
    return { error: `has an unexpected trailing token '${tokens[idx]}'` };
  }

  const hostWithPort = port ? `${normalizedHost}:${port}` : normalizedHost;
  if (
    action === 'allow' &&
    scheme === '' &&
    port === '' &&
    methods.length === 0 &&
    pathPrefix === ''
  ) {
    return { host: normalizedHost };
  }

  const parts: string[] = [action];
  if (scheme) {
    parts.push(scheme);
  }
  parts.push(hostWithPort);
  if (methods.length > 0) {
    parts.push(methods.join(','));
  } else if (pathPrefix) {
    parts.push('*');
  }
  if (pathPrefix) {
    parts.push(pathPrefix);
  }
  return { host: parts.join(' ') };
};

export interface SandboxAllowlistValidation {
  /** Normalized, de-duplicated hosts/rules in input order. */
  hosts: string[];
  /** One message per rejected entry, or for the list as a whole; empty when the list is valid. */
  errors: string[];
}

/** Normalizes and validates a whole allowlist / egress firewall rule list. */
export const validateSandboxAllowlist = (
  rawHosts: readonly string[]
): SandboxAllowlistValidation => {
  const hosts: string[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const raw of rawHosts) {
    const withoutComment = raw.includes('#') ? raw.slice(0, raw.indexOf('#')) : raw;
    if (withoutComment.trim().length === 0) {
      continue;
    }
    const result = normalizeSandboxAllowlistHost(raw);
    if ('error' in result) {
      errors.push(`'${raw.trim()}' ${result.error}`);
      continue;
    }
    if (!seen.has(result.host)) {
      seen.add(result.host);
      hosts.push(result.host);
    }
  }
  if (hosts.length > MAX_SANDBOX_ALLOWLIST_HOSTS) {
    errors.push(
      `At most ${MAX_SANDBOX_ALLOWLIST_HOSTS} rules are allowed (got ${hosts.length}): the credential proxy rejects longer lists`
    );
  }
  return { hosts, errors };
};

export interface GetSandboxAllowlistResponse {
  hosts: string[];
}

export interface PutSandboxAllowlistRequest {
  hosts: string[];
}

export type PutSandboxAllowlistResponse = GetSandboxAllowlistResponse;
