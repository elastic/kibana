/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getSavedRuleId, isLatestAttachmentVersion, isRuleDraftAttachment } from './helpers';
import type { RuleAttachment } from './helpers';

const ruleAttachment = (text: string, origin?: string): RuleAttachment => ({
  id: 'attachment-1',
  type: 'security.rule',
  data: { text },
  origin,
});

describe('getSavedRuleId', () => {
  it('prefers the id in the payload over a human-readable rule_id in origin', () => {
    expect(getSavedRuleId(ruleAttachment(JSON.stringify({ id: 'so-id' }), 'human-readable'))).toBe(
      'so-id'
    );
  });

  it('falls back to origin when the payload has no id', () => {
    expect(getSavedRuleId(ruleAttachment(JSON.stringify({ name: 'Rule' }), 'so-id'))).toBe('so-id');
  });

  it('is undefined for an unsaved rule', () => {
    expect(getSavedRuleId(ruleAttachment('not json'))).toBeUndefined();
  });
});

describe('isRuleDraftAttachment', () => {
  it('is true for the drafted rule attachment id', () => {
    expect(isRuleDraftAttachment({ id: 'rule-draft' })).toBe(true);
  });

  it('is false for any other attachment id', () => {
    expect(isRuleDraftAttachment({ id: 'attachment-1' })).toBe(false);
  });
});

describe('isLatestAttachmentVersion', () => {
  const versionData = (version: number, versionCount: number) => ({
    versionData: { version, versionCount, createdAt: '2026-11-12T00:00:00Z' },
  });

  it('is true when the attachment carries no version data', () => {
    expect(isLatestAttachmentVersion({})).toBe(true);
  });

  it('is true for the latest version', () => {
    expect(isLatestAttachmentVersion(versionData(3, 3))).toBe(true);
  });

  it('is false for an older version', () => {
    expect(isLatestAttachmentVersion(versionData(1, 3))).toBe(false);
  });
});
