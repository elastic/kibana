/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPanel } from '@elastic/eui';
import { formatPercent } from './metrics';
import { ComparePercentage } from './compare_percentage';
import { getTimeRangeAsDays } from './utils';
import * as i18n from './translations';
import { AlertFilteringTrend } from './alert_filtering_trend';

interface Props {
  filteredAlertsPerc: number;
  filteredAlertsPercCompare: number;
  attackAlertIds: string[];
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
  console.log('AlertFilteringTrendComponent', {
    filteredAlertsPerc,
    totalAlerts,
  });
  return (
    <EuiPanel paddingSize="none">
      <AlertFilteringTrend
        attackAlertIds={attackAlertIds}
        totalAlerts={totalAlerts}
        from={from}
        to={to}
      />
      <ComparePercentage
        description={i18n.FILTERING_RATE_DESC}
        positionForLens
        currentCount={filteredAlertsPerc}
        previousCount={filteredAlertsPercCompare}
        stat={formatPercent(filteredAlertsPercCompare)}
        statType={i18n.FILTERING_RATE}
        timeRange={getTimeRangeAsDays({ from, to })}
      />
    </EuiPanel>
  );
};
