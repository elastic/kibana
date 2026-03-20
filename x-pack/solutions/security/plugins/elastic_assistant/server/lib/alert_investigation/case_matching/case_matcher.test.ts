/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core-logging-server-mocks';
import type { CasesServerStart } from '@kbn/cases-plugin/server';
import type { KibanaRequest } from '@kbn/core/server';
import { CaseStatuses } from '@kbn/cases-components';
import { matchAlertsToCases } from './case_matcher';
import type { ExtractedEntity, CaseMatchingConfig } from '../types';

const logger = loggingSystemMock.createLogger();

const defaultConfig: CaseMatchingConfig = {
  enabled: true,
  strategy: 'weighted',
  matchThreshold: 0.3,
  weights: {
    ip: 1.0,
    hostname: 0.8,
    user: 0.7,
    fileHash: 1.0,
    domain: 0.6,
    process: 0.5,
    other: 0.3,
  },
  temporalDecayDays: 30,
};

const createMockCasesClient = (
  casesData: Array<{
    id: string;
    title: string;
    status: string;
    updated_at: string;
    created_at: string;
    observables: Array<{ typeKey: string; value: string }>;
  }>
) => {
  const mockFind = jest.fn().mockResolvedValue({
    cases: casesData,
    total: casesData.length,
  });

  const mockCases: jest.Mocked<CasesServerStart> = {
    getCasesClientWithRequest: jest.fn().mockResolvedValue({
      cases: { find: mockFind },
    }),
  } as unknown as jest.Mocked<CasesServerStart>;

  return mockCases;
};

const mockRequest = {} as KibanaRequest;

const makeEntity = (
  alertId: string,
  typeKey: ExtractedEntity['typeKey'],
  value: string
): ExtractedEntity => ({
  typeKey,
  value,
  sourceField: 'test.field',
  alertId,
});

describe('matchAlertsToCases', () => {
  beforeEach(() => jest.clearAllMocks());

  it('returns all alerts as unmatched when no cases have observables', async () => {
    const cases = createMockCasesClient([
      {
        id: 'case-1',
        title: 'Empty Case',
        status: CaseStatuses.open,
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        observables: [],
      },
    ]);

    const entities: ExtractedEntity[] = [makeEntity('alert-1', 'ipv4', '10.0.0.1')];

    const result = await matchAlertsToCases({
      entities,
      cases,
      config: defaultConfig,
      logger,
      request: mockRequest,
    });

    expect(result.matched).toHaveLength(0);
    expect(result.unmatched).toHaveLength(1);
  });

  it('matches an alert to a case with overlapping observables', async () => {
    const cases = createMockCasesClient([
      {
        id: 'case-1',
        title: 'Incident A',
        status: CaseStatuses.open,
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        observables: [
          { typeKey: 'observable-type-ipv4', value: '10.0.0.1' },
          { typeKey: 'observable-type-hostname', value: 'server-1' },
        ],
      },
    ]);

    const entities: ExtractedEntity[] = [
      makeEntity('alert-1', 'ipv4', '10.0.0.1'),
      makeEntity('alert-1', 'hostname', 'server-1'),
    ];

    const result = await matchAlertsToCases({
      entities,
      cases,
      config: defaultConfig,
      logger,
      request: mockRequest,
    });

    expect(result.matched).toHaveLength(1);
    expect(result.matched[0].matchedCase?.caseId).toBe('case-1');
    expect(result.matched[0].matchedCase!.score).toBeGreaterThan(0);
  });

  it('selects the best matching case when multiple have overlapping observables', async () => {
    const cases = createMockCasesClient([
      {
        id: 'case-weak',
        title: 'Weak match',
        status: CaseStatuses.open,
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        observables: [{ typeKey: 'observable-type-domain', value: 'example.com' }],
      },
      {
        id: 'case-strong',
        title: 'Strong match',
        status: CaseStatuses.open,
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        observables: [
          { typeKey: 'observable-type-ipv4', value: '10.0.0.1' },
          { typeKey: 'observable-type-file-hash', value: 'abc123' },
        ],
      },
    ]);

    const entities: ExtractedEntity[] = [
      makeEntity('alert-1', 'ipv4', '10.0.0.1'),
      makeEntity('alert-1', 'file_hash', 'abc123'),
      makeEntity('alert-1', 'domain', 'example.com'),
    ];

    const result = await matchAlertsToCases({
      entities,
      cases,
      config: defaultConfig,
      logger,
      request: mockRequest,
    });

    expect(result.matched).toHaveLength(1);
    expect(result.matched[0].matchedCase?.caseId).toBe('case-strong');
  });

  it('applies temporal decay in temporal strategy', async () => {
    const recentDate = new Date().toISOString();
    const oldDate = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();

    const cases = createMockCasesClient([
      {
        id: 'case-old',
        title: 'Old case',
        status: CaseStatuses.open,
        updated_at: oldDate,
        created_at: oldDate,
        observables: [{ typeKey: 'observable-type-ipv4', value: '10.0.0.1' }],
      },
      {
        id: 'case-recent',
        title: 'Recent case',
        status: CaseStatuses.open,
        updated_at: recentDate,
        created_at: recentDate,
        observables: [{ typeKey: 'observable-type-ipv4', value: '10.0.0.1' }],
      },
    ]);

    const entities: ExtractedEntity[] = [makeEntity('alert-1', 'ipv4', '10.0.0.1')];

    const result = await matchAlertsToCases({
      entities,
      cases,
      config: { ...defaultConfig, strategy: 'temporal' },
      logger,
      request: mockRequest,
    });

    expect(result.matched).toHaveLength(1);
    expect(result.matched[0].matchedCase?.caseId).toBe('case-recent');
  });

  it('reports correct stats', async () => {
    const cases = createMockCasesClient([
      {
        id: 'case-1',
        title: 'Case 1',
        status: CaseStatuses.open,
        updated_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        observables: [{ typeKey: 'observable-type-ipv4', value: '10.0.0.1' }],
      },
    ]);

    const entities: ExtractedEntity[] = [
      makeEntity('alert-1', 'ipv4', '10.0.0.1'),
      makeEntity('alert-2', 'hostname', 'unknown-host'),
    ];

    const result = await matchAlertsToCases({
      entities,
      cases,
      config: defaultConfig,
      logger,
      request: mockRequest,
    });

    expect(result.stats.alertsProcessed).toBe(2);
    expect(result.stats.casesEvaluated).toBe(1);
    expect(result.stats.alertsMatched + result.stats.alertsUnmatched).toBe(2);
  });

  it('returns empty matched when no cases exist', async () => {
    const cases = createMockCasesClient([]);

    const entities: ExtractedEntity[] = [makeEntity('alert-1', 'ipv4', '10.0.0.1')];

    const result = await matchAlertsToCases({
      entities,
      cases,
      config: defaultConfig,
      logger,
      request: mockRequest,
    });

    expect(result.matched).toHaveLength(0);
    expect(result.unmatched).toHaveLength(1);
  });
});
