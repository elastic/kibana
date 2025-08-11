/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiPanel } from '@elastic/eui';
import { css } from '@emotion/react';
import { getTimeRangeAsDays, formatThousands } from './metrics';
import { ComparePercentageBadge } from './compare_percentage_badge';
import * as i18n from './translations';
import { TimeSavedMetric } from './time_saved_metric';

interface Props {
  hoursSaved: number;
  hoursSavedCompare: number;
  from: string;
  to: string;
  minutesPerAlert: number;
}

export const TimeSaved: React.FC<Props> = ({
  minutesPerAlert,
  hoursSaved,
  hoursSavedCompare,
  from,
  to,
}) => {
  const timerangeAsDays = useMemo(() => getTimeRangeAsDays({ from, to }), [from, to]);

  return (
    <EuiPanel
      css={css`
        min-height: 140px;
      `}
      hasBorder
      hasShadow={false}
      paddingSize="none"
    >
      <TimeSavedMetric minutesPerAlert={minutesPerAlert} from={from} to={to} />
      <ComparePercentageBadge
        description={i18n.TIME_SAVED_DESC}
        positionForLens
        currentCount={hoursSaved}
        previousCount={hoursSavedCompare}
        stat={formatThousands(hoursSavedCompare)}
        statType={i18n.TIME_SAVED_DESC.toLowerCase()}
        timeRange={timerangeAsDays}
      />
    </EuiPanel>
  );
};
