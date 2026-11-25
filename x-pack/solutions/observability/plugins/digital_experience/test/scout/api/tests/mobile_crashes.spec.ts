/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiTest, type ApiClientFixture } from '@kbn/scout-oblt';
import { expect } from '@kbn/scout-oblt/api';
import { EXPECTED_CRASH_FINGERPRINTS } from '../../../../common/mobile/crash_fingerprint.test_helpers';
import type {
  MobileCrashGroupDetailResponse,
  MobileCrashGroupsResponse,
} from '../../../../common/types/mobile';
import { CRASH_APPS, NPE_LATEST_SESSION } from '../../common/fixtures/mobile_crash_data';
import { FLAG_ON_OVERRIDE, FLAG_RESET_OVERRIDE } from '../../feature_flag';
import { testData } from '../fixtures';
import { DIGITAL_EXPERIENCE_TAGS } from '../../tags';

const { COMMON_HEADERS, mobileCrashGroupsPath } = testData;

apiTest.describe('Digital Experience mobile crashes API', { tag: DIGITAL_EXPERIENCE_TAGS }, () => {
  let headers: Record<string, string>;

  apiTest.beforeAll(async ({ apiServices, samlAuth }) => {
    await apiServices.core.settings(FLAG_ON_OVERRIDE);
    const { cookieHeader } = await samlAuth.asInteractiveUser('viewer');
    headers = { ...COMMON_HEADERS, ...cookieHeader };
  });

  apiTest.afterAll(async ({ apiServices }) => {
    await apiServices.core.settings(FLAG_RESET_OVERRIDE);
  });

  const getGroups = async (
    apiClient: ApiClientFixture,
    serviceName: string,
    query: Record<string, string> = {}
  ) => {
    const response = await apiClient.get(mobileCrashGroupsPath(serviceName, query), {
      headers,
      responseType: 'json',
    });
    expect(response).toHaveStatusCode(200);
    return response.body as MobileCrashGroupsResponse;
  };

  const getDetail = async (
    apiClient: ApiClientFixture,
    serviceName: string,
    fingerprint: string
  ) => {
    const response = await apiClient.get(mobileCrashGroupsPath(serviceName, { fingerprint }), {
      headers,
      responseType: 'json',
    });
    expect(response).toHaveStatusCode(200);
    return response.body as MobileCrashGroupDetailResponse;
  };

  apiTest(
    'ranks the crash groups by affected users, ignoring line numbers, and marks new the one only the newest release has',
    async ({ apiClient }) => {
      const { crashGroups, isPartial } = await getGroups(apiClient, CRASH_APPS.android);

      expect(isPartial).toBe(false);
      // A crash at line 88 or 91 of the same frames is one group; the crash loop on one device has
      // more events but fewer users.
      expect(crashGroups).toHaveLength(2);
      expect(crashGroups[0]).toMatchObject({
        type: 'java.lang.NullPointerException',
        message: 'TrackRecorder is null',
        users: 3,
        events: 3,
        sessions: 3,
        firstSeen: { time: '2021-01-18T12:20:00.000Z', release: '4.2.0' },
        lastSeen: { time: '2021-01-18T12:40:00.000Z', release: '4.2.0' },
        newInRelease: '4.2.0',
      });
      expect(crashGroups[1]).toMatchObject({
        type: 'java.lang.IllegalStateException',
        users: 1,
        events: 4,
        sessions: 1,
        newInRelease: null,
      });
    }
  );

  apiTest(
    'narrows the groups to a release, and still marks new by every release',
    async ({ apiClient }) => {
      const older = await getGroups(apiClient, CRASH_APPS.android, { release: '4.1.0' });
      expect(older.crashGroups.map(({ type }) => type)).toStrictEqual([
        'java.lang.IllegalStateException',
      ]);
      expect(older.crashGroups[0].newInRelease).toBeNull();

      const newest = await getGroups(apiClient, CRASH_APPS.android, { release: '4.2.0' });
      expect(newest.crashGroups.map(({ newInRelease }) => newInRelease)).toStrictEqual(['4.2.0']);
    }
  );

  apiTest(
    'groups the iOS reports of one crash whatever their addresses, by when it happened rather than when it was sent',
    async ({ apiClient }) => {
      const { crashGroups } = await getGroups(apiClient, CRASH_APPS.ios);

      // Sent on the next launch with the legacy name, sent after the range ended, and without a
      // session: one group. The crash sent in the range that happened before it is left out.
      expect(crashGroups).toHaveLength(1);
      expect(crashGroups[0]).toMatchObject({
        type: 'SIGSEGV',
        users: 2,
        events: 3,
        sessions: 2,
        firstSeen: { time: '2021-01-18T12:15:00.000Z' },
        lastSeen: { time: '2021-01-18T12:55:00.000Z' },
      });
    }
  );

  apiTest(
    'computes the fingerprints an ingest-time fingerprint must match, and prefers a stored one',
    async ({ apiClient }) => {
      const { crashGroups } = await getGroups(apiClient, CRASH_APPS.fingerprints);

      expect(crashGroups.map(({ fingerprint }) => fingerprint).sort()).toStrictEqual(
        [...new Set(Object.values(EXPECTED_CRASH_FINGERPRINTS))].sort()
      );
    }
  );

  apiTest(
    "answers a group's latest crash, its breakdowns and its session before the crash",
    async ({ apiClient }) => {
      const [npe] = (await getGroups(apiClient, CRASH_APPS.android)).crashGroups;

      const detail = await getDetail(apiClient, CRASH_APPS.android, npe.fingerprint);

      expect(detail.latestCrash).toMatchObject({
        time: '2021-01-18T12:40:00.000Z',
        type: 'java.lang.NullPointerException',
        release: '4.2.0',
        sessionId: NPE_LATEST_SESSION,
      });
      expect(detail.latestCrash?.stacktrace).toContain('MainActivity.onResume(MainActivity.kt:88)');
      expect(detail.releases).toStrictEqual({ top: [{ key: '4.2.0', count: 3 }], other: 0 });
      expect(detail.osVersions).toStrictEqual({
        top: [
          { key: '15', count: 2 },
          { key: '14', count: 1 },
        ],
        other: 0,
      });
      expect(detail.deviceModels.top.map(({ key }) => key)).toStrictEqual(['Pixel 8', 'SM-S911B']);
      // Oldest first, and never the tap after the crash.
      expect(
        detail.beforeCrash.map(({ kind, name, page, statusCode }) => ({
          kind,
          name,
          page,
          statusCode,
        }))
      ).toStrictEqual([
        { kind: 'screen', name: 'Map', page: 'Map', statusCode: null },
        { kind: 'request', name: 'POST', page: 'Map', statusCode: 503 },
        { kind: 'tap', name: 'Start recording', page: 'Map', statusCode: null },
      ]);
      expect(detail.beforeCrash[1]).toMatchObject({
        detail: 'https://api.example.com/tracks?id=7',
        durationMs: 420,
      });
    }
  );

  apiTest(
    "finds an iOS session's events, whose id EDOT iOS writes in uppercase",
    async ({ apiClient }) => {
      const [group] = (await getGroups(apiClient, CRASH_APPS.ios)).crashGroups;

      const detail = await getDetail(apiClient, CRASH_APPS.ios, group.fingerprint);

      expect(detail.latestCrash?.sessionId).toBe('CRASH-IOS-SESSION-2');
      expect(detail.beforeCrash.map(({ kind, name }) => ({ kind, name }))).toStrictEqual([
        { kind: 'screen', name: 'Transfer - view appearing' },
      ]);
    }
  );

  apiTest('has no latest crash for a fingerprint without crashes', async ({ apiClient }) => {
    const detail = await getDetail(apiClient, CRASH_APPS.android, 'no-such-group');

    expect(detail.latestCrash).toBeNull();
    expect(detail.beforeCrash).toStrictEqual([]);
  });

  apiTest('rejects a fingerprint longer than any', async ({ apiClient }) => {
    const response = await apiClient.get(
      mobileCrashGroupsPath(CRASH_APPS.android, { fingerprint: 'a'.repeat(257) }),
      { headers, responseType: 'json' }
    );

    expect(response).toHaveStatusCode(400);
  });
});
