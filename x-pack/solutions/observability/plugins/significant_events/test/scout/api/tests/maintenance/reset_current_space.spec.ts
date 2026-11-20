/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'node:crypto';
import { tags, type KibanaRole } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import {
  NIGHTSHIFT_FEATURE_ID,
  NIGHTSHIFT_MANAGE_ENGINES_SUB_FEATURE_ID,
} from '@kbn/nightshift-shared';
import { significantEventsApiTest as apiTest } from '../../fixtures';
import { COMMON_API_HEADERS } from '../../fixtures/constants';

const STREAMS = ['.significant_events-knowledge_indicators', '.significant_events-detections'];
const RESET_PATH = 'internal/significant_events/maintenance/_reset';
const STATUS_PATH = 'internal/significant_events/maintenance/_status';

apiTest.describe(
  'Reset current-space authorization and isolation',
  {
    tag: [...tags.stateful.classic, ...tags.serverless.observability.complete],
  },
  () => {
    const spaceA = `reset-a-${randomUUID()}`;
    const spaceB = `reset-b-${randomUUID()}`;
    const ids = [spaceA, spaceB, `legacy-${randomUUID()}`];

    const role = (configure: boolean, canDelete = true): KibanaRole => ({
      kibana: [
        {
          base: [],
          feature: {
            [NIGHTSHIFT_FEATURE_ID]: configure
              ? ['all', NIGHTSHIFT_MANAGE_ENGINES_SUB_FEATURE_ID]
              : ['all'],
          },
          spaces: [spaceA],
        },
      ],
      elasticsearch: {
        cluster: [],
        indices: [
          {
            names: ['.significant_events-*'],
            privileges: canDelete ? ['read', 'delete', 'maintenance'] : ['read', 'maintenance'],
          },
        ],
      },
    });

    apiTest.beforeAll(async ({ apiServices, kbnClient, esClient }) => {
      for (const id of [spaceA, spaceB]) {
        await apiServices.spaces.create({ id, name: id });
      }
      // Initialize the owned streams before writing test documents directly.
      await kbnClient.request({
        method: 'POST',
        path: `/s/${spaceA}/${RESET_PATH}`,
        headers: COMMON_API_HEADERS,
      });
      await kbnClient.request({
        method: 'POST',
        path: `/s/${spaceB}/internal/significant_events/maintenance/_pause`,
        headers: COMMON_API_HEADERS,
      });
      for (const index of STREAMS) {
        for (const [offset, id] of ids.entries()) {
          await esClient.index({
            index,
            id,
            op_type: 'create',
            refresh: true,
            document: {
              '@timestamp': new Date().toISOString(),
              id: 'same-ki-id',
              type: 'feature',
              'source.id': 'same-source-id',
              ...(offset < 2 ? { 'kibana.space_ids': [offset === 0 ? spaceA : spaceB] } : {}),
              feature: { type: 'entity', slug: 'same-slug', properties: {}, confidence: 90 },
              detection_id: id,
              rule_uuid: 'same-rule-id',
              change_point_type: 'spike',
            },
          });
        }
      }
    });

    apiTest.afterAll(async ({ apiServices, esClient }) => {
      for (const index of STREAMS) {
        await esClient.deleteByQuery({
          index,
          query: { ids: { values: ids } },
          refresh: true,
          ignore_unavailable: true,
        });
      }
      for (const id of [spaceA, spaceB]) await apiServices.spaces.delete(id);
    });

    apiTest(
      'rejects missing configure privilege before changing any data',
      async ({ apiClient, samlAuth, esClient }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser(role(false));
        const response = await apiClient.post(`s/${spaceA}/${RESET_PATH}`, {
          headers: { ...COMMON_API_HEADERS, ...cookieHeader },
        });
        expect(response).toHaveStatusCode(403);
        for (const index of STREAMS)
          expect((await esClient.count({ index, query: { ids: { values: ids } } })).count).toBe(3);
      }
    );

    apiTest(
      'reports missing ES delete privilege without falling back to internal deletion',
      async ({ apiClient, samlAuth, esClient }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser(role(true, false));
        const response = await apiClient.post(`s/${spaceA}/${RESET_PATH}`, {
          headers: { ...COMMON_API_HEADERS, ...cookieHeader },
        });
        expect(response).toHaveStatusCode(200);
        expect(response.body.deleted).toMatchObject({
          knowledgeIndicators: 0,
          storedQueries: 0,
          dataStreams: 0,
        });
        expect(response.body.partialFailures).toStrictEqual(
          expect.arrayContaining(
            STREAMS.map((index) =>
              expect.objectContaining({ target: `data-stream:${index}:delete` })
            )
          )
        );
        for (const index of STREAMS)
          expect((await esClient.count({ index, query: { ids: { values: ids } } })).count).toBe(3);
      }
    );

    apiTest(
      'allows a current-space-only caller and leaves the other space paused and intact',
      async ({ apiClient, samlAuth, esClient, kbnClient }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser(role(true));
        const before = await kbnClient.request({
          method: 'GET',
          path: `/s/${spaceB}/${STATUS_PATH}`,
          headers: COMMON_API_HEADERS,
        });
        const response = await apiClient.post(`s/${spaceA}/${RESET_PATH}`, {
          headers: { ...COMMON_API_HEADERS, ...cookieHeader },
        });
        expect(response).toHaveStatusCode(200);
        expect(response.body.deleted).toStrictEqual({
          knowledgeIndicators: 1,
          storedQueries: 0,
          rules: 0,
          dataStreams: 2,
        });
        for (const index of STREAMS) {
          expect(
            (await esClient.count({ index, query: { term: { 'kibana.space_ids': spaceA } } })).count
          ).toBe(0);
          expect(
            (await esClient.count({ index, query: { ids: { values: [ids[1], ids[2]] } } })).count
          ).toBe(2);
        }
        const after = await kbnClient.request({
          method: 'GET',
          path: `/s/${spaceB}/${STATUS_PATH}`,
          headers: COMMON_API_HEADERS,
        });
        expect(after.data).toStrictEqual(before.data);
        const second = await apiClient.post(`s/${spaceA}/${RESET_PATH}`, {
          headers: { ...COMMON_API_HEADERS, ...cookieHeader },
        });
        expect(second).toHaveStatusCode(200);
        expect(second.body.deleted).toStrictEqual({
          knowledgeIndicators: 0,
          storedQueries: 0,
          rules: 0,
          dataStreams: 0,
        });
      }
    );
  }
);
