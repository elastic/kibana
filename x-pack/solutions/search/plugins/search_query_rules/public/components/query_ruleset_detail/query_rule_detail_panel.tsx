/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EuiFlexGroup, EuiFlexItem, EuiButton, EuiText } from '@elastic/eui';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import React from 'react';
import { FormattedMessage } from '@kbn/i18n-react';
import { QueryRulesQueryRule, QueryRulesQueryRuleset } from '@elastic/elasticsearch/lib/api/types';
import { QueryRuleDraggableList } from './query_rule_draggable_list/query_rule_draggable_list';
import { QueryRuleFlyout } from './query_rule_flyout/query_rule_flyout';

interface QueryRuleDetailPanelProps {
  rules: QueryRulesQueryRule[];
  rulesetId: QueryRulesQueryRuleset['ruleset_id'];
  setRules: (rules: QueryRulesQueryRule[]) => void;
}
export const QueryRuleDetailPanel: React.FC<QueryRuleDetailPanelProps> = ({
  rulesetId,
  rules,
  setRules,
}) => {
  const [ruleIdToEdit, setRuleIdToEdit] = React.useState<string | null>(null);
  return (
    <KibanaPageTemplate.Section restrictWidth>
      {ruleIdToEdit !== null && (
        <QueryRuleFlyout
          rulesetId={rulesetId}
          ruleId={ruleIdToEdit}
          onClose={() => setRuleIdToEdit(null)}
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
                      // Logic to add a new rule
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
          <QueryRuleDraggableList
            rules={rules}
            onReorder={setRules}
            onEditRuleFlyoutOpen={(ruleId: string) => setRuleIdToEdit(ruleId)}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </KibanaPageTemplate.Section>
  );
};
