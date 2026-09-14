/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { css } from '@emotion/react';
import { getTimeRangeAsDays, formatThousands } from './metrics';
import { ComparePercentage } from './compare_percentage';
import * as i18n from './translations';
import { TimeSavedMetric } from './time_saved_metric';

interface Props {
  isSample: boolean;
  hoursSaved: number;
  hoursSavedCompare: number;
  from: string;
  to: string;
  minutesPerAlert: number;
}

export const TimeSaved: React.FC<Props> = ({
  isSample,
  minutesPerAlert,
  hoursSaved,
  hoursSavedCompare,
  from,
  to,
}) => {
  const timerangeAsDays = useMemo(() => getTimeRangeAsDays({ from, to }), [from, to]);

  return (
    <span
      css={css`
        min-height: 160px;
      `}
    >
      <TimeSavedMetric isSample={isSample} minutesPerAlert={minutesPerAlert} from={from} to={to} />
      <ComparePercentage
        positionForLens
        currentCount={hoursSaved}
        previousCount={hoursSavedCompare}
        stat={formatThousands(hoursSavedCompare)}
        statType={i18n.TIME_SAVED_INLINE_DESCRIPTION}
        timeRange={timerangeAsDays}
      />
    </span>
  );
};
