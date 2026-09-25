/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest as baseApiTest, mergeTests } from '@kbn/scout-security';
import { securitySolutionApiFixture } from '@kbn/security-solution-test-api-clients/scout';
import { ENABLE_ATTACK_DISCOVERY_WORKFLOWS_SETTING } from './constants';

export interface ScheduleSpaceFixture {
  /** Id of the Kibana space this worker's specs run in */
  id: string;
}

/**
 * Discoveries API tests get the generated Security Solution Scout clients (`discoveriesApi`, ...) on
 * top of the default `@kbn/scout-security` API fixtures, plus a dedicated Kibana space per worker.
 * Schedules are alerting rules that the find route lists without any filter, so running in an own
 * space keeps the specs' counts and cleanup isolated from other suites sharing the Kibana instance.
 */
export const apiTest = mergeTests(baseApiTest, securitySolutionApiFixture).extend<
  {},
  { scheduleSpace: ScheduleSpaceFixture }
>({
  scheduleSpace: [
    async ({ kbnClient, log }, use, workerInfo) => {
      const id = `ad-schedules-${workerInfo.workerIndex}-${Math.random().toString(36).slice(2, 8)}`;

      log.debug(`[scheduleSpace] creating space "${id}"`);
      await kbnClient.spaces.create({ id, name: id });

      try {
        // The internal routes are gated per space by this Advanced Setting (see
        // `isWorkflowsEnabledForSpace`), on top of the process-wide feature flag enabled in
        // `global.setup.ts`.
        await kbnClient.uiSettings.update(
          { [ENABLE_ATTACK_DISCOVERY_WORKFLOWS_SETTING]: true },
          {
            space: id,
          }
        );

        await use({ id });
      } finally {
        // Also runs when enabling the setting fails, so a broken setup never leaks the space
        log.debug(`[scheduleSpace] deleting space "${id}"`);
        await kbnClient.spaces.delete(id);
      }
    },
    { scope: 'worker' },
  ],
});
