/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React from 'react';
import styled from '@emotion/styled';
import { i18n } from '@kbn/i18n';
import { ChartLabel } from '../../../overview/components/detection_response/alerts_by_status/chart_label';
import { useRiskDonutChartData } from './use_risk_donut_chart_data';
import { DonutChart } from '../../../common/components/charts/donutchart';
import { Legend } from '../../../common/components/charts/legend';
import { useRiskScoreFillColor } from './use_risk_score_fill_color';
import type { SeverityCount } from '../severity/types';

const DONUT_HEIGHT = 120;

const DonutContainer = styled(EuiFlexItem)`
  padding-right: ${({ theme: { euiTheme } }) => euiTheme.size.xxl};
  padding-left: ${({ theme: { euiTheme } }) => euiTheme.size.m};
`;

const StyledLegendItems = styled(EuiFlexItem)`
  justify-content: center;
`;

interface RiskScoreDonutChartProps {
  severityCount: SeverityCount;
}

export const RiskScoreDonutChart = ({ severityCount }: RiskScoreDonutChartProps) => {
  const [donutChartData, legendItems, total] = useRiskDonutChartData(severityCount);
  const fillColor = useRiskScoreFillColor();

  return (
    <EuiFlexGroup responsive={false} data-test-subj="risk-score-donut-chart">
      <StyledLegendItems grow={false}>
        {legendItems.length > 0 && <Legend legendItems={legendItems} />}
      </StyledLegendItems>
      <DonutContainer grow={false} className="eui-textCenter">
        <DonutChart
          data={donutChartData ?? null}
          fillColor={fillColor}
          height={DONUT_HEIGHT}
          label={i18n.translate(
            'xpack.securitySolution.entityAnalytics.riskScore.donut_chart.totalLabel',
            { defaultMessage: 'Total' }
          )}
          title={<ChartLabel count={total} />}
          totalCount={total}
        />
      </DonutContainer>
    </EuiFlexGroup>
  );
};
