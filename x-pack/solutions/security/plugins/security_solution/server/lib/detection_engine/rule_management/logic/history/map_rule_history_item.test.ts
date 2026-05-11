/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { RuleChangeHistoryDocument } from '@kbn/alerting-plugin/server';
import type { SanitizedRule } from '@kbn/alerting-plugin/common';
import type { RuleParams } from '../../../rule_schema';
import { mapRuleHistoryItem } from './map_rule_history_item';

describe('mapRuleHistoryItem', () => {
  it('returns the API-shaped item with `rule` converted to `RuleResponse`', () => {
    const item = mapRuleHistoryItem(buildHistoryDoc({ name: 'My Rule' }));

    expect(item).toMatchObject({
      timestamp: '2026-05-01T10:00:00.000Z',
      id: 'event-1',
      user: { name: 'alice' },
      action: 'rule_update',
      old_values: null,
      metadata: { reason: 'manual edit' },
    });
    expect(item.rule.name).toBe('My Rule');
  });

  it('omits rule_id, revision, and version from the API item', () => {
    const item = mapRuleHistoryItem(buildHistoryDoc());
    expect(item).not.toHaveProperty('rule_id');
    expect(item).not.toHaveProperty('revision');
    expect(item).not.toHaveProperty('version');
  });

  it('returns null `old_values` when no predecessor is supplied', () => {
    const item = mapRuleHistoryItem(buildHistoryDoc());
    expect(item.old_values).toBeNull();
  });

  it('returns the RFC 7396 merge patch in `old_values` when a predecessor differs', () => {
    const current = buildHistoryDoc({ name: 'B' });
    const previous = buildHistoryDoc({ name: 'A' });

    const item = mapRuleHistoryItem(current, previous);

    expect(item.old_values).toEqual({ name: 'A' });
  });

  it('returns an empty object in `old_values` when current and previous snapshots are equivalent', () => {
    const item = mapRuleHistoryItem(buildHistoryDoc(), buildHistoryDoc());
    expect(item.old_values).toEqual({});
  });

  it('returns a null `user` when the change history doc has no user', () => {
    const item = mapRuleHistoryItem(
      buildHistoryDoc({}, { user: undefined as unknown as RuleChangeHistoryDocument['user'] })
    );
    expect(item.user).toBeNull();
  });

  it('passes the user profile `id` through when present', () => {
    const item = mapRuleHistoryItem(
      buildHistoryDoc({}, { user: { id: 'profile-1', name: 'alice' } })
    );
    expect(item.user).toEqual({ id: 'profile-1', name: 'alice' });
  });

  it('forwards metadata as-is', () => {
    const item = mapRuleHistoryItem(
      buildHistoryDoc({}, { metadata: { reason: 'ui edit', extra: { key: 1 } } })
    );
    expect(item.metadata).toEqual({ reason: 'ui edit', extra: { key: 1 } });
  });

  const buildRule = (
    overrides: Partial<SanitizedRule<RuleParams>> = {}
  ): SanitizedRule<RuleParams> =>
    ({
      id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
      name: 'Rule',
      tags: [],
      alertTypeId: 'siem.queryRule',
      consumer: 'siem',
      enabled: true,
      actions: [],
      throttle: null,
      notifyWhen: null,
      createdBy: 'elastic',
      updatedBy: 'elastic',
      apiKeyOwner: 'elastic',
      muteAll: false,
      mutedInstanceIds: [],
      schedule: { interval: '5m' },
      revision: 0,
      createdAt: new Date('2026-05-01T10:00:00.000Z'),
      updatedAt: new Date('2026-05-01T10:00:00.000Z'),
      executionStatus: {
        status: 'unknown',
        lastExecutionDate: new Date('2026-05-01T10:00:00.000Z'),
      },
      params: {
        type: 'query',
        ruleId: 'rule-1',
        description: 'description',
        from: 'now-6m',
        to: 'now',
        immutable: false,
        version: 1,
        author: [],
        severity: 'low',
        severityMapping: [],
        riskScore: 21,
        riskScoreMapping: [],
        falsePositives: [],
        references: [],
        threat: [],
        maxSignals: 100,
        query: 'host.name:*',
        language: 'kuery',
        filters: [],
        index: ['*'],
        exceptionsList: [],
        relatedIntegrations: [],
        requiredFields: [],
        outputIndex: '',
        setup: '',
        ruleSource: { type: 'internal' },
      } as unknown as RuleParams,
      ...overrides,
    } as unknown as SanitizedRule<RuleParams>);

  const buildHistoryDoc = (
    ruleOverrides: Partial<SanitizedRule<RuleParams>> = {},
    docOverrides: Partial<RuleChangeHistoryDocument> = {}
  ): RuleChangeHistoryDocument =>
    ({
      '@timestamp': '2026-05-01T10:00:00.000Z',
      user: { name: 'alice' },
      event: {
        id: 'event-1',
        action: 'rule_update',
        type: 'change',
        module: 'security',
        dataset: 'alerting-rules',
      },
      object: {
        id: '04128c15-0d1b-4716-a4c5-46997ac7f3bd',
        type: 'alert',
        hash: 'h',
        fields: { hashed: [] },
        snapshot: {},
      },
      rule: buildRule(ruleOverrides),
      metadata: { reason: 'manual edit' },
      ...docOverrides,
    } as unknown as RuleChangeHistoryDocument);
});
