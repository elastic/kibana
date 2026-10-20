/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isIPv4, isIPv6 } from 'net';
import type { UptimeConfig } from '../../../config';

const stripBrackets = (host: string): string => host.replace(/^\[|\]$/g, '');

/**
 * Link-local (cloud metadata services live here) and unspecified addresses.
 * Loopback and private ranges stay allowed: Vault is commonly self-hosted
 * on an internal network.
 */
export const isBlockedAddress = (rawIp: string): boolean => {
  const ip = stripBrackets(rawIp).toLowerCase().split('%')[0];

  if (isIPv4(ip)) {
    const [first, second] = ip.split('.').map(Number);
    return first === 0 || (first === 169 && second === 254);
  }
  if (!isIPv6(ip)) return false;

  const mapped = ip.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isBlockedAddress(mapped[1]);

  return (
    ip === '::' ||
    /^fe[89ab]/.test(ip) || // fe80::/10
    ip.startsWith('::ffff:a9fe:') || // mapped 169.254.0.0/16
    ip.startsWith('fd00:ec2:') // AWS IMDS over IPv6
  );
};

const isLoopbackHost = (hostname: string): boolean => {
  const host = stripBrackets(hostname).toLowerCase();
  return host === 'localhost' || host === '::1' || (isIPv4(host) && host.startsWith('127.'));
};

/**
 * Validates a user-supplied Vault address. The request URL is built by appending
 * a fixed path, so a query string or fragment would let the caller rewrite that path.
 */
export const validateVaultAddress = (value: string): string | undefined => {
  let url: URL;
  try {
    url = new URL(value);
  } catch (e) {
    return 'must be a valid URL';
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return 'must be an http(s) URL';
  // Agents send their Vault token here; plaintext is only safe to a Vault Agent on the same host.
  if (url.protocol === 'http:' && !isLoopbackHost(url.hostname)) {
    return 'must use https unless the host is loopback';
  }
  if (url.username || url.password) return 'must not include credentials';
  // `new URL` reports an empty `#`/`?` as no hash/search, so check the raw value.
  if (value.includes('#') || value.includes('?')) return 'must not include a query or fragment';
  if (isBlockedAddress(url.hostname)) return 'must not be a link-local address';
  return undefined;
};

const ALLOW_ANY_HOST = '*';

export const getAllowedHosts = (config: UptimeConfig): readonly string[] =>
  config.secretConnections?.allowedHosts ?? [ALLOW_ANY_HOST];

/** Whether the address's host is in `xpack.synthetics.secretConnections.allowedHosts` (exact match). */
export const isAddressHostAllowed = (address: string, allowedHosts: readonly string[]): boolean => {
  if (allowedHosts.includes(ALLOW_ANY_HOST)) return true;
  try {
    const host = stripBrackets(new URL(address).hostname).toLowerCase();
    return allowedHosts.some((allowed) => stripBrackets(allowed).toLowerCase() === host);
  } catch (e) {
    return false;
  }
};

export const hostNotAllowedMessage = (address: string): string => {
  let host = address;
  try {
    host = new URL(address).hostname;
  } catch (e) {
    // keep the raw value
  }
  return `Vault host "${host}" is not added to the Kibana config xpack.synthetics.secretConnections.allowedHosts`;
};
