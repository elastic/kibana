/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { i18n } from '@kbn/i18n';
import { useIsOpenState } from '../../../../common/hooks/use_is_open_state';
import { StartMigrationModal } from '../../../common/components';
import type { MigrationSettingsBase } from '../../../common/types';
import type { WorkflowMigrationStats } from '../../types';

const START_WORKFLOWS_MIGRATION_DIALOG_TITLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.startMigrationDialog.title',
  { defaultMessage: 'Translate workflows' }
);

const START_WORKFLOWS_MIGRATION_DIALOG_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.siemMigrations.workflows.startMigrationDialog.description',
  { defaultMessage: 'You are about to start a translation. Select which AI connector to use.' }
);

interface UseStartWorkflowsMigrationModalProps {
  migrationStats?: WorkflowMigrationStats;
  onStartMigrationWithSettings: (settings: MigrationSettingsBase) => void;
}

export const useStartWorkflowsMigrationModal = ({
  migrationStats,
  onStartMigrationWithSettings,
}: UseStartWorkflowsMigrationModalProps) => {
  const { isOpen: isModalVisible, open: showModal, close: closeModal } = useIsOpenState(false);

  const defaultSettings = useMemo(
    () => ({ connectorId: migrationStats?.last_execution?.connector_id }),
    [migrationStats?.last_execution?.connector_id]
  );

  const modal = useMemo(() => {
    if (!isModalVisible) {
      return null;
    }
    return (
      <StartMigrationModal
        title={START_WORKFLOWS_MIGRATION_DIALOG_TITLE}
        description={START_WORKFLOWS_MIGRATION_DIALOG_DESCRIPTION}
        defaultSettings={defaultSettings}
        onStartMigrationWithSettings={onStartMigrationWithSettings}
        onClose={closeModal}
      />
    );
  }, [closeModal, defaultSettings, isModalVisible, onStartMigrationWithSettings]);

  return { modal, showModal, closeModal };
};
