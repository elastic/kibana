/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { createTestServers, type TestElasticsearchUtils } from '@kbn/core-test-helpers-kbn-server';
import type { EntityDefinitionWithoutId } from '@kbn/entity-store/common';
import { MAX_FILTER_VALUE_LENGTH } from '../../common';
import type { QueryEngine } from '../../common';
import { executeEsql } from '../../server/inventory/executor';
import {
  ATTRIBUTE_VALUE_COLUMN,
  generateAttributeValuesQueries,
  planSources,
} from '../../server/inventory/generator';
import type { AttributeSelections } from '../../server/inventory/generator';

const STANDARD_INDEX = 'value-labels-standard';
const TSDS_INDEX = 'value-labels-tsds';
const WINDOW = { from: '2026-11-01T09:00:00.000Z', to: '2026-11-01T11:00:00.000Z' };

const definition: EntityDefinitionWithoutId = {
  type: 'test.labelled',
  name: 'Labelled',
  identityField: { singleField: 'host.name' },
  dynamic: {
    sources: [
      {
        indexPattern: 'value-labels-*',
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

describe('Value labels and selections in the attribute values query', () => {
  jest.setTimeout(10 * 60 * 1000);

  let esServer: TestElasticsearchUtils;
  let esClient: ElasticsearchClient;

  beforeAll(async () => {
    const { startES } = createTestServers({ adjustTimeout: jest.setTimeout });
    esServer = await startES();
    esClient = esServer.es.getClient();

    await esClient.indices.create({
      index: STANDARD_INDEX,
      mappings: mappings({ type: 'keyword' }),
    });
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

    // Only `multi` reads as `arm64` and only `multi` is on Linux, so a query that drops or skips a
    // multi-value document changes what the cases below see.
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

  afterAll(async () => {
    if (esServer) {
      await esServer.stop();
    }
  });

  const valuesOf = async (
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

  describe.each(['TS', 'FROM'] as const)('through the %s plan', (engine) => {
    it('groups the raw values of one label, also in a multi-value field', async () => {
      expect(await valuesOf(engine, { attribute: 'arch' })).toStrictEqual(['arm64', 'x86']);
    });

    it('applies the limit to the labels, not to the raw values', async () => {
      expect(await valuesOf(engine, { attribute: 'arch', limit: 1 })).toStrictEqual(['arm64']);
    });

    it('narrows by a selection on a single-value field', async () => {
      expect(
        await valuesOf(engine, { attribute: 'arch', selections: { os: ['linux'] } })
      ).toStrictEqual(['arm64']);
    });

    it('does not offer an empty value or one the route would reject', async () => {
      const values = await valuesOf(engine, { attribute: 'arch', limit: 100 });

      expect(values).not.toContain('');
      expect(values.every((value) => String(value).length <= MAX_FILTER_VALUE_LENGTH)).toBe(true);
    });

    it('keeps a multi-value document when its field is selected', async () => {
      expect(
        await valuesOf(engine, { attribute: 'os', selections: { arch: ['arm64'] } })
      ).toStrictEqual(['linux']);
    });
  });
});
