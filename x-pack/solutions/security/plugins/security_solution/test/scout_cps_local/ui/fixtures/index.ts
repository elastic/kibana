/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { test as baseTest } from '@kbn/scout-security';
import type { SecurityTestFixtures, SecurityWorkerFixtures } from '@kbn/scout-security';

export interface CpsSpaceFixture {
  create: (params: { spaceId: string; projectRouting: string }) => Promise<string>;
}

export const test = baseTest.extend<
  SecurityTestFixtures & { cpsSpace: CpsSpaceFixture },
  SecurityWorkerFixtures
>({
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
