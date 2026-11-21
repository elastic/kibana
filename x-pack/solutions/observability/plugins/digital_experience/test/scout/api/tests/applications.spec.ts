/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { testData } from '../fixtures';
import { DIGITAL_EXPERIENCE_TAGS } from '../../tags';
import { FLAG_ON_OVERRIDE, FLAG_RESET_OVERRIDE } from '../../feature_flag';

const {
  APM_ONLY_ROLE,
  APPLICATIONS_IN_TIME_RANGE_PATH,
  APPLICATIONS_PATH,
  COMMON_HEADERS,
  DIGITAL_EXPERIENCE_ONLY_ROLE,
  DIGITAL_EXPERIENCE_READ_ROLE,
  TIME_RANGE,
} = testData;

apiTest.describe('Digital Experience applications API', { tag: DIGITAL_EXPERIENCE_TAGS }, () => {
  apiTest.beforeAll(async ({ apiServices }) => {
    await apiServices.core.settings(FLAG_ON_OVERRIDE);
  });

  apiTest.afterAll(async ({ apiServices }) => {
    await apiServices.core.settings(FLAG_RESET_OVERRIDE);
  });

  apiTest(
    'returns 403 without the Digital Experience privilege',
    async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser(APM_ONLY_ROLE);

      const response = await apiClient.get(APPLICATIONS_IN_TIME_RANGE_PATH, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(403);
    }
  );

  apiTest('returns 403 without the APM privilege', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser(DIGITAL_EXPERIENCE_ONLY_ROLE);

    const response = await apiClient.get(APPLICATIONS_IN_TIME_RANGE_PATH, {
      headers: { ...COMMON_HEADERS, ...cookieHeader },
      responseType: 'json',
    });

    expect(response).toHaveStatusCode(403);
  });

  apiTest(
    'returns 403 without Elasticsearch details when no data can be read',
    async ({ apiClient, samlAuth }) => {
      // The Kibana privileges of the app, without any index privilege.
      const { cookieHeader } = await samlAuth.asInteractiveUser(DIGITAL_EXPERIENCE_READ_ROLE);

      const response = await apiClient.get(APPLICATIONS_IN_TIME_RANGE_PATH, {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(403);
      expect(response.body.message).toBe("You don't have read access to the application data.");
    }
  );

  apiTest('returns 400 for invalid query params', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');
    const headers = { ...COMMON_HEADERS, ...cookieHeader };
    const { rangeFrom, rangeTo } = TIME_RANGE;

    await apiTest.step('rejects a start that is not a date', async () => {
      const response = await apiClient.get(`${APPLICATIONS_PATH}?start=foo&end=${rangeTo}`, {
        headers,
      });
      expect(response).toHaveStatusCode(400);
    });

    await apiTest.step('rejects a start after the end', async () => {
      const response = await apiClient.get(
        `${APPLICATIONS_PATH}?start=${rangeTo}&end=${rangeFrom}`,
        { headers }
      );
      expect(response).toHaveStatusCode(400);
    });

    await apiTest.step('rejects a missing time range', async () => {
      const response = await apiClient.get(APPLICATIONS_PATH, { headers });
      expect(response).toHaveStatusCode(400);
    });

    await apiTest.step('rejects an environment over 1024 characters', async () => {
      const response = await apiClient.get(
        `${APPLICATIONS_IN_TIME_RANGE_PATH}&environment=${'x'.repeat(1025)}`,
        { headers }
      );
      expect(response).toHaveStatusCode(400);
    });
  });

  apiTest('accepts environments up to 1024 characters', async ({ apiClient, samlAuth }) => {
    const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');
    const headers = { ...COMMON_HEADERS, ...cookieHeader };

    for (const length of [201, 1024]) {
      await apiTest.step(`accepts an environment of ${length} characters`, async () => {
        const response = await apiClient.get(
          `${APPLICATIONS_IN_TIME_RANGE_PATH}&environment=${'x'.repeat(length)}`,
          { headers }
        );
        expect(response).toHaveStatusCode(200);
      });
    }
  });
});
