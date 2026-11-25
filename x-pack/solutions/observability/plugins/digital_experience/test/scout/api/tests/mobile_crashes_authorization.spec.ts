/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { CRASH_APPS } from '../../common/fixtures/mobile_crash_data';
import { FLAG_ON_OVERRIDE, FLAG_RESET_OVERRIDE } from '../../feature_flag';
import { testData } from '../fixtures';
import { DIGITAL_EXPERIENCE_TAGS } from '../../tags';

const { APM_ONLY_ROLE, COMMON_HEADERS, DIGITAL_EXPERIENCE_ONLY_ROLE, mobileCrashGroupsPath } =
  testData;

apiTest.describe(
  'Digital Experience mobile crashes API authorization',
  { tag: DIGITAL_EXPERIENCE_TAGS },
  () => {
    apiTest.beforeAll(async ({ apiServices }) => {
      await apiServices.core.settings(FLAG_ON_OVERRIDE);
    });

    apiTest.afterAll(async ({ apiServices }) => {
      await apiServices.core.settings(FLAG_RESET_OVERRIDE);
    });

    // The detail returns stack traces and session events: both routes need both privileges.
    for (const [privilege, role] of [
      ['Digital Experience', APM_ONLY_ROLE],
      ['APM', DIGITAL_EXPERIENCE_ONLY_ROLE],
    ] as const) {
      apiTest(
        `answers 403 to the crash routes without the ${privilege} privilege`,
        async ({ apiClient, samlAuth }) => {
          const { cookieHeader } = await samlAuth.asInteractiveUser(role);
          const paths = [
            mobileCrashGroupsPath(CRASH_APPS.android),
            mobileCrashGroupsPath(CRASH_APPS.android, { fingerprint: 'any-group' }),
          ];

          for (const path of paths) {
            const response = await apiClient.get(path, {
              headers: { ...COMMON_HEADERS, ...cookieHeader },
              responseType: 'json',
            });
            expect(response).toHaveStatusCode(403);
          }
        }
      );
    }
  }
);
