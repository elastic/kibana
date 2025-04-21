/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  EuiHorizontalRule,
  EuiPanel,
  EuiProgress,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import React, { useMemo } from 'react';
import { v4 as uuid } from 'uuid';
import { css } from '@emotion/react';
import { i18n } from '@kbn/i18n';
import { ProgressBarRow } from '../../alerts_kpis/alerts_progress_bar_panel/alerts_progress_bar_row';
import { EMPTY_DATA_MESSAGE } from '../../alerts_kpis/alerts_progress_bar_panel/translations';
import type { ChartsPanelProps } from '../../alerts_kpis/alerts_summary_charts_panel/types';
import { HeaderSection } from '../../../../common/components/header_section';
import { InspectButtonContainer } from '../../../../common/components/inspect';
import { useSummaryChartData } from '../../alerts_kpis/alerts_summary_charts_panel/use_summary_chart_data';
import { alertsGroupingAggregations } from '../../alerts_kpis/alerts_summary_charts_panel/aggregations';
import {
  getAggregateData,
  getIsAlertsProgressBarData,
} from '../../alerts_kpis/alerts_progress_bar_panel/helpers';

export const ALERTS_BY_HOST_PANEL = 'alert-summary-alerts-by-host-panel';
export const ALERTS_BY_HOST_PROGRESS_BAR = 'alert-summary-alerts-by-host-progress-bar';
export const ALERTS_BY_HOST_ROW = 'alert-summary-alerts-by-host-row-';
export const ALERTS_BY_HOST_NO_DATA = 'alert-summary-alerts-by-host-no-data';

const ALERT_BY_HOST_NAME_TITLE = i18n.translate(
  'xpack.securitySolution.alertSummary.kpiSection.alertByHostNameTitle',
  {
    defaultMessage: 'Alert distribution by host',
  }
);

const AGGREGATION_FIELD = 'host.name';
const AGGREGATION_NAME = 'Host name';
const TOP_ALERTS_CHART_ID = 'alerts-summary-top-alerts';
const HEIGHT = 160; // px

/**
 * Renders a list showing the percentages of alerts grouped by host.name .
 * The component is used in the alerts page in the AI for SOC alert summary page.
 */
export const AlertsProgressBarByHostNamePanel: React.FC<ChartsPanelProps> = ({
  filters,
  query,
  signalIndexName,
  runtimeMappings,
  skip = false,
}) => {
  const { euiTheme } = useEuiTheme();

  const uniqueQueryId = useMemo(() => `${TOP_ALERTS_CHART_ID}-${uuid()}`, []);
  const aggregations = useMemo(() => alertsGroupingAggregations(AGGREGATION_FIELD), []);
  const { items, isLoading } = useSummaryChartData({
    aggregations,
    filters,
    query,
    signalIndexName,
    runtimeMappings,
    skip,
    uniqueQueryId,
  });
  const data = useMemo(() => (getIsAlertsProgressBarData(items) ? items : []), [items]);
  const [nonEmpty] = useMemo(() => getAggregateData(data), [data]);
  const noData: boolean = useMemo(() => nonEmpty === 0, [nonEmpty]);

  return (
    <InspectButtonContainer>
      <EuiPanel data-test-subj={ALERTS_BY_HOST_PANEL} hasBorder hasShadow={false}>
        <HeaderSection
          id={uniqueQueryId}
          inspectTitle={ALERT_BY_HOST_NAME_TITLE}
          outerDirection="row"
          title={ALERT_BY_HOST_NAME_TITLE}
          titleSize="xs"
          hideSubtitle
        />
        <EuiText
          size="xs"
          css={css`
            font-weight: ${euiTheme.font.weight.semiBold};
          `}
        >
          {AGGREGATION_NAME}
        </EuiText>
        {isLoading ? (
          <>
            <EuiSpacer size="s" />
            <EuiProgress data-test-subj={ALERTS_BY_HOST_PROGRESS_BAR} color="primary" size="xs" />
          </>
        ) : (
          <>
            <EuiHorizontalRule margin="xs" />
            {noData ? (
              <EuiText data-test-subj={ALERTS_BY_HOST_NO_DATA} size="s" textAlign="center">
                {EMPTY_DATA_MESSAGE}
              </EuiText>
            ) : (
              <div
                className="eui-yScroll"
                css={css`
                  height: ${HEIGHT}px !important;
                `}
              >
                {data
                  .filter((item) => item.key !== '-')
                  .map((item) => (
                    <div data-test-subj={`${ALERTS_BY_HOST_ROW}${item.key}`} key={`${item.key}`}>
                      <ProgressBarRow item={item} />
                      <EuiSpacer size="s" />
                    </div>
                  ))}
              </div>
            )}
          </>
        )}
      </EuiPanel>
    </InspectButtonContainer>
  );
};

AlertsProgressBarByHostNamePanel.displayName = 'AlertsProgressBarByHostNamePanel';
