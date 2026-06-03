/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import React, { useCallback } from 'react';
import styled from '@emotion/styled';
import { i18n } from '@kbn/i18n';
import { ChartLabel } from '../../../overview/components/detection_response/alerts_by_status/chart_label';
import { useRiskDonutChartData } from './use_risk_donut_chart_data';
import { DonutChart } from '../../../common/components/charts/donutchart';
import { Legend } from '../../../common/components/charts/legend';
import { useRiskScoreFillColor } from './use_risk_score_fill_color';
import type { SeverityCount } from '../severity/types';
import type { RiskSeverity } from '../../../../common/search_strategy';

const DONUT_HEIGHT = 150;

const DonutContainer = styled(EuiFlexItem)`
  padding-right: ${({ theme: { euiTheme } }) => euiTheme.size.m};
  padding-left: ${({ theme: { euiTheme } }) => euiTheme.size.m};
`;

const StyledLegendItems = styled(EuiFlexItem)`
  justify-content: center;
`;

interface RiskScoreDonutChartProps {
  severityCount: SeverityCount;
  showLegend?: boolean;
  /**
   * When provided, clicking a donut partition invokes this callback with the
   * clicked risk level so the caller can add a corresponding global filter.
   */
  onPartitionClick?: (level: RiskSeverity) => void;
}

export const RiskScoreDonutChart = ({
  severityCount,
  showLegend = true,
  onPartitionClick,
}: RiskScoreDonutChartProps) => {
  const [donutChartData, legendItems, total] = useRiskDonutChartData(severityCount);
  const fillColor = useRiskScoreFillColor();

  const handlePartitionClick = useCallback(
    (level: string) => {
      onPartitionClick?.(level as RiskSeverity);
    },
    [onPartitionClick]
  );

  return (
    <EuiFlexGroup responsive={false} data-test-subj="risk-score-donut-chart">
      {showLegend && (
        <StyledLegendItems grow={false}>
          {legendItems.length > 0 && <Legend legendItems={legendItems} />}
        </StyledLegendItems>
      )}
      <DonutContainer grow={false} className="eui-textCenter">
        <DonutChart
          data={donutChartData ?? null}
          fillColor={fillColor}
          height={DONUT_HEIGHT}
          label={i18n.translate(
            'xpack.securitySolution.entityAnalytics.riskScore.donut_chart.totalLabel',
            { defaultMessage: 'entities' }
          )}
          title={<ChartLabel count={total} />}
          totalCount={total}
          onPartitionClick={onPartitionClick ? handlePartitionClick : undefined}
        />
      </DonutContainer>
    </EuiFlexGroup>
  );
};
