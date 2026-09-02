/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import { useIsOpenState } from '../../../common/hooks/use_is_open_state';
import * as i18n from './translations';
import type { WorkflowMigrationStats } from '../types';
import { StartMigrationModal } from '../../common/components';
import type { MigrationSettingsBase } from '../../common/types';

interface UseStartWorkflowsMigrationModalProps {
  type: 'start' | 'retry';
  migrationStats?: WorkflowMigrationStats;
  onStartMigrationWithSettings: (settings: MigrationSettingsBase) => void;
}

export const useStartWorkflowsMigrationModal = ({
  type,
  migrationStats,
  onStartMigrationWithSettings,
}: UseStartWorkflowsMigrationModalProps) => {
  const { isOpen: isModalVisible, open: showModal, close: closeModal } = useIsOpenState(false);

  const defaultSettingsForModal = useMemo(
    () => ({
      connectorId: migrationStats?.last_execution?.connector_id,
    }),
    [migrationStats?.last_execution?.connector_id]
  );

  const title = useMemo(() => {
    switch (type) {
      case 'start':
        return i18n.START_WORKFLOWS_MIGRATION_DIALOG_TITLE;
      case 'retry':
        return i18n.RETRY_WORKFLOWS_MIGRATION_DIALOG_TITLE;
    }
  }, [type]);

  const description = useMemo(() => {
    switch (type) {
      case 'start':
        return i18n.START_WORKFLOWS_MIGRATION_DIALOG_DESCRIPTION;
      case 'retry':
        return i18n.RETRY_WORKFLOWS_MIGRATION_DIALOG_DESCRIPTION;
    }
  }, [type]);

  const modal = useMemo(() => {
    if (!isModalVisible) {
      return null;
    }
    return (
      <StartMigrationModal
        title={title}
        description={description}
        defaultSettings={defaultSettingsForModal}
        onStartMigrationWithSettings={onStartMigrationWithSettings}
        onClose={closeModal}
      />
    );
  }, [
    closeModal,
    defaultSettingsForModal,
    description,
    isModalVisible,
    onStartMigrationWithSettings,
    title,
  ]);

  return { modal, showModal, closeModal };
};
