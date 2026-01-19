/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiPanel, useEuiTheme } from '@elastic/eui';
import { css } from '@emotion/react';
import { getTimeRangeAsDays, formatDollars } from './metrics';
import { ComparePercentageBadge } from './compare_percentage_badge';
import { CostSavingsMetric } from './cost_savings_metric';
import * as i18n from './translations';

interface Props {
  minutesPerAlert: number;
  analystHourlyRate: number;
  from: string;
  to: string;
  costSavings: number;
  costSavingsCompare: number;
}

export const CostSavings: React.FC<Props> = ({
  minutesPerAlert,
  analystHourlyRate,
  from,
  to,
  costSavings,
  costSavingsCompare,
}) => {
  const {
    euiTheme: { colors },
  } = useEuiTheme();
  const timerangeAsDays = useMemo(() => getTimeRangeAsDays({ from, to }), [from, to]);

  return (
    <EuiPanel
      css={css`
        min-height: 140px;
        border: 1px solid ${colors.success};
      `}
      hasBorder
      hasShadow={false}
      paddingSize="none"
    >
      <CostSavingsMetric
        from={from}
        to={to}
        analystHourlyRate={analystHourlyRate}
        minutesPerAlert={minutesPerAlert}
      />
      <ComparePercentageBadge
        positionForLens
        colorFamily="bright"
        currentCount={costSavings}
        previousCount={costSavingsCompare}
        stat={formatDollars(costSavingsCompare)}
        statType={i18n.COST_SAVED_DESC.toLowerCase()}
        timeRange={timerangeAsDays}
      />
    </EuiPanel>
  );
};
