/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// The validation runs in the browser and on the server, and `net` only exists on the server. These expressions accept the
// same strings as `net.isIP` of Node.js, which the tests compare them with.

const V4_SEGMENT = '(?:25[0-5]|2[0-4][0-9]|1[0-9][0-9]|[1-9][0-9]|[0-9])';
const V4 = `(?:${V4_SEGMENT}\\.){3}${V4_SEGMENT}`;
const V6_SEGMENT = '(?:[0-9a-fA-F]{1,4})';

const IPV4_PATTERN = new RegExp(`^${V4}$`);
const IPV6_PATTERN = new RegExp(
  `^(?:${[
    `(?:${V6_SEGMENT}:){7}(?:${V6_SEGMENT}|:)`,
    `(?:${V6_SEGMENT}:){6}(?:${V4}|:${V6_SEGMENT}|:)`,
    `(?:${V6_SEGMENT}:){5}(?::${V4}|(?::${V6_SEGMENT}){1,2}|:)`,
    `(?:${V6_SEGMENT}:){4}(?:(?::${V6_SEGMENT}){0,1}:${V4}|(?::${V6_SEGMENT}){1,3}|:)`,
    `(?:${V6_SEGMENT}:){3}(?:(?::${V6_SEGMENT}){0,2}:${V4}|(?::${V6_SEGMENT}){1,4}|:)`,
    `(?:${V6_SEGMENT}:){2}(?:(?::${V6_SEGMENT}){0,3}:${V4}|(?::${V6_SEGMENT}){1,5}|:)`,
    `(?:${V6_SEGMENT}:){1}(?:(?::${V6_SEGMENT}){0,4}:${V4}|(?::${V6_SEGMENT}){1,6}|:)`,
    `(?::(?:(?::${V6_SEGMENT}){0,5}:${V4}|(?::${V6_SEGMENT}){1,7}|:))`,
  ].join('|')})(?:%[0-9a-zA-Z-.:]{1,})?$`
);

/** 4 for an IPv4 address, 6 for an IPv6 address (with an optional zone, as `fe80::1%eth0`), and 0 for anything else. */
export const isIP = (value: string): 0 | 4 | 6 => {
  if (IPV4_PATTERN.test(value)) {
    return 4;
  }
  return IPV6_PATTERN.test(value) ? 6 : 0;
};
