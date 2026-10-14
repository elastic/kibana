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
import type { FlyoutPrevNextNavigation } from '../../../common/flyout_prev_next_nav';
import { useFlyoutPrevNextNav } from '../../../common/flyout_prev_next_nav';
import { isMigrationItemNavigableWithFlyout } from '../../common/utils';

interface UseMigrationRuleDetailsFlyoutParams {
  isLoading?: boolean;
  /**
   * Ordered rules of the currently loaded table page, used for prev/next navigation.
   * Must be the same array that backs `getMigrationRuleData`, so that navigation
   * targets always resolve. Failed rules have no details flyout and are skipped
   * during navigation.
   */
  migrationRules: RuleMigrationRule[];
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
  /** Id of the rule currently opened in the flyout, if any */
  openedMigrationRuleId?: string;
  /**
   * Navigation state for the opened rule within the loaded page. Boundary flags are
   * computed ONLY here. The same object is passed to the flyout.
   */
  navigation: FlyoutPrevNextNavigation;
}

export function useMigrationRuleDetailsFlyout({
  isLoading,
  migrationRules,
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

  const navigation = useFlyoutPrevNextNav({
    items: migrationRules,
    openedItemId: migrationRuleId,
    isNavigable: isMigrationItemNavigableWithFlyout,
    onNavigate: openMigrationRuleDetails,
  });

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

  return useMemo(
    () => ({
      migrationRuleDetailsFlyout: migrationRuleData?.migrationRule && (
        <MigrationRuleDetailsFlyout
          migrationRule={migrationRuleData.migrationRule}
          matchedPrebuiltRule={migrationRuleData.matchedPrebuiltRule}
          size="l"
          closeFlyout={closeMigrationRuleDetails}
          ruleActions={ruleActions}
          extraTabs={extraTabs}
          isDataLoading={isLoading}
          navigation={navigation}
        />
      ),
      openMigrationRuleDetails,
      closeMigrationRuleDetails,
      openedMigrationRuleId: migrationRuleData?.migrationRule ? migrationRuleId : undefined,
      navigation,
    }),
    [
      migrationRuleData?.migrationRule,
      migrationRuleData?.matchedPrebuiltRule,
      closeMigrationRuleDetails,
      ruleActions,
      extraTabs,
      isLoading,
      navigation,
      openMigrationRuleDetails,
      migrationRuleId,
    ]
  );
}
