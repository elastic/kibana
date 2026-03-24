/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, memo } from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { WithMissingPrivilegesTooltip } from '../../../../common/components/missing_privileges';
import {
  InstallTranslatedButton,
  ReprocessFailedItemsButton,
} from '../../../../common/components/bulk_actions';
import { UpdateMissingIndex } from './update_missing_index';
import { type RuleMigrationRule } from '../../../../../../common/siem_migrations/model/rule_migration.gen';
import type { GetRuleMigrationTranslationStatsResponse } from '../../../../../../common/siem_migrations/model/api/rules/rule_migration.gen';

const ReprocessFailedRulesButton = WithMissingPrivilegesTooltip(
  ReprocessFailedItemsButton,
  'rule',
  'all'
);

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
export const BulkActions: React.FC<BulkActionsProps> = memo(
  ({
    isTableLoading,
    translationStats,
    selectedRules,
    installTranslatedRule,
    installSelectedRule,
    reprocessFailedRules,
    setMissingIndexPatternFlyoutOpen,
  }) => {
    const numberOfFailedRules = translationStats.rules.failed;
    const numberOfTranslatedRules = translationStats.rules.success.installable;
    const numberOfRulesWithMissingIndex = translationStats.rules.success.missing_index;
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
      <EuiFlexGroup
        alignItems="center"
        gutterSize="s"
        responsive={false}
        wrap={true}
        data-test-subj="migrationsBulkActions"
      >
        {showUpdateMissingIndexPatternButton && (
          <UpdateMissingIndex
            setMissingIndexPatternFlyoutOpen={setMissingIndexPatternFlyoutOpen}
            isTableLoading={isTableLoading}
            selectedRules={selectedRules}
            translationStats={translationStats}
          />
        )}
        {showRetryFailedRulesButton && (
          <EuiFlexItem grow={false}>
            <ReprocessFailedRulesButton
              isDisabled={isTableLoading}
              isLoading={isTableLoading}
              numberOfFailedItems={numberOfFailedRules}
              onClick={reprocessFailedRulesCallback}
              selectedItems={selectedRules}
            />
          </EuiFlexItem>
        )}
        {showInstallSelectedRulesButton && (
          <EuiFlexItem grow={false}>
            <InstallTranslatedButton
              disableInstallTranslatedItemsButton={isTableLoading}
              installSelectedItem={installSelectedRulesCallback}
              installTranslatedItems={installTranslatedRulesCallback}
              isLoading={isTableLoading}
              numberOfTranslatedItems={numberOfTranslatedRules}
              selectedItems={selectedRules}
            />
          </EuiFlexItem>
        )}
      </EuiFlexGroup>
    );
  }
);
BulkActions.displayName = 'BulkActions';
