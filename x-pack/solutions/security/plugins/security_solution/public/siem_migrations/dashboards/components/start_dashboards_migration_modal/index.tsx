/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo } from 'react';

import { SiemMigrationRetryFilter } from '../../../../../common/siem_migrations/constants';
import { useIsOpenState } from '../../../../common/hooks/use_is_open_state';
import type { DashboardMigrationTranslationStats } from '../../../../../common/siem_migrations/model/dashboard_migration.gen';
import * as i18n from './translations';
import type { DashboardMigrationStats } from '../../types';
import { StartMigrationModal } from '../../../common/components';
import type { MigrationSettingsBase } from '../../../common/types';
import type { OnSuccess } from '../../logic/use_start_migration';
import { useStartMigration } from '../../logic/use_start_migration';

interface UseStartDashboardsMigrationModalProps {
  type: 'start' | 'retry' | 'reprocess';
  migrationStats?: DashboardMigrationStats;
  translationStats?: DashboardMigrationTranslationStats;
  onStartSuccess?: OnSuccess;
}

export const useStartDashboardsMigrationModal = ({
  type,
  migrationStats,
  translationStats,
  onStartSuccess,
}: UseStartDashboardsMigrationModalProps) => {
  const { startMigration, isLoading } = useStartMigration(onStartSuccess);

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

  const retryFilter = useMemo(() => {
    switch (type) {
      case 'start':
        return undefined;
      case 'retry':
        return SiemMigrationRetryFilter.NOT_FULLY_TRANSLATED;
      case 'reprocess':
        return SiemMigrationRetryFilter.FAILED;
    }
  }, [type]);

  const onStartMigrationWithSettings = useCallback(
    (settings: MigrationSettingsBase) => {
      if (migrationStats?.id) {
        startMigration(migrationStats.id, retryFilter, settings);
      }
    },
    [migrationStats?.id, retryFilter, startMigration]
  );

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

  return { isLoading, modal, showModal, closeModal };
};
