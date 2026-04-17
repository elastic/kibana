/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSLO, createAPMTransactionErrorRateIndicator } from './fixtures/slo';
import { createCompositeSlo } from './fixtures/composite_slo';
import { GetCompositeSLO } from './get_composite_slo';
import {
  createSummaryClientMock,
  createSLORepositoryMock,
  createCompositeSLORepositoryMock,
} from './mocks';
import type { CompositeSLORepository } from './composite_slo_repository';
import type { SLODefinitionRepository } from './slo_definition_repository';
import type { BurnRateWindow, SummaryClient } from './summary_client';
import type { Summary } from '../domain/models';

const buildSummary = (overrides: Partial<Summary> = {}): Summary => ({
  status: 'HEALTHY',
  sliValue: 0.995,
  errorBudget: { initial: 0.01, consumed: 0.5, remaining: 0.5, isEstimated: false },
  fiveMinuteBurnRate: 1.2,
  oneHourBurnRate: 0.9,
  oneDayBurnRate: 0.8,
  ...overrides,
});

const buildBurnRateWindows = (slis: {
  '5m': number;
  '1h': number;
  '1d': number;
}): BurnRateWindow[] => [
  { name: '5m', burnRate: 0, sli: slis['5m'] },
  { name: '1h', burnRate: 0, sli: slis['1h'] },
  { name: '1d', burnRate: 0, sli: slis['1d'] },
];

const DEFAULT_BURN_RATE_WINDOWS = buildBurnRateWindows({
  '5m': 0.995,
  '1h': 0.995,
  '1d': 0.995,
});

describe('GetCompositeSLO', () => {
  let mockCompositeRepo: jest.Mocked<CompositeSLORepository>;
  let mockSloRepo: jest.Mocked<SLODefinitionRepository>;
  let mockSummaryClient: jest.Mocked<SummaryClient>;
  let getCompositeSLO: GetCompositeSLO;

  beforeEach(() => {
    mockCompositeRepo = createCompositeSLORepositoryMock();
    mockSloRepo = createSLORepositoryMock();
    mockSummaryClient = createSummaryClientMock();
    getCompositeSLO = new GetCompositeSLO(mockCompositeRepo, mockSloRepo, mockSummaryClient);
  });

  it('derives composite burn rates from composite per-window SLIs and composite target', async () => {
    const sloA = createSLO({
      id: 'slo-a-xxxxxxxx',
      name: 'Service A',
      indicator: createAPMTransactionErrorRateIndicator(),
    });
    const sloB = createSLO({
      id: 'slo-b-xxxxxxxx',
      name: 'Service B',
      indicator: createAPMTransactionErrorRateIndicator(),
    });

    const composite = createCompositeSlo({
      members: [
        { sloId: sloA.id, weight: 6 },
        { sloId: sloB.id, weight: 4 },
      ],
      objective: { target: 0.99 },
    });

    mockCompositeRepo.findById.mockResolvedValue(composite);
    mockSloRepo.findAllByIds.mockResolvedValue([sloA, sloB]);

    mockSummaryClient.computeSummaries.mockResolvedValueOnce([
      {
        groupings: {},
        meta: {},
        summary: buildSummary({
          sliValue: 0.995,
          fiveMinuteBurnRate: 1.0,
          oneHourBurnRate: 0.8,
          oneDayBurnRate: 0.5,
        }),
        burnRateWindows: buildBurnRateWindows({
          '5m': 0.999,
          '1h': 0.9992,
          '1d': 0.9995,
        }),
      },
      {
        groupings: {},
        meta: {},
        summary: buildSummary({
          sliValue: 0.98,
          fiveMinuteBurnRate: 2.0,
          oneHourBurnRate: 1.5,
          oneDayBurnRate: 1.0,
        }),
        burnRateWindows: buildBurnRateWindows({
          '5m': 0.998,
          '1h': 0.9985,
          '1d': 0.999,
        }),
      },
    ]);

    const result = await getCompositeSLO.execute(composite.id);

    // normalisedWeight: sloA = 6/10 = 0.6, sloB = 4/10 = 0.4
    // compositeSLI = 0.6 * 0.995 + 0.4 * 0.98 = 0.989 (below target of 0.99)
    // consumed = (1 - 0.989) / 0.01 = 1.1 → budget exhausted → VIOLATED
    expect(result.summary.sliValue).toBeCloseTo(0.989, 3);
    expect(result.summary.status).toBe('VIOLATED');

    // composite 5m SLI  = 0.6 * 0.999  + 0.4 * 0.998  = 0.9986
    // composite 1h SLI  = 0.6 * 0.9992 + 0.4 * 0.9985 = 0.99892
    // composite 1d SLI  = 0.6 * 0.9995 + 0.4 * 0.999  = 0.9993
    // composite error budget = 1 - 0.99 = 0.01
    // composite 5m burn rate = (1 - 0.9986) / 0.01 = 0.14
    expect(result.summary.fiveMinuteBurnRate).toBeCloseTo(0.14, 3);
    // composite 1h burn rate = (1 - 0.99892) / 0.01 = 0.108
    expect(result.summary.oneHourBurnRate).toBeCloseTo(0.108, 3);
    // composite 1d burn rate = (1 - 0.9993) / 0.01 = 0.07
    expect(result.summary.oneDayBurnRate).toBeCloseTo(0.07, 3);

    expect(result.members).toHaveLength(2);
    expect(result.members[0]).toMatchObject({
      id: sloA.id,
      name: 'Service A',
      weight: 6,
      normalisedWeight: 0.6,
    });
    expect(result.members[1]).toMatchObject({
      id: sloB.id,
      name: 'Service B',
      weight: 4,
      normalisedWeight: 0.4,
    });
  });

  it('produces consistent burn rates when member targets differ from composite target', async () => {
    const sloA = createSLO({
      id: 'slo-a-xxxxxxxx',
      name: 'High Target',
      indicator: createAPMTransactionErrorRateIndicator(),
      objective: { target: 0.999 },
    });
    const sloB = createSLO({
      id: 'slo-b-xxxxxxxx',
      name: 'Low Target',
      indicator: createAPMTransactionErrorRateIndicator(),
      objective: { target: 0.9 },
    });

    const composite = createCompositeSlo({
      members: [
        { sloId: sloA.id, weight: 1 },
        { sloId: sloB.id, weight: 1 },
      ],
      objective: { target: 0.95 },
    });

    mockCompositeRepo.findById.mockResolvedValue(composite);
    mockSloRepo.findAllByIds.mockResolvedValue([sloA, sloB]);

    // sloA: 5m SLI = 0.990 → member burn rate = 0.010/0.001 = 10.0
    // sloB: 5m SLI = 0.95  → member burn rate = 0.05/0.10 = 0.5
    // Old approach: 0.5 * 10.0 + 0.5 * 0.5 = 5.25 (misleadingly high!)
    mockSummaryClient.computeSummaries.mockResolvedValueOnce([
      {
        groupings: {},
        meta: {},
        summary: buildSummary({ sliValue: 0.99, fiveMinuteBurnRate: 10.0 }),
        burnRateWindows: buildBurnRateWindows({ '5m': 0.99, '1h': 0.995, '1d': 0.998 }),
      },
      {
        groupings: {},
        meta: {},
        summary: buildSummary({ sliValue: 0.95, fiveMinuteBurnRate: 0.5 }),
        burnRateWindows: buildBurnRateWindows({ '5m': 0.95, '1h': 0.96, '1d': 0.97 }),
      },
    ]);

    const result = await getCompositeSLO.execute(composite.id);

    // composite 5m SLI = 0.5 * 0.990 + 0.5 * 0.95 = 0.97
    // composite error budget = 1 - 0.95 = 0.05
    // composite 5m burn rate = (1 - 0.97) / 0.05 = 0.6
    // The composite is healthy (SLI 97% vs target 95%), burn rate < 1
    expect(result.summary.fiveMinuteBurnRate).toBeCloseTo(0.6, 3);
    expect(result.summary.oneHourBurnRate).toBeCloseTo(0.45, 3);
    expect(result.summary.oneDayBurnRate).toBeCloseTo(0.32, 3);
  });

  it('computes error budget from composite SLI and target', async () => {
    const sloA = createSLO({
      id: 'slo-a-xxxxxxxx',
      name: 'A',
      indicator: createAPMTransactionErrorRateIndicator(),
    });

    const composite = createCompositeSlo({
      members: [{ sloId: sloA.id, weight: 1 }],
      objective: { target: 0.99 },
    });

    mockCompositeRepo.findById.mockResolvedValue(composite);
    mockSloRepo.findAllByIds.mockResolvedValue([sloA]);
    mockSummaryClient.computeSummaries.mockResolvedValueOnce([
      {
        groupings: {},
        meta: {},
        summary: buildSummary({ sliValue: 0.995 }),
        burnRateWindows: DEFAULT_BURN_RATE_WINDOWS,
      },
    ]);

    const result = await getCompositeSLO.execute(composite.id);

    // initialErrorBudget = 1 - 0.99 = 0.01
    // consumed = (1 - 0.995) / 0.01 = 0.5
    // remaining = 1 - 0.5 = 0.5
    expect(result.summary.errorBudget.initial).toBeCloseTo(0.01, 4);
    expect(result.summary.errorBudget.consumed).toBeCloseTo(0.5, 4);
    expect(result.summary.errorBudget.remaining).toBeCloseTo(0.5, 4);
  });

  it('excludes members with no data and re-normalises weights', async () => {
    const sloA = createSLO({
      id: 'slo-a-xxxxxxxx',
      name: 'With Data',
      indicator: createAPMTransactionErrorRateIndicator(),
    });
    const sloB = createSLO({
      id: 'slo-b-xxxxxxxx',
      name: 'No Data',
      indicator: createAPMTransactionErrorRateIndicator(),
    });

    const composite = createCompositeSlo({
      members: [
        { sloId: sloA.id, weight: 3 },
        { sloId: sloB.id, weight: 7 },
      ],
      objective: { target: 0.99 },
    });

    mockCompositeRepo.findById.mockResolvedValue(composite);
    mockSloRepo.findAllByIds.mockResolvedValue([sloA, sloB]);

    mockSummaryClient.computeSummaries.mockResolvedValueOnce([
      {
        groupings: {},
        meta: {},
        summary: buildSummary({ sliValue: 0.995 }),
        burnRateWindows: DEFAULT_BURN_RATE_WINDOWS,
      },
      {
        groupings: {},
        meta: {},
        summary: buildSummary({ sliValue: -1 }),
        burnRateWindows: buildBurnRateWindows({ '5m': -1, '1h': -1, '1d': -1 }),
      },
    ]);

    const result = await getCompositeSLO.execute(composite.id);

    // sloB has no data (-1), so only sloA participates with normalisedWeight = 1.0
    expect(result.summary.sliValue).toBeCloseTo(0.995, 4);
    expect(result.members[0].normalisedWeight).toBe(1);
    expect(result.members[1].normalisedWeight).toBe(0);
    expect(result.members[1].sliValue).toBe(-1);
    expect(result.members[1].contribution).toBe(0);
  });

  it('returns NO_DATA status when all members lack data', async () => {
    const sloA = createSLO({
      id: 'slo-a-xxxxxxxx',
      name: 'No Data A',
      indicator: createAPMTransactionErrorRateIndicator(),
    });
    const sloB = createSLO({
      id: 'slo-b-xxxxxxxx',
      name: 'No Data B',
      indicator: createAPMTransactionErrorRateIndicator(),
    });

    const composite = createCompositeSlo({
      members: [
        { sloId: sloA.id, weight: 1 },
        { sloId: sloB.id, weight: 1 },
      ],
    });

    mockCompositeRepo.findById.mockResolvedValue(composite);
    mockSloRepo.findAllByIds.mockResolvedValue([sloA, sloB]);

    mockSummaryClient.computeSummaries.mockResolvedValueOnce([
      {
        groupings: {},
        meta: {},
        summary: buildSummary({ sliValue: -1 }),
        burnRateWindows: buildBurnRateWindows({ '5m': -1, '1h': -1, '1d': -1 }),
      },
      {
        groupings: {},
        meta: {},
        summary: buildSummary({ sliValue: -1 }),
        burnRateWindows: buildBurnRateWindows({ '5m': -1, '1h': -1, '1d': -1 }),
      },
    ]);

    const result = await getCompositeSLO.execute(composite.id);

    expect(result.summary.sliValue).toBe(-1);
    expect(result.summary.status).toBe('NO_DATA');
  });

  it('skips deleted members that no longer exist in the repository', async () => {
    const sloA = createSLO({
      id: 'slo-a-xxxxxxxx',
      name: 'Existing',
      indicator: createAPMTransactionErrorRateIndicator(),
    });

    const composite = createCompositeSlo({
      members: [
        { sloId: sloA.id, weight: 1 },
        { sloId: 'deleted-xxxxxxxx', weight: 2 },
      ],
      objective: { target: 0.99 },
    });

    mockCompositeRepo.findById.mockResolvedValue(composite);
    // findAllByIds only returns sloA; deleted SLO is not returned
    mockSloRepo.findAllByIds.mockResolvedValue([sloA]);

    mockSummaryClient.computeSummaries.mockResolvedValueOnce([
      {
        groupings: {},
        meta: {},
        summary: buildSummary({ sliValue: 0.995 }),
        burnRateWindows: DEFAULT_BURN_RATE_WINDOWS,
      },
    ]);

    const result = await getCompositeSLO.execute(composite.id);

    // Only sloA participates
    expect(result.summary.sliValue).toBeCloseTo(0.995, 4);
    expect(result.members).toHaveLength(1);
    expect(result.members[0].id).toBe(sloA.id);
    expect(result.members[0].normalisedWeight).toBe(1);
  });

  it('passes instanceId to summary client when member specifies it', async () => {
    const sloA = createSLO({
      id: 'slo-a-xxxxxxxx',
      name: 'A',
      indicator: createAPMTransactionErrorRateIndicator(),
    });

    const composite = createCompositeSlo({
      members: [{ sloId: sloA.id, weight: 1, instanceId: 'my-instance' }],
    });

    mockCompositeRepo.findById.mockResolvedValue(composite);
    mockSloRepo.findAllByIds.mockResolvedValue([sloA]);
    mockSummaryClient.computeSummaries.mockResolvedValueOnce([
      {
        groupings: {},
        meta: {},
        summary: buildSummary({ sliValue: 0.999 }),
        burnRateWindows: DEFAULT_BURN_RATE_WINDOWS,
      },
    ]);

    const result = await getCompositeSLO.execute(composite.id);

    expect(mockSummaryClient.computeSummaries).toHaveBeenCalledWith([
      {
        slo: sloA,
        instanceId: 'my-instance',
        timeWindowOverride: composite.timeWindow,
      },
    ]);
    expect(result.members[0].instanceId).toBe('my-instance');
  });

  it('returns VIOLATED status when composite SLI is below target and error budget exhausted', async () => {
    const sloA = createSLO({
      id: 'slo-a-xxxxxxxx',
      name: 'Violated',
      indicator: createAPMTransactionErrorRateIndicator(),
    });

    const composite = createCompositeSlo({
      members: [{ sloId: sloA.id, weight: 1 }],
      objective: { target: 0.999 },
    });

    mockCompositeRepo.findById.mockResolvedValue(composite);
    mockSloRepo.findAllByIds.mockResolvedValue([sloA]);
    mockSummaryClient.computeSummaries.mockResolvedValueOnce([
      {
        groupings: {},
        meta: {},
        summary: buildSummary({ sliValue: 0.95 }),
        burnRateWindows: buildBurnRateWindows({ '5m': 0.95, '1h': 0.95, '1d': 0.95 }),
      },
    ]);

    const result = await getCompositeSLO.execute(composite.id);

    // initialErrorBudget = 0.001, consumed = (1 - 0.95) / 0.001 = 50
    // remaining = 1 - 50 = -49 < 0
    expect(result.summary.status).toBe('VIOLATED');
    expect(result.summary.errorBudget.remaining).toBeLessThan(0);
  });
});
