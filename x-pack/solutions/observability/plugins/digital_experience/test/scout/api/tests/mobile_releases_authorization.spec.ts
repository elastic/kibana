/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { MOBILE_APPS } from '../../common/fixtures/mobile_data';
import { FLAG_ON_OVERRIDE, FLAG_RESET_OVERRIDE } from '../../feature_flag';
import { testData } from '../fixtures';
import { DIGITAL_EXPERIENCE_TAGS } from '../../tags';

const { COMMON_HEADERS, DIGITAL_EXPERIENCE_ONLY_ROLE, mobileReleasesPath } = testData;

apiTest.describe(
  'Digital Experience mobile releases API authorization',
  { tag: DIGITAL_EXPERIENCE_TAGS },
  () => {
    apiTest.beforeAll(async ({ apiServices }) => {
      await apiServices.core.settings(FLAG_ON_OVERRIDE);
    });

    apiTest.afterAll(async ({ apiServices }) => {
      await apiServices.core.settings(FLAG_RESET_OVERRIDE);
    });

    apiTest('answers 403 naming the apm privilege, without it', async ({ apiClient, samlAuth }) => {
      const { cookieHeader } = await samlAuth.asInteractiveUser(DIGITAL_EXPERIENCE_ONLY_ROLE);

      const response = await apiClient.get(mobileReleasesPath(MOBILE_APPS.reactNative), {
        headers: { ...COMMON_HEADERS, ...cookieHeader },
        responseType: 'json',
      });

      expect(response).toHaveStatusCode(403);
      // Kibana's own check, before the route reads any data, rather than an Elasticsearch
      // access denial, which would be a 403 too
      expect((response.body as { message: string }).message).toContain(
        'is unauthorized for user, this action is granted by the Kibana privileges [apm]'
      );
    });
  }
);
