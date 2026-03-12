/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';

import { useIsOpenState } from '../../../common/hooks/use_is_open_state';
import type { DashboardMigrationTranslationStats } from '../../../../common/siem_migrations/model/dashboard_migration.gen';
import * as i18n from './translations';
import type { DashboardMigrationStats } from '../types';
import { StartMigrationModal } from '../../common/components';
import type { MigrationSettingsBase } from '../../common/types';

interface UseStartDashboardsMigrationModalProps {
  type: 'start' | 'retry' | 'reprocess';
  migrationStats?: DashboardMigrationStats;
  translationStats?: DashboardMigrationTranslationStats;
  onStartMigrationWithSettings: (settings: MigrationSettingsBase) => void;
}

export const useStartDashboardsMigrationModal = ({
  type,
  migrationStats,
  translationStats,
  onStartMigrationWithSettings,
}: UseStartDashboardsMigrationModalProps) => {
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
        return i18n.START_DASHBOARDS_MIGRATION_DIALOG_TITLE;
      case 'retry':
        return i18n.RETRY_DASHBOARDS_MIGRATION_DIALOG_TITLE;
      case 'reprocess':
        return i18n.REPROCESS_DASHBOARDS_MIGRATION_DIALOG_TITLE(
          translationStats?.dashboards.failed ?? 0
        );
    }
  }, [translationStats?.dashboards.failed, type]);

  const description = useMemo(() => {
    switch (type) {
      case 'start':
        return i18n.START_DASHBOARDS_MIGRATION_DIALOG_DESCRIPTION;
      case 'retry':
        return i18n.RETRY_DASHBOARDS_MIGRATION_DIALOG_DESCRIPTION;
      case 'reprocess':
        return i18n.REPROCESS_DASHBOARDS_MIGRATION_DIALOG_DESCRIPTION;
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
