/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import type { CompositeSLOMemberWithSummary, CompositeSLOSummary } from '@kbn/slo-schema';
import { createSLO, createAPMTransactionErrorRateIndicator } from '../fixtures/slo';
import { createCompositeSlo } from '../fixtures/composite_slo';
import * as compositeSloSummaryIndex from './composite_slo_summary_index';
import { GetCompositeSLO } from './get_composite_slo';
import {
  createSummaryClientMock,
  createSLORepositoryMock,
  createCompositeSLORepositoryMock,
} from '../mocks';
import type { CompositeSLORepository } from './composite_slo_repository';
import type { SLODefinitionRepository } from '../slo_definition_repository';
import type { BurnRateWindow, SummaryClient } from '../summary_client';
import { type Summary } from '../../domain/models';

const buildSummary = (overrides: Partial<Summary> = {}): Summary => ({
  status: 'HEALTHY',
  sliValue: 0.995,
  errorBudget: { initial: 0.01, consumed: 0.5, remaining: 0.5, isEstimated: false },
  fiveMinuteBurnRate: 1.2,
  oneHourBurnRate: 0.9,
  oneDayBurnRate: 0.8,
  ...overrides,
});

const buildMemberSummary = (
  overrides: Partial<CompositeSLOMemberWithSummary> = {}
): CompositeSLOMemberWithSummary => ({
  sloId: 'slo-a-xxxxxxxx',
  name: 'Service A',
  weight: 1,
  normalisedWeight: 1,
  sliValue: 0.995,
  fiveMinuteBurnRate: 1.2,
  oneHourBurnRate: 0.9,
  oneDayBurnRate: 0.8,
  errorBudget: {
    initial: 0.01,
    consumed: 0.5,
    remaining: 0.5,
    isEstimated: false,
  },
  instanceId: undefined,
  status: 'HEALTHY',
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

const DEFAULT_SPACE_ID = 'default';
const DEFAULT_ES_CLIENT = {} as ElasticsearchClient;

function mockPersistedCompositeSummary(
  compositeId: string,
  summary: CompositeSLOSummary,
  members?: CompositeSLOMemberWithSummary[]
) {
  return jest
    .spyOn(compositeSloSummaryIndex, 'fetchCompositeSloSummariesFromIndex')
    .mockResolvedValue(new Map([[compositeId, { summary, members }]]));
}

describe('GetCompositeSLO', () => {
  let mockCompositeRepo: jest.Mocked<CompositeSLORepository>;
  let mockSloRepo: jest.Mocked<SLODefinitionRepository>;
  let mockSummaryClient: jest.Mocked<SummaryClient>;
  let getCompositeSLO: GetCompositeSLO;

  beforeEach(() => {
    mockCompositeRepo = createCompositeSLORepositoryMock();
    mockSloRepo = createSLORepositoryMock();
    mockSummaryClient = createSummaryClientMock();
    getCompositeSLO = new GetCompositeSLO(
      mockCompositeRepo,
      mockSloRepo,
      mockSummaryClient,
      DEFAULT_ES_CLIENT
    );
  });

  describe('when persisted summary is missing or incomplete', () => {
    // Compute math is covered in compute_composite_summary.test.ts. The test below only
    // verifies that the reader falls through to `computeLiveCompositeSummary` and surfaces
    // its output, so the expand flow can render member data without waiting for the task.
    it('recomputes live and returns the recomputed summary and members', async () => {
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
      jest
        .spyOn(compositeSloSummaryIndex, 'fetchCompositeSloSummariesFromIndex')
        .mockResolvedValue(new Map());

      const result = await getCompositeSLO.execute(composite.id, DEFAULT_SPACE_ID);

      expect(mockSummaryClient.computeSummaries).toHaveBeenCalled();
      expect(result.summary.sliValue).toBeCloseTo(0.995);
      expect(result.members).toHaveLength(1);
      expect(result.members[0].sloId).toBe(sloA.id);
    });
  });

  describe('when persisted summary and members are present', () => {
    it('uses persisted composite summary from index when it is present and has computed members', async () => {
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

      const indexSummary: CompositeSLOSummary = {
        sliValue: 0.5,
        status: 'VIOLATED',
        errorBudget: {
          initial: 0.01,
          consumed: 50,
          remaining: -49,
          isEstimated: false,
        },
        fiveMinuteBurnRate: 9,
        oneHourBurnRate: 8,
        oneDayBurnRate: 7,
      };

      const fetchSpy = mockPersistedCompositeSummary(composite.id, indexSummary, [
        buildMemberSummary(sloA),
      ]);

      const result = await getCompositeSLO.execute(composite.id, DEFAULT_SPACE_ID);

      expect(fetchSpy).toHaveBeenCalled();
      expect(result.summary).toEqual(indexSummary);
      expect(result.members).toHaveLength(1);

      fetchSpy.mockRestore();
    });
  });
});
