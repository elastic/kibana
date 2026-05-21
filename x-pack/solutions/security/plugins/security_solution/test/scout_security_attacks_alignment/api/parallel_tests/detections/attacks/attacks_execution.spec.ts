/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { spaceTest, tags } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';

spaceTest.describe(
  'Attacks execution with EIS inference connector',
  { tag: [...tags.stateful.classic, ...tags.serverless.security.complete] },
  () => {
    spaceTest.beforeAll(async ({ scoutSpace }) => {
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest.afterAll(async ({ scoutSpace }) => {
      await scoutSpace.savedObjects.cleanStandardList();
    });

    spaceTest(
      'successfully executes manual _generate endpoint without "Saved object not found" error',
      async ({ kbnClient, scoutSpace }) => {
        const payload = {
          alertsIndexPattern: `.alerts-security.alerts-${scoutSpace.id}`,
          anonymizationFields: [],
          apiConfig: {
            actionTypeId: '.inference',
            connectorId: '.eis-claude-3.7-sonnet',
            model: 'none',
            name: 'Scout seeded inference connector',
            provider: 'Other',
          },
          end: 'now',
          replacements: {},
          size: 50,
          start: 'now-24h',
          subAction: 'invokeAI',
        };

        const response = await kbnClient.request({
          method: 'POST',
          path: `/s/${scoutSpace.id}/api/attack_discovery/_generate`,
          headers: { 'kbn-xsrf': 'true', 'elastic-api-version': '2023-10-31' },
          body: payload,
          ignoreErrors: [400, 500],
        });

        // The endpoint returns a 500 error from the inference client because the mock connector
        // doesn't exist in Elasticsearch. This proves it correctly bypassed the actionsClient
        // which would have thrown a 404 "Saved object not found" error.
        expect(response.status).toBe(500);

        const dataString = JSON.stringify(response.data);
        expect(dataString).toContain('No connector or inference endpoint found');
      }
    );

    spaceTest(
      'successfully executes scheduled background task without "Saved object not found" error',
      async ({ kbnClient, scoutSpace, apiServices }) => {
        // 1. Seed the schedule with a 1m interval
        const { id: scheduleId } = await apiServices.attackDiscovery.seedAttackInferenceSchedule(
          '1m'
        );

        // 2. Enable the schedule
        const enableResponse = await kbnClient.request({
          method: 'POST',
          path: `/s/${scoutSpace.id}/api/attack_discovery/schedules/${scheduleId}/_enable`,
          headers: { 'kbn-xsrf': 'true', 'elastic-api-version': '2023-10-31' },
        });
        expect(enableResponse.status).toBe(200);

        try {
          // 3. Poll for the schedule's last_execution to indicate it ran.
          // It will fail because the mock connector doesn't exist, but that's expected
          // and proves it correctly bypassed the actionsClient.
          await expect
            .poll(
              async () => {
                const findResponse = await kbnClient.request({
                  method: 'GET',
                  path: `/s/${scoutSpace.id}/api/attack_discovery/schedules/_find`,
                  query: {
                    search: '"Scout seeded inference attack schedule"',
                    per_page: 1,
                  },
                });
                const body = findResponse.data as {
                  data?: Array<{ last_execution?: { status: string; message?: string } }>;
                };
                const schedule = body.data?.[0];
                return schedule?.last_execution;
              },
              { timeout: 45_000 }
            )
            .toMatchObject({
              status: 'error',
              message: expect.stringContaining('No connector or inference endpoint found'),
            });
        } finally {
          // Clean up by disabling the schedule
          await kbnClient.request({
            method: 'POST',
            path: `/s/${scoutSpace.id}/api/attack_discovery/schedules/${scheduleId}/_disable`,
            headers: { 'kbn-xsrf': 'true', 'elastic-api-version': '2023-10-31' },
          });
        }
      }
    );
  }
);
