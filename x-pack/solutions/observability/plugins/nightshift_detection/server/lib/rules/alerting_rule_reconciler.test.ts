/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import { InMemoryRulesClient } from '../../test_utils/in_memory_rules_client';
import type { RulesClientApi } from '@kbn/alerting-v2-plugin/server';
import { AlertingRuleReconciler, type StrategyAlertingRule } from './alerting_rule_reconciler';
import { ManagedRuleReader } from './managed_rule_reader';
import { computeRuleId, MANAGED_RULE_TAG } from './rule_identity';

const SPACE_ID = 'space-a';
const STRATEGY = { id: 'known_failures', name: 'Known failures' };

const createRule = ({
  sourceId = 'source-1',
  query = 'FROM logs | WHERE message : "timeout"',
  lookback = '361m',
  every = '5m',
  enabled = true,
  strategy = STRATEGY,
}: {
  sourceId?: string;
  query?: string;
  lookback?: string;
  every?: string;
  enabled?: boolean;
  strategy?: { id: string; name: string };
} = {}): StrategyAlertingRule => ({
  strategy,
  resource: {
    kind: 'alerting_rule',
    source_id: sourceId,
    enabled,
    data: {
      kind: 'signal',
      metadata: { name: 'Timeouts' },
      time_field: '@timestamp',
      schedule: { every, lookback },
      query: { base: query },
    },
  },
});

const getRuleId = ({ strategy, resource }: StrategyAlertingRule) =>
  computeRuleId({
    spaceId: SPACE_ID,
    strategy: strategy.id,
    sourceId: resource.source_id,
    data: resource.data,
  });

const setUp = (options?: ConstructorParameters<typeof InMemoryRulesClient>[0]) => {
  const rulesClient = new InMemoryRulesClient(options);
  const client = rulesClient as unknown as RulesClientApi;
  const reconciler = new AlertingRuleReconciler(
    client,
    new ManagedRuleReader(client, {} as ElasticsearchClient, loggingSystemMock.createLogger()),
    loggingSystemMock.createLogger()
  );
  const reconcile = (
    desired: StrategyAlertingRule[],
    {
      paused = false,
      failed = [] as string[],
      skippedSources = [] as string[],
      abortSignal = new AbortController().signal,
    } = {}
  ) =>
    reconciler.reconcile({
      spaceId: SPACE_ID,
      abortSignal,
      desired,
      paused,
      strategyErrors: failed.map((strategy) => ({ strategy, message: 'boom' })),
      skippedSources: skippedSources.map((sourceId) => ({
        strategy: STRATEGY.id,
        source_id: sourceId,
      })),
    });

  return { rulesClient, reconcile };
};

describe('AlertingRuleReconciler', () => {
  it('creates a missing rule once, with the engine id and tags, and leaves it alone after', async () => {
    const { rulesClient, reconcile } = setUp();
    const rule = createRule();

    await expect(reconcile([rule])).resolves.toMatchObject({ created: 1, failures: [] });
    await expect(reconcile([rule])).resolves.toMatchObject({
      created: 0,
      deleted: 0,
      enabled: 0,
      disabled: 0,
    });

    expect(rulesClient.createCalls).toEqual([[getRuleId(rule)]]);
    expect(rulesClient.rules.get(getRuleId(rule))).toMatchObject({
      enabled: true,
      tags: [
        MANAGED_RULE_TAG,
        'nightshift:detection_engine:strategy:known_failures',
        'nightshift:detection_engine:source:source-1',
      ],
    });
  });

  it.each([
    [
      'query',
      createRule({ query: 'FROM logs | WHERE a' }),
      createRule({ query: 'FROM logs | WHERE b' }),
    ],
    ['lookback', createRule({ lookback: '361m' }), createRule({ lookback: '721m' })],
  ])('replaces the rule when its %s changes, without editing it', async (_, before, after) => {
    const { rulesClient, reconcile } = setUp();
    await reconcile([before]);

    await expect(reconcile([after])).resolves.toMatchObject({ created: 1, deleted: 1 });

    expect([...rulesClient.rules.keys()]).toEqual([getRuleId(after)]);
  });

  it('deletes the rules of a deleted source and keeps the rules of a disabled one, turned off', async () => {
    const { rulesClient, reconcile } = setUp();
    const deletedSourceRule = createRule({ sourceId: 'deleted' });
    const disabledSourceRule = createRule({ sourceId: 'disabled' });
    await reconcile([deletedSourceRule, disabledSourceRule]);

    await expect(
      reconcile([createRule({ sourceId: 'disabled', enabled: false })])
    ).resolves.toMatchObject({ deleted: 1, disabled: 1 });

    expect([...rulesClient.rules.values()]).toEqual([
      expect.objectContaining({ id: getRuleId(disabledSourceRule), enabled: false }),
    ]);
  });

  it('creates a disabled source rule turned off', async () => {
    const { rulesClient, reconcile } = setUp();
    const rule = createRule({ enabled: false });

    await reconcile([rule]);

    expect(rulesClient.rules.get(getRuleId(rule))?.enabled).toBe(false);
  });

  it('turns every rule off while paused and back on once resumed', async () => {
    const { rulesClient, reconcile } = setUp();
    const rule = createRule();
    await reconcile([rule]);

    await expect(reconcile([rule], { paused: true })).resolves.toMatchObject({ disabled: 1 });
    expect(rulesClient.rules.get(getRuleId(rule))?.enabled).toBe(false);

    await expect(reconcile([rule])).resolves.toMatchObject({ enabled: 1 });
    expect(rulesClient.rules.get(getRuleId(rule))?.enabled).toBe(true);
  });

  it('keeps every rule of a strategy whose resources failed, and reports it', async () => {
    const { rulesClient, reconcile } = setUp();
    const rule = createRule();
    await reconcile([rule]);

    await expect(reconcile([], { failed: [STRATEGY.id] })).resolves.toMatchObject({
      deleted: 0,
      strategy_errors: [{ strategy: STRATEGY.id, message: 'boom' }],
    });
    expect(rulesClient.rules.has(getRuleId(rule))).toBe(true);
  });

  it('keeps the rule of a source its strategy skipped, as it is', async () => {
    const { rulesClient, reconcile } = setUp();
    const rule = createRule();
    await reconcile([rule]);

    await expect(reconcile([], { skippedSources: ['source-1'] })).resolves.toMatchObject({
      deleted: 0,
      disabled: 0,
    });
    expect(rulesClient.rules.get(getRuleId(rule))?.enabled).toBe(true);
  });

  it('creates as many rules of a chunk as the schedule budget fits, and skips the rest', async () => {
    const rules = Array.from({ length: 100 }, (_, index) =>
      createRule({ sourceId: `source-${index}` })
    );
    // Forty rules running every five minutes, with room for rounding.
    const { reconcile } = setUp({ maxRunsPerMinute: 8.01 });

    const result = await reconcile(rules);

    expect(result.created).toBe(40);
    expect(result.skipped).toHaveLength(60);
    expect(result.failures).toEqual([]);
  });

  it('still creates a rule that runs less often than one the budget refused', async () => {
    const frequent = createRule({ sourceId: 'frequent', every: '30s' });
    const rare = createRule({ sourceId: 'rare', every: '5m' });
    const { rulesClient, reconcile } = setUp({ maxRunsPerMinute: 1 });

    const result = await reconcile([frequent, rare]);

    expect(result.skipped).toEqual([
      { rule_id: getRuleId(frequent), reason: 'Too many schedules' },
    ]);
    expect([...rulesClient.rules.keys()]).toEqual([getRuleId(rare)]);
  });

  it('turns a rule off before creating one in its slot, and skips a turn on the budget refuses', async () => {
    const first = createRule({ sourceId: 'first' });
    const second = createRule({ sourceId: 'second' });
    const { rulesClient, reconcile } = setUp({ maxRunsPerMinute: 0.2 });
    await reconcile([first]);

    await expect(
      reconcile([createRule({ sourceId: 'first', enabled: false }), second])
    ).resolves.toMatchObject({ disabled: 1, created: 1, skipped: [] });

    await expect(reconcile([first, second])).resolves.toMatchObject({
      enabled: 0,
      skipped: [{ rule_id: getRuleId(first), reason: 'Too many schedules' }],
    });
    expect(rulesClient.rules.get(getRuleId(first))?.enabled).toBe(false);
  });

  it('stops before changing anything once the call is aborted', async () => {
    const { rulesClient, reconcile } = setUp();
    const controller = new AbortController();
    controller.abort();

    await expect(reconcile([createRule()], { abortSignal: controller.signal })).rejects.toThrow();
    expect(rulesClient.createCalls).toEqual([]);
  });

  it('creates the rest of a chunk Alerting refuses for one invalid rule', async () => {
    const rules = Array.from({ length: 100 }, (_, index) =>
      createRule({ sourceId: `source-${index}` })
    );
    const { reconcile } = setUp({ invalidRuleIds: new Set([getRuleId(rules[42])]) });

    const result = await reconcile(rules);

    expect(result.created).toBe(99);
    expect(result.failures).toEqual([
      { rule_id: getRuleId(rules[42]), operation: 'create', message: 'Invalid rule data' },
    ]);
  });

  it('applies the other chunks when one chunk fails', async () => {
    const rules = Array.from({ length: 101 }, (_, index) =>
      createRule({ sourceId: `source-${index}` })
    );
    const { rulesClient, reconcile } = setUp({
      // The first chunk fails, so the second one proves the run goes on after a failure.
      failCreateOf: new Map([[getRuleId(rules[0]), 'create failed']]),
    });

    const result = await reconcile(rules);

    expect(result.created).toBe(1);
    expect(result.failures).toHaveLength(100);
    expect(result.failures[0]).toEqual({
      rule_id: getRuleId(rules[0]),
      operation: 'create',
      message: 'create failed',
    });
    expect([...rulesClient.rules.keys()]).toEqual([getRuleId(rules[100])]);
  });

  it('never deletes a rule it does not manage', async () => {
    const { rulesClient, reconcile } = setUp();
    rulesClient.rules.set('customer-rule', {
      id: 'customer-rule',
      enabled: true,
      tags: ['nightshift:source:source-1'],
      query: 'FROM logs',
      every: '5m',
    });

    await reconcile([]);

    expect(rulesClient.rules.has('customer-rule')).toBe(true);
  });
});
