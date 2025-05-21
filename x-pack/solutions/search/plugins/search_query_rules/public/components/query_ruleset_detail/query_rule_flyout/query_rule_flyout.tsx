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
  EuiDragDropContext,
  EuiDraggable,
  EuiDroppable,
  EuiFieldText,
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
  useEuiTheme,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { Controller, useFieldArray, useFormContext } from 'react-hook-form';
import { useFetchQueryRule } from '../../../hooks/use_fetch_query_rule';
import { QueryRuleEditorForm, SearchQueryRulesQueryRule } from '../../../types';
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
  const { control, getValues, reset } = useFormContext<QueryRuleEditorForm>();
  const { fields, remove, replace, update, append } = useFieldArray({
    control,
    name: 'criteria',
  });

  const { euiTheme } = useEuiTheme();

  const ruleFromRuleset = rules.find((rule) => rule.rule_id === ruleId);
  const { isLoading } = useFetchQueryRule(rulesetId, ruleId);
  const data = ruleFromRuleset;
  const [isAlways, setIsAlways] = useState<boolean>(
    (data?.criteria && isCriteriaAlways(data?.criteria)) ?? false
  );

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

  // const isUpdateEnabled =
  //   // TODO: add if has documents and they are valid &&
  //   isAlways &&
  //   (fields.length > 0
  //     ? fields.every((field) => {
  //         // TODO: check if valid
  //         return true;
  //       })
  //     : false);

  if (isLoading) {
    return <></>;
  }
  return (
    <EuiFlyout onClose={onClose} ownFocus={false} size="l" aria-labelledby="flyoutTitle">
      <EuiFlyoutHeader hasBorder>
        <EuiFlexGroup direction="column">
          <EuiFlexItem>
            <EuiTitle size="m" id="flyoutTitle">
              <h2>
                <FormattedMessage
                  id="xpack.search.queryRulesetDetail.queryRuleFlyoutTitle.create"
                  defaultMessage="Create rule"
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
            <EuiPanel hasBorder paddingSize="l" borderRadius="none">
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
                      documentCount: (data?.actions.ids?.length || data?.actions.docs?.length) ?? 0,
                    }}
                  />
                </b>
              </EuiText>
              <EuiDragDropContext onDragEnd={() => {}}>
                <EuiDroppable droppableId="queryRuleDroppable" spacing="m">
                  {data?.actions?.ids?.map((value, index) => (
                    <EuiDraggable
                      usePortal
                      spacing="m"
                      index={index}
                      hasInteractiveChildren={true}
                      draggableId={'queryRuleDocumentDraggable'}
                      key={value + '-' + index}
                    >
                      {(provided) => (
                        <EuiPanel paddingSize="s" hasShadow={false}>
                          <EuiFlexGroup alignItems="center" gutterSize="s">
                            <EuiFlexItem grow={false}>
                              <EuiPanel
                                color="transparent"
                                paddingSize="s"
                                aria-label="Drag Handle"
                              >
                                <EuiIcon type="grab" />
                              </EuiPanel>
                            </EuiFlexItem>
                            <EuiFlexItem grow={true}>
                              <EuiFlexGroup responsive={false} alignItems="center">
                                <EuiFlexItem>
                                  <EuiFieldText
                                    data-test-subj="searchQueryRulesQueryRuleDocumentId"
                                    value={value}
                                    readOnly
                                    fullWidth
                                  />
                                </EuiFlexItem>
                              </EuiFlexGroup>
                            </EuiFlexItem>
                          </EuiFlexGroup>
                        </EuiPanel>
                      )}
                    </EuiDraggable>
                  )) || <></>}
                </EuiDroppable>
              </EuiDragDropContext>
            </EuiPanel>
          </EuiFlexItem>
          <EuiFlexItem grow>
            <EuiPanel hasBorder paddingSize="l" borderRadius="none">
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
              {data &&
                !isAlways &&
                fields.map((field, index) => (
                  <>
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
                  </>
                ))}

              {data && !isAlways && (
                <EuiButton
                  data-test-subj="searchQueryRulesQueryRuleMetadataEditorAddCriteriaButton"
                  onClick={() => {
                    append({
                      type: 'exact',
                      metadata: '',
                      values: [],
                    });
                  }}
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
              onClick={() => {
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
                  onSave({
                    rule_id: ruleId,
                    criteria: getValues('criteria'),
                    type: getValues('type'),
                    actions: getValues('actions'),
                  });
                }
              }}
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
