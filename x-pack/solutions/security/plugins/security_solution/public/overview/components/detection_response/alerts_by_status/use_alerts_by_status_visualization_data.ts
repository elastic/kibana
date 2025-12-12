/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useVisualizationResponse } from '../../../../common/components/visualization_actions/use_visualization_response';
import { DETECTION_RESPONSE_ALERTS_BY_STATUS_ID } from './types';

export const openAlertsVisualizationId = `${DETECTION_RESPONSE_ALERTS_BY_STATUS_ID}-open`;
export const acknowledgedAlertsVisualizationId = `${DETECTION_RESPONSE_ALERTS_BY_STATUS_ID}- acknowledged`;
export const closedAlertsVisualizationId = `${DETECTION_RESPONSE_ALERTS_BY_STATUS_ID}-closed`;

export const useAlertsByStatusVisualizationData = () => {
  const { tables: openAlertsTables } = useVisualizationResponse({
    visualizationId: openAlertsVisualizationId,
  });

  const { tables: acknowledgedAlertsTables } = useVisualizationResponse({
    visualizationId: acknowledgedAlertsVisualizationId,
  });

  const { tables: closedAlertsTables } = useVisualizationResponse({
    visualizationId: closedAlertsVisualizationId,
  });

  const visualizationOpenAlertsData =
    (openAlertsTables && openAlertsTables.meta.statistics.totalCount) ?? 0;
  const visualizationAcknowledgedAlertsData =
    (acknowledgedAlertsTables && acknowledgedAlertsTables.meta.statistics.totalCount) ?? 0;
  const visualizationClosedAlertsData =
    (closedAlertsTables && closedAlertsTables.meta.statistics.totalCount) ?? 0;

  const visualizationTotalAlertsData =
    visualizationOpenAlertsData +
    visualizationAcknowledgedAlertsData +
    visualizationClosedAlertsData;

  return {
    open: visualizationOpenAlertsData,
    acknowledged: visualizationAcknowledgedAlertsData,
    closed: visualizationClosedAlertsData,
    total: visualizationTotalAlertsData,
  };
};
