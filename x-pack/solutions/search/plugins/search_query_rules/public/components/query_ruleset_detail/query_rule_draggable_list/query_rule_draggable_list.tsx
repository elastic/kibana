/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useRef, useState } from 'react';
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
  EuiNotificationBadge,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { QueryRulesQueryRule } from '@elastic/elasticsearch/lib/api/types';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { useUsageTracker } from '../../../hooks/use_usage_tracker';
import { SearchQueryRulesQueryRule } from '../../../../common/types';
import { DroppableContainer } from '../styles';
import { QueryRuleDraggableListHeader } from './query_rule_draggable_list_header';
import { QueryRuleDraggableListItemActionTypeBadge } from './query_rule_draggable_item_action_type_badge';
import { QueryRuleDraggableItemCriteriaDisplay } from './query_rule_draggable_item_criteria_display';
import { DeleteRulesetRuleModal } from './delete_ruleset_rule_modal';
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
  const { euiTheme } = useEuiTheme();
  const useTracker = useUsageTracker();
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);
  const localTourTargetRef = useRef<HTMLDivElement>(null);
  const effectiveRef = tourInfo?.tourTargetRef || localTourTargetRef;
  const closePopover = useCallback(() => {
    setIsPopoverOpen(false);
  }, []);
  const openPopover = useCallback(() => {
    setIsPopoverOpen(true);
  }, []);
  const [ruleToDelete, setRuleToDelete] = useState<string | null>(null);
  return (
    <>
      {ruleToDelete && (
        <DeleteRulesetRuleModal
          closeDeleteModal={() => setRuleToDelete(null)}
          onConfirm={() => {
            if (deleteRule) {
              deleteRule(ruleToDelete);
            }
          }}
        />
      )}
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
            <EuiFlexGroup alignItems="center" gutterSize="m">
              <EuiFlexItem grow={false} ref={isLastItem ? effectiveRef : undefined}>
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
                  <EuiFlexItem grow={false}>
                    <EuiNotificationBadge color="subdued">{index + 1}</EuiNotificationBadge>
                  </EuiFlexItem>
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
                              useTracker?.click(AnalyticsEvents.editRuleClicked);
                              onEditRuleFlyoutOpen(queryRule.rule_id);
                              closePopover();
                            }}
                          >
                            <FormattedMessage
                              id="xpack.search.queryRulesetDetail.draggableList.actions.edit"
                              defaultMessage="Edit rule"
                            />
                          </EuiContextMenuItem>,
                          <EuiContextMenuItem
                            toolTipContent={
                              rules.length === 1
                                ? i18n.translate(
                                    'xpack.search.queryRulesetDetail.draggableList.actions.deleteTooltip',
                                    {
                                      defaultMessage: 'The ruleset must contains at least 1 rule.',
                                    }
                                  )
                                : undefined
                            }
                            disabled={rules.length === 1}
                            key="delete"
                            icon="trash"
                            css={css`
                              color: ${rules.length === 1
                                ? euiTheme.colors.textDisabled
                                : euiTheme.colors.danger};
                            `}
                            data-test-subj="searchQueryRulesQueryRulesetDetailDeleteButton"
                            onClick={() => {
                              useTracker?.click(AnalyticsEvents.deleteRuleClicked);
                              setRuleToDelete(queryRule.rule_id);
                              closePopover();
                            }}
                          >
                            <FormattedMessage
                              id="xpack.search.queryRulesetDetail.draggableList.actions.delete"
                              defaultMessage="Delete rule"
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

export interface QueryRuleDraggableListItemProps {
  queryRule: QueryRulesQueryRule;
  index: number;
  onEditRuleFlyoutOpen: (ruleId: string) => void;
  isLastItem?: boolean;
  tourInfo?: {
    title: string;
    content: string;
    tourTargetRef?: React.RefObject<HTMLDivElement>;
  };
}

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
