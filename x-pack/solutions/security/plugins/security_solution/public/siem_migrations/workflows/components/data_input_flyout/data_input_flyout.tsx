/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiButtonEmpty,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFlyoutResizable,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import React, { useCallback, useState } from 'react';
import { useMigrationDataInputContext } from '../../../common/components/migration_data_input_flyout_context';
import { PanelText } from '../../../../common/components/panel_text';
import { WorkflowsDataInputStep } from './constants';
import { WorkflowsUploadStep } from './steps/upload_stories';
import * as i18n from './translations';

interface WorkflowMigrationDataInputFlyoutProps {
  onClose: () => void;
}

const WORKFLOWS_MIGRATION_DATA_INPUT_FLYOUT_TITLE = 'workflowsMigrationDataInputFlyoutTitle';

export const WorkflowMigrationDataInputFlyout = React.memo(
  function WorkflowMigrationDataInputFlyout({ onClose }: WorkflowMigrationDataInputFlyoutProps) {
    const titleId = useGeneratedHtmlId({
      prefix: WORKFLOWS_MIGRATION_DATA_INPUT_FLYOUT_TITLE,
    });

    const { closeFlyout } = useMigrationDataInputContext();

    const [dataInputStep, setDataInputStep] = useState<WorkflowsDataInputStep>(
      WorkflowsDataInputStep.Upload
    );
    const [createdMigrationId, setCreatedMigrationId] = useState<string | undefined>();

    const onMigrationCreated = useCallback((migrationId: string) => {
      setCreatedMigrationId(migrationId);
      setDataInputStep(WorkflowsDataInputStep.End);
    }, []);

    return (
      <EuiFlyoutResizable
        onClose={closeFlyout}
        ownFocus
        size={850}
        maxWidth={1200}
        minWidth={500}
        data-test-subj="workflowMigrationDataInputFlyout"
        aria-labelledby={titleId}
      >
        <EuiFlyoutHeader hasBorder>
          <EuiTitle size="m">
            <h2 id={titleId}>{i18n.DATA_INPUT_FLYOUT_TITLE}</h2>
          </EuiTitle>
        </EuiFlyoutHeader>
        <EuiFlyoutBody>
          <EuiFlexGroup direction="column" gutterSize="m">
            <EuiFlexItem>
              <WorkflowsUploadStep
                dataInputStep={dataInputStep}
                onMigrationCreated={onMigrationCreated}
              />
            </EuiFlexItem>
            <EuiFlexItem>
              <PanelText size="xs" subdued cursive>
                <p>{i18n.DATA_INPUT_FLYOUT_COPYRIGHT}</p>
              </PanelText>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty onClick={onClose} data-test-subj="workflowDataFlyoutCloseButton">
                {i18n.DATA_INPUT_FLYOUT_CLOSE}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              {/* Starting a translation is not available yet, it is wired together with the start modal. */}
              <EuiButton
                fill
                disabled={createdMigrationId == null}
                data-test-subj="workflowDataFlyoutTranslateButton"
              >
                {i18n.DATA_INPUT_FLYOUT_TRANSLATE}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyoutResizable>
    );
  }
);
