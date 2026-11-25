/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Reserved top-level names (RFC 2606 and 6761 `test`, `example`, `invalid`,
 * `localhost`; RFC 6762 `local`; ICANN-reserved `internal`). No attacker mailbox
 * lives on these, and none is in the IANA root zone.
 */
const PLACEHOLDER_EMAIL_TLDS: ReadonlySet<string> = new Set([
  'test',
  'example',
  'invalid',
  'localhost',
  'local',
  'internal',
]);

/**
 * Well-known documentation stand-in domains, matched exactly or as a parent of
 * the host. The bar for an entry: a name no attacker mailbox would plausibly be
 * on. A wrong entry silently drops a real indicator from hunts and promotion.
 * Seeded demo and eval addresses must never match (a test pins this); that is
 * why the label `example` anywhere else, as in `corp.example.cloud`, is not a
 * placeholder.
 */
const PLACEHOLDER_EMAIL_DOMAINS: ReadonlySet<string> = new Set([
  'example.com',
  'example.net',
  'example.org',
  'test.com',
  'domain.com',
  'host.name',
  'yourdomain.com',
  'company.com',
]);

/** True when `host` is a reserved name or a well-known documentation stand-in. */
export const isPlaceholderEmailHost = (host: string): boolean => {
  const labels = host.trim().toLowerCase().split('.');
  if (PLACEHOLDER_EMAIL_TLDS.has(labels[labels.length - 1])) {
    return true;
  }
  for (let i = 0; i < labels.length - 1; i++) {
    if (PLACEHOLDER_EMAIL_DOMAINS.has(labels.slice(i).join('.'))) {
      return true;
    }
  }
  return false;
};

/** True when a stored `email` IOC value sits on a placeholder host. */
export const isPlaceholderEmailIoc = (ioc: { type?: unknown; value?: unknown }): boolean => {
  if (ioc.type !== 'email' || typeof ioc.value !== 'string') {
    return false;
  }
  const at = ioc.value.lastIndexOf('@');
  return at >= 0 && isPlaceholderEmailHost(ioc.value.slice(at + 1));
};
