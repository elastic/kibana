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
} from '@elastic/eui';
import { css } from '@emotion/react';
import type { QueryRulesQueryRule } from '@elastic/elasticsearch/lib/api/types';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';
import { useUsageTracker } from '../../../hooks/use_usage_tracker';
import type { SearchQueryRulesQueryRule } from '../../../../common/types';
import { QueryRuleDraggableListHeader } from './query_rule_draggable_list_header';
import { QueryRuleDraggableListItemActionTypeBadge } from './query_rule_draggable_item_action_type_badge';
import { QueryRuleDraggableItemCriteriaDisplay } from './query_rule_draggable_item_criteria_display';
import { DeleteRulesetRuleModal } from './delete_ruleset_rule_modal';
import { AnalyticsEvents } from '../../../analytics/constants';
import { DroppableContainer } from '../styles';

export interface QueryRuleSearchResultsProps {
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

export const QueryRuleSearchResults: React.FC<QueryRuleSearchResultsProps> = ({
  index,
  rules,
  onEditRuleFlyoutOpen,
  deleteRule,
  queryRule,
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
          <EuiFlexItem grow={false}>
            {/* Custom spacer to prevent elements jumping in between search and list */}
            <EuiPanel
              color="transparent"
              paddingSize="s"
              css={css({
                minWidth: euiTheme.base * 2,
                minHeight: euiTheme.base * 2,
              })}
            />
          </EuiFlexItem>
          <EuiFlexItem grow={true}>
            <EuiFlexGroup alignItems="center" responsive={false}>
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
    </>
  );
};

export interface QueryRuleSearchResultsListProps {
  rules: SearchQueryRulesQueryRule[];
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
                index={index}
                rules={rules}
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
