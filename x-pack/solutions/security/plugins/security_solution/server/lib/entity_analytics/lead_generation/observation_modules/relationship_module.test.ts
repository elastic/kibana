/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loggingSystemMock } from '@kbn/core/server/mocks';
import { type RelationshipsClient } from '@kbn/entity-store/server';
import type { LeadEntity } from '../types';
import { createRelationshipModule } from './relationship_module';

const logger = loggingSystemMock.createLogger();

interface EntityRecordOverrides {
  type?: string;
  name?: string;
  id?: string;
  relationships?: Record<string, unknown>;
  riskScoreNorm?: number;
  riskLevel?: string;
  criticality?: string;
}

const buildEntity = ({
  type = 'user',
  name = 'alice',
  id,
  relationships,
  riskScoreNorm,
  riskLevel,
  criticality,
}: EntityRecordOverrides = {}): LeadEntity => {
  const entityId = id ?? `${type}:${name}`;
  return {
    id: entityId,
    type,
    name,
    record: {
      entity: {
        id: entityId,
        type,
        name,
        relationships,
        ...(riskScoreNorm != null || riskLevel != null
          ? {
              risk: {
                ...(riskScoreNorm != null ? { calculated_score_norm: riskScoreNorm } : {}),
                ...(riskLevel != null ? { calculated_level: riskLevel } : {}),
              },
            }
          : {}),
      },
      ...(criticality ? { asset: { criticality } } : {}),
    } as unknown as LeadEntity['record'],
  };
};

const relationshipsClient: jest.Mocked<
  Pick<RelationshipsClient, 'getEarliestObservationByTarget'>
> = {
  getEarliestObservationByTarget: jest.fn(),
};

const createModule = (entitiesMap: ReadonlyMap<string, LeadEntity>) =>
  createRelationshipModule({
    logger,
    relationshipsClient: relationshipsClient as unknown as RelationshipsClient,
    entitiesMap,
  });

/**
 * Builds an `entitiesMap` from `allEntities` (defaulting to `entities`) and
 * collects observations for `entities` — mirroring how `run_pipeline` injects
 * the map produced by `buildEntityLookupMap`, which may include entities
 * resolved from outside the candidate batch.
 */
const collect = (entities: LeadEntity[], allEntities: LeadEntity[] = entities) => {
  const entitiesMap = new Map(allEntities.map((entity) => [entity.id, entity]));
  return createModule(entitiesMap).collect(entities);
};

const msDaysAgo = (days: number) => Date.now() - days * 24 * 60 * 60 * 1000;

const firstSeenMap = (entries: Record<string, number>) => new Map(Object.entries(entries));

describe('createRelationshipModule', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    relationshipsClient.getEarliestObservationByTarget.mockResolvedValue(new Map());
  });

  it('is always enabled', () => {
    expect(createModule(new Map()).isEnabled()).toBe(true);
  });

  it('exposes the entity_relationships module id, priority, and weight', () => {
    const { config } = createModule(new Map());
    expect(config.id).toBe('entity_relationships');
    expect(config.priority).toBe(6);
    expect(config.weight).toBe(0.6);
  });

  describe('relationship parsing', () => {
    it('returns no observations when relationships are missing or empty', async () => {
      expect(await collect([buildEntity()])).toHaveLength(0);
      expect(await collect([buildEntity({ relationships: {} })])).toHaveLength(0);
      expect(
        await collect([buildEntity({ relationships: { communicates_with: { ids: [] } } })])
      ).toHaveLength(0);
    });

    it('ignores malformed relationships', async () => {
      const malformed = [
        buildEntity({ relationships: { communicates_with: ['host:a', 'host:b'] } }),
        buildEntity({ relationships: { administers: 'host:dc-01' } }),
        buildEntity({ relationships: { accesses_infrequently: { ids: 'host:dc-01' } } }),
      ];

      for (const entity of malformed) {
        expect(await collect([entity])).toHaveLength(0);
      }
    });

    it('does not emit for relationship kinds outside the picked set', async () => {
      const entity = buildEntity({
        relationships: { owns: { ids: ['host:dc-01'] } },
      });

      expect(await collect([entity])).toHaveLength(0);
    });
  });

  describe('connected_to_risk', () => {
    it('does not fire when the entity has no connections', async () => {
      const observations = await collect([buildEntity()]);

      expect(observations.find((o) => o.type === 'connected_to_risk')).toBeUndefined();
    });

    it('does not fire for entities reached only via non-communication edges', async () => {
      const criticalConnection = buildEntity({
        type: 'host',
        name: 'dc-01',
        riskLevel: 'Critical',
      });
      const entity = buildEntity({
        relationships: { administers: { ids: [criticalConnection.id] } },
      });

      const observations = await collect([entity, criticalConnection]);

      expect(observations.find((o) => o.type === 'connected_to_risk')).toBeUndefined();
    });

    it('does not fire when the connected entity risk level is below High', async () => {
      const benignConnection = buildEntity({
        type: 'host',
        name: 'web-01',
        riskLevel: 'Moderate',
      });
      const entity = buildEntity({
        relationships: { communicates_with: { ids: [benignConnection.id] } },
      });

      const observations = await collect([entity, benignConnection]);

      expect(observations.find((o) => o.type === 'connected_to_risk')).toBeUndefined();
    });

    it('fires with medium severity for a single High-risk communication peer', async () => {
      const highRiskConnection = buildEntity({ type: 'host', name: 'web-01', riskLevel: 'High' });
      const entity = buildEntity({
        relationships: { communicates_with: { ids: [highRiskConnection.id] } },
      });

      const observations = await collect([entity, highRiskConnection]);
      const observation = observations.find((o) => o.type === 'connected_to_risk');

      expect(observation).toBeDefined();
      // High base 25 + full fraction bonus 30 (1/1 peers risky) = 55
      expect(observation?.score).toBe(55);
      expect(observation?.severity).toBe('medium');
      expect(observation?.confidence).toBe(0.6);
      expect(observation?.metadata.high_risk_entities).toEqual([highRiskConnection.id]);
      expect(observation?.metadata.critical_risk_entities).toEqual([]);
    });

    it('fires with high severity for a single Critical-risk communication peer', async () => {
      const criticalConnection = buildEntity({
        type: 'host',
        name: 'dc-01',
        riskLevel: 'Critical',
      });
      const entity = buildEntity({
        relationships: { communicates_with: { ids: [criticalConnection.id] } },
      });

      const observations = await collect([entity, criticalConnection]);
      const observation = observations.find((o) => o.type === 'connected_to_risk');

      // Critical base 45 + full fraction bonus 30 (1/1 peers risky) = 75
      expect(observation?.score).toBe(75);
      expect(observation?.severity).toBe('high');
    });

    it('does not fire for a peer that is only high-criticality with no elevated risk level', async () => {
      const criticalAssetConnection = buildEntity({
        type: 'host',
        name: 'dc-01',
        criticality: 'extreme_impact',
      });
      const entity = buildEntity({
        relationships: { communicates_with: { ids: [criticalAssetConnection.id] } },
      });

      const observations = await collect([entity, criticalAssetConnection]);

      expect(observations.find((o) => o.type === 'connected_to_risk')).toBeUndefined();
    });

    it('scores from the worst tier and splits peers by risk tier', async () => {
      const criticalConnection = buildEntity({
        type: 'host',
        name: 'dc-01',
        riskLevel: 'Critical',
      });
      const highRiskConnection = buildEntity({ type: 'host', name: 'web-01', riskLevel: 'High' });
      const entity = buildEntity({
        relationships: {
          communicates_with: { ids: [criticalConnection.id, highRiskConnection.id] },
        },
      });

      const observations = await collect([entity, criticalConnection, highRiskConnection]);
      const observation = observations.find((o) => o.type === 'connected_to_risk');

      // Worst tier Critical → base 45 + full fraction bonus 30 (2/2 peers risky) = 75
      expect(observation?.score).toBe(75);
      expect(observation?.severity).toBe('high');
      expect(observation?.metadata.critical_risk_entities).toEqual([criticalConnection.id]);
      expect(observation?.metadata.high_risk_entities).toEqual([highRiskConnection.id]);
    });

    it('applies a partial bonus when only some peers are risky, and ignores non-risky peers', async () => {
      const criticalConnection = buildEntity({
        type: 'host',
        name: 'dc-01',
        riskLevel: 'Critical',
      });
      const benignConnection = buildEntity({ type: 'host', name: 'web-02', riskLevel: 'Low' });
      const entity = buildEntity({
        relationships: {
          communicates_with: { ids: [criticalConnection.id, benignConnection.id] },
        },
      });

      const observations = await collect([entity, criticalConnection, benignConnection]);
      const observation = observations.find((o) => o.type === 'connected_to_risk');

      // base 45 + round(0.5 * 30) fraction bonus (1 of 2 resolved peers risky) = 60
      expect(observation?.score).toBe(60);
      expect(observation?.metadata.critical_risk_entities).toEqual([criticalConnection.id]);
      expect(observation?.metadata.high_risk_entities).toEqual([]);
      expect(observation?.metadata.total_communicating_count).toBe(2);
    });

    it('does not inflate a hub where only a small fraction of many peers are risky', async () => {
      const criticalConnection = buildEntity({
        type: 'host',
        name: 'dc-01',
        riskLevel: 'Critical',
      });
      const benignPeers = Array.from({ length: 9 }, (_, i) =>
        buildEntity({ type: 'host', name: `web-0${i}`, riskLevel: 'Low' })
      );
      const entity = buildEntity({
        relationships: {
          communicates_with: { ids: [criticalConnection.id, ...benignPeers.map((p) => p.id)] },
        },
      });

      const observations = await collect([entity, criticalConnection, ...benignPeers]);
      const observation = observations.find((o) => o.type === 'connected_to_risk');

      // base 45 + round(0.1 * 30) = 48 — a lone risky peer among many barely moves the score.
      expect(observation?.score).toBe(48);
      expect(observation?.metadata.total_communicating_count).toBe(10);
    });

    it('does not treat unresolved peer IDs as a clean neighborhood', async () => {
      const criticalConnection = buildEntity({
        type: 'host',
        name: 'dc-01',
        riskLevel: 'Critical',
      });
      const entity = buildEntity({
        relationships: {
          communicates_with: { ids: [criticalConnection.id, 'host:unknown'] },
        },
      });

      const observations = await collect([entity, criticalConnection]);
      const observation = observations.find((o) => o.type === 'connected_to_risk');

      // Unresolved IDs are excluded from the fraction: 1/1 resolved risky → 75, not 1/2 → 60.
      expect(observation?.score).toBe(75);
      expect(observation?.metadata.critical_risk_entities).toEqual([criticalConnection.id]);
      expect(observation?.metadata.total_communicating_count).toBe(2);
    });
  });

  describe('sensitive_infrequent_access', () => {
    it('does not emit for infrequent access to low-value targets', async () => {
      const lowValueTarget = buildEntity({ type: 'host', name: 'kiosk-01' });
      const entity = buildEntity({
        relationships: { accesses_infrequently: { ids: [lowValueTarget.id] } },
      });

      const observations = await collect([entity, lowValueTarget]);

      expect(observations.find((o) => o.type === 'sensitive_infrequent_access')).toBeUndefined();
    });

    it('does not emit when the target cannot be resolved to an entity', async () => {
      const entity = buildEntity({
        relationships: { accesses_infrequently: { ids: ['host:unknown'] } },
      });

      // host:unknown is absent from the entity lookup map (unresolved by buildEntityLookupMap).
      const observations = await collect([entity]);

      expect(observations.find((o) => o.type === 'sensitive_infrequent_access')).toBeUndefined();
    });

    it('emits score 80 and high severity for a single Critical-tier target (extreme criticality)', async () => {
      const criticalTarget = buildEntity({
        type: 'host',
        name: 'dc-01',
        criticality: 'extreme_impact',
      });
      const entity = buildEntity({
        relationships: { accesses_infrequently: { ids: [criticalTarget.id] } },
      });

      const observations = await collect([entity, criticalTarget]);
      const observation = observations.find((o) => o.type === 'sensitive_infrequent_access');

      expect(observation).toBeDefined();
      expect(observation?.score).toBe(80);
      expect(observation?.severity).toBe('high');
      expect(observation?.confidence).toBe(0.6);
      expect(observation?.metadata.critical_accessed_entities).toEqual([criticalTarget.id]);
      expect(observation?.metadata.high_accessed_entities).toEqual([]);
      expect(observation?.description).toContain('critical-tier');
    });

    it('treats a Critical risk level as a Critical-tier target', async () => {
      const criticalTarget = buildEntity({ type: 'host', name: 'dc-01', riskLevel: 'Critical' });
      const entity = buildEntity({
        relationships: { accesses_infrequently: { ids: [criticalTarget.id] } },
      });

      const observations = await collect([entity, criticalTarget]);
      const observation = observations.find((o) => o.type === 'sensitive_infrequent_access');

      expect(observation?.score).toBe(80);
      expect(observation?.severity).toBe('high');
    });

    it('emits score 60 and medium severity for a single High-tier target', async () => {
      const highTarget = buildEntity({ type: 'host', name: 'web-01', riskLevel: 'High' });
      const entity = buildEntity({
        relationships: { accesses_infrequently: { ids: [highTarget.id] } },
      });

      const observations = await collect([entity, highTarget]);
      const observation = observations.find((o) => o.type === 'sensitive_infrequent_access');

      expect(observation?.score).toBe(60);
      expect(observation?.severity).toBe('medium');
      expect(observation?.metadata.high_accessed_entities).toEqual([highTarget.id]);
      expect(observation?.metadata.critical_accessed_entities).toEqual([]);
      expect(observation?.description).not.toContain('critical-tier');
    });

    it('scores from the worst tier only — additional targets do not raise the score', async () => {
      const highTargets = Array.from({ length: 3 }, (_, i) =>
        buildEntity({ type: 'host', name: `web-0${i}`, riskLevel: 'High' })
      );
      const entity = buildEntity({
        relationships: { accesses_infrequently: { ids: highTargets.map((t) => t.id) } },
      });

      const observations = await collect([entity, ...highTargets]);
      const observation = observations.find((o) => o.type === 'sensitive_infrequent_access');

      // Worst tier is High → 60, regardless of how many High-tier targets there are.
      expect(observation?.score).toBe(60);
      expect(observation?.metadata.high_accessed_entities).toHaveLength(3);
    });

    it('lets the worst (Critical) tier drive score and severity when tiers are mixed', async () => {
      const criticalTarget = buildEntity({ type: 'host', name: 'dc-01', riskLevel: 'Critical' });
      const highTarget = buildEntity({ type: 'host', name: 'web-01', riskLevel: 'High' });
      const entity = buildEntity({
        relationships: {
          accesses_infrequently: { ids: [highTarget.id, criticalTarget.id] },
        },
      });

      const observations = await collect([entity, criticalTarget, highTarget]);
      const observation = observations.find((o) => o.type === 'sensitive_infrequent_access');

      // Worst tier is Critical → 80; the extra High-tier target does not change it.
      expect(observation?.score).toBe(80);
      expect(observation?.severity).toBe('high');
      expect(observation?.metadata.critical_accessed_entities).toEqual([criticalTarget.id]);
      expect(observation?.metadata.high_accessed_entities).toEqual([highTarget.id]);
    });

    it('ignores low-value targets when scoring but counts them in the total', async () => {
      const criticalTarget = buildEntity({
        type: 'host',
        name: 'dc-01',
        criticality: 'extreme_impact',
      });
      const lowValueTarget = buildEntity({ type: 'host', name: 'kiosk-01' });
      const entity = buildEntity({
        relationships: {
          accesses_infrequently: { ids: [criticalTarget.id, lowValueTarget.id] },
        },
      });

      const observations = await collect([entity, criticalTarget, lowValueTarget]);
      const observation = observations.find((o) => o.type === 'sensitive_infrequent_access');

      expect(observation?.score).toBe(80);
      expect(observation?.metadata.critical_accessed_entities).toEqual([criticalTarget.id]);
      expect(observation?.metadata.total_infrequently_accessed_count).toBe(2);
    });

    it('resolves a high-value target fetched from outside the candidate batch', async () => {
      const target = buildEntity({ type: 'host', name: 'dc-01', criticality: 'extreme_impact' });
      const entity = buildEntity({
        relationships: { accesses_infrequently: { ids: [target.id] } },
      });

      // `target` is only present in the injected entity lookup map, not in the
      // candidate batch passed to collect() — mirroring an entity resolved by
      // buildEntityLookupMap from outside the pipeline's candidate list.
      const observations = await collect([entity], [entity, target]);
      const observation = observations.find((o) => o.type === 'sensitive_infrequent_access');

      expect(observation?.score).toBe(80);
      expect(observation?.metadata.critical_accessed_entities).toEqual([target.id]);
    });
  });

  describe('new_control_over_critical_asset', () => {
    const criticalHost = () =>
      buildEntity({ type: 'host', name: 'dc-01', criticality: 'extreme_impact' });

    it('does not emit without an administers edge to a high-impact asset', async () => {
      const lowValueTarget = buildEntity({ type: 'host', name: 'kiosk-01' });
      const entity = buildEntity({
        relationships: { administers: { ids: [lowValueTarget.id] } },
      });

      const observations = await collect([entity, lowValueTarget]);

      expect(
        observations.find((o) => o.type === 'new_control_over_critical_asset')
      ).toBeUndefined();
      // No high-impact target → no history lookup is paid for.
      expect(relationshipsClient.getEarliestObservationByTarget).not.toHaveBeenCalled();
    });

    it('queries administers history in one call, scoped to high-impact targets only', async () => {
      const target = criticalHost();
      const lowValueTarget = buildEntity({ type: 'host', name: 'kiosk-01' });
      const entity = buildEntity({
        relationships: { administers: { ids: [target.id, lowValueTarget.id] } },
      });

      await collect([entity, target, lowValueTarget]);

      expect(relationshipsClient.getEarliestObservationByTarget).toHaveBeenCalledTimes(1);
      expect(relationshipsClient.getEarliestObservationByTarget).toHaveBeenCalledWith({
        entityId: entity.id,
        kind: 'administers',
        targets: [target.id],
      });
    });

    it('abstains when history has no record for the edge', async () => {
      const target = criticalHost();
      const entity = buildEntity({
        relationships: { administers: { ids: [target.id] } },
      });
      relationshipsClient.getEarliestObservationByTarget.mockResolvedValue(new Map());

      const observations = await collect([entity, target]);

      expect(
        observations.find((o) => o.type === 'new_control_over_critical_asset')
      ).toBeUndefined();
    });

    it('does not fire for standing control first observed outside the window', async () => {
      const target = criticalHost();
      const entity = buildEntity({
        relationships: { administers: { ids: [target.id] } },
      });
      relationshipsClient.getEarliestObservationByTarget.mockResolvedValue(
        firstSeenMap({ [target.id]: msDaysAgo(30) })
      );

      const observations = await collect([entity, target]);

      expect(
        observations.find((o) => o.type === 'new_control_over_critical_asset')
      ).toBeUndefined();
    });

    it('fires with critical severity for newly-gained control over an extreme-impact asset', async () => {
      const target = criticalHost();
      const entity = buildEntity({
        name: 'svc-admin',
        relationships: { administers: { ids: [target.id] } },
      });
      relationshipsClient.getEarliestObservationByTarget.mockResolvedValue(
        firstSeenMap({ [target.id]: msDaysAgo(1) })
      );

      const observations = await collect([entity, target]);
      const observation = observations.find((o) => o.type === 'new_control_over_critical_asset');

      expect(observation).toBeDefined();
      expect(observation?.score).toBe(85);
      expect(observation?.severity).toBe('critical');
      expect(observation?.confidence).toBe(0.7);
      expect(observation?.metadata.new_critical_controlled_entities).toEqual([target.id]);
      expect(observation?.description).toContain('recently gained');
    });

    it('fires with high severity for newly-gained control over a high-impact asset', async () => {
      const target = buildEntity({ type: 'host', name: 'app-01', criticality: 'high_impact' });
      const entity = buildEntity({
        relationships: { administers: { ids: [target.id] } },
      });
      relationshipsClient.getEarliestObservationByTarget.mockResolvedValue(
        firstSeenMap({ [target.id]: msDaysAgo(2) })
      );

      const observations = await collect([entity, target]);
      const observation = observations.find((o) => o.type === 'new_control_over_critical_asset');

      expect(observation?.score).toBe(70);
      expect(observation?.severity).toBe('high');
    });
  });
});
