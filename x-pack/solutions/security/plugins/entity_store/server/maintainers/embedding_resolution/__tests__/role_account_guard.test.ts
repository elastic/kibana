/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isRoleAccount } from '../role_account_guard';

describe('isRoleAccount', () => {
  it('flags an exact deny-listed local-part (noreply@…)', () => {
    expect(isRoleAccount({ email: 'noreply@corp.com' })).toBe(true);
    expect(isRoleAccount({ email: 'admin@corp.com' })).toBe(true);
    expect(isRoleAccount({ email: 'support@corp.com' })).toBe(true);
  });

  it('flags hyphenated deny-listed local-parts (no-reply@…)', () => {
    expect(isRoleAccount({ email: 'no-reply@corp.com' })).toBe(true);
  });

  it('is case-insensitive on the email', () => {
    expect(isRoleAccount({ email: 'NoReply@Corp.Com' })).toBe(true);
    expect(isRoleAccount({ email: 'ADMIN@corp.com' })).toBe(true);
  });

  it('flags a deny-listed token within a multi-segment local-part (noreply-team@…)', () => {
    expect(isRoleAccount({ email: 'noreply-team@corp.com' })).toBe(true);
    expect(isRoleAccount({ email: 'team.noreply@corp.com' })).toBe(true);
    expect(isRoleAccount({ email: 'service_acct@corp.com' })).toBe(true);
    expect(isRoleAccount({ email: 'helpdesk-l1@corp.com' })).toBe(true);
  });

  it('does NOT flag a substring that just happens to contain a deny-listed word', () => {
    // "noreplyperson" is not split, so doesn't match. Avoid false positives on
    // names like "Adminah" or "Servicea". We only flag whole-token matches.
    expect(isRoleAccount({ email: 'noreplyperson@corp.com' })).toBe(false);
    expect(isRoleAccount({ email: 'serviceability@corp.com' })).toBe(false);
    expect(isRoleAccount({ email: 'rooting@corp.com' })).toBe(false);
  });

  it('does NOT flag normal user emails', () => {
    expect(isRoleAccount({ email: 'alice@corp.com' })).toBe(false);
    expect(isRoleAccount({ email: 'nora.patterson@corp.com' })).toBe(false);
    expect(isRoleAccount({ email: 'bob+work@corp.com' })).toBe(false);
  });

  it('flags a deny-listed token in user.full_name (case-insensitive, whitespace-tokenised)', () => {
    expect(isRoleAccount({ full_name: 'Service Account' })).toBe(true);
    expect(isRoleAccount({ full_name: 'CI Bot' })).toBe(true);
    expect(isRoleAccount({ full_name: 'data Pipeline' })).toBe(true);
    expect(isRoleAccount({ full_name: 'PROD MONITOR' })).toBe(true);
    expect(isRoleAccount({ full_name: 'auth automation' })).toBe(true);
  });

  it('does NOT flag a normal full_name', () => {
    expect(isRoleAccount({ full_name: 'Alice Patterson' })).toBe(false);
    expect(isRoleAccount({ full_name: 'Nora Patterson' })).toBe(false);
    expect(isRoleAccount({ full_name: 'Bob' })).toBe(false);
  });

  it('returns false when both fields are null/undefined/empty', () => {
    expect(isRoleAccount({})).toBe(false);
    expect(isRoleAccount({ email: '', full_name: '' })).toBe(false);
    expect(isRoleAccount({ email: null, full_name: undefined })).toBe(false);
  });

  it('flags entities matching either signal even if the other is benign', () => {
    expect(isRoleAccount({ full_name: 'Alice Patterson', email: 'admin@corp.com' })).toBe(true);
    expect(isRoleAccount({ full_name: 'Build Bot', email: 'alice@corp.com' })).toBe(true);
  });

  // Defense-of-design: the design's #15 fixture is the gold negative test —
  // three okta service accounts + one entra_id admin sharing noreply@corp.com.
  // None of them must collapse via the embedding maintainer.
  it('flags every #15 fixture identity (okta service accounts + entra admin)', () => {
    const shared = { email: 'noreply@corp.com' };
    expect(isRoleAccount({ ...shared, name: 'er-15-svc-1' })).toBe(true);
    expect(isRoleAccount({ ...shared, name: 'er-15-svc-2' })).toBe(true);
    expect(isRoleAccount({ ...shared, name: 'er-15-svc-3' })).toBe(true);
    expect(isRoleAccount({ ...shared, name: 'er-15-admin' })).toBe(true);
  });

  it('handles a malformed email without an @ by treating the whole string as a local-part', () => {
    expect(isRoleAccount({ email: 'noreply' })).toBe(true);
    expect(isRoleAccount({ email: 'alice' })).toBe(false);
  });
});
