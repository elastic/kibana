/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiPanel,
  EuiStepNumber,
  EuiText,
  EuiTitle,
} from '@elastic/eui';
import React, { useCallback, useMemo } from 'react';
import { getEuiStepStatus } from '../../utils/get_eui_step_status';
import * as i18n from './translations';

export interface WatchlistsLookupsSubStepsProps<TStats> {
  migrationStats: TStats;
  missingLookups: string[];
  onAllLookupsCreated: () => void;
}

export interface WatchlistsDataInputProps<TStats> {
  /** The current step number in the surrounding flow */
  dataInputStep: number;
  /** The step number this Watchlists step occupies */
  stepNumber: number;
  /** The step number to advance to once all watchlists are uploaded */
  endStepNumber: number;
  migrationStats?: TStats;
  missingLookups?: string[];
  setDataInputStep: React.Dispatch<React.SetStateAction<number>>;
  /** Render function for the per-flow lookups upload sub-steps */
  renderLookupsSubSteps: (props: WatchlistsLookupsSubStepsProps<TStats>) => React.ReactNode;
  /** Description text shown when this step is current */
  description: string;
}

const WatchlistsDataInputComponent = <TStats,>({
  dataInputStep,
  stepNumber,
  endStepNumber,
  migrationStats,
  missingLookups,
  setDataInputStep,
  renderLookupsSubSteps,
  description,
}: WatchlistsDataInputProps<TStats>) => {
  const onAllLookupsCreated = useCallback(() => {
    setDataInputStep(endStepNumber);
  }, [setDataInputStep, endStepNumber]);

  const dataInputStatus = useMemo(
    () => getEuiStepStatus(stepNumber, dataInputStep),
    [dataInputStep, stepNumber]
  );

  return (
    <EuiPanel hasShadow={false} hasBorder>
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <EuiFlexGroup direction="row" justifyContent="center" gutterSize="m">
            <EuiFlexItem grow={false}>
              <EuiStepNumber
                data-test-subj="watchlistsUploadStepNumber"
                titleSize="xs"
                number={stepNumber}
                status={dataInputStatus}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTitle size="xs" data-test-subj="watchlistsUploadTitle">
                <b>{i18n.WATCHLISTS_DATA_INPUT_TITLE}</b>
              </EuiTitle>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        {dataInputStatus === 'current' && migrationStats && missingLookups && (
          <>
            <EuiFlexItem>
              <EuiText size="s" color="subdued" data-test-subj="watchlistsUploadDescription">
                {description}
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              {renderLookupsSubSteps({
                migrationStats,
                missingLookups,
                onAllLookupsCreated,
              })}
            </EuiFlexItem>
          </>
        )}
      </EuiFlexGroup>
    </EuiPanel>
  );
};

export const WatchlistsDataInput = React.memo(
  WatchlistsDataInputComponent
) as typeof WatchlistsDataInputComponent;
