/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel, useEuiTheme } from '@elastic/eui';
import React from 'react';
import { css } from '@emotion/react';

import { StatsRollup } from '../stats_rollup';
import { SummaryActions } from './summary_actions';
import { IlmPhaseFilter } from './ilm_phase_filter';
import { useDataQualityContext } from '../data_quality_context';
import { useResultsRollupContext } from '../contexts/results_rollup_context';

const MAX_SUMMARY_ACTIONS_CONTAINER_WIDTH = 400;
const MIN_SUMMARY_ACTIONS_CONTAINER_WIDTH = 235;

const useStyles = () => {
  const { euiTheme } = useEuiTheme();

  return {
    flexGroup: css({
      minHeight: `calc(174px - ${euiTheme.size.l} * 2)`,
    }),
    flexItem: css({
      gap: euiTheme.size.l,
    }),
    summaryActionsContainer: css({
      maxWidth: MAX_SUMMARY_ACTIONS_CONTAINER_WIDTH,
      minWidth: MIN_SUMMARY_ACTIONS_CONTAINER_WIDTH,
    }),
    filtersContainer: css({
      width: '100%',
      alignSelf: 'flex-end',
      flexGrow: 0,
    }),
    ilmPhaseFilterContainer: css({
      maxWidth: 432,
      minWidth: 0,
    }),
    rollupContainer: css({
      marginTop: 'auto',
    }),
  };
};

interface Props {
  summaryFilters?: React.ReactNode;
}

const DataQualitySummaryComponent: React.FC<Props> = ({ summaryFilters }) => {
  const styles = useStyles();
  const { isILMAvailable } = useDataQualityContext();
  const { totalIndices, totalDocsCount, totalIndicesChecked, totalIncompatible, totalSizeInBytes } =
    useResultsRollupContext();
  const hasSummaryFilters = summaryFilters != null;

  return (
    <EuiPanel paddingSize="l" data-test-subj="dataQualitySummary" hasShadow={true}>
      <EuiFlexGroup
        css={styles.flexGroup}
        alignItems="stretch"
        gutterSize="none"
        justifyContent="spaceBetween"
        wrap={true}
      >
        <EuiFlexItem css={styles.summaryActionsContainer} grow={false}>
          <SummaryActions />
        </EuiFlexItem>

        <EuiFlexItem css={styles.flexItem} grow={false}>
          {(hasSummaryFilters || isILMAvailable) && (
            <EuiFlexGroup
              css={styles.filtersContainer}
              alignItems="center"
              gutterSize="s"
              justifyContent="flexEnd"
              responsive={false}
              wrap={true}
              data-test-subj="dataQualitySummaryFilters"
            >
              {hasSummaryFilters && <EuiFlexItem grow={false}>{summaryFilters}</EuiFlexItem>}
              {isILMAvailable && (
                <EuiFlexItem css={styles.ilmPhaseFilterContainer}>
                  <IlmPhaseFilter />
                </EuiFlexItem>
              )}
            </EuiFlexGroup>
          )}
          <div css={styles.rollupContainer}>
            <StatsRollup
              docsCount={totalDocsCount}
              incompatible={totalIncompatible}
              indices={totalIndices}
              indicesChecked={totalIndicesChecked}
              sizeInBytes={totalSizeInBytes}
            />
          </div>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};

export const DataQualitySummary = React.memo(DataQualitySummaryComponent);
