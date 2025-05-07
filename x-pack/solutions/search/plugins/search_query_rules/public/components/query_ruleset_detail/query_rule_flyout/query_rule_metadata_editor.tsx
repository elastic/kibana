/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';

import {
  EuiButtonIcon,
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPanel,
  EuiSelect,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { QueryRulesQueryRuleCriteria } from '@elastic/elasticsearch/lib/api/types';

interface QueryRuleMetadataEditorProps {
  onRemove: () => void;
  criteria: QueryRulesQueryRuleCriteria;
  onChange: (criteria: QueryRulesQueryRuleCriteria) => void;
}

export const QueryRuleMetadataEditor: React.FC<QueryRuleMetadataEditorProps> = ({
  onRemove,
  criteria,
  onChange,
}) => {
  const [metadataField, setMetadataField] = React.useState(criteria.metadata);
  const [operator, setOperator] = React.useState(criteria.type);
  const [values, setValues] = React.useState(criteria.values);
  return (
    <EuiPanel hasBorder>
      <EuiFlexGroup direction="row">
        <EuiFlexItem>
          <EuiFormRow
            fullWidth
            label={i18n.translate(
              'xpack.search.queryRulesetDetail.queryRuleFlyout.metadataEditorLabel',
              {
                defaultMessage: 'Metadata field',
              }
            )}
          >
            <EuiComboBox
              fullWidth
              aria-label={i18n.translate(
                'xpack.search.queryRulesetDetail.queryRuleFlyout.metadataEditorLabel',
                {
                  defaultMessage: 'Select or create a new metadata field',
                }
              )}
              options={[{ label: 'Field 1' }, { label: 'Field 2' }, { label: 'Field 3' }]}
              selectedOptions={metadataField ? [{ label: metadataField }] : []}
              onCreateOption={(newOption) => {
                // Logic to create a new option
              }}
              customOptionText={i18n.translate(
                'xpack.search.queryRulesetDetail.queryRuleFlyout.createNewMetadata',
                {
                  defaultMessage: 'Create new metadata field: {newMetadata}',
                  values: { newMetadata: 'New Metadata' },
                }
              )}
            />
          </EuiFormRow>
          <EuiFormRow fullWidth>
            <EuiFlexGroup alignItems="center" direction="row">
              <EuiFlexItem grow={false}>
                <EuiFormRow
                  label={i18n.translate(
                    'xpack.search.queryRulesetDetail.queryRuleFlyout.metadataEditorOperatorLabel',
                    {
                      defaultMessage: 'Match type',
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
                      // Logic to handle operator change
                    }}
                    value={operator}
                  />
                </EuiFormRow>
              </EuiFlexItem>
              <EuiFlexItem grow>
                <EuiFormRow
                  fullWidth
                  label={i18n.translate(
                    'xpack.search.queryRulesetDetail.queryRuleFlyout.metadataEditorValuesLabel',
                    {
                      defaultMessage: 'Values',
                    }
                  )}
                >
                  <EuiComboBox
                    data-test-subj="searchQueryRulesQueryRuleMetadataEditorValues"
                    fullWidth
                    aria-label={i18n.translate(
                      'xpack.search.queryRulesetDetail.queryRuleFlyout.metadataEditorValuesLabel',
                      {
                        defaultMessage: 'Select or create new values',
                      }
                    )}
                    selectedOptions={criteria?.values?.map((value) => ({ label: value }))}
                    options={[{ label: 'Value 1' }, { label: 'Value 2' }, { label: 'Value 3' }]}
                    onCreateOption={(newOption) => {
                      // Logic to create a new option
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
            data-test-subj="searchQueryRulesQueryRuleMetadataEditorButton"
            iconType="minusInCircle"
            color="danger"
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
