/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import type { ApplicationsResponse } from '../../../../common/types/applications';
import type { OwnedSessions, OwnedSessionsSetup } from '../../common/fixtures/sessions_data';
import {
  deleteOwnedSessions,
  ingestOwnedSessions,
  setUpOwnedSessions,
  sessionJourney,
  sessionStartOffsetMs,
} from '../../common/fixtures/sessions_data';
import { testData } from '../fixtures';
import { DIGITAL_EXPERIENCE_TAGS } from '../../tags';
import { FLAG_ON_OVERRIDE, FLAG_RESET_OVERRIDE } from '../../feature_flag';

const { APPLICATIONS_PATH, COMMON_HEADERS, withQuery } = testData;

// In their own environment, so the request reads only them. They start every 4 minutes from the
// first one, a day ago.
const SESSIONS: OwnedSessions = {
  idPrefix: 'dx-sessions-histogram',
  environment: 'sessions-histogram-test',
  count: 8,
};
const LAST_SESSION_IN_RANGE = 5;

apiTest.describe(
  'Digital Experience applications API from the sessions index',
  { tag: DIGITAL_EXPERIENCE_TAGS },
  () => {
    let sessionsStartMs: number;
    let setup: OwnedSessionsSetup | undefined;

    apiTest.beforeAll(async ({ apiServices, esClient, kbnClient }) => {
      await apiServices.core.settings(FLAG_ON_OVERRIDE);
      setup = await setUpOwnedSessions(esClient, kbnClient);
      sessionsStartMs = await ingestOwnedSessions(esClient, SESSIONS);
    });

    apiTest.afterAll(async ({ apiServices, esClient, kbnClient }) => {
      await deleteOwnedSessions(esClient, kbnClient, SESSIONS, setup);
      await apiServices.core.settings(FLAG_RESET_OVERRIDE);
    });

    apiTest(
      'keeps the page loads and sessions of the last bucket when the range ends inside it',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');
        const sessionStarts = Array.from({ length: LAST_SESSION_IN_RANGE + 1 }, (_, index) => {
          return sessionsStartMs + sessionStartOffsetMs(index);
        });
        // The range ends as the last session starts, so the last bucket holds it but not its end.
        const end = sessionStarts[LAST_SESSION_IN_RANGE];

        const response = await apiClient.get(
          withQuery(APPLICATIONS_PATH, {
            start: new Date(sessionsStartMs - 10 * 60 * 1000).toISOString(),
            end: new Date(end).toISOString(),
            environment: SESSIONS.environment,
          }),
          { headers: { ...COMMON_HEADERS, ...cookieHeader }, responseType: 'json' }
        );
        expect(response).toHaveStatusCode(200);
        const { pageLoadsOverTime, sessionsOverTime } = response.body as ApplicationsResponse;
        const sessions = sessionsOverTime ?? [];
        expect(sessions.map(({ timestamp }) => timestamp)).toStrictEqual(
          pageLoadsOverTime.otel.map(({ timestamp }) => timestamp)
        );

        const lastKey = sessions[sessions.length - 1].timestamp;
        const inLastBucket = sessionStarts
          .map((start, index) => {
            return { start, index };
          })
          .filter(({ start }) => {
            return start >= lastKey;
          });
        expect(inLastBucket.length).toBeGreaterThan(0);
        expect(sessions[sessions.length - 1].count).toBe(inLastBucket.length);
        expect(pageLoadsOverTime.otel[pageLoadsOverTime.otel.length - 1].count).toBe(
          inLastBucket.reduce((sum, { index }) => {
            return sum + sessionJourney(index).length;
          }, 0)
        );
      }
    );
  }
);
