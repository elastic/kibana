/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import type {
  MobileCrashGroupDetailResponse,
  MobileCrashGroupsResponse,
} from '../../../../common/types/mobile';
import { CRASH_APPS } from '../../common/fixtures/mobile_crash_data';
import { FLAG_ON_OVERRIDE, FLAG_RESET_OVERRIDE } from '../../feature_flag';
import { testData } from '../fixtures';
import { DIGITAL_EXPERIENCE_TAGS } from '../../tags';

const {
  APM_ONLY_ROLE,
  COMMON_HEADERS,
  DIGITAL_EXPERIENCE_ONLY_ROLE,
  createRole,
  mobileCrashGroupsPath,
} = testData;

/** Both Kibana privileges, and the OTel logs, where crashes are, but not the traces. */
const OTEL_LOGS_ONLY_ROLE = {
  ...createRole({ digital_experience: ['read'], apm: ['read'] }),
  elasticsearch: {
    cluster: [],
    indices: [{ names: ['logs-*.otel-*'], privileges: ['read'] }],
  },
};

/** Both Kibana privileges, and the OTel traces, but not the logs, where crashes are. */
const OTEL_TRACES_ONLY_ROLE = {
  ...createRole({ digital_experience: ['read'], apm: ['read'] }),
  elasticsearch: {
    cluster: [],
    indices: [{ names: ['traces-*.otel-*'], privileges: ['read'] }],
  },
};

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

    apiTest(
      "lists the crash groups of a user who can't read the traces, as partial",
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser(OTEL_LOGS_ONLY_ROLE);

        const response = await apiClient.get(mobileCrashGroupsPath(CRASH_APPS.android), {
          headers: { ...COMMON_HEADERS, ...cookieHeader },
          responseType: 'json',
        });

        // The crashes are in the logs; the newest release, which marks groups new, also comes from
        // spans, so the response says it may be off.
        expect(response).toHaveStatusCode(200);
        const { crashGroups, isPartial } = response.body as MobileCrashGroupsResponse;
        expect(isPartial).toBe(true);
        expect(crashGroups.map(({ type }) => type)).toStrictEqual([
          'java.lang.NullPointerException',
          'java.lang.IllegalStateException',
          'java.lang.IllegalArgumentException',
        ]);
      }
    );

    apiTest(
      "answers a group's detail to a user who can't read the traces, without the session's spans",
      async ({ apiClient, samlAuth }) => {
        const { cookieHeader } = await samlAuth.asInteractiveUser(OTEL_LOGS_ONLY_ROLE);
        const headers = { ...COMMON_HEADERS, ...cookieHeader };
        const list = await apiClient.get(mobileCrashGroupsPath(CRASH_APPS.android), {
          headers,
          responseType: 'json',
        });
        const [npe] = (list.body as MobileCrashGroupsResponse).crashGroups;

        const response = await apiClient.get(
          mobileCrashGroupsPath(CRASH_APPS.android, { fingerprint: npe.fingerprint }),
          { headers, responseType: 'json' }
        );

        // The crash and the tap are log records; the screen and the request before it are spans,
        // which this user can't read, so they're missing and the response says so.
        expect(response).toHaveStatusCode(200);
        const { latestCrash, beforeCrash, isPartial } =
          response.body as MobileCrashGroupDetailResponse;
        expect(isPartial).toBe(true);
        expect(latestCrash).toMatchObject({ type: 'java.lang.NullPointerException' });
        expect(beforeCrash.map(({ kind, name }) => ({ kind, name }))).toStrictEqual([
          { kind: 'tap', name: 'Start recording' },
        ]);
      }
    );

    apiTest(
      "answers no crash to a user who can't read the logs, where crashes are",
      async ({ apiClient, samlAuth }) => {
        const viewer = await samlAuth.asInteractiveUser('viewer');
        const viewerList = await apiClient.get(mobileCrashGroupsPath(CRASH_APPS.android), {
          headers: { ...COMMON_HEADERS, ...viewer.cookieHeader },
          responseType: 'json',
        });
        const [npe] = (viewerList.body as MobileCrashGroupsResponse).crashGroups;
        const { cookieHeader } = await samlAuth.asInteractiveUser(OTEL_TRACES_ONLY_ROLE);
        const headers = { ...COMMON_HEADERS, ...cookieHeader };

        const list = await apiClient.get(mobileCrashGroupsPath(CRASH_APPS.android), {
          headers,
          responseType: 'json',
        });
        const detail = await apiClient.get(
          mobileCrashGroupsPath(CRASH_APPS.android, { fingerprint: npe.fingerprint }),
          { headers, responseType: 'json' }
        );

        expect(list).toHaveStatusCode(200);
        expect(list.body).toStrictEqual({ crashGroups: [], isPartial: true });
        expect(detail).toHaveStatusCode(200);
        expect(detail.body).toMatchObject({ latestCrash: null, beforeCrash: [], isPartial: true });
      }
    );
  }
);
