/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem, useEuiTheme } from '@elastic/eui';
import React from 'react';
import { css } from '@emotion/react';

import { useResultsRollupContext } from '../../contexts/results_rollup_context';
import { Pattern } from './pattern';
import { SelectedIndex } from '../../types';
import { useDataQualityContext } from '../../data_quality_context';

const useStyles = () => {
  const { euiTheme } = useEuiTheme();

  return {
    patternWrapperFlexItem: css({
      marginBottom: euiTheme.size.base,
      ':last-child': {
        marginBottom: 0,
      },
    }),
  };
};

export interface Props {
  chartSelectedIndex: SelectedIndex | null;
  setChartSelectedIndex: (selectedIndex: SelectedIndex | null) => void;
}

const IndicesDetailsComponent: React.FC<Props> = ({
  chartSelectedIndex,
  setChartSelectedIndex,
}) => {
  const styles = useStyles();
  const { patternRollups, patternIndexNames } = useResultsRollupContext();
  const { patterns } = useDataQualityContext();

  return (
    <div data-test-subj="indicesDetails">
      {patterns.map((pattern) => (
        <EuiFlexItem css={styles.patternWrapperFlexItem} grow={false} key={pattern}>
          <Pattern
            indexNames={patternIndexNames[pattern]}
            pattern={pattern}
            patternRollup={patternRollups[pattern]}
            chartSelectedIndex={chartSelectedIndex}
            setChartSelectedIndex={setChartSelectedIndex}
          />
        </EuiFlexItem>
      ))}
    </div>
  );
};

IndicesDetailsComponent.displayName = 'IndicesDetailsComponent';

export const IndicesDetails = React.memo(IndicesDetailsComponent);
