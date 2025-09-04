/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiStepNumber } from '@elastic/eui';
import { getEuiStepStatus } from '../../../../../common/utils/get_eui_step_status';
import { DashboardUploadSteps } from '../constants';
import * as i18n from '../translations';
import { DashboardsUploadSubSteps } from './sub_steps';

interface DashboardsUploadStepProps {
  dataInputStep?: number;
}

export const DashboardsUploadStep = ({
  dataInputStep = 1, // Default value if not provided
}: DashboardsUploadStepProps) => {
  const dataInputStatus = useMemo(
    () => getEuiStepStatus(DashboardUploadSteps.DashboardsUpload, dataInputStep),
    [dataInputStep]
  );

  return (
    <EuiPanel data-test-subj="siemMigrationsDashboardsUploadStep">
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <EuiFlexGroup direction="row" alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiStepNumber titleSize="xs" number={1} status={dataInputStatus} />
            </EuiFlexItem>
            <EuiFlexItem>
              <h3>{i18n.DASHBOARDS_UPLOAD_STEP_TITLE}</h3>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        {dataInputStatus === 'current' && (
          <EuiFlexItem>
            <DashboardsUploadSubSteps />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    </EuiPanel>
  );
};
