/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { TEMPLATE_VERSION_CURRENT } from '../../constants';
import { MOCK_INVESTIGATIONS } from './investigations';
import { MOCK_PROPOSALS } from './proposals';

/**
 * Lockdown: every templated record must pin BOTH the template it was
 * instantiated from AND that template's revision.
 *
 * `template_version` is optional on the schema so records written before it
 * existed stay valid. That optionality means a new producer can omit it and
 * nothing fails — the version pin then silently covers only part of the data,
 * which is worse than not having it. These tests are the guard: add a record
 * without a version and this suite goes red.
 */
describe('templated record version pinning', () => {
  describe.each([
    ['investigations', MOCK_INVESTIGATIONS as Array<Record<string, unknown>>],
    ['proposals', MOCK_PROPOSALS as Array<Record<string, unknown>>],
  ])('%s fixtures', (_name, records) => {
    it('is not empty (a passing empty suite would prove nothing)', () => {
      expect(records.length).toBeGreaterThan(0);
    });

    it('every record declares a template_id', () => {
      const missing = records.filter((r) => r.template_id == null).map((r) => r.id);
      expect(missing).toEqual([]);
    });

    it('every record pins template_version to the current revision', () => {
      const missing = records.filter((r) => r.template_version == null).map((r) => r.id);
      expect(missing).toEqual([]);

      const wrong = records
        .filter((r) => r.template_version !== TEMPLATE_VERSION_CURRENT)
        .map((r) => ({ id: r.id, version: r.template_version }));
      expect(wrong).toEqual([]);
    });
  });

  it('proposals link to a parent investigation', () => {
    // The parent/child half of the object model — the part the platform POC has
    // no code for at all. Losing it would silently orphan every proposal.
    const orphans = (MOCK_PROPOSALS as Array<Record<string, unknown>>)
      .filter((p) => p.parentConversationId == null)
      .map((p) => p.id);
    expect(orphans).toEqual([]);
  });

  it('TEMPLATE_VERSION_CURRENT is a positive integer', () => {
    expect(Number.isInteger(TEMPLATE_VERSION_CURRENT)).toBe(true);
    expect(TEMPLATE_VERSION_CURRENT).toBeGreaterThanOrEqual(1);
  });
});
