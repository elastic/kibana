/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { SESSIONS_INDEX_PATTERN } from '../../../../common/sessions';
import type { ApplicationsResponse } from '../../../../common/types/applications';
import { TIME_RANGE } from '../../common/fixtures/constants';
import {
  SESSIONS_APP,
  deleteOwnedSessions,
  ingestOwnedSessions,
  setUpOwnedSessions,
  type OwnedSessions,
  type OwnedSessionsSetup,
} from '../../common/fixtures/sessions_data';
import { findApplication, testData } from '../fixtures';
import { DIGITAL_EXPERIENCE_WITH_UX_TAGS } from '../../tags';
import { FLAG_ON_OVERRIDE, FLAG_RESET_OVERRIDE } from '../../feature_flag';

const { APPLICATIONS_IN_TIME_RANGE_PATH, APPLICATIONS_PATH, COMMON_HEADERS, createRole } = testData;

// A session from a day ago, so the readable EDOT Browser source has an application to list.
const SESSIONS: OwnedSessions = {
  idPrefix: 'dx-partial-access',
  environment: 'partial-access-test',
  count: 1,
};

/** Reads the EDOT Browser indices only, so not the Classic RUM archive's `apm-*` indices. */
const OTEL_ONLY_INDICES_ROLE = {
  ...createRole({ digital_experience: ['read'], apm: ['read'] }),
  elasticsearch: {
    cluster: [],
    indices: [
      {
        names: [SESSIONS_INDEX_PATTERN, 'logs-*.otel-*', 'traces-*.otel-*'],
        privileges: ['read'],
      },
    ],
  },
};

/** Reads every Classic RUM index and the EDOT Browser events, but not the sessions index. */
const NO_SESSIONS_READ_ROLE = {
  ...createRole({ digital_experience: ['read'], apm: ['read'] }),
  elasticsearch: {
    cluster: [],
    indices: [
      {
        names: ['logs-*.otel-*', 'traces-*.otel-*', 'traces-apm*', 'logs-apm*', 'apm-*'],
        privileges: ['read'],
      },
    ],
  },
};

apiTest.describe(
  'Digital Experience applications API with partial index access',
  { tag: DIGITAL_EXPERIENCE_WITH_UX_TAGS },
  () => {
    let setup: OwnedSessionsSetup | undefined;

    apiTest.beforeAll(async ({ apiServices, esClient, kbnClient }) => {
      await apiServices.core.settings(FLAG_ON_OVERRIDE);
      setup = await setUpOwnedSessions(esClient, kbnClient);
      await ingestOwnedSessions(esClient, SESSIONS);
    });

    apiTest.afterAll(async ({ apiServices, esClient, kbnClient }) => {
      await deleteOwnedSessions(esClient, kbnClient, SESSIONS, setup);
      await apiServices.core.settings(FLAG_RESET_OVERRIDE);
    });

    apiTest(
      'reports Classic RUM as partially available when only the EDOT Browser indices are readable',
      async ({ apiClient, requestAuth }) => {
        const { apiKeyHeader } = await requestAuth.getApiKeyForCustomRole(OTEL_ONLY_INDICES_ROLE);
        // From the Classic RUM archive's time to now, to include the session.
        const range = `start=${TIME_RANGE.rangeFrom}&end=${new Date().toISOString()}`;

        const response = await apiClient.get(`${APPLICATIONS_PATH}?${range}`, {
          headers: { ...COMMON_HEADERS, ...apiKeyHeader },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        const { applications, unavailableSources, partiallyAvailableSources } =
          response.body as ApplicationsResponse;
        expect(unavailableSources).toStrictEqual([]);
        expect(partiallyAvailableSources).toStrictEqual(['classic']);
        expect(findApplication(applications, SESSIONS_APP, 'otel')).toBeDefined();
      }
    );

    apiTest(
      'reports EDOT Browser as partially available when the sessions index is not readable',
      async ({ apiClient, requestAuth }) => {
        const { apiKeyHeader } = await requestAuth.getApiKeyForCustomRole(NO_SESSIONS_READ_ROLE);

        const response = await apiClient.get(APPLICATIONS_IN_TIME_RANGE_PATH, {
          headers: { ...COMMON_HEADERS, ...apiKeyHeader },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        const { unavailableSources, partiallyAvailableSources } =
          response.body as ApplicationsResponse;
        expect(unavailableSources).toStrictEqual([]);
        expect(partiallyAvailableSources).toStrictEqual(['otel']);
      }
    );

    apiTest(
      'reports no partially available source for the viewer role',
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');

        const response = await apiClient.get(APPLICATIONS_IN_TIME_RANGE_PATH, {
          headers: { ...COMMON_HEADERS, ...cookieHeader },
          responseType: 'json',
        });

        expect(response).toHaveStatusCode(200);
        expect((response.body as ApplicationsResponse).partiallyAvailableSources).toStrictEqual([]);
      }
    );
  }
);
