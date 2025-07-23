/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPanel } from '@elastic/eui';
import { css } from '@emotion/react';
import { formatThousandsDecimal } from './metrics';
import { ComparePercentage } from './compare_percentage';
import { getTimeRangeAsDays } from './utils';
import * as i18n from './translations';
import { TimeSavedTrend } from './time_saved_trend';

interface Props {
  attackAlertIds: string[];
  hoursSaved: number;
  hoursSavedCompare: number;
  from: string;
  to: string;
  minutesPerAlert: number;
}

export const TimeSaved: React.FC<Props> = ({
  minutesPerAlert,
  attackAlertIds,
  hoursSaved,
  hoursSavedCompare,
  from,
  to,
}) => {
  return (
    <EuiPanel
      paddingSize="none"
      css={css`
        min-height: 160px;
      `}
    >
      <TimeSavedTrend
        attackAlertIds={attackAlertIds}
        minutesPerAlert={minutesPerAlert}
        from={from}
        to={to}
      />
      <ComparePercentage
        description={i18n.TIME_SAVED_DESC}
        positionForLens
        currentCount={hoursSaved}
        previousCount={hoursSavedCompare}
        stat={formatThousandsDecimal(hoursSavedCompare)}
        statType={i18n.TIME_SAVED_DESC.toLowerCase()}
        timeRange={getTimeRangeAsDays({ from, to })}
      />
    </EuiPanel>
  );
};
