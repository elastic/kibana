/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Parser } from '@elastic/esql';
import { INVENTORY_DEFINITION_FIXTURES, k8sDeploymentFixture } from '../__fixtures__/definitions';
import { probeAllAs } from '../__fixtures__/source_probes';
import {
  buildAttributeValuesQuery,
  generateAttributeValuesQueries,
} from './attribute_values_query';
import { buildColumns } from './columns';
import { resolveIdentityPlan } from './identity';
import { assertParses } from './parse_guard';
import { planSources } from './source_plans';
import type { TimeWindow } from './types';

jest.mock('./parse_guard', () => {
  const actual = jest.requireActual('./parse_guard');
  return { ...actual, assertParses: jest.fn(actual.assertParses) };
});

const window: TimeWindow = { from: '2026-10-19T10:00:00.000Z', to: '2026-10-19T11:00:00.000Z' };
const LIMIT = 100;
const WINDOW_PREDICATE = '`@timestamp` >= ?from AND `@timestamp` < ?to';

// Plan 0 is `TS` and plan 1 is `FROM` over the first source, which declares `cluster`; plans 2 and
// 3 are `TS` and `FROM` over the second, which declares `cluster` and `paused` and has a filter.
const plans = planSources(k8sDeploymentFixture, probeAllAs(k8sDeploymentFixture, true));
const identity = resolveIdentityPlan(k8sDeploymentFixture);
const columns = buildColumns(k8sDeploymentFixture, plans, identity);

const build = (planIndex: number, attribute: string, selections = {}) =>
  buildAttributeValuesQuery({
    plan: plans[planIndex],
    identity,
    columns,
    attribute,
    selections,
    window,
    limit: LIMIT,
  });

const cases = INVENTORY_DEFINITION_FIXTURES.map(
  (definition) => [definition.type, definition] as const
);

describe('buildAttributeValuesQuery', () => {
  beforeEach(() => {
    jest.mocked(assertParses).mockClear();
  });

  describe.each(cases)('%s with time-series indices', (_type, definition) => {
    const fixturePlans = planSources(definition, probeAllAs(definition, true));
    const fixtureIdentity = resolveIdentityPlan(definition);
    const fixtureColumns = buildColumns(definition, fixturePlans, fixtureIdentity);
    const attribute = fixtureColumns.find(({ kind }) => kind === 'attribute')?.name ?? '';

    it.each(fixturePlans.map((plan) => [plan.index, plan.engine, plan] as const))(
      'builds the values query of plan %i under %s',
      (_index, _engine, plan) => {
        const query = buildAttributeValuesQuery({
          plan,
          identity: fixtureIdentity,
          columns: fixtureColumns,
          attribute,
          selections: {},
          window,
          limit: LIMIT,
        });

        expect(query).toMatchSnapshot();
        expect(Parser.parse(query?.esql ?? '').errors).toEqual([]);
        expect(assertParses).toHaveBeenCalledTimes(1);
        expect(assertParses).toHaveBeenCalledWith(query?.esql);
      }
    );
  });

  it('lists the distinct values of the attribute under the time-series engine', () => {
    const query = build(0, 'cluster');

    expect(query?.esql.split('\n')).toEqual([
      'SET unmapped_fields="nullify";',
      `TS ${plans[0].indexPattern}`,
      `| WHERE ${WINDOW_PREDICATE}`,
      `    AND ${identity.presenceFilter}`,
      '| STATS `last_seen` = MAX(`@timestamp`) BY `value` = TO_STRING(`orchestrator.cluster.name`)',
      '| WHERE `value` IS NOT NULL',
      '| KEEP `value`',
      '| SORT `value` ASC',
      `| LIMIT ${LIMIT}`,
    ]);
    expect(query?.params).toEqual([{ from: window.from }, { to: window.to }]);
  });

  it('skips the time-series indices under the other engine', () => {
    const lines = build(1, 'cluster')?.esql.split('\n');

    expect(lines?.slice(1, 4)).toEqual([
      `FROM ${plans[1].indexPattern} METADATA _index_mode`,
      '| WHERE `_index_mode` != "time_series"',
      `    AND ${WINDOW_PREDICATE}`,
    ]);
  });

  it("applies the source's own filter", () => {
    const esql = build(3, 'cluster')?.esql;

    expect(esql).toContain(`    AND (${plans[3].filter})`);
  });

  it('reads the attribute from the field of the plan source', () => {
    expect(build(3, 'paused')?.esql).toContain(
      'BY `value` = TO_STRING(`kubernetes.deployment.paused`)'
    );
  });

  it('adds the other selections and their parameters', () => {
    const query = build(3, 'cluster', { paused: ['true'] });

    expect(query?.esql).toContain('    AND TO_STRING(`kubernetes.deployment.paused`) IN (?a0v0)');
    expect(query?.params).toEqual([{ from: window.from }, { to: window.to }, { a0v0: 'true' }]);
  });

  it('produces a query that parses', () => {
    plans.forEach(({ index }) => {
      const query = build(index, 'cluster', { paused: ['true'] });
      if (query) {
        expect(Parser.parse(query.esql).errors).toEqual([]);
      }
    });
  });

  it('returns nothing for a plan whose source declares no field for the attribute', () => {
    expect(build(0, 'paused')).toBeUndefined();
    expect(build(0, 'unknown')).toBeUndefined();
  });

  it('returns nothing for a plan that cannot match the selections', () => {
    expect(build(0, 'cluster', { paused: ['true'] })).toBeUndefined();
  });

  it.each([0, -1, 1.5])('rejects the limit %s', (limit) => {
    expect(() =>
      buildAttributeValuesQuery({
        plan: plans[0],
        identity,
        columns,
        attribute: 'cluster',
        selections: {},
        window,
        limit,
      })
    ).toThrow(RangeError);
  });
});

describe('generateAttributeValuesQueries', () => {
  it('builds one entry per plan, in plan order, empty where a plan cannot contribute', () => {
    const queries = generateAttributeValuesQueries(k8sDeploymentFixture, plans, {
      attribute: 'paused',
      selections: {},
      window,
      limit: LIMIT,
    });

    expect(queries).toHaveLength(plans.length);
    expect(queries.map((query) => query !== undefined)).toEqual([false, false, true, true]);
  });
});
