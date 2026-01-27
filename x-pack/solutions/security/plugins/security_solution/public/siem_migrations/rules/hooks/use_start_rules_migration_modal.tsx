/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState } from 'react';

import { EuiSwitch } from '@elastic/eui';
import type { RuleMigrationTranslationStats } from '../../../../common/siem_migrations/model/rule_migration.gen';
import { useIsOpenState } from '../../../common/hooks/use_is_open_state';
import * as i18n from './translations';
import type { RuleMigrationSettings, RuleMigrationStats } from '../types';
import { DATA_TEST_SUBJ_PREFIX, StartMigrationModal } from '../../common/components';
import type { MigrationSettingsBase } from '../../common/types';

interface UseStartRulesMigrationModalProps {
  type: 'start' | 'retry' | 'reprocess';
  migrationStats?: RuleMigrationStats;
  translationStats?: RuleMigrationTranslationStats;
  onStartMigrationWithSettings: (settings: RuleMigrationSettings) => void;
}

export const useStartRulesMigrationModal = ({
  type,
  migrationStats,
  translationStats,
  onStartMigrationWithSettings,
}: UseStartRulesMigrationModalProps) => {
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

  const handleStartMigrationWithSettings = useCallback(
    (settings: MigrationSettingsBase) => {
      onStartMigrationWithSettings({
        ...settings,
        skipPrebuiltRulesMatching: !enablePrebuiltRulesMatching,
      });
    },
    [enablePrebuiltRulesMatching, onStartMigrationWithSettings]
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
        onStartMigrationWithSettings={handleStartMigrationWithSettings}
        onClose={closeModal}
        additionalSettings={prebuiltRulesMatchingSwitch}
      />
    );
  }, [
    closeModal,
    defaultSettingsForModal,
    description,
    handleStartMigrationWithSettings,
    isModalVisible,
    prebuiltRulesMatchingSwitch,
    title,
  ]);

  return { modal, showModal, closeModal };
};
