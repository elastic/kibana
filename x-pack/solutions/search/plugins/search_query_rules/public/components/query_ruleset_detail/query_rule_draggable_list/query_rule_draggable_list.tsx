/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiDragDropContext,
  EuiDroppable,
  EuiDraggable,
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiIcon,
  EuiText,
  EuiButtonIcon,
  useEuiTheme,
  euiDragDropReorder,
} from '@elastic/eui';
import { QueryRulesQueryRule } from '@elastic/elasticsearch/lib/api/types';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { DroppableContainer } from '../styles';
import { QueryRuleDraggableListHeader } from './query_rule_draggable_list_header';
import { QueryRuleDraggableListItemActionTypeBadge } from './query_rule_draggable_item_action_type_badge';
import { QueryRuleDraggableItemCriteriaDisplay } from './query_rule_draggable_item_criteria_display';

export interface QueryRuleDraggableListProps {
  rules: QueryRulesQueryRule[];
  onReorder: (queryRules: QueryRulesQueryRule[]) => void;
}
export const QueryRuleDraggableList: React.FC<QueryRuleDraggableListProps> = ({
  rules,
  onReorder,
}) => {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiDragDropContext
      onDragEnd={({ source, destination }) => {
        if (source && destination) {
          const items = euiDragDropReorder(rules, source.index, destination.index);
          onReorder(items);
        }
      }}
    >
      <>
        <QueryRuleDraggableListHeader />
        <EuiDroppable
          droppableId="queryRuleListDropabble"
          spacing="m"
          css={DroppableContainer(euiTheme)}
          data-test-subj="searchQueryRulesDroppable"
        >
          {rules.map((queryRule, index) => (
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
                <EuiPanel paddingSize="s" hasShadow={false}>
                  <EuiFlexGroup alignItems="center" gutterSize="s">
                    <EuiFlexItem grow={false}>
                      <EuiPanel
                        color="transparent"
                        paddingSize="s"
                        {...provided.dragHandleProps}
                        aria-label="Drag Handle"
                      >
                        <EuiIcon type="grab" />
                      </EuiPanel>
                    </EuiFlexItem>
                    <EuiFlexItem grow={true}>
                      <EuiFlexGroup responsive={false} alignItems="center">
                        <EuiFlexItem grow={7}>
                          <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
                            {Array.isArray(queryRule.criteria) ? (
                              <>
                                {queryRule.criteria.slice(0, 3).map((criteria, criteriaIndex) => (
                                  <EuiFlexItem key={criteria.type + criteriaIndex} grow={false}>
                                    <QueryRuleDraggableItemCriteriaDisplay criteria={criteria} />
                                  </EuiFlexItem>
                                ))}
                                {queryRule.criteria.length > 3 && (
                                  <EuiFlexItem grow={false}>
                                    <EuiText size="s">
                                      <FormattedMessage
                                        id="xpack.search.queryRulesetDetail.draggableList.queryRulesCriteriaMoreLabel"
                                        defaultMessage="+{count} more"
                                        values={{ count: queryRule.criteria.length - 3 }}
                                      />
                                    </EuiText>
                                  </EuiFlexItem>
                                )}
                              </>
                            ) : (
                              <EuiFlexItem grow={false}>
                                <QueryRuleDraggableItemCriteriaDisplay
                                  criteria={queryRule.criteria}
                                />
                              </EuiFlexItem>
                            )}
                          </EuiFlexGroup>
                        </EuiFlexItem>
                        <EuiFlexItem grow={1}>
                          <QueryRuleDraggableListItemActionTypeBadge queryRule={queryRule} />
                        </EuiFlexItem>
                        <EuiFlexItem grow={false}>
                          <EuiButtonIcon
                            aria-label={i18n.translate(
                              'xpack.search.queryRulesetDetail.draggableList.actionsButton.aria.label',
                              {
                                defaultMessage: 'Click to reach actions menu for rule {ruleId}',
                                values: {
                                  ruleId: queryRule.rule_id,
                                },
                              }
                            )}
                            data-test-subj="searchQueryRulesQueryRulesetDetailButton"
                            iconType="boxesHorizontal"
                            color="text"
                            onClick={() => {
                              // Logic to open actions menu
                            }}
                          />
                        </EuiFlexItem>
                      </EuiFlexGroup>
                    </EuiFlexItem>
                  </EuiFlexGroup>
                </EuiPanel>
              )}
            </EuiDraggable>
          ))}
        </EuiDroppable>
      </>
    </EuiDragDropContext>
  );
};
