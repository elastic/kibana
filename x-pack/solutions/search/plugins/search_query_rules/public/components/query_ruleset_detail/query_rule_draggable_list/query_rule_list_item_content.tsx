/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useState } from 'react';
import {
  EuiPanel,
  EuiFlexGroup,
  EuiFlexItem,
  EuiText,
  EuiButtonIcon,
  useEuiTheme,
  EuiPopover,
  EuiContextMenuPanel,
  EuiContextMenuItem,
  EuiNotificationBadge,
  EuiIcon,
} from '@elastic/eui';
import type { DraggableProvidedDragHandleProps } from '@elastic/eui';
import { css } from '@emotion/react';
import type { QueryRulesQueryRule } from '@elastic/elasticsearch/lib/api/types';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { useUsageTracker } from '../../../hooks/use_usage_tracker';
import type { SearchQueryRulesQueryRule } from '../../../../common/types';
import { QueryRuleDraggableListItemActionTypeBadge } from './query_rule_draggable_item_action_type_badge';
import { QueryRuleDraggableItemCriteriaDisplay } from './query_rule_draggable_item_criteria_display';
import { DeleteRulesetRuleModal } from './delete_ruleset_rule_modal';
import { AnalyticsEvents } from '../../../analytics/constants';

const MAX_VISIBLE_CRITERIA = 3;

const getVisibleCriteriaDescription = (queryRule: QueryRulesQueryRule): string => {
  if (Array.isArray(queryRule.criteria)) {
    const visibleCriteriaText = queryRule.criteria
      .slice(0, MAX_VISIBLE_CRITERIA)
      .map((criteria) => {
        const parts = [];
        if (criteria.metadata) {
          parts.push(criteria.metadata);
        }
        parts.push(criteria.type);
        if (criteria.values?.length) {
          parts.push(criteria.values.join(', '));
        }
        return parts.join(' ');
      })
      .join('; ');

    if (queryRule.criteria.length > MAX_VISIBLE_CRITERIA) {
      const moreText = i18n.translate(
        'xpack.search.queryRulesetDetail.draggableList.dragHandle.moreCriteria',
        {
          defaultMessage: 'and {count} more',
          values: { count: queryRule.criteria.length - MAX_VISIBLE_CRITERIA },
        }
      );
      return `${visibleCriteriaText} ${moreText}`;
    }

    return visibleCriteriaText;
  }

  const parts = [];
  if (queryRule.criteria.metadata) {
    parts.push(queryRule.criteria.metadata);
  }
  parts.push(queryRule.criteria.type);
  if (queryRule.criteria.values?.length) {
    parts.push(queryRule.criteria.values.join(', '));
  }
  return parts.join(' ');
};

export interface QueryRuleListItemContentProps {
  rules: SearchQueryRulesQueryRule[];
  queryRule: QueryRulesQueryRule;
  rulesetId: string;
  onEditRuleFlyoutOpen: (ruleId: string) => void;
  deleteRule?: (ruleId: string) => void;
  order?: React.ReactNode;
  isDraggable?: boolean;
  dragHandleProps?: DraggableProvidedDragHandleProps | null;
  tourTargetRef?: React.RefObject<HTMLDivElement>;
}

export const QueryRuleListItemContent: React.FC<QueryRuleListItemContentProps> = ({
  rules,
  queryRule,
  onEditRuleFlyoutOpen,
  deleteRule,
  order = '-',
  isDraggable = false,
  dragHandleProps,
  tourTargetRef,
}) => {
  const { euiTheme } = useEuiTheme();
  const useTracker = useUsageTracker();
  const [isPopoverOpen, setIsPopoverOpen] = React.useState(false);
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
      <EuiPanel paddingSize="s" hasShadow={false}>
        <EuiFlexGroup alignItems="center" gutterSize="m">
          <EuiFlexItem grow={false} ref={tourTargetRef}>
            {isDraggable ? (
              <EuiPanel
                color="transparent"
                paddingSize="s"
                {...dragHandleProps}
                aria-label={i18n.translate(
                  'xpack.search.queryRulesetDetail.draggableList.dragHandle.aria.label',
                  {
                    defaultMessage:
                      'Drag handle for {actionType} rule with ID: {ruleId}. ' +
                      'The rule has {documentCount, plural, one {document} other {documents}} ' +
                      'and {criteriaCount} {criteriaCount, plural, one {criterion} other {criteria}}. ' +
                      'Visible criteria: {visibleCriteria}',
                    values: {
                      actionType: queryRule.type === 'exclude' ? 'exclude' : 'pinned',
                      ruleId: queryRule.rule_id,
                      documentCount: queryRule.actions.docs?.length ?? 0,
                      criteriaCount: Array.isArray(queryRule.criteria)
                        ? queryRule.criteria.length
                        : 1,
                      visibleCriteria: getVisibleCriteriaDescription(queryRule),
                    },
                  }
                )}
              >
                <EuiIcon type="grab" />
              </EuiPanel>
            ) : (
              <EuiPanel
                color="transparent"
                paddingSize="s"
                css={css({
                  minWidth: euiTheme.base * 2,
                  minHeight: euiTheme.base * 2,
                })}
              />
            )}
          </EuiFlexItem>
          <EuiFlexItem grow={true}>
            <EuiFlexGroup alignItems="center" responsive={false}>
              <EuiFlexItem grow={false}>
                <EuiNotificationBadge color="subdued">{order}</EuiNotificationBadge>
              </EuiFlexItem>
              <EuiFlexItem grow={7}>
                <EuiFlexGroup direction="column" gutterSize="xs" responsive={false}>
                  {Array.isArray(queryRule.criteria) ? (
                    <>
                      {queryRule.criteria
                        .slice(0, MAX_VISIBLE_CRITERIA)
                        .map((criteria, criteriaIndex) => (
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
                      aria-label={
                        isDraggable
                          ? i18n.translate(
                              'xpack.search.queryRulesetDetail.draggableList.actionsButton.aria.label.draggable',
                              {
                                defaultMessage: 'Click to reach actions menu for rule {ruleId}',
                                values: {
                                  ruleId: queryRule.rule_id,
                                },
                              }
                            )
                          : i18n.translate(
                              'xpack.search.queryRulesetDetail.draggableList.actionsButton.aria.label.searchResult',
                              {
                                defaultMessage:
                                  'Click to reach actions menu for {actionType} rule with ID: {ruleId}. ' +
                                  'The rule has {documentCount, plural, one {document} other {documents}} ' +
                                  'and {criteriaCount} {criteriaCount, plural, one {criterion} other {criteria}}. ' +
                                  'Visible criteria: {visibleCriteria}',
                                values: {
                                  actionType: queryRule.type === 'exclude' ? 'exclude' : 'pinned',
                                  ruleId: queryRule.rule_id,
                                  documentCount: queryRule.actions.docs?.length ?? 0,
                                  criteriaCount: Array.isArray(queryRule.criteria)
                                    ? queryRule.criteria.length
                                    : 1,
                                  visibleCriteria: getVisibleCriteriaDescription(queryRule),
                                },
                              }
                            )
                      }
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
    </>
  );
};
