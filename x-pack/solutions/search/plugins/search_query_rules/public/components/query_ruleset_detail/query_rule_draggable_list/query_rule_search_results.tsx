/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { EuiPanel, EuiFlexGroup, EuiFlexItem, useEuiTheme } from '@elastic/eui';
import type { QueryRulesQueryRule } from '@elastic/elasticsearch/lib/api/types';
import type { SearchQueryRulesQueryRule } from '../../../../common/types';
import { QueryRuleDraggableListHeader } from './query_rule_draggable_list_header';
import { QueryRuleListItemContent } from './query_rule_list_item_content';
import { DroppableContainer } from '../styles';

export interface QueryRuleSearchResultsProps {
  rules: SearchQueryRulesQueryRule[];
  unfilteredRules: SearchQueryRulesQueryRule[];
  queryRule: QueryRulesQueryRule;
  rulesetId: string;
  onEditRuleFlyoutOpen: (ruleId: string) => void;
  deleteRule?: (ruleId: string) => void;
  isLastItem?: boolean;
  tourInfo?: {
    title: string;
    content: string;
    tourTargetRef?: React.RefObject<HTMLDivElement>;
  };
}

export const QueryRuleSearchResults: React.FC<QueryRuleSearchResultsProps> = ({
  unfilteredRules,
  onEditRuleFlyoutOpen,
  deleteRule,
  queryRule,
  rulesetId,
}) => {
  return (
    <QueryRuleListItemContent
      rules={unfilteredRules}
      queryRule={queryRule}
      rulesetId={rulesetId}
      onEditRuleFlyoutOpen={onEditRuleFlyoutOpen}
      deleteRule={deleteRule}
    />
  );
};

export interface QueryRuleSearchResultsListProps {
  rules: SearchQueryRulesQueryRule[];
  unfilteredRules: SearchQueryRulesQueryRule[];
  rulesetId: string;
  onEditRuleFlyoutOpen: (ruleId: string) => void;
  deleteRule?: (ruleId: string) => void;
  tourInfo?: {
    title: string;
    content: string;
    tourTargetRef?: React.RefObject<HTMLDivElement>;
  };
}
export const QueryRuleSearchResultsList: React.FC<QueryRuleSearchResultsListProps> = ({
  rules,
  unfilteredRules,
  rulesetId,
  onEditRuleFlyoutOpen,
  deleteRule,
  tourInfo,
}) => {
  const { euiTheme } = useEuiTheme();

  return (
    <>
      <QueryRuleDraggableListHeader tourInfo={tourInfo} />
      <EuiPanel paddingSize="s" hasShadow={false} css={DroppableContainer(euiTheme)}>
        <EuiFlexGroup direction="column" gutterSize="s">
          {rules.map((queryRule, index) => (
            <EuiFlexItem key={queryRule.rule_id} grow={false}>
              <QueryRuleSearchResults
                key={queryRule.rule_id}
                queryRule={queryRule}
                deleteRule={deleteRule}
                rulesetId={rulesetId}
                tourInfo={tourInfo}
                rules={rules}
                unfilteredRules={unfilteredRules}
                onEditRuleFlyoutOpen={onEditRuleFlyoutOpen}
                isLastItem={index === rules.length - 1}
              />
            </EuiFlexItem>
          ))}
        </EuiFlexGroup>
      </EuiPanel>
    </>
  );
};
