/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiStepNumber, EuiTitle } from '@elastic/eui';
import { getEuiStepStatus } from '../../../../../common/utils/get_eui_step_status';
import * as i18n from './translations';
import { SentinelWorkbooksUploadSubSteps } from './sub_steps';
import type { MigrationStepProps } from '../../../../../common/types';
import { SentinelDashboardDataInputStep } from '../constants';

export const SentinelWorkbooksUploadStep = ({
  dataInputStep = 1,
  migrationStats,
  onMigrationCreated,
  onMissingResourcesFetched,
}: MigrationStepProps) => {
  const dataInputStatus = useMemo(
    () => getEuiStepStatus(SentinelDashboardDataInputStep.Workbooks, dataInputStep),
    [dataInputStep]
  );

  return (
    <EuiPanel
      data-test-subj="siemMigrationsSentinelWorkbooksUploadStep"
      hasShadow={false}
      hasBorder
    >
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <EuiFlexGroup direction="row" alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiStepNumber
                titleSize="xs"
                number={SentinelDashboardDataInputStep.Workbooks}
                status={dataInputStatus}
                data-test-subj="sentinelWorkbooksUploadStepNumber"
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTitle size="xs" data-test-subj="sentinelWorkbooksUploadTitle">
                <b>{i18n.SENTINEL_WORKBOOKS_UPLOAD_STEP_TITLE}</b>
              </EuiTitle>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        {dataInputStatus === 'current' && (
          <EuiFlexItem>
            <SentinelWorkbooksUploadSubSteps
              migrationStats={migrationStats}
              onMigrationCreated={onMigrationCreated}
              onMissingResourcesFetched={onMissingResourcesFetched}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiPanel>
  );
};
