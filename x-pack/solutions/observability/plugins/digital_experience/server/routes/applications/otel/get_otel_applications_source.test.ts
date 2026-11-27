/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { forbidden } from '@hapi/boom';
import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { taskManagerMock } from '@kbn/task-manager-plugin/server/mocks';
import type { SessionsStatus } from '../../../../common/sessions';
import { getSessionsStatus } from '../../../services/sessions/sessions_status';
import type { SourceApplications } from '../types';
import { getOtelApplications } from './get_otel_applications';
import {
  createSessionsReadableCache,
  type SessionsReadableCache,
} from '../../../services/sessions/sessions_readable';
import { getOtelApplicationsFromBestSource } from './get_otel_applications_source';
import { getSessionsApplications } from './get_sessions_applications';

jest.mock('../../../services/sessions/sessions_status');
jest.mock('./get_otel_applications');
jest.mock('./get_sessions_applications');

const mockedStatus = jest.mocked(getSessionsStatus);
const mockedRaw = jest.mocked(getOtelApplications);
const mockedSessions = jest.mocked(getSessionsApplications);

const NOW = Date.parse('2021-01-18T12:00:00.000Z');
const DAY_MS = 24 * 60 * 60 * 1000;
const SETTINGS = { frequency: '1m' };

const application = (serviceName: string) =>
  ({ serviceName, source: 'otel' } as SourceApplications['applications'][number]);

const FROM_SESSIONS: SourceApplications = {
  applications: [application('from-sessions')],
  environments: ['production'],
  pageLoadsOverTime: [],
  sessionsOverTime: [],
};
const FROM_RAW: SourceApplications = {
  applications: [application('from-raw')],
  environments: ['staging'],
  pageLoadsOverTime: [],
  sessionsOverTime: null,
};

const status = (overrides: Partial<SessionsStatus> = {}) =>
  ({ installed: true, health: 'healthy', rebuilding: false, ...overrides } as SessionsStatus);

/** One per test, so a test's requests share an answer and the next test starts without one. */
let sessionsReadable: SessionsReadableCache;

const setup = ({
  start = NOW - DAY_MS,
  signal,
  withTaskManager = true,
}: { start?: number; signal?: AbortSignal; withTaskManager?: boolean } = {}) => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const taskManager = withTaskManager ? taskManagerMock.createStart() : undefined;
  const logger = loggingSystemMock.createLogger();
  const result = getOtelApplicationsFromBestSource({
    esClient,
    taskManager,
    sessionsReadable,
    sessionsSettings: SETTINGS,
    logger,
    start,
    end: NOW,
    environment: 'production',
    signal,
  });
  return { result, esClient, taskManager, logger };
};

describe('getOtelApplicationsFromBestSource', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    sessionsReadable = createSessionsReadableCache();
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

  it('searches through a traced client of the current user and reads the status from Task Manager', async () => {
    const { result, esClient, taskManager } = setup();
    await result;

    expect(mockedStatus).toHaveBeenCalledWith({ taskManager, settings: SETTINGS });
    expect(mockedSessions).toHaveBeenCalledWith({
      tracedEsClient: expect.objectContaining({ client: esClient }),
      start: NOW - DAY_MS,
      end: NOW,
      environment: 'production',
    });
  });

  it('reads the raw events, without reading a status, without Task Manager', async () => {
    await expect(setup({ withTaskManager: false }).result).resolves.toBe(FROM_RAW);
    expect(mockedStatus).not.toHaveBeenCalled();
    expect(mockedSessions).not.toHaveBeenCalled();
  });

  describe('the sessions status', () => {
    it('is read once for the requests of the next half minute', async () => {
      await setup().result;
      await setup().result;
      await Promise.all([setup().result, setup().result]);

      expect(mockedStatus).toHaveBeenCalledTimes(1);
      expect(mockedSessions).toHaveBeenCalledTimes(4);
    });

    it('is read again after half a minute', async () => {
      await setup().result;
      jest.setSystemTime(NOW + 29_000);
      await setup().result;
      expect(mockedStatus).toHaveBeenCalledTimes(1);

      jest.setSystemTime(NOW + 31_000);
      await setup().result;
      expect(mockedStatus).toHaveBeenCalledTimes(2);
    });

    it('is not cancelled by the abort of the request that read it', async () => {
      const controller = new AbortController();
      await setup({ signal: controller.signal }).result;
      controller.abort();

      await expect(setup().result).resolves.toBe(FROM_SESSIONS);
      expect(mockedStatus).toHaveBeenCalledTimes(1);
    });

    it('is not remembered when it could not be read', async () => {
      mockedStatus.mockRejectedValueOnce(new Error('task read failed'));
      await expect(setup().result).resolves.toBe(FROM_RAW);

      await expect(setup().result).resolves.toBe(FROM_SESSIONS);
      expect(mockedStatus).toHaveBeenCalledTimes(2);
    });
  });

  it.each([
    ['sessions are not set up', { installed: false, health: 'missing' }],
    ['the summaries lag', { health: 'lagging' }],
    ['the summaries task fails', { health: 'degraded' }],
    ['the sessions index is being built', { rebuilding: true }],
  ] as const)('reads the raw events when %s', async (_reason, overrides) => {
    mockedStatus.mockResolvedValue(status(overrides));

    await expect(setup().result).resolves.toBe(FROM_RAW);
    expect(mockedSessions).not.toHaveBeenCalled();
  });

  describe('the time range', () => {
    // The task summarizes the events from the start of the day 30 days ago.
    const LOOKBACK_START = Date.parse('2020-12-19T00:00:00.000Z');

    it('reads the sessions from the start of the lookback on', async () => {
      await expect(setup({ start: LOOKBACK_START }).result).resolves.toBe(FROM_SESSIONS);
    });

    it('reads the raw events, without reading the status, when it starts before', async () => {
      await expect(setup({ start: LOOKBACK_START - 1 }).result).resolves.toBe(FROM_RAW);
      expect(mockedStatus).not.toHaveBeenCalled();
      expect(mockedSessions).not.toHaveBeenCalled();
    });
  });

  it('reads the raw events when the sessions status can not be read', async () => {
    mockedStatus.mockRejectedValue(new Error('task read failed'));
    const { result, logger } = setup();

    await expect(result).resolves.toBe(FROM_RAW);
    expect(mockedSessions).not.toHaveBeenCalled();
    expect(logger.debug).toHaveBeenCalledWith(expect.stringContaining('task read failed'));
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

  it('passes the same search parameters, without Task Manager or the sessions settings, to the raw search', async () => {
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
