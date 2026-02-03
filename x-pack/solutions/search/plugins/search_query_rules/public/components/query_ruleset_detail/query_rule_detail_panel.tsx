/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import type { QueryRulesQueryRuleset } from '@elastic/elasticsearch/lib/api/types';
import { EuiButton, EuiFieldSearch, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { i18n } from '@kbn/i18n';
import { QueryRuleDraggableList } from './query_rule_draggable_list/query_rule_draggable_list';
import { QueryRuleFlyout } from './query_rule_flyout/query_rule_flyout';
import { useGenerateRuleId } from '../../hooks/use_generate_rule_id';
import type { SearchQueryRulesQueryRule } from '../../types';
import { RulesetDetailEmptyPrompt } from '../empty_prompt/ruleset_detail_empty_prompt';
import { useUsageTracker } from '../../hooks/use_usage_tracker';
import { AnalyticsEvents } from '../../analytics/constants';
import { QueryRuleSearchResultsList } from './query_rule_draggable_list/query_rule_search_results';

interface QueryRuleDetailPanelProps {
  rules: SearchQueryRulesQueryRule[];
  unfilteredRules: SearchQueryRulesQueryRule[];
  setNewRules: (newRules: SearchQueryRulesQueryRule[]) => void;
  setIsFormDirty?: (isDirty: boolean) => void;
  updateRule: (updatedRule: SearchQueryRulesQueryRule) => void;
  addNewRule: (newRule: SearchQueryRulesQueryRule) => void;
  deleteRule?: (ruleId: string) => void;
  searchFilter?: string;
  setSearchFilter?: (searchFilter: string) => void;
  rulesetId: QueryRulesQueryRuleset['ruleset_id'];
  tourInfo?: {
    title: string;
    content: string;
    tourTargetRef?: React.RefObject<HTMLDivElement>;
  };
  createMode?: boolean;
}
export const QueryRuleDetailPanel: React.FC<QueryRuleDetailPanelProps> = ({
  rulesetId,
  tourInfo,
  rules,
  unfilteredRules,
  setIsFormDirty,
  setNewRules,
  updateRule,
  addNewRule,
  deleteRule,
  searchFilter = '',
  setSearchFilter = () => {},
  createMode = false,
}) => {
  const [isFirstRender, setIsFirstRender] = React.useState<boolean>(true);
  const [ruleIdToEdit, setRuleIdToEdit] = React.useState<string | null>(null);
  const [flyoutMode, setFlyoutMode] = React.useState<'create' | 'edit'>('edit');
  const hasSearchFilter = searchFilter.trim() !== '';

  const useTracker = useUsageTracker();

  const { mutate: generateRuleId } = useGenerateRuleId(rulesetId);
  useEffect(() => {
    if (!isFirstRender) return;
    setIsFirstRender(false);
    if (createMode && rules.length === 0) {
      generateRuleId(undefined, {
        onSuccess: (newRuleId) => {
          setFlyoutMode('create');
          setRuleIdToEdit(newRuleId);
        },
      });
    }
  }, [isFirstRender, createMode, rules.length, generateRuleId, rulesetId]);

  return (
    <KibanaPageTemplate.Section restrictWidth>
      {ruleIdToEdit !== null && (
        <QueryRuleFlyout
          rules={rules}
          rulesetId={rulesetId}
          ruleId={ruleIdToEdit}
          onSave={(rule) => {
            if (flyoutMode === 'create') {
              addNewRule(rule);
            } else {
              updateRule(rule);
            }
            setRuleIdToEdit(null);
            setFlyoutMode('edit');
          }}
          onClose={() => {
            setRuleIdToEdit(null);
            setFlyoutMode('edit');
          }}
          setIsFormDirty={setIsFormDirty}
          createMode={flyoutMode === 'create'}
        />
      )}

      <EuiFlexGroup justifyContent="spaceBetween" direction="column">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiFlexGroup alignItems="center">
                <EuiFlexItem>
                  <EuiButton
                    iconType="plusInCircle"
                    color="primary"
                    data-test-subj="queryRulesetDetailAddRuleButton"
                    onClick={() => {
                      useTracker?.click(AnalyticsEvents.addRuleClicked);
                      generateRuleId(undefined, {
                        onSuccess: (newRuleId) => {
                          setFlyoutMode('create');
                          setRuleIdToEdit(newRuleId);
                        },
                      });
                    }}
                  >
                    <FormattedMessage
                      id="xpack.queryRules.queryRulesetDetail.addRuleButton"
                      defaultMessage="Add rule"
                    />
                  </EuiButton>
                </EuiFlexItem>
                <EuiFlexItem>
                  <EuiText>
                    <FormattedMessage
                      id="xpack.queryRules.queryRulesetDetail.ruleCount"
                      defaultMessage="{ruleCount, plural, one {# rule} other {# rules}}"
                      values={{ ruleCount: rules.length }}
                      data-test-subj="queryRulesetDetailRuleCount"
                    />
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiFlexItem>
                <EuiFieldSearch
                  data-test-subj="queryRulesetDetailSearchFilter"
                  placeholder={i18n.translate(
                    'xpack.queryRules.queryRulesetDetail.searchFilterPlaceholder',
                    {
                      defaultMessage: 'Search rules...',
                    }
                  )}
                  value={searchFilter}
                  onChange={(e) => {
                    setSearchFilter(e.target.value);
                    if (setIsFormDirty) {
                      setIsFormDirty(true);
                    }
                  }}
                  fullWidth
                  incremental={true}
                  aria-label={i18n.translate(
                    'xpack.queryRules.queryRulesetDetail.searchFilterAriaLabel',
                    {
                      defaultMessage: 'Search rules by ID, criteria, or actions',
                    }
                  )}
                />
              </EuiFlexItem>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          {rules.length === 0 && <RulesetDetailEmptyPrompt isFilter={hasSearchFilter} />}
          {rules.length > 0 && !hasSearchFilter && (
            <QueryRuleDraggableList
              rules={rules}
              rulesetId={rulesetId}
              onReorder={(newRules) => {
                setNewRules(newRules);
                if (setIsFormDirty) {
                  setIsFormDirty(true);
                }
              }}
              onEditRuleFlyoutOpen={(ruleId: string) => {
                setFlyoutMode('edit');
                setRuleIdToEdit(ruleId);
              }}
              tourInfo={tourInfo}
              deleteRule={(ruleId: string) => {
                if (setIsFormDirty) {
                  setIsFormDirty(true);
                }
                deleteRule?.(ruleId);
              }}
            />
          )}
          {rules.length > 0 && hasSearchFilter && (
            <QueryRuleSearchResultsList
              rules={rules}
              unfilteredRules={unfilteredRules}
              rulesetId={rulesetId}
              onEditRuleFlyoutOpen={(ruleId: string) => {
                setFlyoutMode('edit');
                setRuleIdToEdit(ruleId);
              }}
            />
          )}
        </EuiFlexItem>
      </EuiFlexGroup>
    </KibanaPageTemplate.Section>
  );
};
