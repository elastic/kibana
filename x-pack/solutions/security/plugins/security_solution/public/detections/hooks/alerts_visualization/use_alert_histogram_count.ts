/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useMemo } from 'react';
import numeral from '@elastic/numeral';

import { DEFAULT_NUMBER_FORMAT } from '../../../../common/constants';
import { useUiSetting$ } from '../../../common/lib/kibana';
import { SHOWING_ALERTS } from '../../components/alerts_kpis/alerts_histogram_panel/translations';
import { useVisualizationResponse } from '../../../common/components/visualization_actions/use_visualization_response';

export const useAlertHistogramCount = ({
  visualizationId,
}: {
  visualizationId: string;
}): string => {
  const [defaultNumberFormat] = useUiSetting$<string>(DEFAULT_NUMBER_FORMAT);
  const { responses: visualizationResponses } = useVisualizationResponse({ visualizationId });

  const visualizationAlerts = useMemo(() => {
    const visualizationAlertsCount =
      visualizationResponses != null ? visualizationResponses[0].hits.total : 0;
    return SHOWING_ALERTS(
      numeral(visualizationAlertsCount).format(defaultNumberFormat),
      visualizationAlertsCount,
      ''
    );
  }, [defaultNumberFormat, visualizationResponses]);

  return visualizationAlerts;
};
