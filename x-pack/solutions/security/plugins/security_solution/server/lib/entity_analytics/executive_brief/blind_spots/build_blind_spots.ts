/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SavedObjectsClientContract } from '@kbn/core/server';
import type { MitreAttackDataClient } from '@kbn/mitre-attack-plugin/server';
import type {
  BlindSpotGap,
  BriefBlindSpots,
  SourceStatus,
} from '../../../../../common/entity_analytics/executive_brief/types';
import type { SnapshotContext, SnapshotPart, SnapshotSources } from '../snapshot/context';
import { runSource } from '../snapshot/context';
import { fetchAlertsByTactic } from './alerts_by_tactic';
import { fetchAnomaliesByTactic } from './anomalies';
import { fetchAttackDiscoveryTactics } from './attack_discovery_tactics';
import { buildAttackStages } from './attack_stages';
import { fetchDetectionCoverage } from './detection_coverage';
import {
  fetchAttackDiscoveryStatus,
  fetchEntityDocs,
  fetchEntityTypes,
  fetchLeadsStatus,
  fetchRelationshipSourceInventory,
  fetchRiskEngineStatus,
  fetchUncasedHighAlerts,
  fetchUnattributedAlerts,
  fetchUnresolvedLocalUsers,
} from './gap_data';
import {
  buildGapB1,
  buildGapB10,
  buildGapB11,
  buildGapB12,
  buildGapB13,
  buildGapB16,
  buildGapB17,
  buildGapB4,
  buildGapB5,
  buildGapB6,
  buildGapB8,
  buildGapB9,
  sortGaps,
} from './gap_signals';
import type { MlStatus } from './gap_signals';
import { buildTacticLookup, loadTacticLookup } from './mitre_tactics';

export interface BuildBlindSpotsInput {
  /** Golden euids of the computed storylines (lane 3). */
  storylineEuids: string[];
  /** Golden euids of material-risk entities (lane 2). */
  materialRiskEuids: string[];
}

/** Optional collaborators that SnapshotContext does not carry. */
export interface BuildBlindSpotsDeps {
  /** Needed for the ML sources (job config, anomalies, job state). */
  soClient?: SavedObjectsClientContract;
  /** Managed MITRE data client; the bundled MITRE data is used when absent. */
  mitreDataClient?: MitreAttackDataClient;
}

const setSourceStatus = (
  sources: SnapshotSources,
  name: string,
  status: SourceStatus,
  message: string
): void => {
  // A thrown error is more informative than a downgrade to "disabled" / "missing_index".
  if (sources[name]?.status === 'error') return;
  sources[name] = { status, tookMs: sources[name]?.tookMs ?? 0, message };
};

const unique = (values: readonly string[]): string[] => [...new Set(values)];

/**
 * Builds the "Blind spots" part of the snapshot: attack stages (activity vs. detection coverage)
 * and the gap signals. Every query runs through `runSource`, so a failing source becomes a
 * source status rather than an error.
 */
export const buildBlindSpots = async (
  ctx: SnapshotContext,
  input: BuildBlindSpotsInput,
  deps: BuildBlindSpotsDeps = {}
): Promise<SnapshotPart<BriefBlindSpots>> => {
  const sources: SnapshotSources = {};
  const nowIso = ctx.timeRange.to;
  const { registry } = ctx;
  const storylineEuids = unique(input.storylineEuids);
  const materialRiskEuids = unique(input.materialRiskEuids);

  const lookup = await runSource(
    'mitre_tactics',
    sources,
    () => loadTacticLookup(deps.mitreDataClient),
    buildTacticLookup([])
  );

  const [
    alerts,
    coverage,
    attackDiscovery,
    anomalies,
    entities,
    relationshipSources,
    unresolvedUsers,
    entityTypes,
    unattributedAlerts,
    attackDiscoveryStatus,
    leadsStatus,
    riskEngineStatus,
  ] = await Promise.all([
    runSource('alerts_by_tactic', sources, () => fetchAlertsByTactic(ctx, lookup), undefined),
    ctx.services.rulesClient
      ? runSource(
          'detection_coverage',
          sources,
          () => fetchDetectionCoverage(ctx, lookup),
          undefined
        )
      : Promise.resolve(undefined),
    runSource(
      'attack_discovery_tactics',
      sources,
      () => fetchAttackDiscoveryTactics(ctx, lookup),
      undefined
    ),
    runSource('anomalies', sources, () => fetchAnomaliesByTactic(ctx, lookup, deps), undefined),
    runSource(
      'entity_docs',
      sources,
      () => fetchEntityDocs(ctx, unique([...storylineEuids, ...materialRiskEuids])),
      undefined
    ),
    runSource('gap_B1', sources, () => fetchRelationshipSourceInventory(ctx), undefined),
    runSource('gap_B5', sources, () => fetchUnresolvedLocalUsers(ctx, storylineEuids), undefined),
    runSource('gap_B9', sources, () => fetchEntityTypes(ctx), undefined),
    runSource('gap_B8', sources, () => fetchUnattributedAlerts(ctx), undefined),
    runSource('gap_B10', sources, () => fetchAttackDiscoveryStatus(ctx), undefined),
    runSource('gap_B11', sources, () => fetchLeadsStatus(ctx), undefined),
    runSource('gap_B13', sources, () => fetchRiskEngineStatus(ctx), undefined),
  ]);

  if (!ctx.services.rulesClient) {
    setSourceStatus(sources, 'detection_coverage', 'disabled', 'rulesClient is not available');
  }
  if (attackDiscovery && !attackDiscovery.indexExists) {
    setSourceStatus(
      sources,
      'attack_discovery_tactics',
      'missing_index',
      'No Attack Discovery index found'
    );
  }
  if (!ctx.services.ml) {
    setSourceStatus(sources, 'anomalies', 'disabled', 'ML is not available');
  } else if (!deps.soClient) {
    setSourceStatus(sources, 'anomalies', 'disabled', 'No saved objects client for ML');
  } else if (anomalies && anomalies.jobsInstalled === 0) {
    setSourceStatus(sources, 'anomalies', 'disabled', 'No security ML jobs installed');
  }
  if (!ctx.services.entityStore) {
    setSourceStatus(sources, 'gap_B13', 'disabled', 'Entity Store is not available');
  }
  if (entities && !entities.indexExists) {
    setSourceStatus(sources, 'entity_docs', 'missing_index', 'No entity store index found');
  }

  const attackStages = buildAttackStages(
    { lookup, alerts, coverage, attackDiscovery, anomalies },
    registry
  );

  const entityContext = entities && { storylineEuids, materialRiskEuids, entities };
  const entityDocs = entities?.docs ?? [];
  const aliasEuids = entityDocs
    .filter(({ resolvedTo }) => resolvedTo && storylineEuids.includes(resolvedTo))
    .map(({ euid }) => euid);
  const uncasedAlerts = await runSource(
    'gap_B17',
    sources,
    () => fetchUncasedHighAlerts(ctx, unique([...storylineEuids, ...aliasEuids])),
    undefined
  );

  const mlStatus: MlStatus | undefined =
    ctx.services.ml === undefined
      ? { mlAvailable: false, jobsInstalled: 0, jobsOpened: 0 }
      : anomalies && {
          mlAvailable: true,
          jobsInstalled: anomalies.jobsInstalled,
          jobsOpened: anomalies.jobsOpened,
        };

  // Each signal is skipped (undefined) when its source did not return data.
  const gaps: Array<BlindSpotGap | undefined> = [
    relationshipSources && buildGapB1(registry, relationshipSources),
    entityContext && buildGapB4(registry, entityContext),
    unresolvedUsers && buildGapB5(registry, unresolvedUsers),
    entityContext && buildGapB6(registry, entityContext),
    unattributedAlerts && buildGapB8(registry, unattributedAlerts),
    entityTypes && buildGapB9(registry, entityTypes),
    attackDiscoveryStatus && buildGapB10(registry, attackDiscoveryStatus, nowIso),
    leadsStatus && buildGapB11(registry, leadsStatus, nowIso),
    mlStatus && buildGapB12(registry, mlStatus),
    ctx.services.entityStore && sources.gap_B13?.status === 'ok'
      ? buildGapB13(registry, riskEngineStatus, nowIso)
      : undefined,
    alerts ? buildGapB16(registry, attackStages.unmapped) : undefined,
    uncasedAlerts && buildGapB17(registry, uncasedAlerts, storylineEuids, entityDocs),
    // TODO: B2, B3, B7, B14, B15 are stubbed (gap_signals.ts) and not part of the PoC.
  ];

  return {
    value: {
      attackStages,
      gaps: sortGaps(gaps.filter((gap): gap is BlindSpotGap => gap !== undefined)),
    },
    sources,
  };
};
