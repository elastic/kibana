/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { ReprocessFailedRulesButton } from './reprocess_failed_rules';
import { InstallTranslatedButton } from './install_translated';
import { UpdateMissingIndex } from './update_missing_index';
import { type RuleMigrationRule } from '../../../../../../common/siem_migrations/model/rule_migration.gen';
import type { GetRuleMigrationTranslationStatsResponse } from '../../../../../../common/siem_migrations/model/api/rules/rule_migration.gen';
import {
  RuleTranslationResult,
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
    const installTranslatedRulesSelected = useMemo(
      () =>
        selectedRules.filter((rule) => rule.translation_result === RuleTranslationResult.FULL)
          .length,
      [selectedRules]
    );
    const reprocessFailedRulesSelected = useMemo(
      () => selectedRules.filter((rule) => rule.status === SiemMigrationStatus.FAILED).length,
      [selectedRules]
    );
    const showInstallSelectedRulesButton = numberOfTranslatedRules > 0;
    const showRetryFailedRulesButton = numberOfFailedRules > 0;
    const showUpdateMissingIndexPatternButton = numberOfRulesWithMissingIndex > 0;
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
              onClick={() => reprocessFailedRules?.()}
              isDisabled={isTableLoading}
              isLoading={isTableLoading}
              numberOfFailedRules={numberOfFailedRules}
              reprocessFailedRulesSelected={reprocessFailedRulesSelected}
            />
          </EuiFlexItem>
        )}
        {showInstallSelectedRulesButton && (
          <EuiFlexItem grow={false}>
            <InstallTranslatedButton
              installTranslatedRule={() => installTranslatedRule?.()}
              isTableLoading={isTableLoading}
              numberOfTranslatedRules={numberOfTranslatedRules}
              numberOfSelectedRules={numberOfSelectedRules}
              disableInstallTranslatedRulesButton={isTableLoading}
              installSelectedRule={() => installSelectedRule?.()}
              installTranslatedRulesSelected={installTranslatedRulesSelected}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    );
  }
);
BulkActions.displayName = 'BulkActions';
