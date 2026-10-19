/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { lookup as dnsLookup } from 'dns';
import { isIPv4, isIPv6 } from 'net';
import type { LookupFunction } from 'net';

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
  if (url.username || url.password) return 'must not include credentials';
  // `new URL` reports an empty `#`/`?` as no hash/search, so check the raw value.
  if (value.includes('#') || value.includes('?')) return 'must not include a query or fragment';
  if (isBlockedAddress(url.hostname)) return 'must not be a link-local address';
  return undefined;
};

/** DNS lookup that refuses names resolving to a blocked address (guards against rebinding). */
export const guardedLookup: LookupFunction = (hostname, options, callback) => {
  dnsLookup(hostname, options, (err, address, family) => {
    if (err) {
      callback(err, address, family);
      return;
    }
    const addresses = Array.isArray(address) ? address.map((a) => a.address) : [address];
    if (addresses.some(isBlockedAddress)) {
      callback(new Error('address resolves to a blocked link-local IP'), '', 0);
      return;
    }
    callback(null, address, family);
  });
};
