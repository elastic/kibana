/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { useCallback, useState, useMemo } from 'react';
import type { EuiTabbedContentTab } from '@elastic/eui';
import type { RuleResponse } from '../../../../common/api/detection_engine';
import type { RuleMigration } from '../../../../common/siem_migrations/model/rule_migration.gen';
import { MigrationRuleDetailsFlyout } from '../components/rule_details_flyout';

interface UseMigrationRuleDetailsFlyoutParams {
  isLoading?: boolean;
  getMigrationRuleData: (ruleId: string) =>
    | {
        ruleMigration?: RuleMigration;
        matchedPrebuiltRule?: RuleResponse;
      }
    | undefined;
  ruleActionsFactory: (ruleMigration: RuleMigration, closeRulePreview: () => void) => ReactNode;
  extraTabsFactory?: (ruleMigration: RuleMigration) => EuiTabbedContentTab[];
}

interface UseMigrationRuleDetailsFlyoutResult {
  migrationRuleDetailsFlyout: ReactNode;
  openMigrationRuleDetails: (rule: RuleMigration) => void;
  closeMigrationRuleDetails: () => void;
}

export function useMigrationRuleDetailsFlyout({
  isLoading,
  getMigrationRuleData,
  extraTabsFactory,
  ruleActionsFactory,
}: UseMigrationRuleDetailsFlyoutParams): UseMigrationRuleDetailsFlyoutResult {
  const [migrationRuleId, setMigrationRuleId] = useState<string | undefined>();

  const migrationRuleData = useMemo(() => {
    if (migrationRuleId) {
      return getMigrationRuleData(migrationRuleId);
    }
  }, [getMigrationRuleData, migrationRuleId]);

  const openMigrationRuleDetails = useCallback((rule: RuleMigration) => {
    setMigrationRuleId(rule.id);
  }, []);
  const closeMigrationRuleDetails = useCallback(() => setMigrationRuleId(undefined), []);

  const ruleActions = useMemo(
    () =>
      migrationRuleData?.ruleMigration &&
      ruleActionsFactory(migrationRuleData.ruleMigration, closeMigrationRuleDetails),
    [migrationRuleData?.ruleMigration, ruleActionsFactory, closeMigrationRuleDetails]
  );
  const extraTabs = useMemo(
    () =>
      migrationRuleData?.ruleMigration && extraTabsFactory
        ? extraTabsFactory(migrationRuleData.ruleMigration)
        : [],
    [extraTabsFactory, migrationRuleData?.ruleMigration]
  );

  return {
    migrationRuleDetailsFlyout: migrationRuleData?.ruleMigration && (
      <MigrationRuleDetailsFlyout
        ruleMigration={migrationRuleData.ruleMigration}
        matchedPrebuiltRule={migrationRuleData.matchedPrebuiltRule}
        size="l"
        closeFlyout={closeMigrationRuleDetails}
        ruleActions={ruleActions}
        extraTabs={extraTabs}
        isDataLoading={isLoading}
      />
    ),
    openMigrationRuleDetails,
    closeMigrationRuleDetails,
  };
}
