/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import type { EntityDefinitionWithoutId } from '@kbn/entity-store/common';
import { apiTest, tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { executeEsql } from '../../../../server/inventory/executor';
import {
  ATTRIBUTE_VALUE_COLUMN,
  generateAttributeValuesQueries,
  planSources,
} from '../../../../server/inventory/generator';
import type { AttributeSelections } from '../../../../server/inventory/generator';
import { MAX_FILTER_VALUE_LENGTH } from '../../../../common';
import type { QueryEngine } from '../../../../common';

// Unlike the other specs, this one does not call the route: no registered definition labels an
// attribute yet, so the route cannot reach the labels. It runs the generated values query of a
// labelled attribute, built by the real generator, against Elasticsearch on throwaway indices, to
// check what only Elasticsearch decides, such as how a multi-value field is grouped, mapped and
// selected. The same documents are in a standard index, read by the `FROM` plan, and in a
// time-series index, read by the `TS` plan, and every case runs on both.
// Move the cases to the route spec when a registered definition uses `valueLabels`.
// A name of its own per run, so runs that share a deployment never delete each other's indices.
const PREFIX = `scout-entity-inventory-value-labels-${randomUUID()}`;
const STANDARD_INDEX = `${PREFIX}-standard`;
const TSDS_INDEX = `${PREFIX}-tsds`;
const WINDOW = { from: '2026-11-01T09:00:00.000Z', to: '2026-11-01T11:00:00.000Z' };

const definition: EntityDefinitionWithoutId = {
  type: 'scout.labelled',
  name: 'Labelled',
  identityField: { singleField: 'host.name' },
  dynamic: {
    sources: [
      {
        indexPattern: `${PREFIX}-*`,
        attributes: [
          {
            name: 'arch',
            field: 'host.architecture',
            valueLabels: { aarch64: 'arm64', arm: 'arm64' },
          },
          { name: 'os', field: 'host.os.type' },
        ],
      },
    ],
    suggestedFilters: ['arch', 'os'],
  },
};

const mappings = (hostName: Record<string, unknown>) => ({
  properties: {
    '@timestamp': { type: 'date' as const },
    'host.name': hostName,
    'host.architecture': { type: 'keyword' as const },
    'host.os.type': { type: 'keyword' as const },
  },
});

apiTest.describe(
  'Value labels and selections in the attribute values query',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    apiTest.beforeAll(async ({ esClient }) => {
      await esClient.indices.create({
        index: STANDARD_INDEX,
        mappings: mappings({ type: 'keyword' }),
      });
      // A plain time-series index with explicit bounds, as the archive of the other specs does: a
      // time-series data stream sets its bounds around the current time and rejects these timestamps.
      await esClient.indices.create({
        index: TSDS_INDEX,
        settings: {
          index: {
            mode: 'time_series',
            routing_path: ['host.name'],
            time_series: {
              start_time: '2026-11-01T00:00:00.000Z',
              end_time: '2026-11-02T00:00:00.000Z',
            },
          },
        },
        mappings: mappings({ type: 'keyword', time_series_dimension: true }),
      });

      // Only `multi` reads as `arm64` and only `multi` is on Linux, so a query that drops or skips
      // a multi-value document changes what the cases below see.
      const at = '2026-11-01T10:00:00.000Z';
      const documents = [
        { 'host.name': 'multi', 'host.architecture': ['aarch64', 'arm'], 'host.os.type': 'linux' },
        { 'host.name': 'other', 'host.architecture': 'x86', 'host.os.type': 'windows' },
        // Values the route could not take back as a selection: empty, and over the length limit.
        { 'host.name': 'empty', 'host.architecture': '', 'host.os.type': 'macos' },
        {
          'host.name': 'long',
          'host.architecture': 'x'.repeat(MAX_FILTER_VALUE_LENGTH + 1),
          'host.os.type': 'macos',
        },
      ];
      await esClient.bulk({
        refresh: 'wait_for',
        operations: [STANDARD_INDEX, TSDS_INDEX].flatMap((index) =>
          documents.flatMap((document) => [
            { index: { _index: index } },
            { '@timestamp': at, ...document },
          ])
        ),
      });
    });

    apiTest.afterAll(async ({ esClient }) => {
      await esClient.indices.delete({
        index: [STANDARD_INDEX, TSDS_INDEX],
        ignore_unavailable: true,
      });
    });

    const valuesOf = async (
      esClient: Parameters<typeof executeEsql>[0],
      engine: QueryEngine,
      {
        attribute,
        selections = {},
        limit = 100,
      }: { attribute: string; selections?: AttributeSelections; limit?: number }
    ) => {
      const plans = planSources(definition, [{ hasTimeSeries: true }]);
      const queries = generateAttributeValuesQueries(definition, plans, {
        attribute,
        selections,
        window: WINDOW,
        limit,
      });
      const query = queries[plans.findIndex((plan) => plan.engine === engine)];
      if (query === undefined) {
        throw new Error(`the ${attribute} attribute produced no ${engine} query`);
      }
      const { rows } = await executeEsql(esClient, query);
      return rows.map((row) => row[ATTRIBUTE_VALUE_COLUMN]);
    };

    (['TS', 'FROM'] as const).forEach((engine) => {
      apiTest(
        `through the ${engine} plan: groups the raw values of one label, also in a multi-value field`,
        async ({ esClient }) => {
          expect(await valuesOf(esClient, engine, { attribute: 'arch' })).toStrictEqual([
            'arm64',
            'x86',
          ]);
        }
      );

      apiTest(
        `through the ${engine} plan: applies the limit to the labels, not to the raw values`,
        async ({ esClient }) => {
          expect(await valuesOf(esClient, engine, { attribute: 'arch', limit: 1 })).toStrictEqual([
            'arm64',
          ]);
        }
      );

      apiTest(
        `through the ${engine} plan: narrows by a selection on a single-value field`,
        async ({ esClient }) => {
          expect(
            await valuesOf(esClient, engine, { attribute: 'arch', selections: { os: ['linux'] } })
          ).toStrictEqual(['arm64']);
        }
      );

      apiTest(
        `through the ${engine} plan: does not offer an empty value or one the route would reject`,
        async ({ esClient }) => {
          const values = await valuesOf(esClient, engine, { attribute: 'arch', limit: 100 });

          expect(values).not.toContain('');
          expect(values.every((value) => String(value).length <= MAX_FILTER_VALUE_LENGTH)).toBe(
            true
          );
        }
      );

      apiTest(
        `through the ${engine} plan: keeps a multi-value document when its field is selected`,
        async ({ esClient }) => {
          expect(
            await valuesOf(esClient, engine, {
              attribute: 'os',
              selections: { arch: ['arm64'] },
            })
          ).toStrictEqual(['linux']);
        }
      );
    });
  }
);
