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
import { formatThousandsDecimal } from './metrics';
import { ComparePercentage } from './compare_percentage';
import { getTimeRangeAsDays } from './utils';
import * as i18n from './translations';

interface Props {
  hoursSaved: number;
  hoursSavedCompare: number;
  from: string;
  to: string;
}

export const TimeSaved: React.FC<Props> = ({ hoursSaved, hoursSavedCompare, from, to }) => {
  const {
    euiTheme: { colors },
  } = useEuiTheme();
  return (
    <EuiPanel paddingSize="l">
      <EuiFlexGroup justifyContent="spaceBetween" gutterSize="none">
        <EuiFlexItem grow={false}>
          <EuiTitle size="s">
            <h3>{i18n.TIME_SAVED}</h3>
          </EuiTitle>
        </EuiFlexItem>

        <EuiFlexItem grow={false}>
          <EuiIcon type="clock" color={colors.vis.euiColorVis2} />
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiSpacer size="s" />
      <EuiStat title={formatThousandsDecimal(hoursSaved)} description={i18n.TIME_SAVED_DESC} />
      <EuiSpacer size="s" />
      <ComparePercentage
        currentCount={hoursSaved}
        previousCount={hoursSavedCompare}
        stat={formatThousandsDecimal(hoursSavedCompare)}
        statType={i18n.TIME_SAVED_DESC.toLowerCase()}
        timeRange={getTimeRangeAsDays({ from, to })}
      />
    </EuiPanel>
  );
};
