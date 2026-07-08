/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPanel, EuiSpacer, EuiTitle } from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { capitalize } from 'lodash/fp';
import type { EntityType } from '../../../../../common/entity_analytics/types';
import { AnomaliesOverview } from '../../../../entity_analytics/components/anomalies/anomalies_overview';
import type { EntityAttachmentIdentifier } from '../types';
import { useAnomalyOverviewForAttachment } from '../use_anomaly_overview_for_attachment';

interface AnomaliesMiniProps {
  entityType: EntityType;
  entityId: string;
  anomalyDetailsEnabled: boolean;
}

const toAnomalyEntityType = (
  identifierType: EntityAttachmentIdentifier['identifierType']
): 'host' | 'user' | undefined =>
  identifierType === 'host' || identifierType === 'user' ? identifierType : undefined;

const TITLE = (entityType: EntityType) =>
  i18n.translate('xpack.securitySolution.agentBuilder.entityAttachment.anomalies.title', {
    defaultMessage: '{entity} anomalies',
    values: { entity: capitalize(entityType) },
  });

/**
 * Chat-scale recreation of the flyout's `AnomaliesSection`. Reuses the
 * flyout-scale `AnomaliesOverview` directly (it only depends on EUI/kibana-
 * react, no Redux) since it already renders exactly the "anomaly overview"
 * shape we need: the anomaly count + MITRE tactic chain. The "All Anomalies"
 * header and recent-anomalies table are omitted (via `slim`) in favor of
 * this card's own heading, matching `RiskSummaryMini`'s "{entity} risk
 * summary" pattern.
 */
export const AnomaliesMini: React.FC<AnomaliesMiniProps> = ({
  entityType,
  entityId,
  anomalyDetailsEnabled,
}) => {
  const { data, isLoading } = useAnomalyOverviewForAttachment({
    entityId,
    entityType,
    enabled: anomalyDetailsEnabled,
  });

  if (!anomalyDetailsEnabled || isLoading || !data || data.totalAnomaliesCount === 0) {
    return null;
  }

  return (
    <EuiPanel
      hasShadow={false}
      hasBorder={false}
      paddingSize="none"
      data-test-subj="entityAttachmentAnomaliesMini"
    >
      <EuiTitle size="xs">
        <h3>{TITLE(entityType)}</h3>
      </EuiTitle>
      <EuiSpacer size="s" />
      <AnomaliesOverview data={data} isPreviewMode={false} hideHeaderIcons slim />
    </EuiPanel>
  );
};
