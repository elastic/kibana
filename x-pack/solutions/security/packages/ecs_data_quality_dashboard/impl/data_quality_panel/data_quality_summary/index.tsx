/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel } from '@elastic/eui';
import React from 'react';
import styled from 'styled-components';

import { StatsRollup } from '../stats_rollup';
import { SummaryActions } from './summary_actions';
import { IlmPhaseFilter } from './ilm_phase_filter';
import { useDataQualityContext } from '../data_quality_context';
import { useResultsRollupContext } from '../contexts/results_rollup_context';

const MAX_SUMMARY_ACTIONS_CONTAINER_WIDTH = 400;
const MIN_SUMMARY_ACTIONS_CONTAINER_WIDTH = 235;

const StyledFlexGroup = styled(EuiFlexGroup)`
  min-height: calc(174px - ${({ theme }) => theme.eui.euiSizeL} * 2);
`;

const StyledFlexItem = styled(EuiFlexItem)`
  gap: ${({ theme }) => theme.eui.euiSizeL};
`;

const SummaryActionsContainerFlexItem = styled(EuiFlexItem)`
  max-width: ${MAX_SUMMARY_ACTIONS_CONTAINER_WIDTH}px;
  min-width: ${MIN_SUMMARY_ACTIONS_CONTAINER_WIDTH}px;
`;

const StyledIlmPhaseFilterContainer = styled.div`
  width: 100%;
  max-width: 432px;
  align-self: flex-end;
`;

const StyledRollupContainer = styled.div`
  margin-top: auto;
`;

const DataQualitySummaryComponent: React.FC = () => {
  const { isILMAvailable } = useDataQualityContext();
  const { totalIndices, totalDocsCount, totalIndicesChecked, totalIncompatible, totalSizeInBytes } =
    useResultsRollupContext();

  return (
    <EuiPanel paddingSize="l" data-test-subj="dataQualitySummary" hasShadow={true}>
      <StyledFlexGroup
        alignItems="stretch"
        gutterSize="none"
        justifyContent="spaceBetween"
        wrap={true}
      >
        <SummaryActionsContainerFlexItem grow={false}>
          <SummaryActions />
        </SummaryActionsContainerFlexItem>

        <StyledFlexItem grow={false}>
          {isILMAvailable && (
            <StyledIlmPhaseFilterContainer>
              <IlmPhaseFilter />
            </StyledIlmPhaseFilterContainer>
          )}
          <StyledRollupContainer>
            <StatsRollup
              docsCount={totalDocsCount}
              incompatible={totalIncompatible}
              indices={totalIndices}
              indicesChecked={totalIndicesChecked}
              sizeInBytes={totalSizeInBytes}
            />
          </StyledRollupContainer>
        </StyledFlexItem>
      </StyledFlexGroup>
    </EuiPanel>
  );
};

export const DataQualitySummary = React.memo(DataQualitySummaryComponent);
