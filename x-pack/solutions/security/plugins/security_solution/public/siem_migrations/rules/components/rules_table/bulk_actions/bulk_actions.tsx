/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { ReprocessFailedRulesButton } from './reprocess_failed_rules';
import { InstallTranslatedButton } from './install_translated';
import { UpdateMissingIndex } from './update_missing_index';
import { type RuleMigrationRule } from '../../../../../../common/siem_migrations/model/rule_migration.gen';
import type { GetRuleMigrationTranslationStatsResponse } from '../../../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import {
  MigrationTranslationResult,
  SIEM_RULE_MIGRATION_INDEX_PATTERN_PLACEHOLDER,
  SiemMigrationStatus,
} from '../../../../../../common/siem_migrations/constants';

export interface BulkActionsProps {
  isTableLoading: boolean;
  translationStats: GetRuleMigrationTranslationStatsResponse;
  selectedRules: RuleMigrationRule[];
  installTranslatedRule?: () => void;
  installSelectedRule?: () => void;
  reprocessFailedRules?: () => void;
  setMissingIndexPatternFlyoutOpen: () => void;
}

/**
 * Collection of buttons to perform bulk actions on migration rules within the SIEM Rules Migrations table.
 */
export const BulkActions: React.FC<BulkActionsProps> = React.memo(
  ({
    isTableLoading,
    translationStats,
    selectedRules,
    installTranslatedRule,
    installSelectedRule,
    reprocessFailedRules,
    setMissingIndexPatternFlyoutOpen,
  }) => {
    const numberOfSelectedRules = selectedRules.length;
    const numberOfFailedRules = translationStats.rules.failed;
    const numberOfTranslatedRules = translationStats.rules.success.installable;
    const numberOfRulesWithMissingIndex = translationStats.rules.success.missing_index;
    const missingIndexPatternSelected = useMemo(
      () =>
        selectedRules.filter((rule) =>
          rule.elastic_rule?.query?.includes(SIEM_RULE_MIGRATION_INDEX_PATTERN_PLACEHOLDER)
        ).length,
      [selectedRules]
    );
    const numberOfTranslatedRulesSelected = useMemo(
      () =>
        selectedRules.filter((rule) => rule.translation_result === MigrationTranslationResult.FULL)
          .length,
      [selectedRules]
    );
    const numberOfFailedRulesSelected = useMemo(
      () => selectedRules.filter((rule) => rule.status === SiemMigrationStatus.FAILED).length,
      [selectedRules]
    );
    const showInstallSelectedRulesButton = numberOfTranslatedRules > 0;
    const showRetryFailedRulesButton = numberOfFailedRules > 0;
    const showUpdateMissingIndexPatternButton = numberOfRulesWithMissingIndex > 0;
    const reprocessFailedRulesCallback = useCallback(() => {
      reprocessFailedRules?.();
    }, [reprocessFailedRules]);
    const installTranslatedRulesCallback = useCallback(() => {
      installTranslatedRule?.();
    }, [installTranslatedRule]);
    const installSelectedRulesCallback = useCallback(() => {
      installSelectedRule?.();
    }, [installSelectedRule]);
    return (
      <EuiFlexGroup alignItems="center" gutterSize="s" responsive={false} wrap={true}>
        {showUpdateMissingIndexPatternButton && (
          <UpdateMissingIndex
            setMissingIndexPatternFlyoutOpen={setMissingIndexPatternFlyoutOpen}
            isTableLoading={isTableLoading}
            numberOfRulesWithMissingIndex={numberOfRulesWithMissingIndex}
            missingIndexPatternSelected={missingIndexPatternSelected}
            numberOfSelectedRules={numberOfSelectedRules}
          />
        )}
        {showRetryFailedRulesButton && (
          <EuiFlexItem grow={false}>
            <ReprocessFailedRulesButton
              onClick={reprocessFailedRulesCallback}
              isDisabled={isTableLoading}
              isLoading={isTableLoading}
              numberOfFailedRules={numberOfFailedRules}
              reprocessFailedRulesSelected={numberOfFailedRulesSelected}
            />
          </EuiFlexItem>
        )}
        {showInstallSelectedRulesButton && (
          <EuiFlexItem grow={false}>
            <InstallTranslatedButton
              installTranslatedRule={installTranslatedRulesCallback}
              isTableLoading={isTableLoading}
              numberOfTranslatedRules={numberOfTranslatedRules}
              numberOfSelectedRules={numberOfSelectedRules}
              disableInstallTranslatedRulesButton={isTableLoading}
              installSelectedRule={installSelectedRulesCallback}
              installTranslatedRulesSelected={numberOfTranslatedRulesSelected}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    );
  }
);
BulkActions.displayName = 'BulkActions';
