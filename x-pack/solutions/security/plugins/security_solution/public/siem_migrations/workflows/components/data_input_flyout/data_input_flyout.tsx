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
  EuiSpacer,
  EuiSteps,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import React, { useMemo, useState } from 'react';
import { useMigrationDataInputContext } from '../../../common/components/migration_data_input_flyout_context';
import { useMigrationNameStep } from '../../../common/components';
import { PanelText } from '../../../../common/components/panel_text';
import { useCreateMigration } from '../../service/hooks/use_create_migration';
import { TinesStoriesFileUpload } from './tines_stories_file_upload';
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

    const [migrationName, setMigrationName] = useState<string | undefined>();
    const [createdMigrationId, setCreatedMigrationId] = useState<string | undefined>();
    const isCreated = createdMigrationId != null;

    const {
      createMigration,
      isLoading: isCreating,
      error,
    } = useCreateMigration(setCreatedMigrationId);

    const nameStep = useMigrationNameStep({
      status: isCreated ? 'complete' : 'current',
      setMigrationName,
      migrationName,
    });

    const uploadStep = useMemo(
      () => ({
        title: i18n.DATA_INPUT_FLYOUT_UPLOAD_TITLE,
        status: isCreated ? ('complete' as const) : ('current' as const),
        children: isCreated ? null : (
          <TinesStoriesFileUpload
            createMigration={createMigration}
            migrationName={migrationName}
            isLoading={isCreating}
            isCreated={isCreated}
            apiError={error?.message}
          />
        ),
      }),
      [createMigration, error, isCreating, isCreated, migrationName]
    );

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
          <EuiSteps steps={[nameStep, uploadStep]} />
          <EuiSpacer size="m" />
          <PanelText size="xs" subdued>
            <p>{i18n.DATA_INPUT_FLYOUT_COPYRIGHT}</p>
          </PanelText>
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
                disabled={!isCreated}
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
