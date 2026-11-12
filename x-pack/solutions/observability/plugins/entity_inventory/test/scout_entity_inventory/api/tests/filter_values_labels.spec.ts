/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import type { EntityDefinitionWithoutId } from '@kbn/entity-store/common';
import { tags } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { executeEsql } from '../../../../server/inventory/executor';
import {
  ATTRIBUTE_VALUE_COLUMN,
  generateAttributeValuesQueries,
  planSources,
} from '../../../../server/inventory/generator';
import { apiTest } from '../fixtures';

// Unlike the other specs, this one does not call the route: no registered definition labels an
// attribute yet, so the route cannot reach the labels. It runs the generated values query of a
// labelled attribute, built by the real generator, against Elasticsearch on a throwaway index, to
// check what only Elasticsearch decides, such as how a multi-value field is grouped and mapped.
// Move the cases to the route spec when a registered definition uses `valueLabels`.
// A name of its own per run, so runs that share a deployment never delete each other's index.
const INDEX = `scout-entity-inventory-value-labels-${randomUUID()}`;
const WINDOW = { from: '2026-11-01T09:00:00.000Z', to: '2026-11-01T11:00:00.000Z' };

const definition: EntityDefinitionWithoutId = {
  type: 'scout.labelled',
  name: 'Labelled',
  identityField: { singleField: 'host.name' },
  dynamic: {
    sources: [
      {
        indexPattern: INDEX,
        attributes: [
          {
            name: 'arch',
            field: 'host.architecture',
            valueLabels: { aarch64: 'arm64', arm: 'arm64' },
          },
        ],
      },
    ],
    suggestedFilters: ['arch'],
  },
};

apiTest.describe(
  'Value labels in the attribute values query',
  { tag: [...tags.stateful.classic, ...tags.serverless.observability.complete] },
  () => {
    apiTest.beforeAll(async ({ esClient }) => {
      await esClient.indices.create({
        index: INDEX,
        mappings: {
          properties: {
            '@timestamp': { type: 'date' },
            'host.name': { type: 'keyword' },
            'host.architecture': { type: 'keyword' },
          },
        },
      });
      const at = '2026-11-01T10:00:00.000Z';
      await esClient.bulk({
        refresh: 'wait_for',
        operations: [
          { index: { _index: INDEX } },
          { '@timestamp': at, 'host.name': 'multi', 'host.architecture': ['aarch64', 'arm'] },
          { index: { _index: INDEX } },
          { '@timestamp': at, 'host.name': 'single', 'host.architecture': 'aarch64' },
          { index: { _index: INDEX } },
          { '@timestamp': at, 'host.name': 'other', 'host.architecture': 'x86' },
        ],
      });
    });

    apiTest.afterAll(async ({ esClient }) => {
      await esClient.indices.delete({ index: INDEX, ignore_unavailable: true });
    });

    const valuesOf = async (esClient: Parameters<typeof executeEsql>[0], limit: number) => {
      const plans = planSources(definition, [{ hasTimeSeries: false }]);
      const [query] = generateAttributeValuesQueries(definition, plans, {
        attribute: 'arch',
        selections: {},
        window: WINDOW,
        limit,
      });
      if (query === undefined) {
        throw new Error('the labelled attribute produced no query');
      }
      const { rows } = await executeEsql(esClient, query);
      return rows.map((row) => row[ATTRIBUTE_VALUE_COLUMN]);
    };

    apiTest(
      'groups the raw values of one label, also in a multi-value field',
      async ({ esClient }) => {
        expect(await valuesOf(esClient, 100)).toStrictEqual(['arm64', 'x86']);
      }
    );

    apiTest('applies the limit to the labels, not to the raw values', async ({ esClient }) => {
      expect(await valuesOf(esClient, 1)).toStrictEqual(['arm64']);
    });
  }
);
