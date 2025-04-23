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
  EuiBadge,
  EuiTextColor,
  EuiButtonIcon,
  useEuiTheme,
  euiDragDropReorder,
} from '@elastic/eui';
import {
  QueryRulesQueryRule,
  QueryRulesQueryRuleCriteria,
} from '@elastic/elasticsearch/lib/api/types';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

export interface QueryRuleDraggableListProps {
  rules: QueryRulesQueryRule[];
  onReorder: (queryRules: QueryRulesQueryRule[]) => void;
}
export const QueryRuleDraggableList: React.FC<QueryRuleDraggableListProps> = ({
  rules,
  onReorder,
}) => {
  const {
    euiTheme: { colors, size, base },
  } = useEuiTheme();
  const DOC_COUNT_COLUMN_SIZING = {
    columnMinWidth: base * 10,
    actionMinWidth: base * 5,
    docCountMinWidth: base * 4,
    docTextMinWidth: size.l,
    headerpaddingLeft: base * 3.5,
  };
  const criteriaDisplay = (criteria: QueryRulesQueryRuleCriteria) => (
    <EuiText size="s">
      <EuiBadge>{criteria.metadata}</EuiBadge>&nbsp;
      <EuiTextColor color={colors.textPrimary}>{criteria.type}</EuiTextColor>&nbsp;
      {criteria.values?.join(', ')}
    </EuiText>
  );
  const actionIcon = (queryRule: QueryRulesQueryRule) => (
    <EuiFlexGroup
      responsive={false}
      alignItems="center"
      gutterSize="m"
      justifyContent="center"
      css={{ minWidth: DOC_COUNT_COLUMN_SIZING.columnMinWidth }}
    >
      <EuiFlexItem grow={false}>
        <div css={{ minWidth: DOC_COUNT_COLUMN_SIZING.actionMinWidth, textAlign: 'end' }}>
          <EuiBadge iconType={queryRule.type === 'exclude' ? 'eyeClosed' : 'pinFilled'}>
            {queryRule.type === 'exclude' ? (
              <FormattedMessage
                id="xpack.search.queryRulesetDetail.draggableList.excludeLabel"
                defaultMessage="Exclude"
              />
            ) : (
              <FormattedMessage
                id="xpack.search.queryRulesetDetail.draggableList.pinLabel"
                defaultMessage="Pin"
              />
            )}
          </EuiBadge>
        </div>
      </EuiFlexItem>
      <EuiFlexItem
        grow={false}
        css={{
          minWidth: DOC_COUNT_COLUMN_SIZING.docCountMinWidth,
        }}
      >
        <EuiFlexGroup responsive={false} alignItems="center" gutterSize="s">
          <EuiFlexItem grow={false}>
            <EuiIcon type="documents" />
          </EuiFlexItem>
          <EuiFlexItem grow={false} css={{ minWidth: DOC_COUNT_COLUMN_SIZING.docTextMinWidth }}>
            {queryRule.actions.docs?.length ?? 0}
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlexItem>
    </EuiFlexGroup>
  );

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
        <EuiFlexGroup
          css={{
            padding: `0 ${base * 2.25}px 0 ${base * 3.5}px`,
          }}
        >
          <EuiFlexItem grow={7}>
            <EuiText size="xs">
              <b>
                <FormattedMessage
                  id="xpack.search.queryRulesetDetail.draggableList.ruleConditionsLabel"
                  defaultMessage="Rule Conditions"
                />
              </b>
            </EuiText>
          </EuiFlexItem>

          <EuiFlexItem grow={false}>
            <EuiFlexGroup
              alignItems="center"
              justifyContent="center"
              gutterSize="m"
              responsive={false}
              css={{ minWidth: DOC_COUNT_COLUMN_SIZING.columnMinWidth }}
            >
              <EuiFlexItem grow={false} css={{ minWidth: size.xl, textAlign: 'end' }}>
                <EuiText size="xs">
                  <b>
                    <FormattedMessage
                      id="xpack.search.queryRulesetDetail.draggableList.actionLabel"
                      defaultMessage="Action"
                    />
                  </b>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem
                grow={false}
                css={{ minWidth: DOC_COUNT_COLUMN_SIZING.docCountMinWidth }}
              >
                <EuiText size="xs">
                  <b>
                    <FormattedMessage
                      id="xpack.search.queryRulesetDetail.draggableList.documentCountLabel"
                      defaultMessage="Document Count"
                    />
                  </b>
                </EuiText>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
        <EuiDroppable
          droppableId="queryRuleListDropabble"
          spacing="m"
          css={{ backgroundColor: colors.backgroundBaseSubdued }}
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
                                    {criteriaDisplay(criteria)}
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
                                {criteriaDisplay(queryRule.criteria)}
                              </EuiFlexItem>
                            )}
                          </EuiFlexGroup>
                        </EuiFlexItem>
                        <EuiFlexItem grow={1}>{actionIcon(queryRule)}</EuiFlexItem>
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
