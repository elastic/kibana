/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isIP } from 'net';

const ZERO = BigInt(0);
const ONE = BigInt(1);
const TWO = BigInt(2);
const OCTET = BigInt(256);
const HEXTET = BigInt(65536);
const IPV4_MAPPED_HIGH_BITS = BigInt(0xffff);

const power = (exponent: number): bigint => TWO ** BigInt(exponent);

const parseIPv4 = (ip: string): bigint =>
  ip.split('.').reduce((acc, part) => acc * OCTET + BigInt(part), ZERO);

const parseIPv6 = (ip: string): bigint => {
  let text = ip;
  const lastColon = text.lastIndexOf(':');
  const tail = text.slice(lastColon + 1);
  if (tail.includes('.')) {
    const v4 = parseIPv4(tail);
    text = `${text.slice(0, lastColon + 1)}${(v4 / HEXTET).toString(16)}:${(v4 % HEXTET).toString(
      16
    )}`;
  }
  const [head, rest] = text.split('::');
  const headParts = head ? head.split(':') : [];
  const restParts = rest ? rest.split(':') : [];
  const zeros = rest === undefined ? 0 : 8 - headParts.length - restParts.length;
  const groups = [...headParts, ...Array<string>(zeros).fill('0'), ...restParts];
  return groups.reduce((acc, group) => acc * HEXTET + BigInt(`0x${group}`), ZERO);
};

const formatIPv4 = (value: bigint): string =>
  [3, 2, 1, 0].map((position) => String(Number((value / power(8 * position)) % OCTET))).join('.');

const formatIPv6 = (value: bigint): string =>
  Array.from({ length: 8 }, (_, i) => ((value / power(16 * (7 - i))) % HEXTET).toString(16)).join(
    ':'
  );

/** The first and the last address of an IP value in CIDR notation, or `undefined` when it is not a CIDR that the compiler writes. */
export const toIpRange = (value: string): { first: string; last: string } | undefined => {
  const parts = value.split('/');
  // an IPv6 address with a zone (`fe80::1%eth0`) has no range that ES|QL can compare
  if (parts.length !== 2 || !/^\d{1,3}$/.test(parts[1]) || value.includes('%')) {
    return undefined;
  }
  const [address, prefixText] = parts;
  const version = isIP(address);
  const prefix = Number(prefixText);
  if (version === 0 || prefix > (version === 4 ? 32 : 128) || (version === 6 && prefix === 0)) {
    return undefined;
  }
  const bits = version === 4 ? 32 : 128;
  const parsed = version === 4 ? parseIPv4(address) : parseIPv6(address);
  if (version === 6 && parsed / power(32) === IPV4_MAPPED_HIGH_BITS) {
    return undefined;
  }
  const blockSize = power(bits - prefix);
  const first = (parsed / blockSize) * blockSize;
  const last = first + blockSize - ONE;
  return version === 4
    ? { first: formatIPv4(first), last: formatIPv4(last) }
    : { first: formatIPv6(first), last: formatIPv6(last) };
};
