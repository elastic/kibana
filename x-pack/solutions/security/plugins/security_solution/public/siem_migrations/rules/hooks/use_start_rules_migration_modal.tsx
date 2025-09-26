/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';

import { EuiSwitch } from '@elastic/eui';
import type { RuleMigrationTranslationStats } from '../../../../common/siem_migrations/model/rule_migration.gen';
import { SiemMigrationRetryFilter } from '../../../../common/siem_migrations/constants';
import { useIsOpenState } from '../../../common/hooks/use_is_open_state';
import * as i18n from './translations';
import type { RuleMigrationStats } from '../types';
import { DATA_TEST_SUBJ_PREFIX, StartMigrationModal } from '../../common/components';
import type { MigrationSettingsBase } from '../../common/types';
import type { OnSuccess } from '../logic/use_start_migration';
import { useStartMigration } from '../logic/use_start_migration';

interface UseStartRulesMigrationModalProps {
  type: 'start' | 'retry' | 'reprocess';
  migrationStats?: RuleMigrationStats;
  translationStats?: RuleMigrationTranslationStats;
  onStartSuccess?: OnSuccess;
}

export const useStartRulesMigrationModal = ({
  type,
  migrationStats,
  translationStats,
  onStartSuccess,
}: UseStartRulesMigrationModalProps) => {
  const { startMigration, isLoading } = useStartMigration(onStartSuccess);

  const { isOpen: isModalVisible, open: showModal, close: closeModal } = useIsOpenState(false);

  const defaultSettingsForModal = useMemo(
    () => ({
      connectorId: migrationStats?.last_execution?.connector_id,
      skipPrebuiltRulesMatching: migrationStats?.last_execution?.skip_prebuilt_rules_matching,
    }),
    [migrationStats?.last_execution]
  );

  const title = useMemo(() => {
    switch (type) {
      case 'start':
        return i18n.START_RULES_MIGRATION_DIALOG_TITLE;
      case 'retry':
        return i18n.RETRY_RULES_MIGRATION_DIALOG_TITLE;
      case 'reprocess':
        return i18n.REPROCESS_RULES_MIGRATION_DIALOG_TITLE(translationStats?.rules.failed ?? 0);
    }
  }, [translationStats?.rules.failed, type]);

  const description = useMemo(() => {
    switch (type) {
      case 'start':
        return i18n.START_RULES_MIGRATION_DIALOG_DESCRIPTION;
      case 'retry':
        return i18n.RETRY_RULES_MIGRATION_DIALOG_DESCRIPTION;
      case 'reprocess':
        return i18n.REPROCESS_RULES_MIGRATION_DIALOG_DESCRIPTION;
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

  const [enablePrebuiltRulesMatching, setEnablePrebuiltRuleMatching] = useState<boolean>(
    !defaultSettingsForModal.skipPrebuiltRulesMatching
  );

  const prebuiltRulesMatchingSwitch = useMemo(() => {
    return (
      <EuiSwitch
        data-test-subj={`${DATA_TEST_SUBJ_PREFIX}-PrebuiltRulesMatchingSwitch`}
        label={i18n.START_RULES_MIGRATION_DIALOG_PREBUILT_RULES_LABEL}
        checked={enablePrebuiltRulesMatching}
        onChange={(e) => setEnablePrebuiltRuleMatching(e.target.checked)}
      />
    );
  }, [enablePrebuiltRulesMatching]);

  const onStartMigrationWithSettings = useCallback(
    (settings: MigrationSettingsBase) => {
      if (migrationStats?.id) {
        startMigration(migrationStats.id, retryFilter, {
          ...settings,
          skipPrebuiltRulesMatching: !enablePrebuiltRulesMatching,
        });
      }
    },
    [enablePrebuiltRulesMatching, migrationStats?.id, retryFilter, startMigration]
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
        additionalSettings={prebuiltRulesMatchingSwitch}
      />
    );
  }, [
    closeModal,
    defaultSettingsForModal,
    description,
    isModalVisible,
    onStartMigrationWithSettings,
    prebuiltRulesMatchingSwitch,
    title,
  ]);

  return { isLoading, modal, showModal, closeModal };
};
