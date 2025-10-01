/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiStepNumber, EuiTitle } from '@elastic/eui';
import { getEuiStepStatus } from '../../../../../common/utils/get_eui_step_status';
import { DashboardUploadSteps } from '../constants';
import * as i18n from '../translations';
import { DashboardsUploadSubSteps } from './sub_steps';
import type { OnMigrationCreated, OnMissingResourcesFetched } from '../../types';
import type { DashboardMigrationStats } from '../../../../types';

interface DashboardsUploadStepProps {
  dataInputStep?: number;
  migrationStats?: DashboardMigrationStats;
  onMigrationCreated: OnMigrationCreated;
  onMissingResourcesFetched: OnMissingResourcesFetched;
}

export const DashboardsUploadStep = ({
  dataInputStep = 1, // Default value if not provided
  migrationStats,
  onMigrationCreated,
  onMissingResourcesFetched,
}: DashboardsUploadStepProps) => {
  const dataInputStatus = useMemo(
    () => getEuiStepStatus(DashboardUploadSteps.DashboardsUpload, dataInputStep),
    [dataInputStep]
  );

  return (
    <EuiPanel data-test-subj="siemMigrationsDashboardsUploadStep" hasShadow={false} hasBorder>
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <EuiFlexGroup direction="row" alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiStepNumber titleSize="xs" number={1} status={dataInputStatus} />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTitle size="xs">
                <b>{i18n.DASHBOARDS_UPLOAD_STEP_TITLE}</b>
              </EuiTitle>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        {dataInputStatus === 'current' && (
          <EuiFlexItem>
            <DashboardsUploadSubSteps
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
