/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';

import { css } from '@emotion/react';
import { useEuiTheme } from '@elastic/eui';
import { PageScope } from '../../../data_view_manager/constants';
import * as i18n from './translations';
import {
  type GetLensAttributes,
  VisualizationContextMenuActions,
} from '../../../common/components/visualization_actions/types';
import { VisualizationEmbeddable } from '../../../common/components/visualization_actions/visualization_embeddable';
import { getCostSavingsMetricLensAttributes } from '../../../common/components/visualization_actions/lens_attributes/ai/cost_savings_metric';
import { useMetricAnimation } from '../../hooks/use_metric_animation';
import { useSignalIndexWithDefault } from '../../hooks/use_signal_index_with_default';
import { useAIValueExportContext } from '../../providers/ai_value/export_provider';
import { SampleMetric } from './sample_metric';
import { SAMPLE_VALUE_METRICS } from './sample_data';
import { formatDollars } from './metrics';

type Props =
  | { renderSample: true }
  | {
      renderSample: false;
      from: string;
      to: string;
      minutesPerAlert: number;
      analystHourlyRate: number;
    };
const ID = 'CostSavingsMetricQuery';

const WithMetricAnimation = ({ children }: { children: React.ReactNode }) => {
  // Apply animation to the metric value
  useMetricAnimation({
    animationDurationMs: 1500,
    // Scope to this embeddable to avoid accidentally animating the first metric value on the page
    // (e.g. "Real threats detected"), since `.echMetricText__value` is used by all Lens metric cards.
    selector: '[data-test-subj="cost-savings-metric"] .echMetricText__value',
  });

  return <>{children}</>;
};

interface LiveContentProps {
  from: string;
  to: string;
  minutesPerAlert: number;
  analystHourlyRate: number;
}

const LiveCostSavingsMetricContent: React.FC<LiveContentProps> = ({
  from,
  to,
  minutesPerAlert,
  analystHourlyRate,
}) => {
  const {
    euiTheme: { colors },
  } = useEuiTheme();

  const exportContext = useAIValueExportContext();
  const isExportMode = exportContext?.isExportMode === true;

  const signalIndexName = useSignalIndexWithDefault();
  const timerange = useMemo(() => ({ from, to }), [from, to]);
  const getLensAttributes = useCallback<GetLensAttributes>(
    (args) =>
      getCostSavingsMetricLensAttributes({
        ...args,
        backgroundColor: colors.backgroundBaseSuccess,
        minutesPerAlert,
        analystHourlyRate,
        signalIndexName,
      }),
    [analystHourlyRate, colors.backgroundBaseSuccess, minutesPerAlert, signalIndexName]
  );

  const Visualization = (
    <VisualizationEmbeddable
      data-test-subj="cost-savings-metric"
      getLensAttributes={getLensAttributes}
      timerange={timerange}
      id={`${ID}-metric`}
      inspectTitle={i18n.COST_SAVINGS_TREND}
      scopeId={PageScope.alerts}
      withActions={[
        VisualizationContextMenuActions.addToExistingCase,
        VisualizationContextMenuActions.addToNewCase,
        VisualizationContextMenuActions.inspect,
      ]}
    />
  );

  if (isExportMode) {
    return Visualization;
  }

  return <WithMetricAnimation>{Visualization}</WithMetricAnimation>;
};

const SampleCostSavingsMetricContent: React.FC = () => {
  const {
    euiTheme: { colors },
  } = useEuiTheme();
  return (
    <SampleMetric
      id={`${ID}-sample`}
      title={i18n.COST_SAVINGS_TITLE}
      value={SAMPLE_VALUE_METRICS.costSavings}
      valueFormatter={formatDollars}
      icon="rocket"
      color={colors.backgroundBaseSuccess}
    />
  );
};

/**
 * Renders a Lens embeddable metric visualization showing estimated cost savings
 * based on the number of AI filtered alerts, minutes saved per alert,
 * and analyst hourly rate for a given time range.
 *
 * When `renderSample` is true, renders a sample metric backed by `SAMPLE_VALUE_METRICS`.
 */
const CostSavingsMetricComponent: React.FC<Props> = (props) => {
  const {
    euiTheme: { colors },
  } = useEuiTheme();

  return (
    <div
      css={css`
        height: 100%;
        > * {
          height: 100% !important;
        }
        .echMetricText__icon .euiIcon {
          fill: ${colors.success};
        }
        .echMetricText {
          padding: 8px 16px 60px;
        }
        p.echMetricText__value {
          color: ${colors.success};
          font-size: 48px !important;
          padding: 10px 0;
        }
        .euiPanel,
        .embPanel__hoverActions > span {
          background: ${colors.backgroundBaseSuccess};
        }
        .embPanel__hoverActionsAnchor {
          --internalBorderStyle: 1px solid ${colors.success}!important;
        }
      `}
    >
      {props.renderSample ? (
        <SampleCostSavingsMetricContent />
      ) : (
        <LiveCostSavingsMetricContent
          from={props.from}
          to={props.to}
          minutesPerAlert={props.minutesPerAlert}
          analystHourlyRate={props.analystHourlyRate}
        />
      )}
    </div>
  );
};

export const CostSavingsMetric = React.memo(CostSavingsMetricComponent);
