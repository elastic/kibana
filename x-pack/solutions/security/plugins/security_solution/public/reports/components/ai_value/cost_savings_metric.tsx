/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';

import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import * as i18n from './translations';
import {
  type GetLensAttributes,
  VisualizationContextMenuActions,
} from '../../../common/components/visualization_actions/types';
import { SourcererScopeName } from '../../../sourcerer/store/model';
import { VisualizationEmbeddable } from '../../../common/components/visualization_actions/visualization_embeddable';
import { getCostSavingsMetricLensAttributes } from '../../../common/components/visualization_actions/lens_attributes/ai/cost_savings_metric';

interface Props {
  isDarkMode: boolean;
  from: string;
  to: string;
  minutesPerAlert: number;
  analystHourlyRate: number;
}
const ID = 'CostSavingsMetricQuery';

/**
 * Renders a Lens embeddable metric visualization showing estimated cost savings
 * based on the number of AI filtered alerts, minutes saved per alert,
 * and analyst hourly rate for a given time range.
 *
 * Background-color: colors.backgroundBaseSuccess, #E2F8F0
 * Border-color: colors.success, #008A5E
 * Big numbers color: colors.textSuccess, #09724D
 */

const CostSavingsMetricComponent: React.FC<Props> = ({
  isDarkMode,
  minutesPerAlert,
  analystHourlyRate,
  from,
  to,
}) => {
  const {
    euiTheme: { colors },
  } = useEuiTheme();

  const timerange = useMemo(() => ({ from, to }), [from, to]);
  const getLensAttributes = useCallback<GetLensAttributes>(
    (args) => getCostSavingsMetricLensAttributes({ ...args, minutesPerAlert, analystHourlyRate }),
    [analystHourlyRate, minutesPerAlert]
  );
  console.log({
    isDarkMode,
    colors,
    success: colors.success,
    backgroundBaseSuccess: colors.backgroundBaseSuccess,
  });
  return (
    <div
      css={css`
        height: 100%;
        > * {
          height: 100% !important;
        }
        .echMetricText__icon .euiIcon {
          fill: ${isDarkMode ? '#008A5E' : colors.success};
        }
        .echMetricText {
          padding: 8px 20px 60px;
        }
        p.echMetricText__value {
          color: ${isDarkMode ? '#09724D' : colors.success};
        }
        .euiPanel,
        .embPanel__hoverActions > span {
          background: ${isDarkMode ? '#E2F8F0' : colors.backgroundBaseSuccess};
        }
        .embPanel__hoverActionsAnchor {
          --internalBorderStyle: 1px solid ${isDarkMode ? '#008A5E' : colors.success}!important;
        }
      `}
    >
      <VisualizationEmbeddable
        data-test-subj="cost-savings-metric"
        getLensAttributes={getLensAttributes}
        timerange={timerange}
        id={`${ID}-metric`}
        inspectTitle={i18n.COST_SAVINGS_TREND}
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

export const CostSavingsMetric = React.memo(CostSavingsMetricComponent);
