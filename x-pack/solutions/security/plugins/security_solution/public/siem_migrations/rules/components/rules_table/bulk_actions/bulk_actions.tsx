/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { ReprocessFailedRulesButton } from './reprocess_failed_rules';
import { InstallTranslatedButton } from './install_translated';
import { UpdateMissingIndex } from './update_missing_index';

export interface BulkActionsProps {
  isTableLoading: boolean;
  numberOfFailedRules: number;
  numberOfTranslatedRules: number;
  numberOfSelectedRules: number;
  installTranslatedRule?: () => void;
  installSelectedRule?: () => void;
  reprocessFailedRules?: () => void;
  numberOfRulesWithMissingIndex: number;
  setMissingIndexPatternFlyoutOpen: () => void;
  missingIndexPatternSelected: number;
  installTranslatedRulesSelected: number;
  reprocessFailedRulesSelected: number;
}

/**
 * Collection of buttons to perform bulk actions on migration rules within the SIEM Rules Migrations table.
 */
export const BulkActions: React.FC<BulkActionsProps> = React.memo(
  ({
    isTableLoading,
    numberOfFailedRules,
    numberOfTranslatedRules,
    numberOfSelectedRules,
    installTranslatedRule,
    installSelectedRule,
    reprocessFailedRules,
    numberOfRulesWithMissingIndex,
    setMissingIndexPatternFlyoutOpen,
    missingIndexPatternSelected,
    installTranslatedRulesSelected,
    reprocessFailedRulesSelected,
  }) => {
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
