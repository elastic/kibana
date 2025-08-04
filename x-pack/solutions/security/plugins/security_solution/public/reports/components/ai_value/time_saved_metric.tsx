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
import { getTimeSavedMetricLensAttributes } from '../../../common/components/visualization_actions/lens_attributes/ai/time_saved_metric';
import * as i18n from './translations';
import { VisualizationEmbeddable } from '../../../common/components/visualization_actions/visualization_embeddable';

interface Props {
  attackAlertIds: string[];
  from: string;
  to: string;
  minutesPerAlert: number;
}
const ID = 'TimeSavedMetricQuery';

/**
 * Renders a Lens embeddable metric visualization showing the estimated time saved
 * based on the number of AI filtered alerts and minutes saved per alert for a given time range.
 */
const TimeSavedMetricComponent: React.FC<Props> = ({
  attackAlertIds,
  from,
  to,
  minutesPerAlert,
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

  const timerange = useMemo(() => ({ from, to }), [from, to]);

  return (
    <div
      data-test-subj="time-saved-metric-container"
      css={css`
        height: 100%;
        > * {
          height: 100% !important;
        }
        .echMetricText__icon .euiIcon {
          fill: ${colors.vis.euiColorVis2};
        }
        .echMetricText {
          padding: 8px 20px 60px;
        }
      `}
    >
      <VisualizationEmbeddable
        data-test-subj="time-saved-metric"
        extraOptions={extraVisualizationOptions}
        getLensAttributes={(args) => getTimeSavedMetricLensAttributes({ ...args, minutesPerAlert })}
        timerange={timerange}
        id={`${ID}-metric`}
        inspectTitle={i18n.TIME_SAVED}
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

export const TimeSavedMetric = React.memo(TimeSavedMetricComponent);
