/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiHorizontalRule,
  EuiLink,
  EuiPanel,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { DISCOVER_APP_ID } from '@kbn/deeplinks-analytics';
import { FormattedMessage } from '@kbn/i18n-react';
import { Controller } from 'react-hook-form';
import { useKibana } from '../../../hooks/use_kibana';
import { SearchQueryRulesQueryRule } from '../../../types';
import { QueryRuleFlyoutBody, QueryRuleFlyoutPanel } from '../styles';
import { QueryRuleMetadataEditor } from './query_rule_metadata_editor';
import { useQueryRuleFlyoutState } from './use_query_rule_flyout_state';
import { QueryRuleFlyoutHeader } from './query_rule_flyout_header';
import { QueryRuleTypeSelector } from './document_selector/rule_type_selector';
import { ExcludePinDocumentButton } from './pin_exclude_document_button';
import { MetadataTypeSelector } from './metadata_type_selector';
import { DraggableList } from './document_selector/draggable_list';

export interface QueryRuleFlyoutProps {
  rules: SearchQueryRulesQueryRule[];
  onClose: () => void;
  onSave: (rule: SearchQueryRulesQueryRule) => void;
  ruleId: string;
  rulesetId: string;
  setIsFormDirty?: (isDirty: boolean) => void;
  createMode?: boolean;
}

export const QueryRuleFlyout: React.FC<QueryRuleFlyoutProps> = ({
  rules,
  onClose,
  onSave,
  ruleId,
  rulesetId,
  setIsFormDirty,
  createMode = false,
}) => {
  const {
    actionFields,
    actionIdsFields,
    appendAction: appendNewAction,
    control,
    documentCount,
    dragEndHandle,
    criteria,
    criteriaCount,
    handleAddCriteria,
    handleSave,
    indexNames,
    isAlways,
    isFlyoutDirty,
    isIdRule,
    onIndexSelectorChange,
    pinType,
    remove,
    onIdSelectorChange,
    onDeleteDocument,
    setCriteriaCalloutActive,
    setIsAlways,
    setIsFlyoutDirty,
    shouldShowCriteriaCallout,
    shouldShowMetadataEditor,
    update,
  } = useQueryRuleFlyoutState({
    createMode,
    rulesetId,
    ruleId,
    rules,
    setIsFormDirty,
    onSave,
  });

  const {
    services: { application },
  } = useKibana();

  const { euiTheme } = useEuiTheme();

  const dndBackgroundColor = css`
    background-color: ${euiTheme.colors.backgroundBaseFormsPrepend};
  `;

  const pinExcludeText =
    pinType === 'pinned' ? (
      <FormattedMessage
        id="xpack.search.queryRulesetDetail.queryRuleFlyout.actionType.pinned.description"
        defaultMessage="Pin documents to the top of the search results."
      />
    ) : (
      <FormattedMessage
        id="xpack.search.queryRulesetDetail.queryRuleFlyout.actionType.exclude.description"
        defaultMessage="Exclude documents from the search results."
      />
    );

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
      <QueryRuleFlyoutHeader ruleId={ruleId} createMode={createMode} />
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
                      <QueryRuleTypeSelector
                        setIsFlyoutDirty={setIsFlyoutDirty}
                        onChange={onChange}
                        selectedId={value}
                      />
                    )}
                  />
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiText size="xs" color="subdued">
                    <p>{pinExcludeText}</p>
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
                      documentCount,
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
              <EuiFlexItem css={dndBackgroundColor}>
                <DraggableList
                  onIndexSelectorChange={onIndexSelectorChange}
                  onIdSelectorChange={onIdSelectorChange}
                  actionFields={actionFields}
                  actionIdsFields={actionIdsFields}
                  isIdRule={isIdRule}
                  pinType={pinType}
                  indexNames={indexNames}
                  dragEndHandle={dragEndHandle}
                  onDeleteDocument={onDeleteDocument}
                />
              </EuiFlexItem>
              {pinType === 'pinned' && documentCount !== 0 && (
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
              )}
              <EuiSpacer size="m" />
              <ExcludePinDocumentButton
                documentCount={documentCount}
                addNewAction={appendNewAction}
                pinType={pinType}
              />
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
                  <MetadataTypeSelector
                    setIsFlyoutDirty={setIsFlyoutDirty}
                    isAlways={isAlways}
                    setIsAlways={setIsAlways}
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
              {shouldShowCriteriaCallout && (
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
              )}
              {shouldShowMetadataEditor && (
                <>
                  {criteria.map((field, index) => (
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

                  <EuiButton
                    data-test-subj="searchQueryRulesQueryRuleMetadataEditorAddCriteriaButton"
                    onClick={handleAddCriteria}
                    iconType="plusInCircle"
                    iconSide="left"
                    size="s"
                    color={criteriaCount === 0 ? 'primary' : 'text'}
                    fill={criteriaCount === 0}
                  >
                    <FormattedMessage
                      id="xpack.search.queryRulesetDetail.queryRuleFlyout.addCriteriaButton"
                      defaultMessage="AND"
                    />
                  </EuiButton>
                </>
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
              {createMode ? (
                <FormattedMessage
                  id="xpack.search.queryRulesetDetail.queryRuleFlyout.createButton"
                  defaultMessage="Create rule"
                />
              ) : (
                <FormattedMessage
                  id="xpack.search.queryRulesetDetail.queryRuleFlyout.updateButton"
                  defaultMessage="Update rule"
                />
              )}
            </EuiButton>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
