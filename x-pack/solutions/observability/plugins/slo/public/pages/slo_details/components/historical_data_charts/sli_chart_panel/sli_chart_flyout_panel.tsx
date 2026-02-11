/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  euiContainerQuery,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiStat,
  EuiTitle,
} from '@elastic/eui';
import numeral from '@elastic/numeral';
import { i18n } from '@kbn/i18n';
import { rollingTimeWindowTypeSchema } from '@kbn/slo-schema';
import React from 'react';
import { css } from '@emotion/react';
import { getSloChartState } from '../../../utils/is_slo_failed';
import { toDurationAdverbLabel, toDurationLabel } from '../../../../../utils/slo/labels';
import { WideChart } from '../../wide_chart';
import { useSliChartPanel } from './hooks/use_sli_chart_panel';
import { SloFlyoutPanel } from '../../../shared_flyout/flyout_panel';
import type { SliChartPanelProps } from './types';
import { CHART_PANEL_WIDTH_BREAKPOINT } from '../../../shared_flyout/constants';
import { useSloDetailsContext } from '../../slo_details_context';

export function SliChartFlyoutPanel({
  data,
  isLoading,
  onBrushed,
  hideHeaderDurationLabel = false,
}: SliChartPanelProps) {
  const { slo } = useSloDetailsContext();
  const { isSloFailed, hasNoData, observedValue, percentFormat } = useSliChartPanel({ data });

  return (
    <SloFlyoutPanel
      title={i18n.translate('xpack.slo.sloDetails.sliHistoryChartPanel.title', {
        defaultMessage: 'Historical SLI',
      })}
      renderTooltip
      data-test-subj="sliChartPanel"
    >
      <EuiFlexGroup
        direction="row"
        gutterSize="m"
        css={css`
          ${euiContainerQuery(`(width <= ${CHART_PANEL_WIDTH_BREAKPOINT}px)`)} {
            flex-direction: column-reverse;
          }
        `}
      >
        <EuiFlexItem grow={1}>
          <EuiPanel hasShadow={false} paddingSize="m" color="plain" hasBorder>
            <EuiFlexGroup
              direction="column"
              css={css`
                ${euiContainerQuery(`(width <= ${CHART_PANEL_WIDTH_BREAKPOINT}px)`)} {
                  flex-direction: row;
                }
              `}
            >
              {!hideHeaderDurationLabel && (
                <EuiFlexItem grow={false}>
                  <EuiTitle size="xxs">
                    <h5>
                      {rollingTimeWindowTypeSchema.is(slo.timeWindow.type)
                        ? i18n.translate('xpack.slo.sloDetails.sliHistoryChartPanel.duration', {
                            defaultMessage: 'Last {duration}',
                            values: { duration: toDurationLabel(slo.timeWindow.duration) },
                          })
                        : toDurationAdverbLabel(slo.timeWindow.duration)}
                    </h5>
                  </EuiTitle>
                </EuiFlexItem>
              )}
              <EuiFlexItem grow={false}>
                <EuiStat
                  titleColor={isSloFailed ? 'danger' : 'success'}
                  title={hasNoData ? '-' : numeral(observedValue).format(percentFormat)}
                  titleSize="s"
                  description={i18n.translate('xpack.slo.sloDetails.sliHistoryChartPanel.current', {
                    defaultMessage: 'Observed value',
                  })}
                  reverse
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiStat
                  title={numeral(slo.objective.target).format(percentFormat)}
                  titleSize="s"
                  description={i18n.translate(
                    'xpack.slo.sloDetails.sliHistoryChartPanel.objective',
                    {
                      defaultMessage: 'Objective',
                    }
                  )}
                  reverse
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        </EuiFlexItem>
        <EuiFlexItem grow={3}>
          <WideChart
            chart="line"
            id={i18n.translate('xpack.slo.sloDetails.sliHistoryChartPanel.chartTitle', {
              defaultMessage: 'SLI value',
            })}
            state={getSloChartState(slo.summary.status)}
            data={data}
            isLoading={isLoading}
            onBrushed={onBrushed}
            slo={slo}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </SloFlyoutPanel>
  );
}
