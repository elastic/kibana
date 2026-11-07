/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { useQuery } from '@kbn/react-query';
import type { RiskScoreHistoryResponse } from '../../../../common/api/entity_analytics';
import { useSpaceId } from '../../../common/hooks/use_space_id';
import { useEntityAnalyticsRoutes } from '../../api/api';
import type { IntelligenceEntity } from './common';
import type { SecurityFindingScope, SecurityFindingsResult } from './security_findings/types';
import { useSecurityFindings } from './security_findings/use_security_findings';
import type { EntityRiskInputResolution } from './entity_agent_activity_model';
import { useEntityAgentRiskInputs } from './use_entity_agent_risk_inputs';

export interface EntityGraphSecurity {
  scope: SecurityFindingScope;
  result: SecurityFindingsResult;
  spaceId?: string;
  entityTargets?: ReadonlyArray<Pick<IntelligenceEntity, 'id' | 'name' | 'type'>>;
  onInvestigateEntity?: (entityId: string) => void;
  riskHistory?: RiskScoreHistoryResponse;
  riskInputResolution?: EntityRiskInputResolution;
}

interface EntityInvestigationCanvasProps {
  entity: IntelligenceEntity;
  entityTargets?: EntityGraphSecurity['entityTargets'];
  onInvestigateEntity?: EntityGraphSecurity['onInvestigateEntity'];
  children: (security: EntityGraphSecurity) => React.ReactNode;
}

/** Supplies scoped evidence to the existing relationship graph without replacing the canvas. */
export const EntityInvestigationCanvas: React.FC<EntityInvestigationCanvasProps> = ({
  entity,
  entityTargets,
  onInvestigateEntity,
  children,
}) => {
  const spaceId = useSpaceId();
  const { fetchRiskScoreHistory } = useEntityAnalyticsRoutes();
  const scope = useMemo<SecurityFindingScope>(() => ({ type: 'entity', entity }), [entity]);
  const result = useSecurityFindings(scope, spaceId);
  const ready =
    Boolean(spaceId) &&
    !result.isLoading &&
    !result.isRefreshing &&
    !result.unavailable &&
    result.findings.some((finding) => finding.agent && finding.policy);
  const historyQuery = useQuery(
    ['entityIntelligenceRiskHistory', spaceId, entity.type, entity.id],
    ({ signal }) =>
      fetchRiskScoreHistory({
        signal,
        params: { entityType: entity.type, entityId: entity.id, includeContributions: true },
      }),
    { enabled: ready, retry: 1, refetchOnWindowFocus: false }
  );
  const riskHistory =
    ready &&
    !historyQuery.isFetching &&
    !historyQuery.isError &&
    historyQuery.data?.entity_id === entity.id &&
    historyQuery.data.entity_type === entity.type
      ? historyQuery.data
      : undefined;
  const resolution = useEntityAgentRiskInputs(
    entity,
    ready ? result.findings : [],
    riskHistory,
    spaceId
  );
  const riskInputResolution = riskHistory && !resolution.isLoading ? resolution : undefined;
  return (
    <>
      {children({
        scope,
        result,
        spaceId,
        entityTargets,
        onInvestigateEntity,
        riskHistory: resolution.isLoading ? undefined : riskHistory,
        riskInputResolution,
      })}
    </>
  );
};
