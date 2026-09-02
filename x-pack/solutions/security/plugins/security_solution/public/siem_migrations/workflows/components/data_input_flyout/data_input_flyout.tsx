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
import React, { useCallback, useMemo, useState } from 'react';
import { SiemMigrationTaskStatus } from '../../../../../common/siem_migrations/constants';
import { useMigrationDataInputContext } from '../../../common/components/migration_data_input_flyout_context';
import { useMigrationNameStep } from '../../../common/components';
import { PanelText } from '../../../../common/components/panel_text';
import type { MigrationSettingsBase } from '../../../common/types';
import { useCreateMigration } from '../../service/hooks/use_create_migration';
import { useStartMigration } from '../../logic/use_start_migration';
import { useStartWorkflowsMigrationModal } from '../../hooks/use_start_workflow_migration_modal';
import type { WorkflowMigrationStats } from '../../types';
import { TinesStoriesFileUpload } from './tines_stories_file_upload';
import * as i18n from './translations';

interface WorkflowMigrationDataInputFlyoutProps {
  onClose: () => void;
  migrationStats: WorkflowMigrationStats | undefined;
  setFlyoutMigrationStats: (migrationStats: WorkflowMigrationStats | undefined) => void;
}

const WORKFLOWS_MIGRATION_DATA_INPUT_FLYOUT_TITLE = 'workflowsMigrationDataInputFlyoutTitle';

export const WorkflowMigrationDataInputFlyout = React.memo(
  function WorkflowMigrationDataInputFlyout({
    onClose,
    migrationStats,
    setFlyoutMigrationStats,
  }: WorkflowMigrationDataInputFlyoutProps) {
    const titleId = useGeneratedHtmlId({
      prefix: WORKFLOWS_MIGRATION_DATA_INPUT_FLYOUT_TITLE,
    });

    const { closeFlyout } = useMigrationDataInputContext();
    const isRetry = migrationStats?.status === SiemMigrationTaskStatus.FINISHED;

    const [migrationName, setMigrationName] = useState<string | undefined>(migrationStats?.name);

    const onMigrationCreated = useCallback(
      (createdMigrationStats: WorkflowMigrationStats) => {
        setFlyoutMigrationStats(createdMigrationStats);
      },
      [setFlyoutMigrationStats]
    );

    const { createMigration, isLoading: isCreating, error } = useCreateMigration(onMigrationCreated);

    const nameStep = useMigrationNameStep({
      status: migrationStats ? 'complete' : 'current',
      setMigrationName,
      migrationName,
    });

    const uploadStep = useMemo(
      () => ({
        title: i18n.DATA_INPUT_FLYOUT_UPLOAD_TITLE,
        status: migrationStats ? ('complete' as const) : ('current' as const),
        children: migrationStats ? null : (
          <TinesStoriesFileUpload
            createMigration={createMigration}
            migrationName={migrationName}
            isLoading={isCreating}
            isCreated={false}
            apiError={error?.message}
          />
        ),
      }),
      [createMigration, error, isCreating, migrationName, migrationStats]
    );

    const { startMigration, isLoading: isStartLoading } = useStartMigration(onClose);
    const onStartMigrationWithSettings = useCallback(
      (settings: MigrationSettingsBase) => {
        if (migrationStats) {
          startMigration(migrationStats, settings);
        }
      },
      [migrationStats, startMigration]
    );
    const { modal: startMigrationModal, showModal: showStartMigrationModal } =
      useStartWorkflowsMigrationModal({
        type: isRetry ? 'retry' : 'start',
        migrationStats,
        onStartMigrationWithSettings,
      });

    const onTranslateButtonClick = useCallback(() => {
      if (migrationStats?.id) {
        showStartMigrationModal();
      }
    }, [migrationStats?.id, showStartMigrationModal]);

    return (
      <>
        {startMigrationModal}

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
                <EuiButton
                  fill
                  onClick={onTranslateButtonClick}
                  disabled={!migrationStats?.id}
                  isLoading={isStartLoading}
                  data-test-subj="workflowDataFlyoutTranslateButton"
                >
                  {i18n.DATA_INPUT_FLYOUT_TRANSLATE}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlyoutFooter>
        </EuiFlyoutResizable>
      </>
    );
  }
);
