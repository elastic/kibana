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
  enabled = true,
  strategy = STRATEGY,
}: {
  sourceId?: string;
  query?: string;
  lookback?: string;
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
      schedule: { every: '5m', lookback },
      query: { base: query },
    },
  },
});

const getRuleId = ({ strategy, resource }: StrategyAlertingRule) => {
  const { metadata, ...rule } = resource.data;
  return computeRuleId({
    spaceId: SPACE_ID,
    strategy: strategy.id,
    sourceId: resource.source_id,
    rule,
  });
};

const setUp = (options?: ConstructorParameters<typeof InMemoryRulesClient>[0]) => {
  const rulesClient = new InMemoryRulesClient(options);
  const client = rulesClient as unknown as RulesClientApi;
  const reconciler = new AlertingRuleReconciler(
    client,
    new ManagedRuleReader(client, {} as ElasticsearchClient),
    loggingSystemMock.createLogger()
  );
  const reconcile = (
    desired: StrategyAlertingRule[],
    { paused = false, failed = [] as string[] } = {}
  ) =>
    reconciler.reconcile({
      spaceId: SPACE_ID,
      desired,
      paused,
      strategyErrors: failed.map((strategy) => ({ strategy, message: 'boom' })),
    });

  return { rulesClient, reconcile };
};

describe('AlertingRuleReconciler', () => {
  it('creates a missing rule once, with the engine id, tags and name, and leaves it alone after', async () => {
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
        'detection_engine:strategy:known_failures',
        'detection_engine:source:source-1',
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

  it('reports rules refused for the schedule budget as skipped, not failed', async () => {
    const { reconcile } = setUp({ maxEnabledRules: 0 });

    const result = await reconcile([createRule()]);

    expect(result.skipped).toEqual([
      { rule_id: getRuleId(createRule()), reason: 'Too many schedules' },
    ]);
    expect(result.failures).toEqual([]);
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
    });

    await reconcile([]);

    expect(rulesClient.rules.has('customer-rule')).toBe(true);
  });
});
