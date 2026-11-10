/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { forbidden } from '@hapi/boom';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { SessionsStatus } from '../../../../common/sessions';
import { getSessionsStatus } from '../../../sessions/sessions_setup';
import type { SourceApplications } from '../types';
import { getOtelApplications } from './get_otel_applications';
import { getOtelApplicationsFromBestSource } from './get_otel_applications_source';
import { getSessionsApplications } from './get_sessions_applications';

jest.mock('../../../sessions/sessions_setup');
jest.mock('./get_otel_applications');
jest.mock('./get_sessions_applications');

const mockedStatus = jest.mocked(getSessionsStatus);
const mockedRaw = jest.mocked(getOtelApplications);
const mockedSessions = jest.mocked(getSessionsApplications);

const NOW = Date.parse('2021-01-18T12:00:00.000Z');
const DAY_MS = 24 * 60 * 60 * 1000;
const SETTINGS = { frequency: '1m', partitions: 1 };

const application = (serviceName: string) =>
  ({ serviceName, source: 'otel' } as SourceApplications['applications'][number]);

const FROM_SESSIONS: SourceApplications = {
  applications: [application('from-sessions')],
  environments: ['production'],
  pageLoadsOverTime: [],
};
const FROM_RAW: SourceApplications = {
  applications: [application('from-raw')],
  environments: ['staging'],
  pageLoadsOverTime: [],
};

const status = (overrides: Partial<SessionsStatus> = {}) =>
  ({ installed: true, health: 'healthy', rebuilding: false, ...overrides } as SessionsStatus);

const setup = ({ start = NOW - DAY_MS, signal }: { start?: number; signal?: AbortSignal } = {}) => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const internalEsClient = elasticsearchServiceMock.createElasticsearchClient();
  const logger = loggingSystemMock.createLogger();
  const result = getOtelApplicationsFromBestSource({
    esClient,
    internalEsClient,
    sessionsSettings: SETTINGS,
    logger,
    start,
    end: NOW,
    environment: 'production',
    signal,
  });
  return { result, esClient, internalEsClient, logger };
};

describe('getOtelApplicationsFromBestSource', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(NOW);
    mockedStatus.mockResolvedValue(status());
    mockedSessions.mockResolvedValue(FROM_SESSIONS);
    mockedRaw.mockResolvedValue(FROM_RAW);
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('reads the sessions index when sessions are set up, current and healthy', async () => {
    const { result } = setup();

    await expect(result).resolves.toBe(FROM_SESSIONS);
    expect(mockedRaw).not.toHaveBeenCalled();
  });

  it('searches as the current user and checks the transforms with the internal user', async () => {
    const { signal } = new AbortController();
    const { result, esClient, internalEsClient } = setup({ signal });
    await result;

    expect(mockedStatus).toHaveBeenCalledWith(internalEsClient, { settings: SETTINGS, signal });
    expect(mockedSessions).toHaveBeenCalledWith({
      esClient,
      start: NOW - DAY_MS,
      end: NOW,
      environment: 'production',
      signal,
    });
  });

  it.each([
    ['sessions are not set up', { installed: false, health: 'missing' }],
    ['the transforms are outdated', { health: 'outdated' }],
    ['the transforms lag', { health: 'lagging' }],
    ['the transforms are degraded', { health: 'degraded' }],
    ['the sessions index is being built', { rebuilding: true }],
  ] as const)('reads the raw events when %s', async (_reason, overrides) => {
    mockedStatus.mockResolvedValue(status(overrides));

    await expect(setup().result).resolves.toBe(FROM_RAW);
    expect(mockedSessions).not.toHaveBeenCalled();
  });

  describe('the time range', () => {
    // The transform summarizes the events from the start of the day 30 days ago.
    const LOOKBACK_START = Date.parse('2020-12-19T00:00:00.000Z');

    it('reads the sessions from the start of the lookback on', async () => {
      await expect(setup({ start: LOOKBACK_START }).result).resolves.toBe(FROM_SESSIONS);
    });

    it('reads the raw events, without checking the transforms, when it starts before', async () => {
      await expect(setup({ start: LOOKBACK_START - 1 }).result).resolves.toBe(FROM_RAW);
      expect(mockedStatus).not.toHaveBeenCalled();
      expect(mockedSessions).not.toHaveBeenCalled();
    });
  });

  it('reads the raw events when the status of the transforms can not be read', async () => {
    mockedStatus.mockRejectedValue(new Error('transform status failed'));
    const { result, logger } = setup();

    await expect(result).resolves.toBe(FROM_RAW);
    expect(mockedSessions).not.toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('transform status failed'));
  });

  it('reads the raw events quietly for a user without access to the sessions index', async () => {
    mockedSessions.mockRejectedValue(forbidden('no read on the sessions index'));
    const { result, logger } = setup();

    await expect(result).resolves.toBe(FROM_RAW);
    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('no read on the sessions'));
    expect(logger.warn).not.toHaveBeenCalled();
  });

  it('reads the raw events and warns when the sessions search fails otherwise', async () => {
    mockedSessions.mockRejectedValue(new Error('search_phase_execution_exception'));
    const { result, logger } = setup();

    await expect(result).resolves.toBe(FROM_RAW);
    expect(logger.warn).toHaveBeenCalledWith(
      expect.stringContaining('search_phase_execution_exception')
    );
  });

  it('reads the raw events when the sessions hold no application', async () => {
    mockedSessions.mockResolvedValue({ ...FROM_SESSIONS, applications: [] });

    await expect(setup().result).resolves.toBe(FROM_RAW);
  });

  it('passes the same search parameters, and no sessions settings, to the raw search', async () => {
    mockedStatus.mockResolvedValue(status({ installed: false }));
    const { result, esClient } = setup();
    await result;

    expect(mockedRaw).toHaveBeenCalledTimes(1);
    expect(mockedRaw).toHaveBeenCalledWith({
      esClient,
      start: NOW - DAY_MS,
      end: NOW,
      environment: 'production',
      signal: undefined,
    });
  });

  it('does not read the raw events when the request was aborted', async () => {
    const controller = new AbortController();
    controller.abort();
    mockedSessions.mockRejectedValue(new Error('request aborted'));

    await expect(setup({ signal: controller.signal }).result).rejects.toThrow('request aborted');
    expect(mockedRaw).not.toHaveBeenCalled();
  });

  it('fails with the raw search when that fails too', async () => {
    mockedStatus.mockResolvedValue(status({ installed: false }));
    mockedRaw.mockRejectedValue(new Error('raw failed'));

    await expect(setup().result).rejects.toThrow('raw failed');
  });
});
