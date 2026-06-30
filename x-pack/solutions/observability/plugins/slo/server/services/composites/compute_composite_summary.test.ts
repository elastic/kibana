/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CompositeSLOMemberWithSummary } from '@kbn/slo-schema';
import { createSLO, createAPMTransactionErrorRateIndicator } from '../fixtures/slo';
import { createCompositeSlo } from '../fixtures/composite_slo';
import { computeLiveCompositeSummary } from './compute_composite_summary';
import { createSummaryClientMock, createSLORepositoryMock } from '../mocks';
import type { SLODefinitionRepository } from '../slo_definition_repository';
import type { BurnRateWindow, SummaryClient } from '../summary_client';
import { Duration, DurationUnit, type Summary } from '../../domain/models';

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

describe('computeLiveCompositeSummary', () => {
  let mockSloRepo: jest.Mocked<SLODefinitionRepository>;
  let mockSummaryClient: jest.Mocked<SummaryClient>;

  beforeEach(() => {
    mockSloRepo = createSLORepositoryMock();
    mockSummaryClient = createSummaryClientMock();
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

    mockSloRepo.findAllByIds.mockResolvedValue([sloA, sloB]);
    mockSummaryClient.computeSummaries.mockResolvedValueOnce([
      {
        groupings: {},
        meta: {},
        summary: buildSummary({ sliValue: 0.995 }),
        burnRateWindows: buildBurnRateWindows({ '5m': 0.999, '1h': 0.9992, '1d': 0.9995 }),
      },
      {
        groupings: {},
        meta: {},
        summary: buildSummary({ sliValue: 0.98 }),
        burnRateWindows: buildBurnRateWindows({ '5m': 0.998, '1h': 0.9985, '1d': 0.999 }),
      },
    ]);

    const { compositeSummary } = await computeLiveCompositeSummary(composite, {
      repository: mockSloRepo,
      summaryClient: mockSummaryClient,
    });

    // weighted_sli      = 0.6 * sloA_sli + 0.4 * sloB_sli
    // composite_burn    = (1 - weighted_sli) / (1 - composite_target)
    // initial_budget    = 1 - composite_target
    // consumed_budget   = (1 - weighted_sli) / initial_budget
    // remaining_budget  = 1 - consumed_budget
    expect(compositeSummary.sliValue).toBeCloseTo(0.989); // 0.6*0.995 + 0.4*0.98
    expect(compositeSummary.fiveMinuteBurnRate).toBeCloseTo(0.14); // (1 - (0.6*0.999 + 0.4*0.998)) / 0.01
    expect(compositeSummary.oneHourBurnRate).toBeCloseTo(0.108); // (1 - (0.6*0.9992 + 0.4*0.9985)) / 0.01
    expect(compositeSummary.oneDayBurnRate).toBeCloseTo(0.07); // (1 - (0.6*0.9995 + 0.4*0.999)) / 0.01
    expect(compositeSummary.status).toBe('VIOLATED'); // consumed > 1 → exhausted
    expect(compositeSummary.errorBudget.initial).toBeCloseTo(0.01); // 1 - 0.99
    expect(compositeSummary.errorBudget.consumed).toBeCloseTo(1.1); // (1 - 0.989) / 0.01
    expect(compositeSummary.errorBudget.remaining).toBeCloseTo(-0.1); // 1 - 1.1
    expect(compositeSummary.errorBudget.isEstimated).toBe(false);
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

    const { compositeSummary } = await computeLiveCompositeSummary(composite, {
      repository: mockSloRepo,
      summaryClient: mockSummaryClient,
    });

    // Equal weights → weighted_sli = (sloA_sli + sloB_sli) / 2.
    // composite_burn = (1 - weighted_sli) / (1 - 0.95).
    expect(compositeSummary.fiveMinuteBurnRate).toBeCloseTo(0.6); // (1 - (0.99 + 0.95)/2) / 0.05
    expect(compositeSummary.oneHourBurnRate).toBeCloseTo(0.45); // (1 - (0.995 + 0.96)/2) / 0.05
    expect(compositeSummary.oneDayBurnRate).toBeCloseTo(0.32); // (1 - (0.998 + 0.97)/2) / 0.05
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

    mockSloRepo.findAllByIds.mockResolvedValue([sloA]);
    mockSummaryClient.computeSummaries.mockResolvedValueOnce([
      {
        groupings: {},
        meta: {},
        summary: buildSummary({ sliValue: 0.995 }),
        burnRateWindows: DEFAULT_BURN_RATE_WINDOWS,
      },
    ]);

    const { compositeSummary } = await computeLiveCompositeSummary(composite, {
      repository: mockSloRepo,
      summaryClient: mockSummaryClient,
    });

    // Single member, sli=0.995, target=0.99.
    expect(compositeSummary.errorBudget).toEqual({
      initial: 0.01, // 1 - 0.99
      consumed: 0.5, // (1 - 0.995) / 0.01
      remaining: 0.5, // 1 - 0.5
      isEstimated: false,
    });
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

    const { members } = await computeLiveCompositeSummary(composite, {
      repository: mockSloRepo,
      summaryClient: mockSummaryClient,
    });

    // sloB has no data (-1), so only sloA participates with normalisedWeight = 1.0
    expect(members[0].normalisedWeight).toBe(1);
    expect(members[1].normalisedWeight).toBe(0);
    expect(members[1].sliValue).toBe(-1);
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

    const { compositeSummary } = await computeLiveCompositeSummary(composite, {
      repository: mockSloRepo,
      summaryClient: mockSummaryClient,
    });

    expect(compositeSummary.sliValue).toBe(-1);
    expect(compositeSummary.status).toBe('NO_DATA');
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

    const { members, unresolvedMemberIds } = await computeLiveCompositeSummary(composite, {
      repository: mockSloRepo,
      summaryClient: mockSummaryClient,
    });

    // Only sloA participates
    expect(members).toHaveLength(1);
    expect(members[0].sloId).toBe(sloA.id);
    expect(members[0].normalisedWeight).toBe(1);
    expect(unresolvedMemberIds).toEqual(['deleted-xxxxxxxx']);
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

    mockSloRepo.findAllByIds.mockResolvedValue([sloA]);
    mockSummaryClient.computeSummaries.mockResolvedValueOnce([
      {
        groupings: {},
        meta: {},
        summary: buildSummary({ sliValue: 0.999 }),
        burnRateWindows: DEFAULT_BURN_RATE_WINDOWS,
      },
    ]);

    const { members } = await computeLiveCompositeSummary(composite, {
      repository: mockSloRepo,
      summaryClient: mockSummaryClient,
    });

    expect(mockSummaryClient.computeSummaries).toHaveBeenCalledWith([
      {
        slo: sloA,
        instanceId: 'my-instance',
        timeWindowOverride: {
          duration: new Duration(30, DurationUnit.Day),
          type: 'rolling',
        },
      },
    ]);
    expect((members[0] as CompositeSLOMemberWithSummary).instanceId).toBe('my-instance');
  });

  it('returns VIOLATED status when composite SLI is below target and error budget is exhausted', async () => {
    const sloA = createSLO({
      id: 'slo-a-xxxxxxxx',
      name: 'Violated',
      indicator: createAPMTransactionErrorRateIndicator(),
    });

    const composite = createCompositeSlo({
      members: [{ sloId: sloA.id, weight: 1 }],
      objective: { target: 0.999 },
    });

    mockSloRepo.findAllByIds.mockResolvedValue([sloA]);
    mockSummaryClient.computeSummaries.mockResolvedValueOnce([
      {
        groupings: {},
        meta: {},
        summary: buildSummary({ sliValue: 0.95 }),
        burnRateWindows: buildBurnRateWindows({ '5m': 0.95, '1h': 0.95, '1d': 0.95 }),
      },
    ]);

    const { compositeSummary } = await computeLiveCompositeSummary(composite, {
      repository: mockSloRepo,
      summaryClient: mockSummaryClient,
    });

    // Single member, sli=0.95, target=0.999.
    expect(compositeSummary.status).toBe('VIOLATED'); // consumed > 1 → exhausted
    expect(compositeSummary.errorBudget.initial).toBeCloseTo(0.001); // 1 - 0.999
    expect(compositeSummary.errorBudget.consumed).toBeCloseTo(50); // (1 - 0.95) / 0.001
    expect(compositeSummary.errorBudget.remaining).toBeCloseTo(-49); // 1 - 50
  });
});
