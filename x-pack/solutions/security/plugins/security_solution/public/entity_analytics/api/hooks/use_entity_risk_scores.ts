/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useMemo } from 'react';
import type { KibanaExecutionContext } from '@kbn/core-execution-context-common';
import type { EntityType } from '../../../../common/entity_analytics/types';
import { useRiskScore, type RiskScoreState } from './use_risk_score';
import { useResolutionGroup } from '../../components/entity_resolution/hooks/use_resolution_group';
import { getEntityId } from '../../components/entity_resolution/helpers';
import { useNewEntityAnalyticsPage } from '../../hooks/use_new_entity_analytics_page';

const FIRST_RECORD_PAGINATION = {
  cursorStart: 0,
  querySize: 1,
};

export interface EntityRiskScoresState<T extends EntityType> {
  base: RiskScoreState<T>;
  resolution: {
    state: RiskScoreState<T>;
    hasResolutionGroup: boolean;
    resolutionTargetEntityId: string | undefined;
  };
  refetch: () => void;
}

/**
 * Fetches an entity's base and resolution-group risk scores in parallel, with one
 * `refetch` that refreshes both queries.
 *
 * How the resolution score's target is found depends on the new entity analytics page flag:
 * - flag off: the group and its target are discovered through `useResolutionGroup`, and the
 *   target's resolution score is fetched whenever the entity belongs to a group;
 * - flag on: the legacy lookup is skipped; only the group view (`isGroupView`) fetches the
 *   resolution score, and `entityId` is the target.
 */
export const useEntityRiskScores = <T extends EntityType>(
  entityType: T,
  entityId: string | undefined,
  options?: {
    /**
     * Optional Kibana execution context forwarded to both the base and resolution risk-score
     * queries so slow logs and APM traces can attribute the queries to the calling page/panel.
     */
    executionContext?: KibanaExecutionContext;
    /**
     * True when the caller renders a resolution group for `entityId` (alias records were loaded for
     * it), which only happens with the new entity analytics page flag on. Defaults to false.
     */
    isGroupView?: boolean;
  }
): EntityRiskScoresState<T> => {
  const executionContext = options?.executionContext;
  const isGroupView = options?.isGroupView ?? false;
  const isNewEntityAnalyticsPage = useNewEntityAnalyticsPage();
  const baseFilterQuery = useMemo(
    () =>
      entityId
        ? {
            bool: {
              filter: [{ term: { [`${entityType}.risk.id_value`]: entityId } }],
              must_not: [{ term: { [`${entityType}.risk.score_type`]: 'resolution' } }],
            },
          }
        : undefined,
    [entityId, entityType]
  );
  const base = useRiskScore({
    riskEntity: entityType,
    filterQuery: baseFilterQuery,
    onlyLatest: false,
    pagination: FIRST_RECORD_PAGINATION,
    skip: !entityId,
    executionContext,
  });

  // Legacy (flag off) path: discover the group and its target through the resolution API.
  const { data: resolutionGroup } = useResolutionGroup(entityId ?? '', {
    enabled: !isNewEntityAnalyticsPage && Boolean(entityId),
    executionContext,
  });
  const legacyHasResolutionGroup = (resolutionGroup?.group_size ?? 0) > 1;
  const legacyTargetEntityId = useMemo(
    () => (resolutionGroup?.target ? getEntityId(resolutionGroup.target) : undefined),
    [resolutionGroup?.target]
  );

  // The group view is opened on the target itself, so its id keys the resolution score. Outside
  // the group view, fall back to the legacy lookup (which yields nothing when the flag is on).
  const hasResolutionGroup = isGroupView || legacyHasResolutionGroup;
  const resolutionTargetEntityId = isGroupView ? entityId : legacyTargetEntityId;
  const shouldFetchResolution = hasResolutionGroup && Boolean(resolutionTargetEntityId);
  const resolutionFilterQuery = useMemo(
    () =>
      shouldFetchResolution && resolutionTargetEntityId
        ? {
            bool: {
              filter: [
                { term: { [`${entityType}.risk.id_value`]: resolutionTargetEntityId } },
                { term: { [`${entityType}.risk.score_type`]: 'resolution' } },
              ],
            },
          }
        : undefined,
    [entityType, resolutionTargetEntityId, shouldFetchResolution]
  );
  const resolution = useRiskScore({
    riskEntity: entityType,
    filterQuery: resolutionFilterQuery,
    onlyLatest: false,
    pagination: FIRST_RECORD_PAGINATION,
    skip: !shouldFetchResolution,
    executionContext,
  });

  const refetch = useCallback(() => {
    base.refetch();
    resolution.refetch();
  }, [base, resolution]);

  return {
    base,
    resolution: { state: resolution, hasResolutionGroup, resolutionTargetEntityId },
    refetch,
  };
};
