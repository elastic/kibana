/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NEVER } from 'rxjs';
import { loggingSystemMock } from '@kbn/core/server/mocks';
import type {
  MobileCrashGroup,
  MobileCrashGroupDetailResponse,
  MobileCrashGroupsResponse,
} from '../../../../common/types/mobile';
import { hasPartialReadAccess } from '../../applications/get_partial_access';
import { getCrashGroup } from './get_crash_group';
import { getCrashGroups } from './get_crash_groups';
import {
  MOBILE_CRASH_GROUPS_ENDPOINT,
  MOBILE_CRASH_GROUP_ENDPOINT,
  mobileCrashesRouteRepository,
} from './route';

jest.mock('./get_crash_group');
jest.mock('./get_crash_groups');
jest.mock('../../applications/get_partial_access');

const START = '2021-01-18T12:00:00.000Z';
const END = '2021-01-18T13:00:00.000Z';

const GROUP: MobileCrashGroup = {
  fingerprint: 'npe',
  type: 'java.lang.NullPointerException',
  message: 'TrackRecorder is null',
  users: 3,
  events: 4,
  sessions: 3,
  firstSeen: { time: START, release: '4.2.0' },
  lastSeen: { time: END, release: '4.2.0' },
  newInRelease: '4.2.0',
};

const esClient = { esql: { query: jest.fn() } };
const internalEsClient = { indices: { resolveIndex: jest.fn() } };

const runHandler = (query: Record<string, string> = { start: START, end: END }) => {
  const handler = mobileCrashesRouteRepository[MOBILE_CRASH_GROUPS_ENDPOINT].handler as unknown as (
    resources: unknown
  ) => Promise<MobileCrashGroupsResponse>;
  return handler({
    params: { path: { serviceName: 'trailmap-android' }, query },
    context: {
      core: Promise.resolve({
        elasticsearch: { client: { asCurrentUser: esClient, asInternalUser: internalEsClient } },
        featureFlags: { getBooleanValue: jest.fn().mockResolvedValue(true) },
      }),
    },
    request: { events: { aborted$: NEVER } },
    plugins: {},
    isServerless: false,
    isUxEnabled: true,
    logger: loggingSystemMock.createLogger(),
  });
};

const DETAIL: Omit<MobileCrashGroupDetailResponse, 'isPartial'> = {
  latestCrash: null,
  releases: { top: [{ key: '4.2.0', count: 4 }], other: 0 },
  osVersions: { top: [], other: 4 },
  deviceModels: { top: [], other: 4 },
  beforeCrash: [],
};

beforeEach(() => {
  jest.mocked(getCrashGroups).mockReset().mockResolvedValue([GROUP]);
  jest.mocked(getCrashGroup).mockReset().mockResolvedValue(DETAIL);
  jest.mocked(hasPartialReadAccess).mockReset().mockResolvedValue(false);
});

describe('mobile crash groups route', () => {
  it('queries the crash groups with the filters and the time range', async () => {
    const response = await runHandler({
      start: START,
      end: END,
      environment: 'production',
      osName: 'Android',
      release: '4.2.0',
    });

    expect(response).toEqual({ crashGroups: [GROUP], isPartial: false });
    expect(jest.mocked(getCrashGroups)).toHaveBeenCalledWith(
      expect.objectContaining({
        esClient: expect.objectContaining({ client: esClient }),
        filters: { serviceName: 'trailmap-android', osName: 'Android', release: '4.2.0' },
        start: Date.parse(START),
        end: Date.parse(END),
        environment: 'production',
      })
    );
  });

  it("reports partial values when the user can't read every OTel logs index", async () => {
    jest.mocked(hasPartialReadAccess).mockResolvedValue(true);

    const response = await runHandler();

    expect(response.isPartial).toBe(true);
    await expect(
      jest.mocked(hasPartialReadAccess).mock.calls[0][0].getIndices()
    ).resolves.toStrictEqual(['logs-*.otel-*']);
  });
});

describe('mobile crash group route', () => {
  const runDetailHandler = (fingerprint: string) => {
    const handler = mobileCrashesRouteRepository[MOBILE_CRASH_GROUP_ENDPOINT]
      .handler as unknown as (resources: unknown) => Promise<MobileCrashGroupDetailResponse>;
    return handler({
      params: {
        path: { serviceName: 'trailmap-android', fingerprint },
        query: { start: START, end: END, release: '4.2.0' },
      },
      context: {
        core: Promise.resolve({
          elasticsearch: { client: { asCurrentUser: esClient, asInternalUser: internalEsClient } },
          featureFlags: { getBooleanValue: jest.fn().mockResolvedValue(true) },
        }),
      },
      request: { events: { aborted$: NEVER } },
      plugins: {},
      isServerless: false,
      isUxEnabled: true,
      logger: loggingSystemMock.createLogger(),
    });
  };

  it("queries the group's detail with its fingerprint and the filters", async () => {
    const response = await runDetailHandler('npe');

    expect(response).toEqual({ ...DETAIL, isPartial: false });
    expect(jest.mocked(getCrashGroup)).toHaveBeenCalledWith(
      expect.objectContaining({
        fingerprint: 'npe',
        filters: { serviceName: 'trailmap-android', osName: undefined, release: '4.2.0' },
        start: Date.parse(START),
        end: Date.parse(END),
      })
    );
  });

  it('bounds the fingerprint', () => {
    const schema = mobileCrashesRouteRepository[MOBILE_CRASH_GROUP_ENDPOINT].params as unknown as {
      shape: { path: { safeParse: (path: unknown) => { success: boolean } } };
    };
    const isValid = (fingerprint: string) =>
      schema.shape.path.safeParse({ serviceName: 'trailmap-android', fingerprint }).success;

    expect(isValid('a'.repeat(64))).toBe(true);
    expect(isValid('')).toBe(false);
    expect(isValid('a'.repeat(257))).toBe(false);
  });
});
