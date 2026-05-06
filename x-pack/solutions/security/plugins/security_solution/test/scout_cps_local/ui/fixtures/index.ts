/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { randomUUID } from 'crypto';
import { tags, test as baseTest } from '@kbn/scout-security';
import type { EsClient, SecurityTestFixtures, SecurityWorkerFixtures } from '@kbn/scout-security';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

export const CPS_TAGS = [...tags.serverless.security.complete];

/** NPRE expression: search only the origin (self-linked) project. */
export const SPACE_PROJECT_ROUTING_ORIGIN_ONLY = '_alias:_origin';

/** NPRE expression: search the origin and all linked projects. */
export const SPACE_PROJECT_ROUTING_ALL = '_alias:*';

const ORIGIN_MARKER_FIELD = 'origin_marker';
const LINKED_MARKER_FIELD = 'linked_marker';

// ---------------------------------------------------------------------------
// ES index helpers (private to the fixture)
// ---------------------------------------------------------------------------

const createMarkerFieldIndex = async (
  esClient: EsClient,
  index: string,
  markerField: string
): Promise<void> => {
  await esClient.indices.delete({ index }, { ignore: [404] });
  await esClient.indices.create({
    index,
    mappings: {
      properties: {
        '@timestamp': { type: 'date' },
        'host.name': { type: 'keyword' },
        [markerField]: { type: 'keyword' },
      },
    },
  });
  await esClient.index({
    index,
    refresh: 'wait_for',
    body: {
      '@timestamp': new Date(Date.now() - 60_000).toISOString(),
      'host.name': `${markerField}-host`,
      [markerField]: 'present',
    },
  });
};

// ---------------------------------------------------------------------------
// Fixture types
// ---------------------------------------------------------------------------

export interface CpsTestDataFixture {
  testIndex: string;
  runId: string;
  originMarkerField: string;
  linkedMarkerField: string;
}

export interface CpsSpaceFixture {
  create: (params: { spaceId: string; projectRouting: string }) => Promise<string>;
}

// ---------------------------------------------------------------------------
// Extended test with CPS fixtures
// ---------------------------------------------------------------------------

export const test = baseTest.extend<
  SecurityTestFixtures & { cpsSpace: CpsSpaceFixture },
  SecurityWorkerFixtures & { cpsTestData: CpsTestDataFixture }
>({
  cpsTestData: [
    async ({ esClient, linkedProject }, use) => {
      const runId = randomUUID().slice(0, 8);
      const testIndex = `logstash-scout-cps-ui-${runId}`;

      await createMarkerFieldIndex(esClient, testIndex, ORIGIN_MARKER_FIELD);
      await createMarkerFieldIndex(linkedProject.esClient, testIndex, LINKED_MARKER_FIELD);

      await use({
        testIndex,
        runId,
        originMarkerField: ORIGIN_MARKER_FIELD,
        linkedMarkerField: LINKED_MARKER_FIELD,
      });

      await esClient.indices.delete({ index: testIndex }, { ignore: [404] });
      await linkedProject.esClient.indices.delete({ index: testIndex }, { ignore: [404] });
    },
    { scope: 'worker' },
  ],

  cpsSpace: [
    async ({ kbnClient }, use) => {
      const createdSpaces: string[] = [];

      await use({
        create: async ({ spaceId, projectRouting }) => {
          await kbnClient.request({
            method: 'POST',
            path: '/api/spaces/space',
            body: {
              id: spaceId,
              name: `CPS detection test ${spaceId}`,
              description: 'Temporary space for CPS Scout tests',
              disabledFeatures: [],
              projectRouting,
            },
          });
          createdSpaces.push(spaceId);
          return spaceId;
        },
      });

      for (const spaceId of createdSpaces) {
        await kbnClient
          .request({ method: 'DELETE', path: `/api/spaces/space/${spaceId}` })
          .catch(() => {});
      }
    },
    { scope: 'test' },
  ],
});
