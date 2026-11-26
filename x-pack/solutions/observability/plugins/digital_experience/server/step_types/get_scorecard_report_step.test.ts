/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { AuthorizationServiceSetup } from '@kbn/security-plugin-types-server';
import type { ScorecardReport } from '../../common/types/scorecard';
import { getScorecardReport } from '../lib/report/get_scorecard_report';
import { getScorecardReportStepDefinition } from './get_scorecard_report_step';

jest.mock('../lib/report/get_scorecard_report');

const getScorecardReportMock = jest.mocked(getScorecardReport);

const REPORT: ScorecardReport = {
  serviceName: 'shop',
  environments: [],
  period: { start: 1, end: 2 },
  previousPeriod: { start: 0, end: 1 },
  generatedAt: 3,
  sections: [],
};

const esClient = { search: jest.fn() };
const request = {};
const checkPrivileges = jest.fn();
const authz = {
  mode: { useRbacForRequest: jest.fn() },
  actions: { api: { get: (name: string) => `api:${name}` } },
  checkPrivilegesDynamicallyWithRequest: jest.fn(() => checkPrivileges),
};
const NOW = Date.UTC(2026, 10, 20);

const run = async (
  input: { serviceName: string; environment?: string; lookbackDays?: number } = {
    serviceName: 'shop',
    lookbackDays: 7,
  }
) => {
  const abortSignal = new AbortController().signal;
  const coreLogger = loggingSystemMock.createLogger();
  const definition = getScorecardReportStepDefinition(
    coreLogger,
    async () => authz as unknown as AuthorizationServiceSetup
  );
  const result = await definition.handler({
    input,
    contextManager: { getScopedEsClient: () => esClient, getFakeRequest: () => request },
    abortSignal,
    logger: loggingSystemMock.createLogger(),
  } as unknown as Parameters<typeof definition.handler>[0]);
  return { result, abortSignal, coreLogger };
};

describe('digital-experience.getScorecardReport', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers().setSystemTime(NOW);
    getScorecardReportMock.mockResolvedValue(REPORT);
    authz.mode.useRbacForRequest.mockReturnValue(true);
    checkPrivileges.mockResolvedValue({ hasAllRequested: true });
  });

  afterEach(() => {
    jest.useRealTimers();
  });

  it('reports on the days before now, as the workflow’s user', async () => {
    const { result, abortSignal, coreLogger } = await run({
      serviceName: 'shop',
      environment: 'production',
      lookbackDays: 3,
    });

    expect(getScorecardReportMock).toHaveBeenCalledWith({
      client: esClient,
      logger: coreLogger,
      serviceName: 'shop',
      environment: 'production',
      start: NOW - 3 * 24 * 60 * 60 * 1000,
      end: NOW,
      signal: abortSignal,
    });
    expect(result).toEqual({
      output: { report: REPORT, summary: expect.stringContaining('scorecard: shop') },
    });
  });

  it('fails with the message of a search error', async () => {
    getScorecardReportMock.mockRejectedValue(new Error('no such index'));

    const { result } = await run();

    expect(result).toEqual({ error: new Error('no such index') });
  });

  it('uses the default lookback when none is given', async () => {
    await run({ serviceName: 'shop' });

    expect(getScorecardReportMock).toHaveBeenCalledWith(
      expect.objectContaining({ start: NOW - 7 * 24 * 60 * 60 * 1000 })
    );
  });

  it('rejects a rendered input out of bounds', async () => {
    const { result } = await run({ serviceName: 'shop', lookbackDays: 365 });

    expect(result).toHaveProperty('error');
    expect(getScorecardReportMock).not.toHaveBeenCalled();
  });

  it('requires the privileges of the scorecard route', async () => {
    await run();

    expect(checkPrivileges).toHaveBeenCalledWith({
      kibana: ['api:read_digital_experience', 'api:apm'],
    });
  });

  it('refuses a user without them', async () => {
    checkPrivileges.mockResolvedValue({ hasAllRequested: false });

    const { result } = await run();

    expect(result).toHaveProperty('error');
    expect(getScorecardReportMock).not.toHaveBeenCalled();
  });

  it('does not check privileges without RBAC', async () => {
    authz.mode.useRbacForRequest.mockReturnValue(false);

    await run();

    expect(checkPrivileges).not.toHaveBeenCalled();
    expect(getScorecardReportMock).toHaveBeenCalled();
  });
});
