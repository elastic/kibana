/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Parser } from '@elastic/esql';
import type { EntityDefinitionWithoutId } from '@kbn/entity-store/common';
import { hostLikeFixture, k8sDeploymentFixture, k8sNodeFixture } from '../__fixtures__/definitions';
import { backingIndexOf, resolveAllAs } from '../__fixtures__/resolved_sources';
import {
  COUNT_COLUMN,
  RAW_GROUPS_COLUMN,
  buildCountQuery,
  generateCountQuery,
} from './count_query';
import { resolveIdentityPlan } from './identity';
import { assertParses } from './parse_guard';
import { planSources } from './source_plans';
import type { GeneratedQuery } from './types';

jest.mock('./parse_guard', () => {
  const actual = jest.requireActual('./parse_guard');
  return { ...actual, assertParses: jest.fn(actual.assertParses) };
});

const window = { from: '2026-10-19T00:00:00.000Z', to: '2026-10-19T01:00:00.000Z' };

// The same pattern on two sources, each with its own filter.
const sharedPatternDefinition: EntityDefinitionWithoutId = {
  ...k8sDeploymentFixture,
  dynamic: {
    sources: [
      {
        indexPattern: 'metrics-kubernetes.*',
        filter: 'metricset.name == "state_deployment"',
      },
      {
        indexPattern: 'metrics-kubernetes.*',
        filter: 'metricset.name == "state_replicaset"',
      },
    ],
  },
};

const countOf = (definition: EntityDefinitionWithoutId): GeneratedQuery => {
  const plans = planSources(definition, resolveAllAs(definition, 'time_series'));
  return generateCountQuery(definition, plans, window);
};

const expectParses = (esql: string): void => {
  expect(Parser.parse(esql).errors).toEqual([]);
};

// Continuation lines (WHERE predicates, EVAL assignments) are indented; commands are not.
const commandsOf = (esql: string): string[] => esql.split('\n').filter((line) => !/^\s/.test(line));

const expectGuarded = (esql: string): void => {
  expect(assertParses).toHaveBeenCalledTimes(1);
  expect(assertParses).toHaveBeenCalledWith(esql);
};

describe('buildCountQuery', () => {
  beforeEach(() => {
    jest.mocked(assertParses).mockClear();
  });

  it('counts k8s.node from its single plan without any _index clause', () => {
    const { esql, params } = countOf(k8sNodeFixture);
    expect(esql).toMatchSnapshot();
    expectParses(esql);
    expectGuarded(esql);
    expect(params).toEqual([{ from: window.from }, { to: window.to }]);
    expect(esql).toContain('\nFROM metrics-kubeletstatsreceiver.otel-default\n');
    expect(esql).not.toContain('METADATA');
    expect(esql).not.toContain('_index');
    expect(esql).toContain('\n| WHERE `@timestamp` >= ?from AND `@timestamp` < ?to\n');
    expect(esql).not.toMatch(/^TS /m);
    expect(esql).toMatch(/\n\| STATS `count` = COUNT\(\*\), `raw_groups` = COUNT\(\*\)$/);
    expect(esql).not.toContain('COUNT_DISTINCT');
    expect(esql).not.toContain('| EVAL');
  });

  it('counts k8s.deployment across both plans, filtering only the state plan', () => {
    const { esql, params } = countOf(k8sDeploymentFixture);
    expect(esql).toMatchSnapshot();
    expectParses(esql);
    expectGuarded(esql);
    expect(esql).toContain(
      '\nFROM metrics-kubeletstatsreceiver.otel-default, metrics-kubernetes.state_deployment-* METADATA _index\n'
    );
    expect(esql).toContain(
      '\n    AND ((`_index` IN (?i0_0)) OR (`_index` IN (?i1_0) AND (metricset.name == "state_deployment")))\n'
    );
    expect(esql).not.toContain('LIKE');
    expect(params).toEqual([
      { from: window.from },
      { to: window.to },
      { i0_0: backingIndexOf('metrics-kubeletstatsreceiver.otel-default') },
      { i1_0: backingIndexOf('metrics-kubernetes.state_deployment-*') },
    ]);
    expect(esql.split('metricset.name').length - 1).toBe(1);
    expect(esql).toContain('| STATS BY `kubernetes.namespace`, `kubernetes.deployment.name`\n');
    expect(esql).toContain(
      `\n| EVAL ${
        resolveIdentityPlan(k8sDeploymentFixture).idEvaluation
      }\n| STATS \`rows\` = COUNT(*) BY \`entity.id\`\n`
    );
    expect(esql).toMatch(
      /\n\| STATS `rows` = COUNT\(\*\) BY `entity\.id`\n\| STATS `count` = COUNT\(\*\), `raw_groups` = COALESCE\(SUM\(`rows`\), 0\)$/
    );
    expect(esql).not.toContain('COUNT_DISTINCT');
  });

  it('counts a ranked identity by evaluating the id and counting the id groups', () => {
    const { esql } = countOf(hostLikeFixture);
    expect(esql).toMatchSnapshot();
    expectParses(esql);
    expectGuarded(esql);
    expect(Parser.parse(esql).root.commands.map(({ name }) => name)).toEqual([
      'from',
      'where',
      'stats',
      'eval',
      'stats',
      'stats',
    ]);
    expect(esql).toContain(`\n| EVAL ${resolveIdentityPlan(hostLikeFixture).idEvaluation}\n`);
    expect(esql).toContain('\n| STATS BY `host.id`, `host.name`\n| EVAL ');
    expect(esql).toMatch(
      /\n\| STATS `rows` = COUNT\(\*\) BY `entity\.id`\n\| STATS `count` = COUNT\(\*\), `raw_groups` = COALESCE\(SUM\(`rows`\), 0\)$/
    );
    expect(esql).not.toContain('COUNT_DISTINCT');
  });

  it('lists a pattern shared by two plans once while keeping both branches', () => {
    const { esql } = countOf(sharedPatternDefinition);
    expect(esql).toMatchSnapshot();
    expectParses(esql);
    expectGuarded(esql);
    expect(esql).toContain('\nFROM metrics-kubernetes.* METADATA _index\n');
    expect(esql).toContain(
      '((`_index` IN (?i0_0) AND (metricset.name == "state_deployment")) OR (`_index` IN (?i1_0) AND (metricset.name == "state_replicaset")))'
    );
  });

  it('ANDs the filter of a single filtered plan directly, without an _index clause', () => {
    const [plan] = planSources(
      sharedPatternDefinition,
      resolveAllAs(sharedPatternDefinition, 'standard')
    );
    const { esql, params } = buildCountQuery({
      plans: [plan],
      identity: resolveIdentityPlan(sharedPatternDefinition),
      window,
    });
    expectParses(esql);
    expect(esql).not.toContain('_index');
    expect(esql).toContain('\n    AND (metricset.name == "state_deployment")\n');
    expect(params).toEqual([{ from: window.from }, { to: window.to }]);
  });

  it('passes every index of every plan as its own parameter when a source is split', () => {
    const definition: EntityDefinitionWithoutId = {
      ...k8sNodeFixture,
      dynamic: { sources: [{ indexPattern: 'metrics-*-*' }, { indexPattern: 'metrics-system.*' }] },
    };
    const plans = planSources(definition, [
      {
        indices: [
          { name: 'metrics-b-ts', mode: 'time_series' },
          { name: 'metrics-a-ts', mode: 'time_series' },
          { name: 'metrics-c-std', mode: 'standard' },
        ],
      },
      { indices: [{ name: 'metrics-system.cpu', mode: 'standard' }] },
    ]);
    const { esql, params } = generateCountQuery(definition, plans, window);
    expectParses(esql);
    expect(esql).toContain('\nFROM metrics-*-*, metrics-system.* METADATA _index\n');
    expect(esql).toContain(
      '\n    AND ((`_index` IN (?i0_0, ?i0_1)) OR (`_index` IN (?i1_0)) OR (`_index` IN (?i2_0)))\n'
    );
    expect(params).toEqual([
      { from: window.from },
      { to: window.to },
      { i0_0: 'metrics-a-ts' },
      { i0_1: 'metrics-b-ts' },
      { i1_0: 'metrics-c-std' },
      { i2_0: 'metrics-system.cpu' },
    ]);
    expect(esql).not.toContain('metrics-a-ts');
  });

  it('matches the indices of a single plan split from its source, which covers only part of the pattern', () => {
    const definition: EntityDefinitionWithoutId = {
      ...k8sNodeFixture,
      dynamic: { sources: [{ indexPattern: 'metrics-*-*' }] },
    };
    const [tsPlan] = planSources(definition, [
      {
        indices: [
          { name: 'metrics-a-ts', mode: 'time_series' },
          { name: 'metrics-c-std', mode: 'standard' },
        ],
      },
    ]);
    const { esql, params } = buildCountQuery({
      plans: [tsPlan],
      identity: resolveIdentityPlan(definition),
      window,
    });
    expectParses(esql);
    expect(esql).toContain('\nFROM metrics-*-* METADATA _index\n');
    expect(esql).toContain('\n    AND ((`_index` IN (?i0_0)))\n');
    expect(params).toEqual([{ from: window.from }, { to: window.to }, { i0_0: 'metrics-a-ts' }]);
  });

  it.each([
    [k8sNodeFixture.type, k8sNodeFixture],
    [k8sDeploymentFixture.type, k8sDeploymentFixture],
    [hostLikeFixture.type, hostLikeFixture],
  ] as const)('returns the count and raw_groups columns for %s', (_type, definition) => {
    const lines = countOf(definition).esql.split('\n');
    expect(lines[lines.length - 1]).toMatch(
      new RegExp(`^\\| STATS \`${COUNT_COLUMN}\` = COUNT\\(\\*\\), \`${RAW_GROUPS_COLUMN}\` = `)
    );
  });

  it('always uses FROM, whatever the engines of the plans', () => {
    const plans = planSources(
      k8sDeploymentFixture,
      resolveAllAs(k8sDeploymentFixture, 'time_series')
    );
    const { esql } = generateCountQuery(k8sDeploymentFixture, plans, window);
    expect(commandsOf(esql)[1]).toMatch(/^FROM /);
    expect(esql).not.toMatch(/^TS /m);
  });

  it('puts one command per line', () => {
    const commands = commandsOf(countOf(k8sDeploymentFixture).esql);
    expect(commands[0]).toBe('SET unmapped_fields="nullify";');
    expect(commands.slice(2).every((command) => command.startsWith('| '))).toBe(true);
  });

  it('throws without plans', () => {
    expect(() =>
      buildCountQuery({ plans: [], identity: resolveIdentityPlan(k8sNodeFixture), window })
    ).toThrow(/at least one plan/);
  });
});

describe('generateCountQuery', () => {
  it('equals buildCountQuery with the resolved identity for k8s.deployment', () => {
    const plans = planSources(k8sDeploymentFixture, [
      { indices: [{ name: 'metrics-a', mode: 'time_series' }] },
      { indices: [{ name: 'metrics-b', mode: 'standard' }] },
    ]);
    expect(generateCountQuery(k8sDeploymentFixture, plans, window)).toEqual(
      buildCountQuery({ plans, identity: resolveIdentityPlan(k8sDeploymentFixture), window })
    );
  });
});
