/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Parser } from '@elastic/esql';
import type { EntityDefinitionWithoutId } from '@kbn/entity-store/common';
import {
  INVENTORY_DEFINITION_FIXTURES,
  k8sDeploymentFixture,
  k8sNodeFixture,
} from '../__fixtures__/definitions';
import { buildColumns, planColumnNames } from './columns';
import { InventoryDefinitionError } from './errors';
import { quoteIdentifier } from './esql_syntax';
import { resolveIdentityPlan } from './identity';
import { buildListQuery, generateListQueries } from './list_query';
import { assertParses } from './parse_guard';
import { planSources } from './source_plans';
import type { QueryEngine, TimeWindow } from './types';

jest.mock('./parse_guard', () => {
  const actual = jest.requireActual('./parse_guard');
  return { ...actual, assertParses: jest.fn(actual.assertParses) };
});

const window: TimeWindow = { from: '2026-10-19T10:00:00.000Z', to: '2026-10-19T11:00:00.000Z' };
const LIMIT = 10000;

const plansOf = (definition: EntityDefinitionWithoutId, engine: QueryEngine) =>
  planSources(
    definition,
    (definition.dynamic?.sources ?? []).map((): QueryEngine => engine)
  );

const cases = INVENTORY_DEFINITION_FIXTURES.flatMap((definition) =>
  (['TS', 'FROM'] as const).map((engine) => [definition.type, engine, definition] as const)
);

describe('buildListQuery', () => {
  beforeEach(() => {
    jest.mocked(assertParses).mockClear();
  });

  describe.each(cases)('%s under %s', (_type, engine, definition) => {
    const plans = plansOf(definition, engine);
    const identity = resolveIdentityPlan(definition);
    const columns = buildColumns(definition, plans, identity);

    it.each(plans.map((plan) => [plan.index, plan] as const))(
      'builds the list query of plan %i',
      (_index, plan) => {
        const query = buildListQuery({ plan, identity, columns, window, limit: LIMIT });
        const { esql, params } = query;
        const lines = esql.split('\n');

        expect(query).toMatchSnapshot();
        expect(params).toEqual([{ from: window.from }, { to: window.to }]);

        expect(lines[0]).toBe('SET unmapped_fields="nullify";');
        expect(lines[1]).toBe(`${engine} ${plan.indexPattern}`);
        expect(lines[2]).toBe('| WHERE `@timestamp` >= ?from AND `@timestamp` < ?to');
        expect(lines.slice(3, 5)).toEqual(
          plan.filter !== undefined
            ? [`    AND (${plan.filter})`, `    AND ${identity.presenceFilter}`]
            : [`    AND ${identity.presenceFilter}`, expect.stringMatching(/^\| STATS /)]
        );

        plan.attributes.forEach(({ name, field }) => {
          const quotedField = quoteIdentifier(field);
          expect(esql).toContain(
            `${quoteIdentifier(
              name
            )} = LAST(${quotedField}, \`@timestamp\`) WHERE ${quotedField} IS NOT NULL`
          );
        });
        expect(esql).toContain('`last_seen` = MAX(`@timestamp`)');

        const byLine = lines.find((line) => line.trimStart().startsWith('BY '));
        expect(byLine?.trim()).toBe(
          `BY ${identity.groupingFields.map(quoteIdentifier).join(', ')}`
        );

        expect(esql).toContain(`\n| EVAL ${identity.idEvaluation}\n`);

        const keepLine = lines.find((line) => line.startsWith('| KEEP '));
        expect(keepLine).toBe(
          `| KEEP ${planColumnNames(columns, plan).map(quoteIdentifier).join(', ')}`
        );

        expect(lines.slice(-2)).toEqual(['| SORT `last_seen` DESC NULLS LAST', `| LIMIT ${LIMIT}`]);

        expect(Parser.parse(esql).errors).toEqual([]);
        expect(assertParses).toHaveBeenCalledTimes(1);
        expect(assertParses).toHaveBeenCalledWith(esql);
      }
    );
  });

  it('drops the store helper columns from KEEP', () => {
    const plans = plansOf(k8sDeploymentFixture, 'FROM');
    const identity = resolveIdentityPlan(k8sDeploymentFixture);
    const { esql } = buildListQuery({
      plan: plans[0],
      identity,
      columns: buildColumns(k8sDeploymentFixture, plans, identity),
      window,
      limit: LIMIT,
    });
    const keepLine = esql.split('\n').find((line) => line.startsWith('| KEEP '));

    expect(esql).toContain('kubernetes_namespace_present_or_null =');
    expect(keepLine).not.toContain('_present');
  });

  it('keeps entity.id once when it is the identity field', () => {
    const definition: EntityDefinitionWithoutId = {
      ...k8sNodeFixture,
      identityField: { singleField: 'entity.id' },
    };
    const [{ esql }] = generateListQueries(definition, plansOf(definition, 'FROM'), window, LIMIT);
    const lines = esql.split('\n');
    const keepLine = lines.find((line) => line.startsWith('| KEEP '));

    expect(lines.find((line) => line.trimStart().startsWith('BY '))?.trim()).toBe('BY `entity.id`');
    expect(keepLine).toBe('| KEEP `entity.id`, `cluster`, `os`, `os.type`, `last_seen`');
    expect(keepLine?.match(/`entity\.id`/g)).toHaveLength(1);
    expect(Parser.parse(esql).errors).toEqual([]);
  });

  it('quotes reserved words and numeric path segments so the query parses', () => {
    const definition: EntityDefinitionWithoutId = {
      ...k8sDeploymentFixture,
      dynamic: {
        sources: [
          {
            indexPattern: 'metrics-system.*',
            attributes: [
              { name: 'last', field: 'count' },
              { name: 'load_1', field: 'system.load.1' },
            ],
          },
        ],
      },
    };
    const [{ esql }] = generateListQueries(definition, plansOf(definition, 'TS'), window, LIMIT);

    expect(esql).toContain('`last` = LAST(`count`, `@timestamp`) WHERE `count` IS NOT NULL');
    expect(esql).toContain(
      '`load_1` = LAST(`system.load.1`, `@timestamp`) WHERE `system.load.1` IS NOT NULL'
    );
    expect(Parser.parse(esql).errors).toEqual([]);
  });

  it('reads an attribute whose name equals its own source field', () => {
    const definition: EntityDefinitionWithoutId = {
      ...k8sDeploymentFixture,
      dynamic: {
        sources: [
          {
            indexPattern: 'metrics-system.cpu-*',
            attributes: [{ name: 'host.os.type', field: 'host.os.type' }],
          },
        ],
      },
    };
    const [{ esql }] = generateListQueries(definition, plansOf(definition, 'FROM'), window, LIMIT);

    expect(esql).toContain(
      '`host.os.type` = LAST(`host.os.type`, `@timestamp`) WHERE `host.os.type` IS NOT NULL'
    );
    expect(esql.split('\n').find((line) => line.startsWith('| KEEP '))).toContain('`host.os.type`');
    expect(Parser.parse(esql).errors).toEqual([]);
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])('rejects a limit of %p', (limit) => {
    const plans = plansOf(k8sDeploymentFixture, 'FROM');
    const identity = resolveIdentityPlan(k8sDeploymentFixture);

    expect(() =>
      buildListQuery({
        plan: plans[0],
        identity,
        columns: buildColumns(k8sDeploymentFixture, plans, identity),
        window,
        limit,
      })
    ).toThrow(RangeError);
    expect(() => generateListQueries(k8sDeploymentFixture, plans, window, limit)).toThrow(
      'list query limit must be a positive integer'
    );
  });
});

describe('generateListQueries', () => {
  it('returns one query per plan in plan order for k8s.deployment', () => {
    const plans = plansOf(k8sDeploymentFixture, 'FROM');
    const queries = generateListQueries(k8sDeploymentFixture, plans, window, LIMIT);

    expect(queries).toHaveLength(plans.length);
    queries.forEach(({ esql }, index) => {
      expect(esql.split('\n')[1]).toBe(`FROM ${plans[index].indexPattern}`);
    });
  });

  it('builds k8s.deployment plans that differ only in pattern, filter and the paused attribute', () => {
    const plans = plansOf(k8sDeploymentFixture, 'TS');
    const [kubeletstats, stateDeployment] = generateListQueries(
      k8sDeploymentFixture,
      plans,
      window,
      LIMIT
    ).map(({ esql }) => esql);

    const normalised = stateDeployment
      .replace('metrics-kubernetes.state_deployment-*', 'metrics-kubeletstatsreceiver.otel-default')
      .replace('\n    AND (metricset.name == "state_deployment")', '')
      .replace(
        ',\n    `paused` = LAST(`kubernetes.deployment.paused`, `@timestamp`) WHERE `kubernetes.deployment.paused` IS NOT NULL',
        ''
      )
      .replace(', `paused`, ', ', ');

    expect(stateDeployment).not.toBe(kubeletstats);
    expect(normalised).toBe(kubeletstats);
  });

  it('generates the full k8s.deployment state_deployment query under TS', () => {
    const [, { esql }] = generateListQueries(
      k8sDeploymentFixture,
      plansOf(k8sDeploymentFixture, 'TS'),
      window,
      LIMIT
    );

    expect(esql).toBe(`SET unmapped_fields="nullify";
TS metrics-kubernetes.state_deployment-*
| WHERE \`@timestamp\` >= ?from AND \`@timestamp\` < ?to
    AND (metricset.name == "state_deployment")
    AND (TO_STRING(kubernetes.namespace) IS NOT NULL AND TO_STRING(kubernetes.namespace) != "" AND TO_STRING(kubernetes.deployment.name) IS NOT NULL AND TO_STRING(kubernetes.deployment.name) != "")
| STATS \`cluster\` = LAST(\`orchestrator.cluster.name\`, \`@timestamp\`) WHERE \`orchestrator.cluster.name\` IS NOT NULL,
    \`paused\` = LAST(\`kubernetes.deployment.paused\`, \`@timestamp\`) WHERE \`kubernetes.deployment.paused\` IS NOT NULL,
    \`last_seen\` = MAX(\`@timestamp\`)
    BY \`kubernetes.namespace\`, \`kubernetes.deployment.name\`
| EVAL kubernetes_namespace_present = TO_STRING(kubernetes.namespace) IS NOT NULL AND TO_STRING(kubernetes.namespace) != "",
 kubernetes_deployment_name_present = TO_STRING(kubernetes.deployment.name) IS NOT NULL AND TO_STRING(kubernetes.deployment.name) != "",
 kubernetes_namespace_present_or_null = CASE(kubernetes_namespace_present, TO_STRING(kubernetes.namespace)),
 kubernetes_deployment_name_present_or_null = CASE(kubernetes_deployment_name_present, TO_STRING(kubernetes.deployment.name)),
 entity.id = CONCAT("k8s.deployment:", CONCAT(kubernetes_namespace_present_or_null, "/", kubernetes_deployment_name_present_or_null))
| KEEP \`entity.id\`, \`kubernetes.namespace\`, \`kubernetes.deployment.name\`, \`cluster\`, \`paused\`, \`last_seen\`
| SORT \`last_seen\` DESC NULLS LAST
| LIMIT 10000`);
  });

  it('rejects an unsafe index pattern before assembling a query', () => {
    const definition: EntityDefinitionWithoutId = {
      ...k8sDeploymentFixture,
      dynamic: { sources: [{ indexPattern: 'logs-* | DROP x' }] },
    };

    expect(() =>
      generateListQueries(definition, plansOf(definition, 'FROM'), window, LIMIT)
    ).toThrow(InventoryDefinitionError);
  });

  it('rejects an unsafe filter before assembling a query', () => {
    const definition: EntityDefinitionWithoutId = {
      ...k8sDeploymentFixture,
      dynamic: { sources: [{ indexPattern: 'logs-*', filter: 'true | DROP x' }] },
    };

    expect(() =>
      generateListQueries(definition, plansOf(definition, 'FROM'), window, LIMIT)
    ).toThrow(InventoryDefinitionError);
  });

  it('throws for a definition without dynamic', () => {
    const { dynamic, ...definition } = k8sDeploymentFixture;

    expect(() =>
      generateListQueries(definition, plansOf(k8sDeploymentFixture, 'FROM'), window, LIMIT)
    ).toThrow(InventoryDefinitionError);
  });
});
