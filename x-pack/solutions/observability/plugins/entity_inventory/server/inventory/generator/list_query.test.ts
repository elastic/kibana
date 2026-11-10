/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Parser } from '@elastic/esql';
import type { EntityDefinitionWithoutId } from '@kbn/entity-store/common';
import { euid } from '@kbn/entity-store/common/euid_helpers';
import {
  INVENTORY_DEFINITION_FIXTURES,
  entityIdFixture,
  k8sDeploymentFixture,
  k8sNodeFixture,
  rankedEntityIdFixture,
} from '../__fixtures__/definitions';
import { probeAllAs } from '../__fixtures__/source_probes';
import { buildColumns, planColumnNames } from './columns';
import { InventoryDefinitionError } from './errors';
import { quoteIdentifier } from './esql_syntax';
import { resolveIdentityPlan } from './identity';
import { buildListQuery, generateListQueries } from './list_query';
import { assertParses } from './parse_guard';
import { planSources } from './source_plans';
import type { QueryPlan, TimeWindow } from './types';

jest.mock('./parse_guard', () => {
  const actual = jest.requireActual('./parse_guard');
  return { ...actual, assertParses: jest.fn(actual.assertParses) };
});

const window: TimeWindow = { from: '2026-10-19T10:00:00.000Z', to: '2026-10-19T11:00:00.000Z' };
const LIMIT = 10000;

const plansOf = (definition: EntityDefinitionWithoutId, hasTimeSeries: boolean) =>
  planSources(definition, probeAllAs(definition, hasTimeSeries));

const WINDOW_PREDICATE = '`@timestamp` >= ?from AND `@timestamp` < ?to';

// The source line and the leading `WHERE` lines each engine writes before the plan's filter.
const sourceLinesOf = ({ engine, indexPattern }: QueryPlan): string[] =>
  engine === 'TS'
    ? [`TS ${indexPattern}`, `| WHERE ${WINDOW_PREDICATE}`]
    : [
        `FROM ${indexPattern} METADATA _index_mode`,
        '| WHERE `_index_mode` != "time_series"',
        `    AND ${WINDOW_PREDICATE}`,
      ];

const cases = INVENTORY_DEFINITION_FIXTURES.map(
  (definition) => [definition.type, definition] as const
);

describe('buildListQuery', () => {
  beforeEach(() => {
    jest.mocked(assertParses).mockClear();
  });

  describe.each(cases)('%s with time-series indices', (_type, definition) => {
    const plans = plansOf(definition, true);
    const identity = resolveIdentityPlan(definition);
    const columns = buildColumns(definition, plans, identity);

    it.each(plans.map((plan) => [plan.index, plan.engine, plan] as const))(
      'builds the list query of plan %i under %s',
      (_index, _engine, plan) => {
        const query = buildListQuery({ plan, identity, columns, window, limit: LIMIT });
        const { esql, params } = query;
        const lines = esql.split('\n');

        expect(query).toMatchSnapshot();
        expect(params).toEqual([{ from: window.from }, { to: window.to }]);

        const sourceLines = sourceLinesOf(plan);
        const afterSource = 1 + sourceLines.length;
        expect(lines[0]).toBe('SET unmapped_fields="nullify";');
        expect(lines.slice(1, afterSource)).toEqual(sourceLines);
        expect(lines.slice(afterSource, afterSource + 2)).toEqual(
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

        expect(lines.slice(-2)).toEqual([
          '| SORT `last_seen` DESC NULLS LAST, `entity.id` ASC',
          `| LIMIT ${LIMIT}`,
        ]);

        expect(Parser.parse(esql).errors).toEqual([]);
        expect(assertParses).toHaveBeenCalledTimes(1);
        expect(assertParses).toHaveBeenCalledWith(esql);
      }
    );
  });

  it('drops the store helper columns from KEEP', () => {
    const plans = plansOf(k8sDeploymentFixture, false);
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

  it.each([
    [
      entityIdFixture.type,
      entityIdFixture,
      'BY `entity.id`',
      '| KEEP `entity.id`, `cluster`, `os`, `os.type`, `last_seen`, `raw:entity.id`',
    ],
    [
      rankedEntityIdFixture.type,
      rankedEntityIdFixture,
      'BY `entity.id`, `host.hostname`',
      '| KEEP `entity.id`, `host.hostname`, `os`, `last_seen`, `raw:entity.id`',
    ],
  ] as const)(
    'keeps entity.id once for %s, with its raw value copied before the id evaluation',
    (_type, definition, byLine, keepLine) => {
      const [{ esql }] = generateListQueries(definition, plansOf(definition, false), window, LIMIT);
      const lines = esql.split('\n');

      expect(esql).toMatchSnapshot();
      expect(lines.find((line) => line.trimStart().startsWith('BY '))?.trim()).toBe(byLine);
      expect(esql).toContain(
        `\n| EVAL \`raw:entity.id\` = \`entity.id\`, ${
          resolveIdentityPlan(definition).idEvaluation
        }\n`
      );
      expect(lines.find((line) => line.startsWith('| KEEP '))).toBe(keepLine);
      expect(Parser.parse(esql).errors).toEqual([]);

      // The TS plan carries the same raw column lines.
      const [ts] = generateListQueries(definition, plansOf(definition, true), window, LIMIT);
      const tsLines = ts.esql.split('\n');
      expect(tsLines[1]).toMatch(/^TS /);
      expect(
        tsLines.filter((line) => line.startsWith('| EVAL ') || line.startsWith('| KEEP '))
      ).toEqual(lines.filter((line) => line.startsWith('| EVAL ') || line.startsWith('| KEEP ')));
    }
  );

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
    const [{ esql }] = generateListQueries(definition, plansOf(definition, true), window, LIMIT);

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
    const [{ esql }] = generateListQueries(definition, plansOf(definition, false), window, LIMIT);

    expect(esql).toContain(
      '`host.os.type` = LAST(`host.os.type`, `@timestamp`) WHERE `host.os.type` IS NOT NULL'
    );
    expect(esql.split('\n').find((line) => line.startsWith('| KEEP '))).toContain('`host.os.type`');
    expect(Parser.parse(esql).errors).toEqual([]);
  });

  it.each([0, -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY])('rejects a limit of %p', (limit) => {
    const plans = plansOf(k8sDeploymentFixture, false);
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
    const plans = plansOf(k8sDeploymentFixture, true);
    const queries = generateListQueries(k8sDeploymentFixture, plans, window, LIMIT);

    expect(queries).toHaveLength(plans.length);
    queries.forEach(({ esql }, index) => {
      expect(esql.split('\n')[1]).toBe(sourceLinesOf(plans[index])[0]);
    });
  });

  it('builds k8s.deployment plans that differ only in pattern, filter and the paused attribute', () => {
    const plans = plansOf(k8sDeploymentFixture, false);
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

  it('generates both plans of the k8s.deployment state_deployment source, TS first', () => {
    const [, , tsQuery, fromQuery] = generateListQueries(
      k8sDeploymentFixture,
      plansOf(k8sDeploymentFixture, true),
      window,
      LIMIT
    );
    const namespaceValue = euid.esql.getIdentityValue('kubernetes.namespace');
    const nameValue = euid.esql.getIdentityValue('kubernetes.deployment.name');
    const tail = `    AND (metricset.name == "state_deployment")
    AND (${namespaceValue} IS NOT NULL AND ${nameValue} IS NOT NULL)
| STATS \`cluster\` = LAST(\`orchestrator.cluster.name\`, \`@timestamp\`) WHERE \`orchestrator.cluster.name\` IS NOT NULL,
    \`paused\` = LAST(\`kubernetes.deployment.paused\`, \`@timestamp\`) WHERE \`kubernetes.deployment.paused\` IS NOT NULL,
    \`last_seen\` = MAX(\`@timestamp\`)
    BY \`kubernetes.namespace\`, \`kubernetes.deployment.name\`
| EVAL kubernetes_namespace_present = ${namespaceValue} IS NOT NULL,
 kubernetes_deployment_name_present = ${nameValue} IS NOT NULL,
 kubernetes_namespace_present_or_null = CASE(kubernetes_namespace_present, ${namespaceValue}),
 kubernetes_deployment_name_present_or_null = CASE(kubernetes_deployment_name_present, ${nameValue}),
 entity.id = CONCAT("k8s.deployment:", CONCAT(kubernetes_namespace_present_or_null, "/", kubernetes_deployment_name_present_or_null))
| KEEP \`entity.id\`, \`kubernetes.namespace\`, \`kubernetes.deployment.name\`, \`cluster\`, \`paused\`, \`last_seen\`
| SORT \`last_seen\` DESC NULLS LAST, \`entity.id\` ASC
| LIMIT 10000`;

    expect(tsQuery.esql).toBe(`SET unmapped_fields="nullify";
TS metrics-kubernetes.state_deployment-*
| WHERE \`@timestamp\` >= ?from AND \`@timestamp\` < ?to
${tail}`);
    expect(fromQuery.esql).toBe(`SET unmapped_fields="nullify";
FROM metrics-kubernetes.state_deployment-* METADATA _index_mode
| WHERE \`_index_mode\` != "time_series"
    AND \`@timestamp\` >= ?from AND \`@timestamp\` < ?to
${tail}`);
  });

  it('names the pattern as written under both engines, with no concrete index', () => {
    const definition: EntityDefinitionWithoutId = {
      ...k8sNodeFixture,
      dynamic: { sources: [{ indexPattern: 'metrics-*-*', filter: 'service.type == "k8s"' }] },
    };
    const queries = generateListQueries(definition, plansOf(definition, true), window, LIMIT);

    expect(queries.map(({ esql }) => esql.split('\n')[1])).toEqual([
      'TS metrics-*-*',
      'FROM metrics-*-* METADATA _index_mode',
    ]);
    queries.forEach(({ esql, params }) => {
      expect(esql).toContain('\n    AND (service.type == "k8s")\n');
      expect(params).toEqual([{ from: window.from }, { to: window.to }]);
      expect(Parser.parse(esql).errors).toEqual([]);
    });
  });

  it('rejects an unsafe index pattern before assembling a query', () => {
    const definition: EntityDefinitionWithoutId = {
      ...k8sDeploymentFixture,
      dynamic: { sources: [{ indexPattern: 'logs-* | DROP x' }] },
    };

    expect(() =>
      generateListQueries(definition, plansOf(definition, false), window, LIMIT)
    ).toThrow(InventoryDefinitionError);
  });

  it('rejects an unsafe filter before assembling a query', () => {
    const definition: EntityDefinitionWithoutId = {
      ...k8sDeploymentFixture,
      dynamic: { sources: [{ indexPattern: 'logs-*', filter: 'true | DROP x' }] },
    };

    expect(() =>
      generateListQueries(definition, plansOf(definition, false), window, LIMIT)
    ).toThrow(InventoryDefinitionError);
  });

  it('throws for a definition without dynamic', () => {
    const { dynamic, ...definition } = k8sDeploymentFixture;

    expect(() =>
      generateListQueries(definition, plansOf(k8sDeploymentFixture, false), window, LIMIT)
    ).toThrow(InventoryDefinitionError);
  });
});
