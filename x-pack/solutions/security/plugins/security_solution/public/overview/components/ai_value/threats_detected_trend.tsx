/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import * as i18n from './translations';
import { getThreatsDetectedTrendLensAttributes } from '../../../common/components/visualization_actions/lens_attributes/ai/threats_detected_trend';
import { VisualizationEmbeddable } from '../../../common/components/visualization_actions/visualization_embeddable';

interface Props {
  from: string;
  to: string;
}
const ID = 'ThreatsDetectedTrendQuery';
const ThreatsDetectedTrendComponent: React.FC<Props> = ({ from, to }) => {
  const {
    euiTheme: { colors },
  } = useEuiTheme();
  const extra = <p>{'hello world'}</p>;
  return (
    <div
      css={css`
        height: 100%;
        > * {
          height: 100% !important;
        }
        .echMetricText__icon .euiIcon {
          fill: ${colors.vis.euiColorVis6};
        }
        .echMetricText {
          padding: 8px 20px 60px;
        }
      `}
    >
      <VisualizationEmbeddable
        data-test-subj="embeddable-metric-trend"
        getLensAttributes={(args) => getThreatsDetectedTrendLensAttributes({ ...args, extra })}
        timerange={{ from, to }}
        id={`${ID}-area-embeddable`}
        inspectTitle={i18n.THREATS_DETECTED}
      />
    </div>
  );
};

export const ThreatsDetectedTrend = React.memo(ThreatsDetectedTrendComponent);
