/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback } from 'react';
import { EuiHorizontalRule } from '@elastic/eui';
import { EntityType } from '../../../../../../common/entity_analytics/types';
import { useEntityRiskScores } from '../../../../../entity_analytics/api/hooks/use_entity_risk_scores';
import { FlyoutRiskSummary } from '../../../../../entity_analytics/components/risk_summary_flyout/risk_summary';
import { useGlobalTime } from '../../../../../common/containers/use_global_time';
import { useQueryInspector } from '../../../../../common/components/page/manage_query';
import { FLYOUT_ORIGIN } from '../../../../../common/lib/telemetry';
import {
  EntityDetailsLeftPanelTab,
  type EntityDetailsPath,
  type RiskScoreLeftPanelSubTab,
} from '../../../../../flyout/entity_details/shared/components/left_panel/left_panel_header';
import { useFlyoutApi } from '../../../../use_flyout_api';

export const AI_AGENT_RISK_SCORE_QUERY_ID = 'aiAgentPanelRiskScoreQuery';

export interface RiskSummarySectionProps {
  /** Install ID, matched against `ai_agent.risk.id_value` in the risk index. */
  readonly entityId: string;
  /** Label for the risk inputs flyout. */
  readonly entityName: string;
  readonly scopeId: string;
  /** Reopens the agent flyout from the risk inputs flyout title. */
  readonly onShowAgent: () => void;
}

/**
 * The shared entity risk summary for the agent's base score, read from the risk index. Its risk
 * contributions link opens the shared risk inputs flyout. Renders nothing until the agent is scored.
 */
export const RiskSummarySection = memo(
  ({ entityId, entityName, scopeId, onShowAgent }: RiskSummarySectionProps) => {
    const { openEntityRiskInputs } = useFlyoutApi();
    const { setQuery, deleteQuery } = useGlobalTime();
    const entityRiskScores = useEntityRiskScores(EntityType.ai_agent, entityId);
    const { base: riskScoreState } = entityRiskScores;
    const { inspect, loading, refetch, hasEngineBeenInstalled, data } = riskScoreState;

    useQueryInspector({
      queryId: AI_AGENT_RISK_SCORE_QUERY_ID,
      inspect,
      loading,
      refetch,
      setQuery,
      deleteQuery,
    });

    const openDetailsPanel = useCallback(
      ({ tab, subTab }: EntityDetailsPath) => {
        if (tab !== EntityDetailsLeftPanelTab.RISK_INPUTS) return;
        openEntityRiskInputs({
          entityType: EntityType.ai_agent,
          entityName,
          entityId,
          scopeId,
          onShowEntity: onShowAgent,
          title: entityName,
          subTab: subTab as RiskScoreLeftPanelSubTab | undefined,
          origin: FLYOUT_ORIGIN.RISK_SUMMARY_ENTITY,
        });
      },
      [openEntityRiskInputs, entityName, entityId, scopeId, onShowAgent]
    );

    if (!hasEngineBeenInstalled || (!loading && (data?.length ?? 0) === 0)) return null;

    return (
      <>
        <FlyoutRiskSummary
          riskScoreData={riskScoreState}
          entityRiskScores={entityRiskScores}
          recalculatingScore={false}
          queryId={AI_AGENT_RISK_SCORE_QUERY_ID}
          openDetailsPanel={openDetailsPanel}
          isPreviewMode={false}
          entityType={EntityType.ai_agent}
          entityId={entityId}
          hideHeaderIcon
          scopeId={scopeId}
        />
        <EuiHorizontalRule margin="m" />
      </>
    );
  }
);
RiskSummarySection.displayName = 'RiskSummarySection';
