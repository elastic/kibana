/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useQueryClient } from '@kbn/react-query';
import type { EntityType } from '../../../../common/entity_analytics/types';
import type { Refetch } from '../../../common/types';
import { useEntityRiskScores, type EntityRiskScoresState } from './use_entity_risk_scores';
import { useCalculateEntityRiskScore } from './use_calculate_entity_risk_score';
import { useRefetchQueryById } from './use_refetch_query_by_id';
import { RISK_INPUTS_TAB_QUERY_ID } from '../../components/entity_details_flyout/tabs/risk_inputs/risk_inputs_tab';
import { RESOLUTION_GROUP_QUERY_KEY } from '../../components/entity_resolution/hooks/use_resolution_group';
import {
  QUERY_KEY_ENTITY_ANALYTICS,
  QUERY_KEY_GRID_DATA,
  QUERY_KEY_TARGET_METADATA,
} from '../../components/home/entities_table/constants';
import { useOnAssetCriticalityToolEvent } from '../../hooks/use_on_asset_criticality_tool_event';

interface UseEntityRiskScoreRecalculationParams<T extends EntityType> {
  entityType: T;
  identifier: string;
  entityId: string | undefined;
  entityStoreV2Enabled: boolean;
  entityFromStoreResult: { refetch: () => void };
  riskScoreState: { refetch: () => void };
  onRecalculation?: () => void;
}

interface UseEntityRiskScoreRecalculationResult<T extends EntityType> {
  entityRiskScores: EntityRiskScoresState<T>;
  calculateEntityRiskScore: () => void;
  recalculatingScore: boolean;
}

/**
 * Encapsulates the repeated pattern of fetching entity risk scores and wiring
 * up the recalculation callback that appears in every entity-detail panel:
 *   1. useEntityRiskScores — fetches base + resolution scores by EUID
 *   2. onRiskScoreUpdated — refetches V1 or V2 data after a recalculation
 *   3. useCalculateEntityRiskScore — triggers an on-demand recalculation
 *
 * Pass `onRecalculation` for any additional invalidations that differ per
 * context (e.g. entities table in flyout panels, attachment query client in
 * the agent-builder canvas).
 */
export const useEntityRiskScoreRecalculation = <T extends EntityType>({
  entityType,
  identifier,
  entityId,
  entityStoreV2Enabled,
  entityFromStoreResult,
  riskScoreState,
  onRecalculation,
}: UseEntityRiskScoreRecalculationParams<T>): UseEntityRiskScoreRecalculationResult<T> => {
  const entityRiskScores = useEntityRiskScores(entityType, entityId);
  const refetchRiskInputsTab = useRefetchQueryById(RISK_INPUTS_TAB_QUERY_ID);
  const queryClient = useQueryClient();

  const onRiskScoreUpdated = useCallback(() => {
    // Flyout header risk badge: V2 reads from the entity store record, V1 from the risk score API.
    if (entityStoreV2Enabled) {
      entityFromStoreResult.refetch();
    } else {
      riskScoreState.refetch();
    }
    // Flyout Risk Summary panel (base + resolution scores).
    entityRiskScores.refetch();
    // Flyout Risk Inputs tab (the alerts/inputs contributing to the score).
    (refetchRiskInputsTab as Refetch | null)?.();
    // Entity resolution group tab/table shown in the flyout.
    queryClient.invalidateQueries({ queryKey: [RESOLUTION_GROUP_QUERY_KEY] });
    // Entity analytics home table rows (flat grid + the leaf tables inside expanded groups).
    queryClient.invalidateQueries({ queryKey: [QUERY_KEY_ENTITY_ANALYTICS, QUERY_KEY_GRID_DATA] });
    // Risk score on the resolution group accordion headers. We refresh only this
    // metadata (not the grouping aggregation) so the header badge updates without
    // re-ordering the buckets, which would collapse any expanded groups.
    queryClient.invalidateQueries({
      queryKey: [QUERY_KEY_ENTITY_ANALYTICS, QUERY_KEY_TARGET_METADATA],
    });
    // Context-specific extras (e.g. agent-builder attachment cache).
    onRecalculation?.();
  }, [
    entityStoreV2Enabled,
    entityFromStoreResult,
    riskScoreState,
    entityRiskScores,
    refetchRiskInputsTab,
    queryClient,
    onRecalculation,
  ]);

  useOnAssetCriticalityToolEvent(({ entityType: updatedType }) => {
    if (updatedType === entityType) onRiskScoreUpdated();
  });

  const { isLoading: recalculatingScore, calculateEntityRiskScore } = useCalculateEntityRiskScore({
    identifierType: entityType,
    identifier,
    entityId,
    onSuccess: onRiskScoreUpdated,
  });

  return { entityRiskScores, calculateEntityRiskScore, recalculatingScore };
};
