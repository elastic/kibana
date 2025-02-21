/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';

import {
  EuiButton,
  EuiButtonEmpty,
  EuiComboBox,
  EuiComboBoxOptionOption,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiFormRow,
  EuiHealth,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { SynonymsSynonymRule } from '@elastic/elasticsearch/lib/api/types';
import {
  getExplicitSynonym,
  isExplicitSynonym,
  synonymsOptionToString,
  synonymsStringToOption,
} from '../../utils/synonyms_utils';
import { usePutSynonymsRule } from '../../hooks/use_put_synonyms_rule';

interface SynonymsRuleFlyoutProps {
  onClose: () => void;
  flyoutMode: 'create' | 'edit';
  synonymsRule: SynonymsSynonymRule;
  synonymsSetId: string;
  renderExplicit?: boolean;
}

export const SynonymsRuleFlyout: React.FC<SynonymsRuleFlyoutProps> = ({
  flyoutMode,
  synonymsRule,
  onClose,
  renderExplicit = false,
  synonymsSetId,
}) => {
  const flyoutHeadingId = useGeneratedHtmlId({ prefix: 'synonymsRuleFlyoutHeading' });

  const { mutate: putSynonymsRule } = usePutSynonymsRule(() => onClose());

  const synonyms = synonymsRule.synonyms.trim();
  const isExplicit = renderExplicit || isExplicitSynonym(synonyms);

  const [from, to] =
    flyoutMode === 'create' ? ['', ''] : isExplicit ? getExplicitSynonym(synonyms) : [synonyms, ''];

  const [selectedFromTerms, setSelectedFromTerms] = useState<EuiComboBoxOptionOption[]>(
    synonymsStringToOption(from)
  );

  const [selectedToTerms, setSelectedToTerms] = useState<EuiComboBoxOptionOption[]>(
    synonymsStringToOption(to)
  );

  const hasChanges =
    synonyms.trim() !==
    synonymsOptionToString({ fromTerms: selectedFromTerms, toTerms: selectedToTerms, isExplicit });

  return (
    <EuiFlyout onClose={onClose} size="s">
      <EuiFlyoutHeader hasBorder aria-labelledby={flyoutHeadingId}>
        {flyoutMode === 'edit' ? (
          <EuiText>
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
              data-test-subj="searchSynonymsSynonymsRuleFlyoutFieldText"
              value={synonymsRule.id}
            />
          </EuiFormRow>
        )}
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiFormRow
          label={i18n.translate('xpack.searchSynonyms.synonymsSetRuleFlyout.synonyms', {
            defaultMessage: 'Add terms to match against',
          })}
        >
          <EuiComboBox
            fullWidth
            title="Synonyms"
            id="synonyms"
            options={selectedFromTerms}
            selectedOptions={selectedFromTerms}
            onChange={(options) => {
              setSelectedFromTerms(options);
            }}
            onCreateOption={(searchValue, options = []) => {
              if (!searchValue.trim()) {
                return;
              }
              if (!options.find((option) => option.label.trim() === searchValue.toLowerCase())) {
                setSelectedFromTerms([
                  ...selectedFromTerms,
                  { label: searchValue, key: searchValue },
                ]);
              }
            }}
          />
        </EuiFormRow>
        {isExplicit && (
          <EuiFormRow
            label={i18n.translate('xpack.searchSynonyms.synonymsSetRuleFlyout.synonymsTo', {
              defaultMessage: 'Map to this term',
            })}
          >
            <EuiComboBox
              fullWidth
              title="Synonyms"
              id="synonyms-to"
              options={selectedToTerms}
              selectedOptions={selectedToTerms}
              onChange={(options) => {
                setSelectedToTerms(options);
              }}
              onCreateOption={(searchValue, options = []) => {
                if (!searchValue.trim()) {
                  return;
                }
                if (!options.find((option) => option.label.trim() === searchValue.toLowerCase())) {
                  setSelectedToTerms([
                    ...selectedToTerms,
                    { label: searchValue, key: searchValue },
                  ]);
                }
              }}
            />
          </EuiFormRow>
        )}
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiFlexGroup justifyContent="spaceBetween" alignItems="center">
          <EuiFlexItem grow={false}>
            {hasChanges && (
              <EuiHealth color="primary">
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
                  onClick={() => {
                    setSelectedFromTerms(synonymsStringToOption(from));
                    setSelectedToTerms(synonymsStringToOption(to));
                  }}
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
                  onClick={() => {
                    if (!synonymsRule.id) {
                      return;
                    }
                    putSynonymsRule({
                      synonymsSetId,
                      ruleId: synonymsRule.id,
                      synonyms: synonymsOptionToString({
                        fromTerms: selectedFromTerms,
                        toTerms: selectedToTerms,
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
