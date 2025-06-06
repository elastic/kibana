/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiButtonGroup,
  EuiCallOut,
  EuiDragDropContext,
  EuiDraggable,
  EuiDroppable,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiHorizontalRule,
  EuiIcon,
  EuiPanel,
  EuiSpacer,
  EuiText,
  EuiTitle,
  euiDragDropReorder,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import { Controller, useFieldArray, useFormContext, useWatch } from 'react-hook-form';
import { useFetchIndexNames } from '../../../hooks/use_fetch_index_names';
import { QueryRuleEditorForm, SearchQueryRulesQueryRule } from '../../../types';
import { DocumentSelector } from './document_selector/document_selector';
import { isCriteriaAlways } from '../../../utils/query_rules_utils';
import { QueryRuleFlyoutBody, QueryRuleFlyoutPanel } from '../styles';
import { QueryRuleMetadataEditor } from './query_rule_metadata_editor';

export interface QueryRuleFlyoutProps {
  rules: SearchQueryRulesQueryRule[];
  onClose: () => void;
  onSave: (rule: SearchQueryRulesQueryRule) => void;
  ruleId: string;
  rulesetId: string;
}

export const QueryRuleFlyout: React.FC<QueryRuleFlyoutProps> = ({
  rules,
  onClose,
  onSave,
  ruleId,
  rulesetId,
}) => {
  const { control, getValues, reset, setValue } = useFormContext<QueryRuleEditorForm>();
  const { fields, remove, replace, update, append } = useFieldArray({
    control,
    name: 'criteria',
  });
  const {
    fields: actionFields,
    remove: removeAction,
    replace: replaceAction,
    append: appendAction,
  } = useFieldArray({
    control,
    name: 'actions.docs',
  });

  const pinType = useWatch({
    control,
    name: 'type',
  });
  const actionIdsFields = useWatch({
    control,
    name: 'actions.ids',
  });

  const { data: indexNames } = useFetchIndexNames('');

  const { euiTheme } = useEuiTheme();

  const ruleFromRuleset = rules.find((rule) => rule.rule_id === ruleId);
  const [isAlways, setIsAlways] = useState<boolean>(
    (ruleFromRuleset?.criteria && isCriteriaAlways(ruleFromRuleset?.criteria)) ?? false
  );
  const isIdRule = Boolean(actionFields.length === 0 && actionIdsFields?.length);
  const isDocRule = Boolean(actionFields.length > 0 && !actionIdsFields?.length);

  useEffect(() => {
    if (ruleFromRuleset) {
      reset({
        ...getValues(),
        criteria: ruleFromRuleset.criteria,
        type: ruleFromRuleset.type,
        actions: ruleFromRuleset.actions,
        mode: 'edit',
        ruleId,
      });
      setIsAlways(
        (ruleFromRuleset?.criteria && isCriteriaAlways(ruleFromRuleset?.criteria)) ?? false
      );
    }
  }, [ruleFromRuleset, reset, getValues, rulesetId, ruleId]);
  const handleAddCriteria = () => {
    append({
      type: 'exact',
      metadata: '',
      values: [],
    });
  };

  const appendNewAction = () => {
    if (isIdRule) {
      setValue('actions.ids', [...(getValues('actions.ids') || []), '']);
    } else {
      appendAction({
        _id: '',
        _index: '',
      });
    }
  };

  const handleSave = () => {
    const index = rules.findIndex((rule) => rule.rule_id === ruleId);
    if (index !== -1) {
      if (isAlways) {
        replace([
          {
            metadata: 'always',
            type: 'always',
            values: ['always'],
          },
        ]);
      }
      const updatedRule = {
        rule_id: ruleId,
        criteria: fields.map((criteria) => {
          const normalizedCriteria = {
            values: criteria.values,
            metadata: criteria.metadata,
            type: criteria.type,
          };
          return normalizedCriteria;
        }),
        type: getValues('type'),
        actions: {
          // if there is docs, use them, otherwise use ids make sure docs doesn't exist when using ids
          ...((isDocRule && {
            docs: actionFields.map((doc) => ({
              _id: doc._id,
              _index: doc._index,
            })),
          }) ||
            (isIdRule && { ids: actionIdsFields }) ||
            {}),
        },
      };
      onSave(updatedRule);
    }
  };

  return (
    <EuiFlyout
      onClose={onClose}
      ownFocus={false}
      size="l"
      aria-labelledby="flyoutTitle"
      css={css({
        overflowY: 'hidden',
      })}
    >
      <EuiFlyoutHeader hasBorder data-test-subj="queryRulesFlyoutHeader">
        <EuiFlexGroup direction="column">
          <EuiFlexItem>
            <EuiTitle size="m" id="flyoutTitle">
              <h2>
                <FormattedMessage
                  id="xpack.search.queryRulesetDetail.queryRuleFlyoutTitle.edit"
                  defaultMessage="Edit rule"
                />
              </h2>
            </EuiTitle>
          </EuiFlexItem>
          <EuiFlexItem>
            <EuiFlexGroup responsive={false}>
              <EuiFlexItem>
                <FormattedMessage
                  defaultMessage="Rule ID: {ruleId}"
                  id="xpack.search.queryRulesetDetail.queryRuleFlyout.ruleId"
                  values={{ ruleId }}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutHeader>
      <EuiFlyoutBody css={QueryRuleFlyoutBody}>
        <EuiFlexGroup gutterSize="none" css={QueryRuleFlyoutPanel(euiTheme)}>
          <EuiFlexItem grow>
            <EuiPanel hasBorder paddingSize="l" borderRadius="none" className="eui-yScroll">
              <EuiText size="s">
                <b>
                  <FormattedMessage
                    id="xpack.search.queryRulesetDetail.queryRuleFlyout.actionTypeHeading"
                    defaultMessage="I want to"
                  />
                </b>
              </EuiText>
              <EuiSpacer size="s" />
              <EuiFlexGroup responsive={false} alignItems="center">
                <EuiFlexItem grow={false}>
                  <Controller
                    control={control}
                    name="type"
                    render={({ field: { value, onChange } }) => (
                      <EuiButtonGroup
                        legend="Action Type"
                        className="eui-displayInlineBlock"
                        options={[
                          {
                            'data-test-subj': 'searchQueryRulesQueryRuleActionTypePinned',
                            id: 'pinned',
                            label: (
                              <>
                                <EuiIcon type="pin" size="m" />
                                &nbsp;
                                <FormattedMessage
                                  id="xpack.search.queryRulesetDetail.queryRuleFlyout.actionType.pinned"
                                  defaultMessage="Pinned"
                                />
                              </>
                            ),
                          },
                          {
                            'data-test-subj': 'searchQueryRulesQueryRuleActionTypeExclude',
                            id: 'exclude',
                            label: (
                              <>
                                <EuiIcon type="eyeClosed" size="m" />
                                &nbsp;
                                <FormattedMessage
                                  id="xpack.search.queryRulesetDetail.queryRuleFlyout.actionType.exclude"
                                  defaultMessage="Exclude"
                                />
                              </>
                            ),
                          },
                        ]}
                        onChange={onChange}
                        buttonSize="compressed"
                        type="single"
                        idSelected={value}
                      />
                    )}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued">
                    <p>
                      {getValues('type') === 'pinned' ? (
                        <FormattedMessage
                          id="xpack.search.queryRulesetDetail.queryRuleFlyout.actionType.pinned.description"
                          defaultMessage="Pin documents to the top of the search results."
                        />
                      ) : (
                        <FormattedMessage
                          id="xpack.search.queryRulesetDetail.queryRuleFlyout.actionType.exclude.description"
                          defaultMessage="Exclude documents from the search results."
                        />
                      )}
                    </p>
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiHorizontalRule margin="m" />

              <EuiText size="s">
                <b>
                  <FormattedMessage
                    id="xpack.search.queryRulesetDetail.queryRuleFlyout.documentCount"
                    defaultMessage="{documentCount, plural, one {# document} other {# documents}}"
                    values={{
                      documentCount:
                        (ruleFromRuleset?.actions.ids?.length ||
                          ruleFromRuleset?.actions.docs?.length) ??
                        0,
                    }}
                  />
                </b>
              </EuiText>
              <EuiFlexItem
                css={css`
                  background-color: ${euiTheme.colors.backgroundBaseFormsPrepend};
                `}
              >
                <EuiDragDropContext
                  onDragEnd={({ source, destination }) => {
                    if (source && destination && ruleFromRuleset) {
                      if (isDocRule) {
                        const newActions = euiDragDropReorder(
                          actionFields,
                          source.index,
                          destination.index
                        );
                        replaceAction(newActions);
                      } else if (isIdRule && actionIdsFields) {
                        const newActions = euiDragDropReorder(
                          actionIdsFields,
                          source.index,
                          destination.index
                        );
                        setValue('actions.ids', newActions);
                      }
                    }
                  }}
                >
                  <EuiDroppable droppableId="queryRuleDroppable" spacing="m">
                    {isIdRule && actionIdsFields
                      ? actionIdsFields.map((doc, index) => (
                          <EuiDraggable
                            usePortal
                            spacing="m"
                            index={index}
                            hasInteractiveChildren={true}
                            draggableId={'queryRuleDocumentDraggable-' + doc + '-' + index}
                            key={doc + '-' + index}
                          >
                            {() => (
                              <DocumentSelector
                                initialDocId={doc}
                                hasIndexSelector={false}
                                onDeleteDocument={() => {
                                  if (ruleFromRuleset) {
                                    const updatedActions = actionIdsFields.filter(
                                      (_, i) => i !== index
                                    );
                                    setValue('actions.ids', updatedActions);
                                  }
                                }}
                                onIdSelectorChange={(id) => {
                                  if (ruleFromRuleset) {
                                    const updatedActions = actionIdsFields.map((value, i) =>
                                      i === index ? id : value
                                    );
                                    setValue('actions.ids', updatedActions);
                                  }
                                }}
                              />
                            )}
                          </EuiDraggable>
                        ))
                      : actionFields.map((doc, index) => (
                          <EuiDraggable
                            usePortal
                            spacing="m"
                            index={index}
                            hasInteractiveChildren={true}
                            draggableId={'queryRuleDocumentDraggable-' + doc._id + '-' + index}
                            key={doc._id}
                          >
                            {() => (
                              <DocumentSelector
                                initialDocId={doc._id}
                                index={doc._index}
                                onDeleteDocument={() => {
                                  removeAction(index);
                                }}
                                onIndexSelectorChange={(indexName) => {
                                  if (ruleFromRuleset) {
                                    const updatedActions = actionFields.map((action, i) =>
                                      i === index ? { ...action, _index: indexName } : action
                                    );
                                    replaceAction(updatedActions);
                                  }
                                }}
                                onIdSelectorChange={(id) => {
                                  if (ruleFromRuleset) {
                                    const updatedActions = actionFields.map((action, i) =>
                                      i === index ? { ...action, _id: id } : action
                                    );
                                    replaceAction(updatedActions);
                                  }
                                }}
                                indices={indexNames}
                              />
                            )}
                          </EuiDraggable>
                        )) || <></>}
                  </EuiDroppable>
                </EuiDragDropContext>
              </EuiFlexItem>
              {getValues('type') === 'pinned' ? (
                <EuiCallOut
                  iconType="transitionTopIn"
                  size="s"
                  title={
                    <FormattedMessage
                      id="xpack.search.queryRulesetDetail.queryRuleFlyout.organicResultsCallout"
                      defaultMessage="All other organic results will be displayed below"
                    />
                  }
                />
              ) : null}
              <EuiSpacer size="m" />
              <EuiButton
                data-test-subj="searchQueryRulesQueryRuleFlyoutButton"
                iconType="plusInCircle"
                color="text"
                size="s"
                onClick={appendNewAction}
              >
                {pinType === 'pinned' ? (
                  <FormattedMessage
                    id="xpack.search.queryRulesetDetail.queryRuleFlyout.addPinnedDocumentButton"
                    defaultMessage="Pin 1 more document"
                  />
                ) : (
                  <FormattedMessage
                    id="xpack.search.queryRulesetDetail.queryRuleFlyout.addExcludedDocumentButton"
                    defaultMessage="Exclude 1 more document"
                  />
                )}
              </EuiButton>
            </EuiPanel>
          </EuiFlexItem>
          <EuiFlexItem grow>
            <EuiPanel hasBorder paddingSize="l" borderRadius="none" className="eui-yScroll">
              <EuiText size="s">
                <b>
                  <FormattedMessage
                    id="xpack.search.queryRulesetDetail.queryRuleFlyout.criteriaHeading"
                    defaultMessage="Criteria"
                  />
                </b>
              </EuiText>
              <EuiSpacer size="s" />
              <EuiFlexGroup responsive={false} alignItems="center">
                <EuiFlexItem grow={false}>
                  <EuiButtonGroup
                    legend="Criteria"
                    className="eui-displayInlineBlock"
                    options={[
                      {
                        'data-test-subj': 'searchQueryRulesQueryRuleCriteriaCustom',
                        id: 'custom',
                        label: (
                          <>
                            <FormattedMessage
                              id="xpack.search.queryRulesetDetail.queryRuleFlyout.criteria.custom"
                              defaultMessage="Custom"
                            />
                          </>
                        ),
                      },
                      {
                        'data-test-subj': 'searchQueryRulesQueryRuleCriteriaAlways',
                        id: 'always',
                        label: (
                          <>
                            <FormattedMessage
                              id="xpack.search.queryRulesetDetail.queryRuleFlyout.criteria.always"
                              defaultMessage="Always"
                            />
                          </>
                        ),
                      },
                    ]}
                    onChange={(id) => {
                      setIsAlways(id === 'always');
                    }}
                    buttonSize="compressed"
                    type="single"
                    idSelected={isAlways ? 'always' : 'custom'}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued">
                    <p>
                      <FormattedMessage
                        id="xpack.search.queryRulesetDetail.queryRuleFlyout.criteria.custom.description"
                        defaultMessage="Define the conditions that trigger this rule."
                      />
                    </p>
                  </EuiText>
                </EuiFlexItem>
              </EuiFlexGroup>
              <EuiSpacer size="m" />
              {ruleFromRuleset &&
                !isAlways &&
                fields.map((field, index) => (
                  <React.Fragment key={field.id}>
                    <QueryRuleMetadataEditor
                      criteria={field}
                      key={field.id}
                      onChange={(newCriteria) => {
                        update(index, newCriteria);
                      }}
                      onRemove={() => {
                        remove(index);
                      }}
                    />
                    <EuiSpacer size="m" />
                  </React.Fragment>
                ))}

              {ruleFromRuleset && !isAlways && (
                <EuiButton
                  data-test-subj="searchQueryRulesQueryRuleMetadataEditorAddCriteriaButton"
                  onClick={handleAddCriteria}
                  iconType="plusInCircle"
                  iconSide="left"
                  size="s"
                  color="text"
                >
                  <FormattedMessage
                    id="xpack.search.queryRulesetDetail.queryRuleFlyout.addCriteriaButton"
                    defaultMessage="AND"
                  />
                </EuiButton>
              )}
            </EuiPanel>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween">
          <EuiFlexItem grow={false}>
            <EuiButtonEmpty
              data-test-subj="searchQueryRulesQueryRuleFlyoutCancelButton"
              onClick={onClose}
            >
              <FormattedMessage
                id="xpack.search.queryRulesetDetail.queryRuleFlyout.closeButton"
                defaultMessage="Close"
              />
            </EuiButtonEmpty>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiButton
              data-test-subj="searchQueryRulesQueryRuleFlyoutUpdateButton"
              fill
              onClick={handleSave}
            >
              <FormattedMessage
                id="xpack.search.queryRulesetDetail.queryRuleFlyout.updateButton"
                defaultMessage="Update"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
