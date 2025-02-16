/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexItem, useEuiTheme } from '@elastic/eui';
import React, { useState, useCallback, useEffect } from 'react';
import { css } from '@emotion/react';

import { useResultsRollupContext } from '../../contexts/results_rollup_context';
import { Pattern } from './pattern';
import { SelectedIndex } from '../../types';
import { useDataQualityContext } from '../../data_quality_context';
import { useIsHistoricalResultsTourActive } from './hooks/use_is_historical_results_tour_active';

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

  const [isTourActive, setIsTourActive] = useIsHistoricalResultsTourActive();

  const handleDismissTour = useCallback(() => {
    setIsTourActive(false);
  }, [setIsTourActive]);

  const [openPatterns, setOpenPatterns] = useState<
    Array<{ name: string; isOpen: boolean; isEmpty: boolean }>
  >(() => {
    return patterns.map((pattern) => ({ name: pattern, isOpen: true, isEmpty: false }));
  });

  const handleAccordionToggle = useCallback(
    (patternName: string, isOpen: boolean, isEmpty: boolean) => {
      setOpenPatterns((prevOpenPatterns) => {
        return prevOpenPatterns.map((p) =>
          p.name === patternName ? { ...p, isOpen, isEmpty } : p
        );
      });
    },
    []
  );

  const firstOpenNonEmptyPattern = openPatterns.find((pattern) => {
    return pattern.isOpen && !pattern.isEmpty;
  })?.name;

  const [openPatternsUpdatedAt, setOpenPatternsUpdatedAt] = useState<number>(Date.now());

  useEffect(() => {
    if (firstOpenNonEmptyPattern) {
      setOpenPatternsUpdatedAt(Date.now());
    }
  }, [openPatterns, firstOpenNonEmptyPattern]);

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
            isTourActive={isTourActive}
            isFirstOpenNonEmptyPattern={pattern === firstOpenNonEmptyPattern}
            onAccordionToggle={handleAccordionToggle}
            onDismissTour={handleDismissTour}
            // TODO: remove this hack when EUI popover is fixed
            // https://github.com/elastic/eui/issues/5226
            //
            // this information is used to force the tour guide popover to reposition
            // when surrounding accordions get toggled and affect the layout
            {...(pattern === firstOpenNonEmptyPattern && { openPatternsUpdatedAt })}
          />
        </EuiFlexItem>
      ))}
    </div>
  );
};

IndicesDetailsComponent.displayName = 'IndicesDetailsComponent';

export const IndicesDetails = React.memo(IndicesDetailsComponent);
