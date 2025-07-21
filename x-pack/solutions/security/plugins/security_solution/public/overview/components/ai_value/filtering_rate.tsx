/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiStat,
  EuiTitle,
  useEuiTheme,
} from '@elastic/eui';
import { formatPercent } from './metrics';
import { ComparePercentage } from './compare_percentage';
import { getTimeRangeAsDays } from './utils';
import * as i18n from './translations';

interface Props {
  filteredAlertsPerc: number;
  filteredAlertsPercCompare: number;
  from: string;
  to: string;
}

export const FilteringRate: React.FC<Props> = ({
  filteredAlertsPerc,
  filteredAlertsPercCompare,
  from,
  to,
}) => {
  const {
    euiTheme: { colors },
  } = useEuiTheme();
  return (
    <EuiPanel paddingSize="l">
      <EuiFlexGroup justifyContent="spaceBetween" gutterSize="none">
        <EuiFlexItem grow={false}>
          <EuiTitle size="s">
            <h3>{i18n.FILTERING_RATE}</h3>
          </EuiTitle>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiIcon type="visLine" color={colors.vis.euiColorVis4} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiStat title={formatPercent(filteredAlertsPerc)} description={i18n.FILTERING_RATE_DESC} />
      <EuiSpacer size="s" />
      <ComparePercentage
        currentCount={filteredAlertsPerc}
        previousCount={filteredAlertsPercCompare}
        stat={formatPercent(filteredAlertsPercCompare)}
        statType={i18n.FILTERING_RATE}
        timeRange={getTimeRangeAsDays({ from, to })}
      />
    </EuiPanel>
  );
};
