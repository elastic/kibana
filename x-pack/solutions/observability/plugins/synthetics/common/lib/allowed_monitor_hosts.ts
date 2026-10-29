/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

// Heartbeat rejects a whole `secret_stores` entry whose `allowed_hosts` has a value it does not
// accept, which would break every monitor using the connection. So these checks are at least as
// strict as Heartbeat's: a host name or IP, without scheme, port, path, wildcard or surrounding
// whitespace. Non-ASCII names must be entered in their punycode form.
export const MAX_ALLOWED_MONITOR_HOSTS = 100;
const MAX_HOST_LENGTH = 253;

const HOST_NAME_REGEX = /^[A-Za-z0-9_](?:[A-Za-z0-9_.-]*[A-Za-z0-9_])?\.?$/;
// Shape only. The server confirms IPv6 literals with `net.isIP`.
const IPV6_SHAPE_REGEX = /^(?=.*:)[0-9A-Fa-f:.]{2,45}$/;

/** Whether `host` could be a monitor target host: a host name or an IP literal. */
export const isAllowedMonitorHostShape = (host: string): boolean =>
  host.length > 0 &&
  host.length <= MAX_HOST_LENGTH &&
  (HOST_NAME_REGEX.test(host) || IPV6_SHAPE_REGEX.test(host));

/** The form Heartbeat compares hosts in: lowercase, without a trailing dot. */
export const normalizeAllowedMonitorHost = (host: string): string =>
  host.trim().toLowerCase().replace(/\.$/, '');

/** Whether every host of `next` is already allowed by `existing`. An empty list allows any host. */
export const isNarrowerOrEqualHostList = (
  existing: readonly string[] | undefined,
  next: readonly string[] | undefined
): boolean => {
  if (!existing?.length) return true;
  if (!next?.length) return false;
  const allowed = new Set(existing.map(normalizeAllowedMonitorHost));
  return next.every((host) => allowed.has(normalizeAllowedMonitorHost(host)));
};
