/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';

import type { QueryRulesQueryRuleCriteria } from '@elastic/elasticsearch/lib/api/types';
import {
  EuiButtonIcon,
  EuiComboBox,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIconTip,
  EuiPanel,
  EuiSelect,
  EuiText,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import type { FieldError } from 'react-hook-form';
import { FormattedMessage } from '@kbn/i18n-react';

interface QueryRuleMetadataEditorProps {
  onRemove: () => void;
  criteria: QueryRulesQueryRuleCriteria;
  onChange: (criteria: QueryRulesQueryRuleCriteria) => void;
  error?: {
    values?: FieldError;
    metadata?: FieldError;
  };
}

export const QueryRuleMetadataEditor: React.FC<QueryRuleMetadataEditorProps> = ({
  onRemove,
  criteria,
  onChange,
  error,
}) => {
  const [metadataField, setMetadataField] = useState<string>(criteria.metadata || '');
  useEffect(() => {
    setMetadataField(criteria?.metadata ?? '');
  }, [criteria]);

  return (
    <EuiPanel data-test-subj="searchQueryRulesQueryRuleMetadataEditor" hasBorder>
      <EuiFlexGroup direction="row">
        <EuiFlexItem>
          <EuiFormRow
            fullWidth
            label={
              <EuiFlexGroup alignItems="center" gutterSize="s">
                <EuiFlexItem grow={false}>
                  <EuiText size="xs">
                    <FormattedMessage
                      id="xpack.search.queryRulesetDetail.queryRuleFlyout.metadataEditorLabel"
                      defaultMessage="Metadata field"
                    />
                  </EuiText>
                </EuiFlexItem>
                <EuiFlexItem grow={false}>
                  <EuiIconTip
                    content={i18n.translate(
                      'xpack.search.queryRulesetDetail.queryRuleFlyout.metadataEditorTooltip',
                      {
                        defaultMessage:
                          'Metadata is used to match documents based on their query criteria. Metadata is ignored when the type is set to "always".',
                      }
                    )}
                    type="question"
                    color="subdued"
                    aria-label={i18n.translate(
                      'xpack.search.queryRulesetDetail.queryRuleFlyout.metadataEditorTooltipLabel',
                      {
                        defaultMessage: 'Metadata field tooltip',
                      }
                    )}
                  />
                </EuiFlexItem>
              </EuiFlexGroup>
            }
            isInvalid={!!error?.metadata}
            error={error?.metadata ? error.metadata.message : undefined}
            isDisabled={criteria.type === 'always'}
          >
            <EuiFieldText
              isInvalid={!!error?.metadata}
              data-test-subj="searchQueryRulesQueryRuleMetadataEditorField"
              fullWidth
              aria-label={i18n.translate(
                'xpack.search.queryRulesetDetail.queryRuleFlyout.metadataEditorLabel',
                {
                  defaultMessage: 'Enter metadata field name',
                }
              )}
              value={metadataField}
              onChange={(e) => {
                setMetadataField(e.target.value);
              }}
              onBlur={() => {
                onChange({
                  ...criteria,
                  metadata: metadataField,
                });
              }}
            />
          </EuiFormRow>
          <EuiFormRow fullWidth>
            <EuiFlexGroup alignItems="flexStart" direction="row">
              <EuiFlexItem grow={false}>
                <EuiFormRow
                  label={i18n.translate(
                    'xpack.search.queryRulesetDetail.queryRuleFlyout.metadataEditorOperatorLabel',
                    {
                      defaultMessage: 'Match type',
                    }
                  )}
                  aria-label={i18n.translate(
                    'xpack.search.queryRulesetDetail.queryRuleFlyout.metadataEditorOperatorLabel',
                    {
                      defaultMessage: 'Select matching type',
                    }
                  )}
                >
                  <EuiSelect
                    data-test-subj="searchQueryRulesQueryRuleMetadataEditorSelect"
                    aria-label={i18n.translate(
                      'xpack.search.queryRulesetDetail.queryRuleFlyout.metadataEditorOperatorLabel',
                      {
                        defaultMessage: 'Select matching type',
                      }
                    )}
                    options={[
                      {
                        value: 'global',
                        text: i18n.translate(
                          'xpack.search.queryRulesetDetail.queryRuleFlyout.operatorGlobal',
                          { defaultMessage: 'global' }
                        ),
                      },
                      {
                        value: 'exact',
                        text: i18n.translate(
                          'xpack.search.queryRulesetDetail.queryRuleFlyout.operatorExact',
                          { defaultMessage: 'exact' }
                        ),
                      },
                      {
                        value: 'exact_fuzzy',
                        text: i18n.translate(
                          'xpack.search.queryRulesetDetail.queryRuleFlyout.operatorExactFuzzy',
                          { defaultMessage: 'exact fuzzy' }
                        ),
                      },
                      {
                        value: 'fuzzy',
                        text: i18n.translate(
                          'xpack.search.queryRulesetDetail.queryRuleFlyout.operatorFuzzy',
                          { defaultMessage: 'fuzzy' }
                        ),
                      },
                      {
                        value: 'prefix',
                        text: i18n.translate(
                          'xpack.search.queryRulesetDetail.queryRuleFlyout.operatorPrefix',
                          { defaultMessage: 'prefix' }
                        ),
                      },
                      {
                        value: 'suffix',
                        text: i18n.translate(
                          'xpack.search.queryRulesetDetail.queryRuleFlyout.operatorSuffix',
                          { defaultMessage: 'suffix' }
                        ),
                      },
                      {
                        value: 'contains',
                        text: i18n.translate(
                          'xpack.search.queryRulesetDetail.queryRuleFlyout.operatorContains',
                          { defaultMessage: 'contains' }
                        ),
                      },
                      {
                        value: 'lt',
                        text: i18n.translate(
                          'xpack.search.queryRulesetDetail.queryRuleFlyout.operatorLessThan',
                          { defaultMessage: 'less than' }
                        ),
                      },
                      {
                        value: 'lte',
                        text: i18n.translate(
                          'xpack.search.queryRulesetDetail.queryRuleFlyout.operatorLessThanOrEqual',
                          { defaultMessage: 'less than or equal' }
                        ),
                      },
                      {
                        value: 'gt',
                        text: i18n.translate(
                          'xpack.search.queryRulesetDetail.queryRuleFlyout.operatorGreaterThan',
                          { defaultMessage: 'greater than' }
                        ),
                      },
                      {
                        value: 'gte',
                        text: i18n.translate(
                          'xpack.search.queryRulesetDetail.queryRuleFlyout.operatorGreaterThanOrEqual',
                          { defaultMessage: 'greater than or equal' }
                        ),
                      },
                      {
                        value: 'always',
                        text: i18n.translate(
                          'xpack.search.queryRulesetDetail.queryRuleFlyout.operatorAlways',
                          { defaultMessage: 'always' }
                        ),
                      },
                    ]}
                    onChange={(e) => {
                      onChange({
                        ...criteria,
                        type: e.target.value as QueryRulesQueryRuleCriteria['type'],
                      });
                    }}
                    value={criteria.type}
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem grow>
                <EuiFormRow
                  fullWidth
                  label={
                    <EuiFlexGroup alignItems="center" gutterSize="s">
                      <EuiFlexItem grow={false}>
                        <EuiText size="xs">
                          <FormattedMessage
                            id="xpack.search.queryRulesetDetail.queryRuleFlyout.metadataEditorValuesLabel"
                            defaultMessage="Values"
                          />
                        </EuiText>
                      </EuiFlexItem>
                      <EuiFlexItem grow={false}>
                        <EuiIconTip
                          content={i18n.translate(
                            'xpack.search.queryRulesetDetail.queryRuleFlyout.metadataEditorValuesTooltip',
                            {
                              defaultMessage:
                                'Values are used to match documents based on their query criteria. Values are ignored when the type is set to "always".',
                            }
                          )}
                          type="question"
                          color="subdued"
                          aria-label={i18n.translate(
                            'xpack.search.queryRulesetDetail.queryRuleFlyout.metadataEditorValuesTooltipLabel',
                            {
                              defaultMessage: 'Metadata values tooltip',
                            }
                          )}
                        />
                      </EuiFlexItem>
                    </EuiFlexGroup>
                  }
                  isInvalid={!!error?.values}
                  isDisabled={criteria.type === 'always'}
                  error={error?.values ? error.values.message : undefined}
                >
                  <EuiComboBox
                    isInvalid={!!error?.values}
                    isDisabled={criteria.type === 'always'}
                    data-test-subj="searchQueryRulesQueryRuleMetadataEditorValues"
                    fullWidth
                    aria-label={i18n.translate(
                      'xpack.search.queryRulesetDetail.queryRuleFlyout.metadataEditorValuesLabel',
                      {
                        defaultMessage: 'Select or create new values',
                      }
                    )}
                    selectedOptions={criteria?.values?.map((value) => ({ label: value }))}
                    options={
                      criteria?.values ? criteria.values.map((value) => ({ label: value })) : []
                    }
                    onCreateOption={(newOption) => {
                      onChange({
                        ...criteria,
                        values: [...(criteria.values || []), newOption],
                      });
                    }}
                    onChange={(selectedOptions) => {
                      onChange({
                        ...criteria,
                        values: selectedOptions.map((option) => option.label),
                      });
                    }}
                    customOptionText={i18n.translate(
                      'xpack.search.queryRulesetDetail.queryRuleFlyout.createNewMetadataValue',
                      {
                        defaultMessage: 'Create new metadata value: {newMetadataValue}',
                        values: { newMetadataValue: 'New Metadata Value' },
                      }
                    )}
                  />
                </EuiFormRow>
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFormRow>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            data-test-subj="searchQueryRulesQueryRuleMetadataEditorDeleteButton"
            iconType="minusInCircle"
            color="danger"
            onClick={onRemove}
            aria-label={i18n.translate(
              'xpack.search.queryRulesetDetail.queryRuleFlyout.removeCriteriaButton',
              {
                defaultMessage: 'Remove criteria',
              }
            )}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
