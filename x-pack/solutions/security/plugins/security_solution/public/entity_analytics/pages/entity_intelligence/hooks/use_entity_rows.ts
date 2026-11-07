/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import { useQuery } from '@kbn/react-query';
import { EntityType } from '../../../../../common/entity_analytics/types';
import { useSpaceId } from '../../../../common/hooks/use_space_id';
import { useEntityAnalyticsRoutes } from '../../../api/api';
import { useCompactAnomalies } from './use_compact_anomalies';
import { toIntelligenceEntity } from '../common';
import type { EntityRow, EvidenceStatus } from '../entities/types';
import {
  ambiguousEntityKeys,
  entityEvidenceKey,
  evidenceStatus,
  sampledEvidenceStatus,
  knownUncasedCount,
} from '../entities/evidence';
import { levelOf } from '../entities/entities_logic';
import {
  buildDeltas,
  buildResolutionIdentities,
  emptyAlertSignal,
  emptyDeltas,
  extractEntityPrimitives,
} from '../entities/enrichment';
import { useEntityAlertSignals } from './use_entity_alert_signals';
import { useEntityCases } from './use_entity_cases';
import { useEntityAttacks } from './use_entity_attacks';
import { useEntityWatchlists } from './use_entity_watchlists';
import { useEntityRiskHistory } from './use_entity_risk_history';
import { useEntityResolution } from './use_entity_resolution';

const DEFAULT_ENTITY_TYPES = [EntityType.user, EntityType.host, EntityType.service];
const ENTITY_FETCH_SIZE = 500;

interface UseEntityRowsResult {
  rows: EntityRow[];
  total: number;
  loadedCount: number;
  isTruncated: boolean;
  hasIncompleteEvidence: boolean;
  now: number;
  dailyActiveSeries: number[] | undefined;
  hasRiskHistory: boolean;
  isLoading: boolean;
  isEntitiesLoading: boolean;
  isError: boolean;
}

/**
 * The end-to-end data assembler for the Entities tab. Fetches the entity store
 * population (v2) and joins every real signal — alerts, cases, attacks,
 * anomalies, watchlists, risk-score trend/first-High history, and resolution —
 * into fully-enriched {@link EntityRow}s. Each join degrades honestly to
 * explicit availability metadata when a backing signal cannot be resolved.
 */
export const useEntityRows = (): UseEntityRowsResult => {
  const spaceId = useSpaceId();
  const { fetchEntitiesListV2 } = useEntityAnalyticsRoutes();
  // Stable "now" for the whole render so window boundaries are consistent.
  const now = useMemo(() => Date.now(), []);

  const {
    data: entitiesData,
    isLoading: isEntitiesLoading,
    isError: isEntitiesError,
  } = useQuery(
    ['entityIntelligenceEntitiesList', ENTITY_FETCH_SIZE],
    ({ signal }) =>
      fetchEntitiesListV2({
        signal,
        params: {
          entityTypes: DEFAULT_ENTITY_TYPES,
          sortField: 'entity.risk.calculated_score_norm',
          sortOrder: 'desc',
          page: 1,
          perPage: ENTITY_FETCH_SIZE,
        },
      }),
    { keepPreviousData: true, refetchOnWindowFocus: false, retry: 1 }
  );

  const {
    signalsByName,
    isLoading: isAlertsLoading,
    isError: isAlertsError,
    isPartial: isAlertsPartial,
  } = useEntityAlertSignals();
  const {
    casesByEntity,
    isLoading: isCasesLoading,
    isError: isCasesError,
    isPartial: isCasesPartial,
  } = useEntityCases();
  const {
    attacksByEntity,
    isLoading: isAttacksLoading,
    isError: isAttacksError,
  } = useEntityAttacks();
  const {
    watchlistsByEntity,
    isLoading: isWatchlistsLoading,
    isError: isWatchlistsError,
    isPartial: isWatchlistsPartial,
  } = useEntityWatchlists();
  const {
    anomalies,
    isLoading: isAnomaliesLoading,
    isError: isAnomaliesError,
    isPartial: isAnomaliesPartial,
  } = useCompactAnomalies(spaceId);
  const {
    trendForEntity,
    dailyActiveSeries,
    hasHistory,
    isLoading: isHistoryLoading,
  } = useEntityRiskHistory(spaceId, now);
  const { lookupRowsByTarget, isLoading: isResolutionLoading } = useEntityResolution(spaceId);

  const anomsById = useMemo(() => {
    // Count of anomalous records per entity: any positive-score anomaly on the
    // entity contributes one signal. Keyed by the entity store `entity.id`.
    const counts = new Map<string, number>();
    for (const anomaly of anomalies) {
      if (anomaly.maxScore > 0) {
        counts.set(anomaly.entityId, (counts.get(anomaly.entityId) ?? 0) + 1);
      }
    }
    return counts;
  }, [anomalies]);

  const isTruncated = (entitiesData?.total ?? 0) > (entitiesData?.records.length ?? 0);
  const rows = useMemo<EntityRow[]>(() => {
    const records = entitiesData?.records ?? [];
    const entities = records.flatMap((record) => {
      const entity = toIntelligenceEntity(record);
      return entity ? [entity] : [];
    });
    const ambiguousTypedKeys = ambiguousEntityKeys(entities);
    const ambiguousNames = ambiguousEntityKeys(entities, false);
    return records.flatMap((record) => {
      const base = toIntelligenceEntity(record);
      if (!base) return [];
      const primitives = extractEntityPrimitives(record);
      const nameKey = base.identifierValue.trim().toLowerCase();
      const typedKey = entityEvidenceKey(base.type, base.identifierValue);
      const typedStatus = (unavailable: boolean, partial = false): EvidenceStatus =>
        evidenceStatus({
          unavailable,
          ambiguous: ambiguousTypedKeys.has(typedKey),
          partial: partial || isTruncated,
        });
      const nameStatus = (unavailable: boolean, partial = false): EvidenceStatus =>
        evidenceStatus({
          unavailable,
          ambiguous: ambiguousNames.has(nameKey),
          partial: partial || isTruncated,
        });
      const alertsStatus = typedStatus(isAlertsLoading || isAlertsError, isAlertsPartial);
      const casesStatus = typedStatus(isCasesLoading || isCasesError, isCasesPartial);
      const attacksStatus = nameStatus(isAttacksLoading || isAttacksError);
      const watchlistsStatus = nameStatus(
        isWatchlistsLoading || isWatchlistsError,
        isWatchlistsPartial
      );
      const anomaliesStatus = sampledEvidenceStatus({
        unavailable: isAnomaliesLoading || isAnomaliesError,
        isLimited: isAnomaliesPartial,
        isPresent: anomsById.has(base.id),
      });
      const alertSignal =
        alertsStatus === 'available'
          ? signalsByName.get(typedKey) ?? emptyAlertSignal()
          : emptyAlertSignal();
      const caseIds =
        casesStatus === 'available' ? [...(casesByEntity.get(typedKey) ?? new Set<string>())] : [];
      const attackIds =
        attacksStatus === 'available'
          ? [...(attacksByEntity.get(nameKey) ?? new Set<string>())]
          : [];
      const watchlists =
        watchlistsStatus === 'available' ? watchlistsByEntity.get(nameKey) ?? [] : [];
      const anoms = anomaliesStatus === 'available' ? anomsById.get(base.id) ?? 0 : 0;

      const risk = base.riskScoreNorm ?? 0;
      const trend = trendForEntity(base.id, risk);
      const identities = buildResolutionIdentities(
        base.id,
        primitives.sources,
        lookupRowsByTarget.get(base.id) ?? []
      );

      // Alerts firing on a rule that had never fired for this entity before the
      // window are flagged NEW. Without per-window rule-first-seen history we
      // approximate "new rule" as rules whose alerts all fall inside the window
      // (i.e. the entity had zero alerts before the window) — honest and
      // window-scoped. Concretely: a rule is NEW when the entity's total alert
      // count equals its in-window alert count (all its alerts are recent).
      const allAlertsRecent =
        alertSignal.total > 0 && alertSignal.windowCounts.w7 >= alertSignal.total;
      const newRules = allAlertsRecent ? alertSignal.ruleNames : [];

      const deltas = buildDeltas(trend.riskDeltas, alertSignal.windowCounts, {
        // Anomaly deltas are not historically resolvable per-entity in this
        // deployment; report flat rather than fabricate.
        w1: 0,
        w7: 0,
        w30: 0,
      });

      const row: EntityRow = {
        base,
        evidence: {
          alerts: alertsStatus,
          cases: casesStatus,
          attacks: attacksStatus,
          watchlists: watchlistsStatus,
          anomalies: anomaliesStatus,
          riskHistory: evidenceStatus({
            unavailable: !trend.hasHistory || base.riskScoreNorm === undefined,
          }),
        },
        identifierValue: base.identifierValue,
        type: base.type,
        isService: primitives.isService,
        risk,
        level: base.riskScoreNorm === undefined ? 'Unknown' : levelOf(risk),
        criticality: base.criticality,
        alerts: alertSignal.total,
        uncased: knownUncasedCount(alertSignal.total, caseIds.length, alertsStatus, casesStatus),
        ruleNames: alertSignal.ruleNames,
        newRules,
        anoms,
        attacks: attackIds.length,
        cases: caseIds.length,
        watchlists,
        identities,
        firstSeen: primitives.firstSeen,
        lastSeen:
          primitives.lastSeen ?? (base.lastSeen ? new Date(base.lastSeen).getTime() : undefined),
        lastAlert: alertSignal.lastAlert,
        firstHighAt: trend.firstHighAt,
        deltas: alertSignal.total === 0 && trend.riskDeltas.w1 === 0 ? emptyDeltas() : deltas,
        caseIds,
        attackIds,
      };
      return [row];
    });
  }, [
    entitiesData?.records,
    isTruncated,
    isAlertsLoading,
    isAlertsError,
    isAlertsPartial,
    isCasesLoading,
    isCasesError,
    isCasesPartial,
    isAttacksLoading,
    isAttacksError,
    isWatchlistsLoading,
    isWatchlistsError,
    isWatchlistsPartial,
    isAnomaliesLoading,
    isAnomaliesError,
    isAnomaliesPartial,
    signalsByName,
    casesByEntity,
    attacksByEntity,
    watchlistsByEntity,
    anomsById,
    trendForEntity,
    lookupRowsByTarget,
  ]);

  return {
    rows,
    total: entitiesData?.total ?? rows.length,
    loadedCount: rows.length,
    isTruncated,
    hasIncompleteEvidence: rows.some((row) =>
      Object.values(row.evidence ?? {}).some((status) => status !== 'available')
    ),
    now,
    dailyActiveSeries,
    hasRiskHistory: hasHistory,
    isEntitiesLoading,
    isLoading:
      isEntitiesLoading ||
      isAnomaliesLoading ||
      isAlertsLoading ||
      isCasesLoading ||
      isAttacksLoading ||
      isWatchlistsLoading ||
      isHistoryLoading ||
      isResolutionLoading,
    isError: isEntitiesError,
  };
};
