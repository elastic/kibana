/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect } from 'react';

import { QueryRulesQueryRuleset } from '@elastic/elasticsearch/lib/api/types';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { QueryRuleDraggableList } from './query_rule_draggable_list/query_rule_draggable_list';
import { QueryRuleFlyout } from './query_rule_flyout/query_rule_flyout';
import { useGenerateRuleId } from '../../hooks/use_generate_rule_id';
import { SearchQueryRulesQueryRule } from '../../types';
import { RulesetDetailEmptyPrompt } from '../empty_prompt/ruleset_detail_empty_prompt';
import { useUsageTracker } from '../../hooks/use_usage_tracker';
import { AnalyticsEvents } from '../../analytics/constants';

interface QueryRuleDetailPanelProps {
  rules: SearchQueryRulesQueryRule[];
  setNewRules: (newRules: SearchQueryRulesQueryRule[]) => void;
  setIsFormDirty?: (isDirty: boolean) => void;
  updateRule: (updatedRule: SearchQueryRulesQueryRule) => void;
  addNewRule: (newRule: SearchQueryRulesQueryRule) => void;
  deleteRule?: (ruleId: string) => void;
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
  setIsFormDirty,
  setNewRules,
  updateRule,
  addNewRule,
  deleteRule,
  createMode = false,
}) => {
  const [ruleIdToEdit, setRuleIdToEdit] = React.useState<string | null>(null);
  const [flyoutMode, setFlyoutMode] = React.useState<'create' | 'edit'>('edit');

  const useTracker = useUsageTracker();

  const { mutate: generateRuleId } = useGenerateRuleId(rulesetId);
  useEffect(() => {
    if (createMode && rules.length === 0) {
      generateRuleId(undefined, {
        onSuccess: (newRuleId) => {
          setFlyoutMode('create');
          setRuleIdToEdit(newRuleId);
        },
      });
    }
  }, [createMode, rules.length, addNewRule, generateRuleId, rulesetId]);

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
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          {rules.length === 0 && <RulesetDetailEmptyPrompt />}
          {rules.length > 0 && (
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
        </EuiFlexItem>
      </EuiFlexGroup>
    </KibanaPageTemplate.Section>
  );
};
