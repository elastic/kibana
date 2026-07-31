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
import type { MigrationFlyoutNavigation } from '../../common/components/flyout_nav';
import { useMigrationFlyoutNav } from '../../common/components/flyout_nav';

interface UseMigrationRuleDetailsFlyoutParams {
  isLoading?: boolean;
  /**
   * Ordered rules of the currently loaded table page, used for prev/next navigation.
   * Must be the same array that backs `getMigrationRuleData`, so that navigation
   * targets always resolve.
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
  navigation: MigrationFlyoutNavigation;
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

  const openedRuleIndex = useMemo(
    () => (migrationRuleId ? migrationRules.findIndex((rule) => rule.id === migrationRuleId) : -1),
    [migrationRules, migrationRuleId]
  );

  const goToRuleAtIndex = useCallback(
    (index: number) => {
      const rule = migrationRules[index];
      if (rule) {
        setMigrationRuleId(rule.id);
      }
    },
    [migrationRules]
  );

  const navigation = useMigrationFlyoutNav({
    // openedRuleIndex is -1 when the opened rule is not in the loaded page. Normalizing
    // totalItems to 0 in that case keeps both arrows disabled (hasPrevious/hasNext false).
    currentIdx: openedRuleIndex === -1 ? 0 : openedRuleIndex,
    totalItems: openedRuleIndex === -1 ? 0 : migrationRules.length,
    onNextCallback: goToRuleAtIndex,
    onPrevCallback: goToRuleAtIndex,
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
        navigation={navigation}
      />
    ),
    openMigrationRuleDetails,
    closeMigrationRuleDetails,
    openedMigrationRuleId: migrationRuleData?.migrationRule ? migrationRuleId : undefined,
    navigation,
  };
}
