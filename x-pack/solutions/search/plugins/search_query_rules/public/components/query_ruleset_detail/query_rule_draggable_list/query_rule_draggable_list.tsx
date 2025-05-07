/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback } from 'react';

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
  EuiPopover,
  EuiContextMenuPanel,
  EuiContextMenuItem,
} from '@elastic/eui';
import { QueryRulesQueryRule } from '@elastic/elasticsearch/lib/api/types';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { DroppableContainer } from '../styles';
import { QueryRuleDraggableListHeader } from './query_rule_draggable_list_header';
import { QueryRuleDraggableListItemActionTypeBadge } from './query_rule_draggable_item_action_type_badge';
import { QueryRuleDraggableItemCriteriaDisplay } from './query_rule_draggable_item_criteria_display';

export interface QueryRuleDraggableListItemProps {
  queryRule: QueryRulesQueryRule;
  index: number;
  onEditRuleFlyoutOpen: (ruleId: string) => void;
}

export const QueryRuleDraggableListItem: React.FC<QueryRuleDraggableListItemProps> = ({
  index,
  onEditRuleFlyoutOpen,
  queryRule,
}) => {
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);
  const closePopover = useCallback(() => {
    setIsPopoverOpen(false);
  }, []);
  const openPopover = useCallback(() => {
    setIsPopoverOpen(true);
  }, []);
  return (
    <>
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
                          <QueryRuleDraggableItemCriteriaDisplay criteria={queryRule.criteria} />
                        </EuiFlexItem>
                      )}
                    </EuiFlexGroup>
                  </EuiFlexItem>
                  <EuiFlexItem grow={1}>
                    <QueryRuleDraggableListItemActionTypeBadge queryRule={queryRule} />
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiPopover
                      id="queryRuleActionsPopover"
                      button={
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
                            openPopover();
                          }}
                        />
                      }
                      isOpen={isPopoverOpen}
                      closePopover={closePopover}
                      panelPaddingSize="none"
                      anchorPosition="downLeft"
                    >
                      <EuiContextMenuPanel
                        items={[
                          <EuiContextMenuItem
                            key="edit"
                            icon="pencil"
                            data-test-subj="searchQueryRulesQueryRulesetDetailEditButton"
                            onClick={() => {
                              onEditRuleFlyoutOpen(queryRule.rule_id);
                              closePopover();
                            }}
                          >
                            <FormattedMessage
                              id="xpack.search.queryRulesetDetail.draggableList.actions.edit"
                              defaultMessage="Edit"
                            />
                          </EuiContextMenuItem>,
                          <EuiContextMenuItem
                            key="delete"
                            icon="trash"
                            data-test-subj="searchQueryRulesQueryRulesetDetailDeleteButton"
                            onClick={() => {
                              // Logic to handle delete action
                              closePopover();
                            }}
                          >
                            <FormattedMessage
                              id="xpack.search.queryRulesetDetail.draggableList.actions.delete"
                              defaultMessage="Delete"
                            />
                          </EuiContextMenuItem>,
                        ]}
                        className="euiContextMenuPanel--inPopover"
                        data-test-subj="searchQueryRulesQueryRulesetDetailContextMenu"
                      />
                    </EuiPopover>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiPanel>
        )}
      </EuiDraggable>
    </>
  );
};
export interface QueryRuleDraggableListProps {
  rules: QueryRulesQueryRule[];
  onReorder: (queryRules: QueryRulesQueryRule[]) => void;
  onEditRuleFlyoutOpen: (ruleId: string) => void;
}
export const QueryRuleDraggableList: React.FC<QueryRuleDraggableListProps> = ({
  rules,
  onEditRuleFlyoutOpen,
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
            <QueryRuleDraggableListItem
              key={queryRule.rule_id}
              queryRule={queryRule}
              index={index}
              data-test-subj={`searchQueryRulesDraggableItem-${queryRule.rule_id}`}
              onEditRuleFlyoutOpen={onEditRuleFlyoutOpen}
            />
          ))}
        </EuiDroppable>
      </>
    </EuiDragDropContext>
  );
};
