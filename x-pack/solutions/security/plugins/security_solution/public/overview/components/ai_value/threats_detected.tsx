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
import { ThreatsDetectedTrend } from './threats_detected_trend';
import { formatThousands } from './metrics';
import { ComparePercentage } from './compare_percentage';
import { getTimeRangeAsDays } from './utils';
import * as i18n from './translations';

interface Props {
  attackDiscoveryCount: number;
  attackDiscoveryCountCompare: number;
  from: string;
  to: string;
}

export const ThreatsDetected: React.FC<Props> = ({
  attackDiscoveryCount,
  attackDiscoveryCountCompare,
  from,
  to,
}) => {
  const {
    euiTheme: { colors },
  } = useEuiTheme();
  const rest = () => (
    <>
      <EuiFlexGroup justifyContent="spaceBetween" gutterSize="none">
        <EuiFlexItem grow={false}>
          <EuiTitle size="s">
            <h3>{i18n.THREATS_DETECTED}</h3>
          </EuiTitle>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiIcon type="securityApp" color={colors.vis.euiColorVis6} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiStat
        title={formatThousands(attackDiscoveryCount)}
        description={i18n.THREATS_DETECTED_DESC}
      />
      <EuiSpacer size="s" />
      <ComparePercentage
        currentCount={attackDiscoveryCount}
        previousCount={attackDiscoveryCountCompare}
        stat={`${attackDiscoveryCountCompare}`}
        statType={i18n.ATTACK_DISCOVERY_COUNT}
        timeRange={getTimeRangeAsDays({ from, to })}
      />
    </>
  );
  return (
    <EuiPanel paddingSize="none">
      <ThreatsDetectedTrend from={from} to={to} />

      <ComparePercentage
        currentCount={attackDiscoveryCount}
        description={i18n.THREATS_DETECTED_DESC}
        positionForLens
        previousCount={attackDiscoveryCountCompare}
        stat={`${attackDiscoveryCountCompare}`}
        statType={i18n.ATTACK_DISCOVERY_COUNT}
        timeRange={getTimeRangeAsDays({ from, to })}
      />
    </EuiPanel>
  );
};
