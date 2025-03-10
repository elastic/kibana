/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiBadge,
  EuiButton,
  EuiButtonEmpty,
  EuiCallOut,
  EuiComboBox,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFormRow,
  EuiHealth,
  EuiSpacer,
  EuiText,
  useEuiTheme,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SynonymsSynonymRule } from '@elastic/elasticsearch/lib/api/types';
import { css } from '@emotion/react';
import { FormattedMessage } from '@kbn/i18n-react';
import { synonymsOptionToString } from '../../utils/synonyms_utils';
import { usePutSynonymsRule } from '../../hooks/use_put_synonyms_rule';
import { useFlyoutState } from './use_flyout_state';

interface SynonymRuleFlyoutProps {
  onClose: () => void;
  flyoutMode: 'create' | 'edit';
  synonymsRule: SynonymsSynonymRule;
  synonymsSetId: string;
  renderExplicit?: boolean;
}

export const SynonymRuleFlyout: React.FC<SynonymRuleFlyoutProps> = ({
  flyoutMode,
  synonymsRule,
  onClose,
  renderExplicit = false,
  synonymsSetId,
}) => {
  const { euiTheme } = useEuiTheme();

  const [backendError, setBackendError] = React.useState<string | null>(null);
  const { mutate: putSynonymsRule } = usePutSynonymsRule(
    () => onClose(),
    (error) => {
      setBackendError(error);
    }
  );

  const {
    canSave,
    fromTermErrors,
    fromTerms,
    hasChanges,
    isExplicit,
    isFromTermsInvalid,
    isMapToTermsInvalid,
    mapToTermErrors,
    mapToTerms,
    clearFromTerms,
    onCreateOption,
    onMapToChange,
    onSearchChange,
    onSortTerms,
    removeTermFromOptions,
    resetChanges,
  } = useFlyoutState({
    synonymRule: synonymsRule,
    flyoutMode,
    renderExplicit,
  });

  return (
    <EuiFlyout onClose={onClose} size="s">
      <EuiFlyoutHeader hasBorder>
        {flyoutMode === 'edit' ? (
          <EuiText data-test-subj="searchSynonymsSynonymRuleFlyoutEditModeRuleIdText">
            <b>
              {i18n.translate('xpack.searchSynonyms.synonymsSetRuleFlyout.title.ruleId', {
                defaultMessage: 'Rule ID: {ruleId}',
                values: { ruleId: synonymsRule.id },
              })}
            </b>
          </EuiText>
        ) : (
          <EuiFormRow
            label={i18n.translate('xpack.searchSynonyms.synonymsSetRuleFlyout.title.ruleId', {
              defaultMessage: 'Rule ID',
            })}
          >
            <EuiFieldText
              data-test-subj="searchSynonymsSynonymRuleFlyoutGeneratedIdText"
              value={synonymsRule.id}
              readOnly
            />
          </EuiFormRow>
        )}
      </EuiFlyoutHeader>
      <EuiFlyoutBody
        css={css`
          .euiFlyoutBody__overflowContent {
            height: 100%;
          }
        `}
        banner={
          backendError && (
            <EuiCallOut
              data-test-subj="searchSynonymsSynonymsRuleFlyoutErrorBanner"
              color="danger"
              title={i18n.translate(
                'xpack.searchSynonyms.synonymsSetRuleFlyout.errorCallout.title',
                {
                  defaultMessage: 'An error occured while saving your changes',
                }
              )}
            >
              {backendError}
            </EuiCallOut>
          )
        }
      >
        <EuiFlexGroup
          justifyContent="spaceBetween"
          direction="column"
          css={css`
            height: 100%;
          `}
        >
          <EuiFlexItem grow={false}>
            <EuiFormRow
              label={i18n.translate('xpack.searchSynonyms.synonymsSetRuleFlyout.synonyms', {
                defaultMessage: 'Add terms to match against',
              })}
              isInvalid={isFromTermsInvalid}
              error={fromTermErrors || null}
            >
              <EuiComboBox
                data-test-subj="searchSynonymsSynonymsRuleFlyoutFromTermsInput"
                isInvalid={isFromTermsInvalid}
                noSuggestions
                placeholder={i18n.translate(
                  'xpack.searchSynonyms.synonymsSetRuleFlyout.synonyms.inputPlaceholder',
                  { defaultMessage: 'Add terms to match against' }
                )}
                onCreateOption={onCreateOption}
                delimiter=","
                onSearchChange={onSearchChange}
              />
            </EuiFormRow>
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup alignItems="center" justifyContent="spaceBetween">
              <EuiFlexItem>
                <EuiFlexGroup responsive={false} alignItems="center">
                  <EuiFlexItem grow={false}>
                    <EuiText
                      size="s"
                      color="subdued"
                      data-test-subj="searchSynonymsSynonymsRuleFlyoutTermCountLabel"
                    >
                      <p>
                        {fromTerms.length <= 1 ? (
                          <FormattedMessage
                            id="xpack.searchSynonyms.synonymsSetRuleFlyout.synonymsCount.single"
                            defaultMessage="{count} term"
                            values={{ count: fromTerms.length }}
                          />
                        ) : (
                          <FormattedMessage
                            id="xpack.searchSynonyms.synonymsSetRuleFlyout.synonymsCount.multiple"
                            defaultMessage="{count} terms"
                            values={{ count: fromTerms.length }}
                          />
                        )}
                      </p>
                    </EuiText>
                  </EuiFlexItem>
                  <EuiFlexItem grow={false}>
                    <EuiButtonEmpty
                      data-test-subj="searchSynonymsSynonymsRuleFlyoutSortAZButton"
                      size="s"
                      color="text"
                      onClick={onSortTerms}
                      iconType="sortUp"
                    >
                      <FormattedMessage
                        id="xpack.searchSynonyms.synonymsSetRuleFlyout.sortAZ"
                        defaultMessage="Sort A-Z"
                      />
                    </EuiButtonEmpty>
                  </EuiFlexItem>
                </EuiFlexGroup>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  data-test-subj="searchSynonymsSynonymsRuleFlyoutRemoveAllButton"
                  color="danger"
                  size="s"
                  onClick={clearFromTerms}
                >
                  <FormattedMessage
                    id="xpack.searchSynonyms.synonymsSetRuleFlyout.clearAll"
                    defaultMessage="Remove all"
                  />
                </EuiButtonEmpty>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>

          <EuiFlexItem>
            <EuiFlexGroup
              direction="column"
              gutterSize="xs"
              tabIndex={0}
              className="eui-yScrollWithShadows"
              css={css`
                height: 100%;
                margin: ${euiTheme.size.xs};
              `}
            >
              <EuiSpacer size="xs" />
              {fromTerms.map((opt, index) => (
                <span key={index + '-' + opt.label.trim()}>
                  <EuiBadge
                    data-test-subj="searchSynonymsSynonymsRuleFlyoutFromTermBadge"
                    color="hollow"
                    iconSide="left"
                    iconType="cross"
                    iconOnClick={() => {
                      removeTermFromOptions(opt);
                    }}
                    iconOnClickAriaLabel="remove"
                  >
                    {' '}
                    {opt.label}
                  </EuiBadge>
                </span>
              ))}
              {fromTerms.length === 0 && (
                <EuiText
                  color="subdued"
                  textAlign="center"
                  size="s"
                  data-test-subj="searchSynonymsSynonymsRuleFlyoutNoTermsText"
                >
                  <p>
                    <FormattedMessage
                      id="xpack.searchSynonyms.synonymsSetRuleFlyout.noTerms"
                      defaultMessage="No terms found."
                    />
                  </p>
                </EuiText>
              )}
              <EuiSpacer size="s" />
            </EuiFlexGroup>
          </EuiFlexItem>

          {isExplicit && (
            <EuiFlexItem grow={false}>
              <EuiFormRow
                label={i18n.translate('xpack.searchSynonyms.synonymsSetRuleFlyout.synonymsTo', {
                  defaultMessage: 'Map to this term',
                })}
                isInvalid={mapToTerms !== '' && isMapToTermsInvalid}
                error={mapToTermErrors || null}
              >
                <EuiFieldText
                  data-test-subj="searchSynonymsSynonymsRuleFlyoutMapToTermsInput"
                  fullWidth
                  value={mapToTerms}
                  isInvalid={mapToTerms !== '' && isMapToTermsInvalid}
                  onChange={(e) => {
                    onMapToChange(e.target.value);
                  }}
                />
              </EuiFormRow>
            </EuiFlexItem>
          )}
        </EuiFlexGroup>
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem grow={false}>
            {hasChanges && (
              <EuiHealth
                color="primary"
                data-test-subj="searchSynonymsSynonymsRuleFlyoutHasChangesBadge"
              >
                {i18n.translate('xpack.searchSynonyms.synonymsSetRuleFlyout.unsavedChanges', {
                  defaultMessage: 'Synonym rule has unsaved changes',
                })}
              </EuiHealth>
            )}
          </EuiFlexItem>
          <EuiFlexItem grow={false}>
            <EuiFlexGroup>
              <EuiFlexItem grow={false}>
                <EuiButtonEmpty
                  data-test-subj="searchSynonymsSynonymsRuleFlyoutResetChangesButton"
                  iconType={'refresh'}
                  disabled={!hasChanges}
                  onClick={resetChanges}
                >
                  {i18n.translate('xpack.searchSynonyms.synonymsSetRuleFlyout.reset', {
                    defaultMessage: 'Reset changes',
                  })}
                </EuiButtonEmpty>
              </EuiFlexItem>
              <EuiFlexItem grow={false}>
                <EuiButton
                  data-test-subj="searchSynonymsSynonymsRuleFlyoutSaveButton"
                  fill
                  disabled={!canSave}
                  onClick={() => {
                    if (!synonymsRule.id) {
                      return;
                    }
                    putSynonymsRule({
                      synonymsSetId,
                      ruleId: synonymsRule.id,
                      synonyms: synonymsOptionToString({
                        fromTerms,
                        toTerms: mapToTerms,
                        isExplicit,
                      }),
                    });
                  }}
                >
                  {i18n.translate('xpack.searchSynonyms.synonymsSetRuleFlyout.save', {
                    defaultMessage: 'Save',
                  })}
                </EuiButton>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexItem>
        </EuiFlexGroup>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
