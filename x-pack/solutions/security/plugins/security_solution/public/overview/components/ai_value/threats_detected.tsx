/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPanel } from '@elastic/eui';
import { css } from '@emotion/react';
import { ThreatsDetectedTrend } from './threats_detected_trend';
import { ComparePercentageBadge } from './compare_percentage_badge';
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
  return (
    <EuiPanel
      paddingSize="none"
      css={css`
        min-height: 160px;
      `}
    >
      <ThreatsDetectedTrend from={from} to={to} />

      <ComparePercentageBadge
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
