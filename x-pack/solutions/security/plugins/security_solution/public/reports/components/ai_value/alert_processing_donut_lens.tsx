/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import { VisualizationContextMenuActions } from '../../../common/components/visualization_actions/types';
import { useSpaceId } from '../../../common/hooks/use_space_id';
import { getAlertProcessingDonutAttributes } from '../../../common/components/visualization_actions/lens_attributes/ai/alert_processing_donut';
import { SourcererScopeName } from '../../../sourcerer/store/model';
import { VisualizationEmbeddable } from '../../../common/components/visualization_actions/visualization_embeddable';

const ChartSize = 250;
interface Props {
  attackAlertIds: string[];
  from: string;
  to: string;
}
export const AlertProcessingDonut: React.FC<Props> = ({ attackAlertIds, from, to }) => {
  const spaceId = useSpaceId();
  const {
    euiTheme: { font },
  } = useEuiTheme();

  return (
    <div
      className="donutChart"
      css={css`
        // hide filtering actions in the legend
        .echLegendItem__action {
          display: none;
        }
        .donutText {
          text-align: center;
          top: 44% !important;
          max-width: 100% !important;
          .donutTitleLabel {
            font-size: ${font.scale.m}em;
          }
          b {
            font-size: ${font.scale.xl}em;
          }
        }
        .euiPanel,
        .embPanel,
        .echMetric,
        .echChartBackground,
        .embPanel__hoverActions > span {
          background-color: rgb(0, 0, 0, 0) !important;
        }
        .donutChart .euiPanel {
          background-color: rgb(255, 255, 255, 0);
        }
      `}
    >
      <VisualizationEmbeddable
        applyGlobalQueriesAndFilters={false}
        getLensAttributes={(args) =>
          getAlertProcessingDonutAttributes({
            ...args,
            attackAlertIds,
            spaceId: spaceId ?? 'default',
          })
        }
        height={ChartSize}
        width={'100%'}
        id={`open`}
        isDonut={true}
        donutTitleLabel={'Total alerts processed'}
        donutTextWrapperClassName={'donutText'}
        scopeId={SourcererScopeName.detections}
        timerange={{ from, to }}
        withActions={[
          VisualizationContextMenuActions.addToExistingCase,
          VisualizationContextMenuActions.addToNewCase,
          VisualizationContextMenuActions.inspect,
        ]}
      />
    </div>
  );
};
