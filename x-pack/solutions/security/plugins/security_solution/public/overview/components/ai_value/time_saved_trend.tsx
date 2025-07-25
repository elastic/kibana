/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import { VisualizationContextMenuActions } from '../../../common/components/visualization_actions/types';
import { SourcererScopeName } from '../../../sourcerer/store/model';
import { getTimeSavedTrendLensAttributes } from '../../../common/components/visualization_actions/lens_attributes/ai/time_saved_trend';
import * as i18n from './translations';
import { VisualizationEmbeddable } from '../../../common/components/visualization_actions/visualization_embeddable';

interface Props {
  attackAlertIds: string[];
  from: string;
  to: string;
  minutesPerAlert: number;
}
const ID = 'TimeSavedTrendQuery';
const TimeSavedTrendComponent: React.FC<Props> = ({
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
      filters: [
        {
          meta: {
            alias: null,
            negate: false,
            disabled: false,
          },
          query: {
            bool: {
              // only query alerts that are not part of an attack discovery
              must_not: attackAlertIds.map((uuid: string) => ({
                match_phrase: { 'kibana.alert.uuid': uuid },
              })),
            },
          },
        },
      ],
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
          fill: ${colors.vis.euiColorVis2};
        }
        .echMetricText {
          padding: 8px 20px 60px;
        }
      `}
    >
      <VisualizationEmbeddable
        data-test-subj="embeddable-metric-trend"
        extraOptions={extraVisualizationOptions}
        getLensAttributes={(args) => getTimeSavedTrendLensAttributes({ ...args, minutesPerAlert })}
        timerange={{ from, to }}
        id={`${ID}-area-embeddable`}
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

export const TimeSavedTrend = React.memo(TimeSavedTrendComponent);
