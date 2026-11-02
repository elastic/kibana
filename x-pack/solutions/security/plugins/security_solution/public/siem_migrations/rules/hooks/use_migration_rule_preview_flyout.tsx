/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ReactNode } from 'react';
import React, { useCallback, useEffect, useState, useMemo } from 'react';
import type { EuiTabbedContentTab } from '@elastic/eui';
import type { RuleResponse } from '../../../../common/api/detection_engine';
import type { RuleMigrationRule } from '../../../../common/siem_migrations/model/rule_migration.gen';
import { MigrationRuleDetailsFlyout } from '../components/rule_details_flyout';
import type { FlyoutPrevNextNavigation } from '../../../common/flyout_prev_next_nav';
import { useFlyoutPrevNextNav } from '../../../common/flyout_prev_next_nav';
import { isMigrationItemNavigableWithFlyout } from '../../common/utils';
import { useGetMigrationRules } from '../logic/use_get_migration_rules';

interface UseMigrationRuleDetailsFlyoutParams {
  migrationId: string;
  isLoading?: boolean;
  /**
   * Ordered rules of the currently loaded table page. Used for prev/next navigation and as the
   * initial data of the opened rule. Failed rules have no details flyout and are skipped during
   * navigation.
   */
  migrationRules: RuleMigrationRule[];
  getMatchedPrebuiltRule: (migrationRule: RuleMigrationRule) => RuleResponse | undefined;
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
  migrationId,
  isLoading,
  migrationRules,
  getMatchedPrebuiltRule,
  extraTabsFactory,
  ruleActionsFactory,
}: UseMigrationRuleDetailsFlyoutParams): UseMigrationRuleDetailsFlyoutResult {
  const [migrationRuleId, setMigrationRuleId] = useState<string | undefined>();

  // The opened rule is fetched on its own, so it stays available when a table refresh
  // moves it to another page. The table row seeds the query to avoid a request on open.
  const pageMigrationRule = migrationRules.find((rule) => rule.id === migrationRuleId);
  const { data: openedRuleData } = useGetMigrationRules(
    { migrationId, filters: { ids: migrationRuleId ? [migrationRuleId] : [] } },
    {
      enabled: migrationRuleId != null,
      initialData: pageMigrationRule
        ? { migrationRules: [pageMigrationRule], total: 1 }
        : undefined,
    }
  );
  const migrationRule = migrationRuleId
    ? openedRuleData?.migrationRules.find((rule) => rule.id === migrationRuleId)
    : undefined;
  const matchedPrebuiltRule = useMemo(
    () => migrationRule && getMatchedPrebuiltRule(migrationRule),
    [getMatchedPrebuiltRule, migrationRule]
  );

  const openMigrationRuleDetails = useCallback((rule: RuleMigrationRule) => {
    setMigrationRuleId(rule.id);
  }, []);
  const closeMigrationRuleDetails = useCallback(() => setMigrationRuleId(undefined), []);

  // A rule that no longer exists cannot be shown; forget it so it is not reopened later
  const isOpenedRuleMissing = openedRuleData != null && migrationRule == null;
  useEffect(() => {
    if (isOpenedRuleMissing) {
      closeMigrationRuleDetails();
    }
  }, [isOpenedRuleMissing, closeMigrationRuleDetails]);

  const navigation = useFlyoutPrevNextNav({
    items: migrationRules,
    openedItemId: migrationRuleId,
    isNavigable: isMigrationItemNavigableWithFlyout,
    onNavigate: openMigrationRuleDetails,
  });

  const ruleActions = useMemo(
    () => migrationRule && ruleActionsFactory(migrationRule, closeMigrationRuleDetails),
    [migrationRule, ruleActionsFactory, closeMigrationRuleDetails]
  );
  const extraTabs = useMemo(
    () => (migrationRule && extraTabsFactory ? extraTabsFactory(migrationRule) : []),
    [extraTabsFactory, migrationRule]
  );

  return useMemo(
    () => ({
      migrationRuleDetailsFlyout: migrationRule && (
        <MigrationRuleDetailsFlyout
          migrationRule={migrationRule}
          matchedPrebuiltRule={matchedPrebuiltRule}
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
      openedMigrationRuleId: migrationRule ? migrationRuleId : undefined,
      navigation,
    }),
    [
      migrationRule,
      matchedPrebuiltRule,
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
