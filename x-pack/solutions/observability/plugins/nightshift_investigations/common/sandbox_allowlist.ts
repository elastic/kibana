/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const SANDBOX_ALLOWLIST_API_PATH = '/internal/nightshift/sandbox_allowlist';

/** The credential proxy rejects more than 32 allowed hosts per secret (`MaxAllowedHosts`). */
export const MAX_SANDBOX_ALLOWLIST_HOSTS = 32;
/** Longest DNS name, and the credential proxy's `MaxHostLen`. */
export const MAX_SANDBOX_ALLOWLIST_HOST_LENGTH = 253;
/** Bound on raw input per entry, before normalization (IDN names grow when encoded). */
export const MAX_SANDBOX_ALLOWLIST_RAW_HOST_LENGTH = 1024;

const MAX_LABEL_LENGTH = 63;
const LABEL_REGEX = /^[a-z0-9](?:[a-z0-9-]*[a-z0-9])?$/;
// Anything that makes an entry more than a bare hostname: scheme, port, path, query, userinfo,
// wildcard, IPv6 brackets or whitespace.
const NON_HOSTNAME_CHARS_REGEX = /[\s/:?#@*[\]\\%]/;

export type SandboxAllowlistHostResult = { host: string } | { error: string };

/**
 * Normalizes one allowlist entry to the exact form the credential proxy compares against: a
 * lowercase, ASCII (punycode) hostname without a trailing dot. Rejects schemes, ports, paths and
 * wildcards instead of stripping them, so an admin never ends up allowing something they did not
 * type. Shared by the API, the server client and the settings UI.
 */
export const normalizeSandboxAllowlistHost = (raw: string): SandboxAllowlistHostResult => {
  const trimmed = raw.trim();
  if (trimmed.length === 0) {
    return { error: 'must not be empty' };
  }
  if (trimmed.includes('*')) {
    return { error: 'must not contain wildcards; list each hostname exactly' };
  }
  if (NON_HOSTNAME_CHARS_REGEX.test(trimmed)) {
    return { error: 'must be a bare hostname without scheme, port, path or spaces' };
  }

  const withoutTrailingDot = trimmed.endsWith('.') ? trimmed.slice(0, -1) : trimmed;

  // The WHATWG URL parser lowercases and converts IDN labels to punycode the same way in Node
  // and in browsers, so the UI and the server always agree on the stored form.
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

export interface SandboxAllowlistValidation {
  /** Normalized, de-duplicated hosts in input order. */
  hosts: string[];
  /** One message per rejected entry, or for the list as a whole; empty when the list is valid. */
  errors: string[];
}

/** Normalizes and validates a whole allowlist, including the per-secret host limit. */
export const validateSandboxAllowlist = (
  rawHosts: readonly string[]
): SandboxAllowlistValidation => {
  const hosts: string[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();
  for (const raw of rawHosts) {
    if (raw.trim().length === 0) {
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
      `At most ${MAX_SANDBOX_ALLOWLIST_HOSTS} hosts are allowed (got ${hosts.length}): the credential proxy rejects longer lists`
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
