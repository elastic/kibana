/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rulesClientMock } from '@kbn/alerting-plugin/server/rules_client.mock';
import type { RuleChangeHistoryDocument } from '@kbn/alerting-plugin/server';
import type { SanitizedRule } from '@kbn/alerting-plugin/common';
import type { RuleParams } from '../../../../rule_schema';
import { getHistoryForRule } from './get_history_for_rule';

describe('getHistoryForRule', () => {
  let rulesClient: ReturnType<typeof rulesClientMock.create>;

  beforeEach(() => {
    rulesClient = rulesClientMock.create();
  });

  it('requests size = perPage + 1 with offset 0 for page 1', async () => {
    rulesClient.getHistory.mockResolvedValueOnce({ total: 0, items: buildItems(3) });

    await getHistoryForRule({ rulesClient, ruleId: 'rule-1', page: 1, perPage: 2 });

    expect(rulesClient.getHistory).toHaveBeenCalledWith({
      module: 'security',
      ruleId: 'rule-1',
      from: 0,
      size: 3,
    });
  });

  it('requests size = perPage + 1 with the correct offset for page > 1', async () => {
    rulesClient.getHistory.mockResolvedValueOnce({ total: 0, items: buildItems(3) });

    await getHistoryForRule({ rulesClient, ruleId: 'rule-1', page: 4, perPage: 2 });

    expect(rulesClient.getHistory).toHaveBeenCalledWith({
      module: 'security',
      ruleId: 'rule-1',
      from: 6,
      size: 3,
    });
  });

  it('uses the trailing entry as the predecessor for the oldest item on the page', async () => {
    rulesClient.getHistory.mockResolvedValueOnce({
      total: 10,
      items: [
        buildHistoryDoc('1', { name: 'name-1' }),
        buildHistoryDoc('2', { name: 'name-2' }),
        buildHistoryDoc('3', { name: 'name-3' }),
      ],
    });

    const result = await getHistoryForRule({
      rulesClient,
      ruleId: 'rule-1',
      page: 1,
      perPage: 2,
    });

    expect(result.items).toHaveLength(2);
    expect(result.items[0].id).toBe('event-1');
    expect(result.items[0].old_values).toEqual({ name: 'name-2' });
    expect(result.items[1].id).toBe('event-2');
    expect(result.items[1].old_values).toEqual({ name: 'name-3' });
  });

  it('returns the requested page/perPage and total in the response', async () => {
    rulesClient.getHistory.mockResolvedValueOnce({ total: 100, items: buildItems(3) });

    const result = await getHistoryForRule({
      rulesClient,
      ruleId: 'rule-1',
      page: 3,
      perPage: 2,
    });

    expect(result).toMatchObject({ page: 3, perPage: 2, total: 100 });
    expect(result.items).toHaveLength(2);
  });

  it('exposes the post-change rule snapshot, action, and username on each item', async () => {
    rulesClient.getHistory.mockResolvedValueOnce({ total: 2, items: buildItems(2) });

    const result = await getHistoryForRule({
      rulesClient,
      ruleId: 'rule-1',
      page: 1,
      perPage: 1,
    });

    expect(result.items[0].action).toBe('rule_update');
    expect(result.items[0].user).toEqual({ name: 'alice' });
    expect(result.items[0].rule.name).toBe('Rule');
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
    id: string,
    ruleOverrides: Partial<SanitizedRule<RuleParams>> = {}
  ): RuleChangeHistoryDocument =>
    ({
      '@timestamp': `2026-05-01T10:00:0${id}.000Z`,
      user: { name: 'alice' },
      event: {
        id: `event-${id}`,
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
    } as unknown as RuleChangeHistoryDocument);

  const buildItems = (count: number) =>
    Array.from({ length: count }, (_, i) => buildHistoryDoc(String(i + 1)));
});
