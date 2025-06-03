/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import { QueryRulesQueryRuleset } from '@elastic/elasticsearch/lib/api/types';
import { EuiButton, EuiFlexGroup, EuiFlexItem, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { KibanaPageTemplate } from '@kbn/shared-ux-page-kibana-template';
import { QueryRuleDraggableList } from './query_rule_draggable_list/query_rule_draggable_list';
import { QueryRuleFlyout } from './query_rule_flyout/query_rule_flyout';
import { useQueryRulesetDetailState } from './use_query_ruleset_detail_state';

interface QueryRuleDetailPanelProps {
  rulesetId: QueryRulesQueryRuleset['ruleset_id'];
  tourInfo?: {
    title: string;
    content: string;
    tourTargetRef?: React.RefObject<HTMLDivElement>;
  };
}
export const QueryRuleDetailPanel: React.FC<QueryRuleDetailPanelProps> = ({
  rulesetId,
  tourInfo,
}) => {
  const { rules, setNewRules, updateRule } = useQueryRulesetDetailState({ rulesetId });
  const [ruleIdToEdit, setRuleIdToEdit] = React.useState<string | null>(null);

  return (
    <KibanaPageTemplate.Section restrictWidth>
      {ruleIdToEdit !== null && (
        <QueryRuleFlyout
          rules={rules}
          rulesetId={rulesetId}
          ruleId={ruleIdToEdit}
          onSave={(rule) => {
            updateRule(rule);
            setRuleIdToEdit(null);
          }}
          onClose={() => {
            setRuleIdToEdit(null);
          }}
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
                      // TODO: Logic to add a new rule
                      // This opens the query rule flyout in create mode.
                      // ruleid cannot be null or empty when creating a new rule. Add logic to generate a rule id.
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
            rulesetId={rulesetId}
            onReorder={(newRules) => setNewRules(newRules)}
            onEditRuleFlyoutOpen={(ruleId: string) => setRuleIdToEdit(ruleId)}
            tourInfo={tourInfo}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </KibanaPageTemplate.Section>
  );
};
