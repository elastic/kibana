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
import { getEuiStepStatus } from '../../../../../common/utils/get_eui_step_status';
import type { MigrationStepProps } from '../../../../../common/types';
import { SentinelDataInputStep } from '../../types';
import { LookupsDataInputSubSteps } from '../lookups/lookups_data_input';
import * as i18n from './translations';

export const WatchlistsDataInput = React.memo<MigrationStepProps>(
  ({ dataInputStep, migrationStats, missingResourcesIndexed, setDataInputStep }) => {
    const missingLookups = useMemo(
      () => missingResourcesIndexed?.lookups,
      [missingResourcesIndexed]
    );

    const onAllLookupsCreated = useCallback(() => {
      setDataInputStep(SentinelDataInputStep.End);
    }, [setDataInputStep]);

    const dataInputStatus = useMemo(
      () => getEuiStepStatus(SentinelDataInputStep.Watchlists, dataInputStep),
      [dataInputStep]
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
                  number={SentinelDataInputStep.Watchlists}
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
                  {i18n.WATCHLISTS_DATA_INPUT_DESCRIPTION}
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem>
                <LookupsDataInputSubSteps
                  migrationStats={migrationStats}
                  missingLookups={missingLookups}
                  onAllLookupsCreated={onAllLookupsCreated}
                />
              </EuiFlexItem>
            </>
          )}
        </EuiFlexGroup>
      </EuiPanel>
    );
  }
);
WatchlistsDataInput.displayName = 'WatchlistsDataInput';
