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
  EuiIconTip,
  EuiLink,
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
import { DISCOVER_APP_ID } from '@kbn/deeplinks-analytics';
import { useFetchIndexNames } from '../../../hooks/use_fetch_index_names';
import { QueryRuleEditorForm, SearchQueryRulesQueryRule } from '../../../types';
import { DocumentSelector } from './document_selector/document_selector';
import { isCriteriaAlways } from '../../../utils/query_rules_utils';
import { QueryRuleFlyoutBody, QueryRuleFlyoutPanel } from '../styles';
import { QueryRuleMetadataEditor } from './query_rule_metadata_editor';
import { useKibana } from '../../../hooks/use_kibana';

export interface QueryRuleFlyoutProps {
  rules: SearchQueryRulesQueryRule[];
  onClose: () => void;
  onSave: (rule: SearchQueryRulesQueryRule) => void;
  ruleId: string;
  rulesetId: string;
  setIsFormDirty?: (isDirty: boolean) => void;
}

export const QueryRuleFlyout: React.FC<QueryRuleFlyoutProps> = ({
  rules,
  onClose,
  onSave,
  ruleId,
  rulesetId,
  setIsFormDirty,
}) => {
  const {
    services: { application },
  } = useKibana();
  const [isFlyoutDirty, setIsFlyoutDirty] = useState<boolean>(false);
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
  const isDocRule = Boolean(actionFields.length > 0);

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
    setIsFlyoutDirty(true);
    append({
      type: 'exact',
      metadata: '',
      values: [],
    });
  };

  const appendNewAction = () => {
    setIsFlyoutDirty(true);
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
    setIsFormDirty?.(true);
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
      let actions = {};
      if (isDocRule) {
        actions = {
          docs: actionFields.map((doc) => ({
            _id: doc._id,
            _index: doc._index,
          })),
        };
      } else if (isIdRule) {
        actions = { ids: actionIdsFields };
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
        actions,
      };
      onSave(updatedRule);
    }
  };
  const CRITERIA_CALLOUT_STORAGE_KEY = 'queryRules.criteriaCalloutState';
  const [criteriaCalloutActive, setCriteriaCalloutActive] = useState<boolean>(() => {
    try {
      const savedState = localStorage.getItem(CRITERIA_CALLOUT_STORAGE_KEY);
      if (savedState === null) {
        localStorage.setItem(CRITERIA_CALLOUT_STORAGE_KEY, 'true');
        return true;
      }
      return savedState !== 'false';
    } catch (e) {
      return true;
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(CRITERIA_CALLOUT_STORAGE_KEY, criteriaCalloutActive ? 'true' : 'false');
    } catch (e) {
      // If localStorage is not available, we can ignore the error
    }
  }, [criteriaCalloutActive]);

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
            <EuiFlexGroup gutterSize="s" responsive={false}>
              <EuiFlexItem grow={false}>
                <FormattedMessage
                  defaultMessage="Rule ID: {ruleId}"
                  id="xpack.search.queryRulesetDetail.queryRuleFlyout.ruleId"
                  values={{ ruleId }}
                />
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiIconTip
                  content={
                    <FormattedMessage
                      defaultMessage="The unique identifier of the query rule within the specified ruleset to retrieve"
                      id="xpack.search.queryRulesetDetail.queryRuleFlyout.ruleIdTooltip"
                    />
                  }
                  position="right"
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
                        onChange={(id) => {
                          setIsFlyoutDirty(true);
                          onChange(id);
                        }}
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
              <EuiSpacer size="s" />
              <EuiText size="xs" color="subdued">
                <FormattedMessage
                  id="xpack.search.queryRulesetDetail.queryRuleFlyout.findDocuments"
                  defaultMessage="Find your documents IDs into "
                />
                {/* eslint-disable-next-line @elastic/eui/href-or-on-click */}
                <EuiLink
                  data-test-subj="searchQueryRulesQueryRuleFlyoutLink"
                  external
                  href="#" // Removing href hides the external link icon
                  onClick={(e) => {
                    e.preventDefault();
                    application.navigateToApp(DISCOVER_APP_ID, {
                      openInNewTab: true,
                    });
                  }}
                >
                  <FormattedMessage
                    id="xpack.search.queryRulesetDetail.queryRuleFlyout.DiscoverDocumentsLink"
                    defaultMessage="Discover"
                  />
                </EuiLink>
              </EuiText>

              <EuiSpacer size="m" />
              <EuiFlexItem
                css={css`
                  background-color: ${euiTheme.colors.backgroundBaseFormsPrepend};
                `}
              >
                <EuiDragDropContext
                  onDragEnd={({ source, destination }) => {
                    if (source && destination && ruleFromRuleset) {
                      setIsFlyoutDirty(true);
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
                            isDragDisabled={getValues('type') === 'exclude'}
                          >
                            {() => (
                              <DocumentSelector
                                initialDocId={doc}
                                indexDoc={index}
                                type={getValues('type')}
                                hasIndexSelector={false}
                                onDeleteDocument={() => {
                                  if (ruleFromRuleset) {
                                    setIsFlyoutDirty(true);
                                    const updatedActions = actionIdsFields.filter(
                                      (_, i) => i !== index
                                    );
                                    setValue('actions.ids', updatedActions);
                                  }
                                }}
                                onIdSelectorChange={(id) => {
                                  if (ruleFromRuleset) {
                                    setIsFlyoutDirty(true);
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
                            isDragDisabled={getValues('type') === 'exclude'}
                          >
                            {() => (
                              <DocumentSelector
                                initialDocId={doc._id}
                                indexDoc={index}
                                type={getValues('type')}
                                index={doc._index}
                                onDeleteDocument={() => {
                                  setIsFlyoutDirty(true);
                                  removeAction(index);
                                }}
                                onIndexSelectorChange={(indexName) => {
                                  if (ruleFromRuleset) {
                                    setIsFlyoutDirty(true);
                                    const updatedActions = actionFields.map((action, i) =>
                                      i === index ? { ...action, _index: indexName } : action
                                    );
                                    replaceAction(updatedActions);
                                  }
                                }}
                                onIdSelectorChange={(id) => {
                                  if (ruleFromRuleset) {
                                    setIsFlyoutDirty(true);
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
              {getValues('type') === 'pinned' && actionFields.length !== 0 ? (
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
                color={actionFields.length === 0 ? 'primary' : 'text'}
                size="s"
                onClick={appendNewAction}
                fill={actionFields.length === 0}
              >
                {pinType === 'pinned' ? (
                  actionFields.length === 0 ? (
                    <FormattedMessage
                      id="xpack.search.queryRulesetDetail.queryRuleFlyout.addPinnedDocumentButton"
                      defaultMessage="Pin document"
                    />
                  ) : (
                    <FormattedMessage
                      id="xpack.search.queryRulesetDetail.queryRuleFlyout.addPinnedDocumentButtonMore"
                      defaultMessage="Pin 1 more document"
                    />
                  )
                ) : actionFields.length === 0 ? (
                  <FormattedMessage
                    id="xpack.search.queryRulesetDetail.queryRuleFlyout.addExcludedDocumentButton"
                    defaultMessage="Exclude document"
                  />
                ) : (
                  <FormattedMessage
                    id="xpack.search.queryRulesetDetail.queryRuleFlyout.addExcludedDocumentButtonMore"
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
                      setIsFlyoutDirty(true);
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
              {criteriaCalloutActive && !isAlways ? (
                <>
                  <EuiCallOut
                    iconType="iInCircle"
                    size="s"
                    onDismiss={() => {
                      setCriteriaCalloutActive(false);
                    }}
                    title={
                      <FormattedMessage
                        id="xpack.search.queryRulesetDetail.queryRuleFlyout.allCriteriaCallout"
                        defaultMessage="All criteria must be met for the rule to be applied"
                      />
                    }
                  />
                  <EuiSpacer size="m" />
                </>
              ) : null}
              {ruleFromRuleset &&
                !isAlways &&
                fields.map((field, index) => (
                  <React.Fragment key={field.id}>
                    <QueryRuleMetadataEditor
                      criteria={field}
                      key={field.id}
                      onChange={(newCriteria) => {
                        setIsFlyoutDirty(true);
                        update(index, newCriteria);
                      }}
                      onRemove={() => {
                        setIsFlyoutDirty(true);
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
                  color={fields.length === 0 ? 'primary' : 'text'}
                  fill={fields.length === 0}
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
              disabled={!isFlyoutDirty}
            >
              <FormattedMessage
                id="xpack.search.queryRulesetDetail.queryRuleFlyout.updateButton"
                defaultMessage="Update rule"
              />
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
