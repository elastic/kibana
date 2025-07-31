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
import type { RuleMigrationRule } from '../../../../common/siem_migrations/model/rule_migration.gen';
import { MigrationRuleDetailsFlyout } from '../components/rule_details_flyout';

interface UseMigrationRuleDetailsFlyoutParams {
  isLoading?: boolean;
  getMigrationRuleData: (ruleId: string) =>
    | {
        migrationRule?: RuleMigrationRule;
        matchedPrebuiltRule?: RuleResponse;
      }
    | undefined;
  ruleActionsFactory: (migrationRule: RuleMigrationRule, closeRulePreview: () => void) => ReactNode;
  extraTabsFactory?: (migrationRule: RuleMigrationRule) => EuiTabbedContentTab[];
}

interface UseMigrationRuleDetailsFlyoutResult {
  migrationRuleDetailsFlyout: ReactNode;
  openMigrationRuleDetails: (rule: RuleMigrationRule) => void;
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

  const openMigrationRuleDetails = useCallback((rule: RuleMigrationRule) => {
    setMigrationRuleId(rule.id);
  }, []);
  const closeMigrationRuleDetails = useCallback(() => setMigrationRuleId(undefined), []);

  const ruleActions = useMemo(
    () =>
      migrationRuleData?.migrationRule &&
      ruleActionsFactory(migrationRuleData.migrationRule, closeMigrationRuleDetails),
    [migrationRuleData?.migrationRule, ruleActionsFactory, closeMigrationRuleDetails]
  );
  const extraTabs = useMemo(
    () =>
      migrationRuleData?.migrationRule && extraTabsFactory
        ? extraTabsFactory(migrationRuleData.migrationRule)
        : [],
    [extraTabsFactory, migrationRuleData?.migrationRule]
  );

  return {
    migrationRuleDetailsFlyout: migrationRuleData?.migrationRule && (
      <MigrationRuleDetailsFlyout
        migrationRule={migrationRuleData.migrationRule}
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
