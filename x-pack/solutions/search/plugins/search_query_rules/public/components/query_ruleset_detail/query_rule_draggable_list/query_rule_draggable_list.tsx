/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useRef } from 'react';
import {
  EuiDragDropContext,
  EuiDroppable,
  EuiDraggable,
  useEuiTheme,
  euiDragDropReorder,
} from '@elastic/eui';
import type { QueryRulesQueryRule } from '@elastic/elasticsearch/lib/api/types';
import { useUsageTracker } from '../../../hooks/use_usage_tracker';
import type { SearchQueryRulesQueryRule } from '../../../../common/types';
import { DroppableContainer } from '../styles';
import { QueryRuleDraggableListHeader } from './query_rule_draggable_list_header';
import { QueryRuleListItemContent } from './query_rule_list_item_content';
import { AnalyticsEvents } from '../../../analytics/constants';

export interface QueryRuleDraggableListItemProps {
  rules: SearchQueryRulesQueryRule[];
  queryRule: QueryRulesQueryRule;
  rulesetId: string;
  index: number;
  onEditRuleFlyoutOpen: (ruleId: string) => void;
  deleteRule?: (ruleId: string) => void;
  isLastItem?: boolean;
  tourInfo?: {
    title: string;
    content: string;
    tourTargetRef?: React.RefObject<HTMLDivElement>;
  };
}

export const QueryRuleDraggableListItem: React.FC<QueryRuleDraggableListItemProps> = ({
  index,
  rulesetId,
  rules,
  onEditRuleFlyoutOpen,
  deleteRule,
  queryRule,
  tourInfo,
  isLastItem = false,
}) => {
  const localTourTargetRef = useRef<HTMLDivElement>(null);
  const effectiveRef = tourInfo?.tourTargetRef || localTourTargetRef;

  return (
    <EuiDraggable
      spacing="m"
      key={queryRule.rule_id}
      index={index}
      draggableId={queryRule.rule_id}
      customDragHandle={true}
      hasInteractiveChildren={true}
      data-test-subj="searchQueryRulesDraggableItem"
    >
      {(provided) => (
        <QueryRuleListItemContent
          rules={rules}
          queryRule={queryRule}
          rulesetId={rulesetId}
          onEditRuleFlyoutOpen={onEditRuleFlyoutOpen}
          deleteRule={deleteRule}
          order={index + 1}
          isDraggable={true}
          dragHandleProps={provided.dragHandleProps}
          tourTargetRef={isLastItem ? effectiveRef : undefined}
        />
      )}
    </EuiDraggable>
  );
};

export interface QueryRuleDraggableListProps {
  rules: SearchQueryRulesQueryRule[];
  rulesetId: string;
  onReorder: (queryRules: SearchQueryRulesQueryRule[]) => void;
  onEditRuleFlyoutOpen: (ruleId: string) => void;
  deleteRule?: (ruleId: string) => void;
  tourInfo?: {
    title: string;
    content: string;
    tourTargetRef?: React.RefObject<HTMLDivElement>;
  };
}

export const QueryRuleDraggableList: React.FC<QueryRuleDraggableListProps> = ({
  rules,
  rulesetId,
  onEditRuleFlyoutOpen,
  deleteRule,
  onReorder,
  tourInfo,
}) => {
  const { euiTheme } = useEuiTheme();
  const useTracker = useUsageTracker();

  return (
    <EuiDragDropContext
      onDragEnd={({ source, destination }) => {
        if (source && destination) {
          useTracker?.click(AnalyticsEvents.rulesReordered);
          const items = euiDragDropReorder(rules, source.index, destination.index);
          onReorder(items);
        }
      }}
    >
      <>
        <QueryRuleDraggableListHeader tourInfo={tourInfo} />
        <EuiDroppable
          droppableId="queryRuleListDropabble"
          spacing="m"
          css={DroppableContainer(euiTheme)}
          data-test-subj="searchQueryRulesDroppable"
        >
          {rules.map((queryRule, index) => (
            <QueryRuleDraggableListItem
              key={queryRule.rule_id}
              queryRule={queryRule}
              deleteRule={deleteRule}
              rulesetId={rulesetId}
              tourInfo={tourInfo}
              index={index}
              rules={rules}
              data-test-subj={`searchQueryRulesDraggableItem-${queryRule.rule_id}`}
              onEditRuleFlyoutOpen={onEditRuleFlyoutOpen}
              isLastItem={index === rules.length - 1}
            />
          ))}
        </EuiDroppable>
      </>
    </EuiDragDropContext>
  );
};
