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
    ilmPhaseFilterContainer: css({
      width: '100%',
      maxWidth: 432,
      alignSelf: 'flex-end',
    }),
    rollupContainer: css({
      marginTop: 'auto',
    }),
  };
};

const DataQualitySummaryComponent: React.FC = () => {
  const styles = useStyles();
  const { isILMAvailable } = useDataQualityContext();
  const { totalIndices, totalDocsCount, totalIndicesChecked, totalIncompatible, totalSizeInBytes } =
    useResultsRollupContext();

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
          {isILMAvailable && (
            <div css={styles.ilmPhaseFilterContainer}>
              <IlmPhaseFilter />
            </div>
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
