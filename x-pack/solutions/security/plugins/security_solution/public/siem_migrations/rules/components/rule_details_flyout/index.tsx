/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState, useEffect, useCallback } from 'react';
import {
  EuiButtonEmpty,
  EuiTitle,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiSpacer,
  EuiFlexGroup,
  EuiFlexItem,
  useGeneratedHtmlId,
  EuiSkeletonLoading,
  EuiSkeletonTitle,
  EuiSkeletonText,
} from '@elastic/eui';
import type { EuiTabbedContentTab, EuiFlyoutProps } from '@elastic/eui';

import { MigrationTranslationResult } from '../../../../../common/siem_migrations/constants';
import type { RuleMigrationRule } from '../../../../../common/siem_migrations/model/rule_migration.gen';
import { useAppToasts } from '../../../../common/hooks/use_app_toasts';
import {
  RuleOverviewTab,
  useOverviewTabSections,
} from '../../../../detection_engine/rule_management/components/rule_details/rule_overview_tab';
import type { RuleResponse } from '../../../../../common/api/detection_engine/model/rule_schema';

import * as logicI18n from '../../logic/translations';
import * as i18n from './translations';
import {
  DEFAULT_DESCRIPTION_LIST_COLUMN_WIDTHS,
  LARGE_DESCRIPTION_LIST_COLUMN_WIDTHS,
} from './constants';
import { SummaryTab, TranslationTab } from './tabs';
import {
  convertMigrationCustomRuleToSecurityRulePayload,
  getTranslationFieldsFromAnnotations,
  isMigrationCustomRule,
} from '../../../../../common/siem_migrations/rules/utils';
import { useUpdateMigrationRule } from '../../logic/use_update_migration_rule';
import {
  ScrollableFlyoutTabbedContent,
  TabContentPadding,
} from '../../../common/components/details_flyout/utils';
import {
  CLOSE_BUTTON_LABEL,
  SUMMARY_TAB_LABEL,
} from '../../../common/components/details_flyout/translation';
import { UpdatedByLabel } from '../../../common/components/updated_by_label';
import { FlyoutPrevNextNav } from '../../../../common/flyout_prev_next_nav';

import type { FlyoutPrevNextNavigation } from '../../../../common/flyout_prev_next_nav';
export type { FlyoutPrevNextNavigation } from '../../../../common/flyout_prev_next_nav';

interface MigrationRuleDetailsFlyoutContentProps {
  migrationRule: RuleMigrationRule;
  // Partial<RuleResponse>, NOT RuleResponse: the outer memo can hold the custom-rule
  // convert payload (convertMigrationCustomRuleToSecurityRulePayload), which is not a
  // full RuleResponse. Matches RuleOverviewTabProps['rule'].
  ruleDetailsToOverview?: Partial<RuleResponse>;
  matchedPrebuiltRule?: RuleResponse;
  size?: EuiFlyoutProps['size'];
  extraTabs: EuiTabbedContentTab[];
  onTranslationUpdate: (ruleName: string, ruleQuery: string) => Promise<void>;
}

/**
 * Holds all per-rule state (selected tab, overview section expansion). Remounted via
 * `key={migrationRule.id}` by the outer component so navigating between rules behaves
 * like a fresh load: first enabled tab, reset drafts and expanded sections.
 */
const MigrationRuleDetailsFlyoutContent: React.FC<MigrationRuleDetailsFlyoutContentProps> = ({
  migrationRule,
  ruleDetailsToOverview,
  matchedPrebuiltRule,
  size = 'm',
  extraTabs,
  onTranslationUpdate,
}) => {
  const { expandedOverviewSections, toggleOverviewSection } = useOverviewTabSections();

  const translationTab: EuiTabbedContentTab = useMemo(
    () => ({
      id: 'translation',
      name: i18n.TRANSLATION_TAB_LABEL,
      'data-test-subj': 'tabTranslation',
      content: (
        <TabContentPadding>
          <TranslationTab
            migrationRule={migrationRule}
            matchedPrebuiltRule={matchedPrebuiltRule}
            onTranslationUpdate={onTranslationUpdate}
          />
        </TabContentPadding>
      ),
    }),
    [migrationRule, onTranslationUpdate, matchedPrebuiltRule]
  );

  const overviewTab: EuiTabbedContentTab = useMemo(
    () => ({
      id: 'overview',
      name: i18n.OVERVIEW_TAB_LABEL,
      'data-test-subj': 'tabOverview',
      content: (
        <TabContentPadding>
          {ruleDetailsToOverview && (
            <RuleOverviewTab
              rule={ruleDetailsToOverview}
              columnWidths={
                size === 'l'
                  ? LARGE_DESCRIPTION_LIST_COLUMN_WIDTHS
                  : DEFAULT_DESCRIPTION_LIST_COLUMN_WIDTHS
              }
              expandedOverviewSections={expandedOverviewSections}
              toggleOverviewSection={toggleOverviewSection}
            />
          )}
        </TabContentPadding>
      ),
      disabled: migrationRule.translation_result === MigrationTranslationResult.UNTRANSLATABLE,
    }),
    [
      ruleDetailsToOverview,
      size,
      expandedOverviewSections,
      toggleOverviewSection,
      migrationRule.translation_result,
    ]
  );

  const summaryTab: EuiTabbedContentTab = useMemo(
    () => ({
      id: 'summary',
      name: SUMMARY_TAB_LABEL,
      'data-test-subj': 'tabSummary',
      content: (
        <TabContentPadding>
          <SummaryTab migrationRule={migrationRule} />
        </TabContentPadding>
      ),
    }),
    [migrationRule]
  );

  const tabs = useMemo(() => {
    return [...extraTabs, translationTab, overviewTab, summaryTab];
  }, [extraTabs, translationTab, overviewTab, summaryTab]);

  const [selectedTabId, setSelectedTabId] = useState<string>(
    () => (tabs.find((tab) => !tab.disabled) ?? tabs[0]).id
  );
  const selectedTab = tabs.find((tab) => tab.id === selectedTabId) ?? tabs[0];

  useEffect(() => {
    const currentTab = tabs.find((tab) => tab.id === selectedTabId);
    if (!currentTab || currentTab.disabled) {
      // Switch to the first usable tab if the current selection is missing or disabled for this rule
      setSelectedTabId((tabs.find((tab) => !tab.disabled) ?? tabs[0]).id);
    }
  }, [tabs, selectedTabId]);

  const onTabClick = useCallback((tab: EuiTabbedContentTab) => {
    setSelectedTabId(tab.id);
  }, []);

  return (
    <ScrollableFlyoutTabbedContent tabs={tabs} selectedTab={selectedTab} onTabClick={onTabClick} />
  );
};
MigrationRuleDetailsFlyoutContent.displayName = 'MigrationRuleDetailsFlyoutContent';

interface MigrationRuleDetailsFlyoutProps {
  migrationRule: RuleMigrationRule;
  ruleActions?: React.ReactNode;
  matchedPrebuiltRule?: RuleResponse;
  size?: EuiFlyoutProps['size'];
  extraTabs?: EuiTabbedContentTab[];
  isDataLoading?: boolean;
  closeFlyout: () => void;
  navigation: FlyoutPrevNextNavigation;
}

export const MigrationRuleDetailsFlyout: React.FC<MigrationRuleDetailsFlyoutProps> = React.memo(
  ({
    ruleActions,
    migrationRule,
    matchedPrebuiltRule,
    size = 'm',
    extraTabs = [],
    isDataLoading,
    closeFlyout,
    navigation,
  }: MigrationRuleDetailsFlyoutProps) => {
    const { addError } = useAppToasts();

    const { mutateAsync: updateMigrationRule } = useUpdateMigrationRule(migrationRule);

    const [isUpdating, setIsUpdating] = useState(false);
    const isLoading = isDataLoading || isUpdating;

    const handleTranslationUpdate = useCallback(
      async (ruleName: string, ruleQuery: string) => {
        if (isLoading) {
          return;
        }
        setIsUpdating(true);
        try {
          await updateMigrationRule({
            id: migrationRule.id,
            elastic_rule: {
              title: ruleName,
              query: ruleQuery,
              query_language: 'esql',
            },
          });
        } catch (error) {
          addError(error, { title: logicI18n.UPDATE_MIGRATION_RULES_FAILURE });
        } finally {
          setIsUpdating(false);
        }
      },
      [isLoading, updateMigrationRule, migrationRule, addError]
    );

    const ruleDetailsToOverview = useMemo(() => {
      const elasticRule = migrationRule?.elastic_rule;
      if (isMigrationCustomRule(elasticRule)) {
        const translationFields = getTranslationFieldsFromAnnotations(migrationRule.original_rule);
        return convertMigrationCustomRuleToSecurityRulePayload(
          elasticRule,
          false,
          translationFields
        );
      }
      return matchedPrebuiltRule;
    }, [migrationRule, matchedPrebuiltRule]);

    const migrationsRulesFlyoutTitleId = useGeneratedHtmlId({
      prefix: 'migrationRulesFlyoutTitle',
    });

    return (
      <EuiFlyout
        size={size}
        onClose={closeFlyout}
        key="migrations-rules-flyout"
        paddingSize="l"
        data-test-subj="ruleMigrationDetailsFlyout"
        aria-labelledby={migrationsRulesFlyoutTitleId}
        ownFocus
      >
        <EuiFlyoutHeader>
          <EuiSpacer size="s" />
          <EuiFlexGroup gutterSize="s" responsive={false} alignItems="center" direction="row">
            <EuiFlexItem grow={false}>
              <FlyoutPrevNextNav navigation={navigation} isDisabled={!!isLoading} />
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiTitle size="m" data-test-subj="detailsFlyoutTitle">
                <h2 id={migrationsRulesFlyoutTitleId}>
                  {ruleDetailsToOverview?.name ??
                    migrationRule.original_rule.title ??
                    i18n.UNKNOWN_MIGRATION_RULE_TITLE}
                </h2>
              </EuiTitle>
            </EuiFlexItem>
          </EuiFlexGroup>
          <EuiSpacer size="s" />
          <UpdatedByLabel
            updatedBy={migrationRule.updated_by ?? migrationRule.created_by}
            updatedAt={migrationRule.updated_at ?? migrationRule['@timestamp']}
          />
        </EuiFlyoutHeader>
        <EuiFlyoutBody
          // EUI TODO: We need to set transform to 'none' to avoid drag/drop issues in the flyout caused by the
          // `transform: translateZ(0)` workaround for the mask image bug in Chromium.
          // https://github.com/elastic/eui/pull/7855.
          // We need to remove this workaround once it is fixed in EUI:
          // https://github.com/elastic/eui/issues/8269.
          css={{ '.euiFlyoutBody__overflow': { transform: 'none' } }}
        >
          <EuiSkeletonLoading
            isLoading={isLoading}
            loadingContent={
              <>
                <EuiSkeletonTitle />
                <EuiSkeletonText />
              </>
            }
            loadedContent={
              <MigrationRuleDetailsFlyoutContent
                key={migrationRule.id}
                migrationRule={migrationRule}
                ruleDetailsToOverview={ruleDetailsToOverview}
                matchedPrebuiltRule={matchedPrebuiltRule}
                size={size}
                extraTabs={extraTabs}
                onTranslationUpdate={handleTranslationUpdate}
              />
            }
          />
        </EuiFlyoutBody>
        <EuiFlyoutFooter>
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                onClick={closeFlyout}
                flush="left"
                data-test-subj="detailsFlyoutCloseButton"
                aria-label={CLOSE_BUTTON_LABEL}
              >
                {CLOSE_BUTTON_LABEL}
              </EuiButtonEmpty>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>{ruleActions}</EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlyoutFooter>
      </EuiFlyout>
    );
  }
);
MigrationRuleDetailsFlyout.displayName = 'MigrationRuleDetailsFlyout';
