/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import type { EnrichedEntity } from '../enriched_entity';
import { RESOLVED_MODE_MAX_RECORDS } from '../../../../common/entity_analytics/entity_store/resolution_group';
import { EntityIdentifierFields } from '../../../../common/entity_analytics/types';
import { entityDetailsHighlightsServiceFactory } from './entity_details_highlights_service';

const mockGetEnrichedEntities = jest.fn();

jest.mock('../enriched_entity', () => ({
  EnrichEntityService: jest.fn().mockImplementation(() => ({
    getEnrichedEntities: mockGetEnrichedEntities,
  })),
}));

const anonymizationField = (field: string, anonymized = false) => ({
  id: field,
  field,
  allowed: true,
  anonymized,
});

const makeEnrichedEntity = ({
  id,
  name,
  riskScoreNorm,
  criticality,
  anomalyIds = [],
  anomalyShape = 'legacy',
  vulnerabilitiesTotal,
}: {
  id: string;
  name: string;
  riskScoreNorm?: number;
  criticality?: string;
  anomalyIds?: string[];
  /** `details` mirrors the `AnomalySummaryEntry` produced when entityAnalyticsAnomalyDetails is on. */
  anomalyShape?: 'legacy' | 'details';
  vulnerabilitiesTotal?: Record<string, number>;
}): EnrichedEntity =>
  ({
    entity: {
      entity: { id, EngineMetadata: { Type: 'user' } },
      user: { name },
    },
    fields: criticality ? { 'asset.criticality': [criticality] } : {},
    riskScore:
      riskScoreNorm !== undefined
        ? {
            id_field: 'entity.id',
            id_value: id,
            calculated_score_norm: riskScoreNorm,
            category_2_score: null,
            inputs: [],
          }
        : undefined,
    anomalies: anomalyIds.map((anomalyId) => ({
      source:
        anomalyShape === 'details'
          ? { recordId: anomalyId, entityId: id, jobId: `job-${anomalyId}`, recordScore: 50 }
          : { _id: anomalyId, job_id: `job-${anomalyId}`, record_score: 50 },
      job: { name: `Job ${anomalyId}` },
    })),
    vulnerabilities: [],
    vulnerabilitiesTotal,
  } as unknown as EnrichedEntity);

const target = makeEnrichedEntity({
  id: 'user:carol',
  name: 'carol',
  riskScoreNorm: 71.25,
  criticality: 'high_impact',
  anomalyIds: ['a-1'],
});
const alias = makeEnrichedEntity({
  id: 'user:carol-alias',
  name: 'carol.alias',
  riskScoreNorm: 12,
  criticality: 'high_impact',
  anomalyIds: ['a-1', 'a-2'],
});

const buildService = () =>
  entityDetailsHighlightsServiceFactory({
    logger: loggingSystemMock.createLogger(),
    anonymizationFields: [anonymizationField('user.name'), anonymizationField('asset.criticality')],
    experimentalFeatures: { entityAnalyticsEntityStoreV2: true },
    spaceId: 'default',
  } as unknown as Parameters<typeof entityDetailsHighlightsServiceFactory>[0]);

const getDataOpts = {
  entityType: 'user',
  entityIdentifier: 'user:carol',
  anomalyFromDate: 0,
  anomalyToDate: 1,
};

beforeEach(() => {
  jest.clearAllMocks();
});

describe('entityDetailsHighlightsServiceFactory.getV2Data', () => {
  describe('single mode', () => {
    it('fetches only the target with its base score and does not describe a group', async () => {
      mockGetEnrichedEntities.mockResolvedValueOnce({ entities: [target] });

      const result = await buildService().getV2Data(getDataOpts);

      expect(mockGetEnrichedEntities).toHaveBeenCalledTimes(1);
      expect(mockGetEnrichedEntities).toHaveBeenCalledWith(
        expect.objectContaining({
          filter: { term: { 'entity.id': 'user:carol' } },
          size: 1,
          riskScoreType: 'base',
        })
      );
      expect(result.resolutionGroup).toBeUndefined();
      expect(result.riskScore).toEqual([expect.objectContaining({ score: ['71.25'] })]);
      expect(result.anomalies).toHaveLength(1);
    });

    it('returns the empty summary when the target is not in the store', async () => {
      mockGetEnrichedEntities.mockResolvedValueOnce({ entities: [] });

      const result = await buildService().getV2Data(getDataOpts);

      expect(result).toEqual({ riskScore: [], assetCriticality: [], anomalies: null });
    });
  });

  describe('resolved mode', () => {
    it('fetches the target with its resolution score and the aliases resolved to it', async () => {
      mockGetEnrichedEntities
        .mockResolvedValueOnce({ entities: [target] })
        .mockResolvedValueOnce({ entities: [alias] });

      await buildService().getV2Data({ ...getDataOpts, mode: 'resolved' });

      expect(mockGetEnrichedEntities).toHaveBeenCalledTimes(2);
      expect(mockGetEnrichedEntities).toHaveBeenNthCalledWith(
        1,
        expect.objectContaining({
          filter: { term: { 'entity.id': 'user:carol' } },
          size: 1,
          riskScoreType: 'resolution',
        })
      );
      expect(mockGetEnrichedEntities).toHaveBeenNthCalledWith(
        2,
        expect.objectContaining({
          filter: { term: { 'entity.relationships.resolution.resolved_to': 'user:carol' } },
          // The target takes one of the member slots.
          size: RESOLVED_MODE_MAX_RECORDS - 1,
          sort: [{ 'entity.risk.calculated_score_norm': 'desc' }],
        })
      );
    });

    it('combines the group signals with the target risk score and describes the group', async () => {
      mockGetEnrichedEntities
        .mockResolvedValueOnce({ entities: [target] })
        .mockResolvedValueOnce({ entities: [alias] });

      const result = await buildService().getV2Data({ ...getDataOpts, mode: 'resolved' });

      // Only the target's (resolution) score, never the alias' own score.
      expect(result.riskScore).toEqual([expect.objectContaining({ score: ['71.25'] })]);
      // A single criticality record is returned for the group.
      expect(result.assetCriticality).toEqual([{ 'asset.criticality': ['High Impact'] }]);
      // Anomalies are merged and the record both members matched appears once.
      expect(result.anomalies?.map((anomaly) => anomaly.id)).toEqual(['job-a-1', 'job-a-2']);
      expect(result.resolutionGroup).toEqual({
        member_count: 2,
        members: ['carol', 'carol.alias'],
      });
      // Users have no vulnerabilities section.
      expect(result).not.toHaveProperty('vulnerabilities');
    });

    it('merges an anomaly-details record that several members matched', async () => {
      const detailsTarget = makeEnrichedEntity({
        id: 'user:carol',
        name: 'carol',
        riskScoreNorm: 71.25,
        anomalyIds: ['a-1'],
        anomalyShape: 'details',
      });
      const detailsAlias = makeEnrichedEntity({
        id: 'user:carol-alias',
        name: 'carol.alias',
        anomalyIds: ['a-1', 'a-2'],
        anomalyShape: 'details',
      });
      mockGetEnrichedEntities
        .mockResolvedValueOnce({ entities: [detailsTarget] })
        .mockResolvedValueOnce({ entities: [detailsAlias] });

      const result = await buildService().getV2Data({ ...getDataOpts, mode: 'resolved' });

      expect(result.anomalies?.map((anomaly) => anomaly.id)).toEqual(['job-a-1', 'job-a-2']);
    });

    it('anonymizes member identifiers with the shared replacements', async () => {
      mockGetEnrichedEntities
        .mockResolvedValueOnce({ entities: [target] })
        .mockResolvedValueOnce({ entities: [alias] });
      const service = entityDetailsHighlightsServiceFactory({
        logger: loggingSystemMock.createLogger(),
        anonymizationFields: [anonymizationField('user.name', true)],
        experimentalFeatures: { entityAnalyticsEntityStoreV2: true },
        spaceId: 'default',
      } as unknown as Parameters<typeof entityDetailsHighlightsServiceFactory>[0]);

      const result = await service.getV2Data({ ...getDataOpts, mode: 'resolved' });
      const replacements = service.getLocalReplacements(EntityIdentifierFields.userName, 'carol');

      const members = result.resolutionGroup?.members ?? [];
      expect(members).toHaveLength(2);
      expect(members).not.toContain('carol');
      expect(members.map((member) => replacements[member])).toEqual(['carol', 'carol.alias']);
    });

    it('returns only the highest criticality in the group', async () => {
      const lowerAlias = makeEnrichedEntity({ id: 'user:a', name: 'a', criticality: 'low_impact' });
      const higherAlias = makeEnrichedEntity({
        id: 'user:b',
        name: 'b',
        criticality: 'extreme_impact',
      });
      mockGetEnrichedEntities
        .mockResolvedValueOnce({ entities: [target] })
        .mockResolvedValueOnce({ entities: [lowerAlias, higherAlias] });

      const result = await buildService().getV2Data({ ...getDataOpts, mode: 'resolved' });

      expect(result.assetCriticality).toEqual([{ 'asset.criticality': ['Extreme Impact'] }]);
    });

    it('sums host vulnerability totals across members', async () => {
      const hostTarget = makeEnrichedEntity({
        id: 'host:web-01',
        name: 'web-01',
        vulnerabilitiesTotal: { CRITICAL: 1, HIGH: 2 },
      });
      const hostAlias = makeEnrichedEntity({
        id: 'host:web-01-alias',
        name: 'web-01.local',
        vulnerabilitiesTotal: { CRITICAL: 3, LOW: 1 },
      });
      mockGetEnrichedEntities
        .mockResolvedValueOnce({ entities: [hostTarget] })
        .mockResolvedValueOnce({ entities: [hostAlias] });

      const result = await buildService().getV2Data({
        ...getDataOpts,
        entityType: 'host',
        entityIdentifier: 'host:web-01',
        mode: 'resolved',
      });

      expect(result.vulnerabilitiesTotal).toEqual(
        expect.objectContaining({ CRITICAL: 4, HIGH: 2, LOW: 1, MEDIUM: 0, NONE: 0 })
      );
    });

    it('returns the empty summary when the target is missing even if aliases exist', async () => {
      mockGetEnrichedEntities
        .mockResolvedValueOnce({ entities: [] })
        .mockResolvedValueOnce({ entities: [alias] });

      const result = await buildService().getV2Data({ ...getDataOpts, mode: 'resolved' });

      expect(result).toEqual({ riskScore: [], assetCriticality: [], anomalies: null });
    });
  });
});
