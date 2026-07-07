/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';
import { AnomaliesOverview } from '../../../../entity_analytics/components/anomalies/anomalies_overview';
import { buildEntityRightPanel } from '../../entity_explore_navigation';
import { useEntityAnalyticsAgentNavigation } from '../../entity_analytics_agent_navigation_context';
import type { EntityAttachmentIdentifier } from '../types';
import { useAnomalyOverviewForAttachment } from '../use_anomaly_overview_for_attachment';

interface AnomaliesMiniProps {
  identifier: EntityAttachmentIdentifier;
  entityStoreEntityId?: string;
  anomalyDetailsEnabled: boolean;
}

const toAnomalyEntityType = (
  identifierType: EntityAttachmentIdentifier['identifierType']
): 'host' | 'user' | undefined =>
  identifierType === 'host' || identifierType === 'user' ? identifierType : undefined;

/**
 * Chat-scale recreation of the flyout's `AnomaliesSection`. Reuses the
 * flyout-scale `AnomaliesOverview` directly (it only depends on EUI/kibana-
 * react, no Redux) since it already renders exactly the "anomaly overview"
 * shape we need: total count, MITRE tactic chain, and a recent-anomalies
 * table. "View all" opens the entity in the Entity Analytics app rather than
 * a left-panel tab, since the chat card has no details panel of its own.
 */
export const AnomaliesMini: React.FC<AnomaliesMiniProps> = ({
  identifier,
  entityStoreEntityId,
  anomalyDetailsEnabled,
}) => {
  const { canNavigate, navigateWithFlyout } = useEntityAnalyticsAgentNavigation();
  const entityType = toAnomalyEntityType(identifier.identifierType);
  const enabled = anomalyDetailsEnabled && Boolean(entityStoreEntityId) && entityType != null;

  const { data, isLoading } = useAnomalyOverviewForAttachment({
    entityId: entityStoreEntityId ?? '',
    entityType: entityType ?? 'host',
    enabled,
  });

  const rightPanel = useMemo(() => buildEntityRightPanel(identifier), [identifier]);

  const openDetailsPanel = useCallback(() => {
    if (!canNavigate || !rightPanel) return;
    navigateWithFlyout({ preview: [], right: rightPanel });
  }, [canNavigate, rightPanel, navigateWithFlyout]);

  if (!enabled || isLoading || !data || data.totalAnomaliesCount === 0) {
    return null;
  }

  return (
    <AnomaliesOverview
      data={data}
      isPreviewMode={false}
      hideHeaderIcons
      openDetailsPanel={openDetailsPanel}
    />
  );
};
