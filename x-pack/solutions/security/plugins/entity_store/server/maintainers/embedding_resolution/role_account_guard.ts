/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IdentityFields } from './embed';

/**
 * Local-part deny-list. An entity whose `user.email` local-part either equals
 * one of these (case-insensitive) OR contains one of them as a tokenised
 * segment (split on `.`, `-`, `_`) is treated as a role account and excluded
 * from embedding-driven resolution. Per design §11 E9.
 */
const ROLE_ACCOUNT_LOCAL_PARTS = new Set<string>([
  'noreply',
  'no-reply',
  'admin',
  'helpdesk',
  'support',
  'info',
  'automation',
  'system',
  'root',
  'service',
]);

/**
 * Whitespace-separated token deny-list for `user.full_name`. Same rationale as
 * the local-part list — these tokens almost always indicate a non-human
 * identity that should not be merged with another entity.
 */
const ROLE_ACCOUNT_FULL_NAME_TOKENS = new Set<string>([
  'service',
  'bot',
  'pipeline',
  'monitor',
  'automation',
]);

/**
 * Splits the local-part of an email on `.` / `-` / `_` to surface tokens.
 * `noreply-team` → `['noreply-team', 'noreply', 'team']`. The original whole
 * string is returned as the first element so the caller can do an exact
 * match against compound entries like `no-reply` (which would otherwise be
 * shredded).
 */
function localPartTokens(localPart: string): string[] {
  const lower = localPart.toLowerCase();
  return [lower, ...lower.split(/[.\-_]+/).filter(Boolean)];
}

function emailLocalPart(email: string): string {
  const at = email.indexOf('@');
  return at >= 0 ? email.slice(0, at) : email;
}

/**
 * Returns true if the entity's identity fields match any of the role-account
 * heuristics in design §11 E9. Applied:
 *
 * 1. **Before embed** — skip role accounts at the page-collection step in
 *    `run.ts` so we don't waste an inference call on them.
 * 2. **Before link** — defence in depth. Even if a role account somehow has
 *    an embedding (e.g. legacy data, version drift, or a candidate returned
 *    by kNN that we'd otherwise link), don't write a link doc for it.
 *
 * Conservative by design — better to leave a role-account split than to
 * collapse three okta service accounts + one entra_id admin into one
 * "person" (the design's #15 fixture, the canonical false positive).
 */
export function isRoleAccount(fields: IdentityFields): boolean {
  const email = (fields.email ?? '').trim();
  if (email !== '') {
    for (const token of localPartTokens(emailLocalPart(email))) {
      if (ROLE_ACCOUNT_LOCAL_PARTS.has(token)) {
        return true;
      }
    }
  }

  const fullName = (fields.full_name ?? '').trim();
  if (fullName !== '') {
    const tokens = fullName.toLowerCase().split(/\s+/).filter(Boolean);
    for (const token of tokens) {
      if (ROLE_ACCOUNT_FULL_NAME_TOKENS.has(token)) {
        return true;
      }
    }
  }

  return false;
}
