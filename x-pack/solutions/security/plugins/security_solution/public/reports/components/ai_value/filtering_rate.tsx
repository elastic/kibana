/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { css } from '@emotion/react';
import { AlertFilteringMetric } from './alert_filtering_metric';
import { ComparePercentage } from './compare_percentage';
import { formatPercent, getTimeRangeAsDays } from './metrics';
import * as i18n from './translations';

interface Props {
  attackAlertIds: string[];
  filteredAlertsPerc: number;
  filteredAlertsPercCompare: number;
  from: string;
  to: string;
  totalAlerts: number;
}

export const FilteringRate: React.FC<Props> = ({
  attackAlertIds,
  filteredAlertsPerc,
  filteredAlertsPercCompare,
  from,
  to,
  totalAlerts,
}) => {
  return (
    <span
      css={css`
        min-height: 160px;
      `}
    >
      <AlertFilteringMetric
        attackAlertIds={attackAlertIds}
        totalAlerts={totalAlerts}
        from={from}
        to={to}
      />
      <ComparePercentage
        positionForLens
        currentCount={filteredAlertsPerc}
        previousCount={filteredAlertsPercCompare}
        stat={formatPercent(filteredAlertsPercCompare)}
        statType={i18n.FILTERING_RATE}
        timeRange={getTimeRangeAsDays({ from, to })}
      />
    </span>
  );
};
