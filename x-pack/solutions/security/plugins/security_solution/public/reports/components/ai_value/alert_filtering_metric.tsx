/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import { getExcludeAlertsFilters } from './utils';
import { VisualizationContextMenuActions } from '../../../common/components/visualization_actions/types';
import { SourcererScopeName } from '../../../sourcerer/store/model';
import { getAlertFilteringMetricLensAttributes } from '../../../common/components/visualization_actions/lens_attributes/ai/alert_filtering_metric';
import * as i18n from './translations';
import { VisualizationEmbeddable } from '../../../common/components/visualization_actions/visualization_embeddable';

interface Props {
  attackAlertIds: string[];
  from: string;
  to: string;
  totalAlerts: number;
}
const ID = 'AlertFilteringMetricQuery';
const AlertFilteringMetricComponent: React.FC<Props> = ({
  attackAlertIds,
  from,
  to,
  totalAlerts,
}) => {
  const {
    euiTheme: { colors },
  } = useEuiTheme();
  const extraVisualizationOptions = useMemo(
    () => ({
      filters: getExcludeAlertsFilters(attackAlertIds),
    }),
    [attackAlertIds]
  );
  return (
    <div
      css={css`
        height: 100%;
        > * {
          height: 100% !important;
        }
        .echMetricText__icon .euiIcon {
          fill: ${colors.vis.euiColorVis4};
        }
        .echMetricText {
          padding: 8px 20px 60px;
        }
        .euiPanel,
        .embPanel,
        .echMetric,
        .echChartBackground,
        .embPanel__hoverActions > span {
          background-color: rgb(0, 0, 0, 0) !important;
        }
      `}
    >
      <VisualizationEmbeddable
        data-test-subj="alert-filtering-metric"
        extraOptions={extraVisualizationOptions}
        getLensAttributes={(args) =>
          getAlertFilteringMetricLensAttributes({ ...args, totalAlerts })
        }
        timerange={{ from, to }}
        id={`${ID}-area-embeddable`}
        inspectTitle={i18n.FILTERING_RATE}
        scopeId={SourcererScopeName.detections}
        withActions={[
          VisualizationContextMenuActions.addToExistingCase,
          VisualizationContextMenuActions.addToNewCase,
          VisualizationContextMenuActions.inspect,
        ]}
      />
    </div>
  );
};

export const AlertFilteringMetric = React.memo(AlertFilteringMetricComponent);
