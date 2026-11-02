/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiPanel, EuiStepNumber, EuiTitle } from '@elastic/eui';
import React, { useMemo } from 'react';
import { getEuiStepStatus } from '../../../../../common/utils/get_eui_step_status';
import { WorkflowDataInputStep, type WorkflowMigrationStepProps } from '../../../../types';
import * as i18n from './translations';

export const TinesDataInput = React.memo<WorkflowMigrationStepProps>(function TinesDataInput({
  dataInputStep,
  migrationSource,
}) {
  const dataInputStatus = useMemo(
    () => getEuiStepStatus(WorkflowDataInputStep.Upload, dataInputStep),
    [dataInputStep]
  );

  return (
    <EuiPanel
      data-test-subj="tinesWorkflowUploadStep"
      data-migration-source={migrationSource}
      hasShadow={false}
      hasBorder
    >
      <EuiFlexGroup direction="column">
        <EuiFlexItem>
          <EuiFlexGroup direction="row" alignItems="center" gutterSize="s">
            <EuiFlexItem grow={false}>
              <EuiStepNumber
                titleSize="xs"
                number={WorkflowDataInputStep.Upload}
                status={dataInputStatus}
                data-test-subj="tinesWorkflowUploadStepNumber"
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiTitle size="xs" data-test-subj="tinesWorkflowUploadTitle">
                <b>{i18n.TINES_UPLOAD_STEP_TITLE}</b>
              </EuiTitle>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
});
