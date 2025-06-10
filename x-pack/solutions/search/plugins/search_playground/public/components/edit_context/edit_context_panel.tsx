/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiPanel,
  EuiText,
  EuiButtonGroup,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import React, { useCallback } from 'react';
import { useController } from 'react-hook-form';
import { useSourceIndicesFields } from '../../hooks/use_source_indices_field';
import { useUsageTracker } from '../../hooks/use_usage_tracker';
import { PlaygroundForm, PlaygroundFormFields } from '../../types';
import { AnalyticsEvents } from '../../analytics/constants';
import { ContextFieldsSelect } from './context_fields_select';

export const EditContextPanel: React.FC = () => {
  const idPrefix = 'playground_context_doc_number';
  const usageTracker = useUsageTracker();
  const { fields } = useSourceIndicesFields();

  const {
    field: { onChange: onChangeSize, value: docSize },
  } = useController({
    name: PlaygroundFormFields.docSize,
  });

  const {
    field: { onChange: onChangeSourceFields, value: sourceFields },
  } = useController<PlaygroundForm, PlaygroundFormFields.sourceFields>({
    name: PlaygroundFormFields.sourceFields,
  });

  const updateSourceField = useCallback(
    (index: string, contextFields: string[]) => {
      onChangeSourceFields({
        ...sourceFields,
        [index]: contextFields,
      });
      usageTracker?.click(AnalyticsEvents.editContextFieldToggled);
    },
    [onChangeSourceFields, sourceFields, usageTracker]
  );

  const handleDocSizeButtonGroupChange = (value: number) => {
    usageTracker?.click(AnalyticsEvents.editContextDocSizeChanged);
    onChangeSize(value);
  };

  return (
    <EuiPanel data-test-subj="editContextPanel">
      <EuiFlexGroup direction="column" gutterSize="l">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup direction="column" gutterSize="m">
            <EuiFlexItem>
              <EuiText>
                <h5>
                  <FormattedMessage
                    id="xpack.searchPlayground.documentsSize.table.title"
                    defaultMessage="Documents"
                  />
                </h5>
              </EuiText>
            </EuiFlexItem>
            <EuiFlexGroup direction="row" gutterSize="m" alignItems="center">
              <EuiFlexItem>
                <EuiText size="xs">
                  <strong>
                    <FormattedMessage
                      id="xpack.searchPlayground.editContext.docsRetrievedCount"
                      defaultMessage="Number of documents sent"
                    />
                  </strong>
                </EuiText>
              </EuiFlexItem>
              <EuiFlexItem>
                <EuiButtonGroup
                  data-test-subj="documentSizeButtonGroup"
                  legend="Number of documents sent"
                  isFullWidth={true}
                  buttonSize="compressed"
                  options={[
                    {
                      id: `${idPrefix}-1`,
                      label: '1',
                      value: 1,
                      'data-test-subj': `${idPrefix}-1`,
                    },
                    {
                      id: `${idPrefix}-3`,
                      label: '3',
                      value: 3,
                      'data-test-subj': `${idPrefix}-3`,
                    },
                    {
                      id: `${idPrefix}-5`,
                      label: '5',
                      value: 5,
                      'data-test-subj': `${idPrefix}-5`,
                    },
                    {
                      id: `${idPrefix}-10`,
                      label: '10',
                      value: 10,
                      'data-test-subj': `${idPrefix}-10`,
                    },
                  ]}
                  idSelected={`${idPrefix}-${docSize}`}
                  onChange={(_, value) => handleDocSizeButtonGroupChange(value)}
                />
              </EuiFlexItem>
            </EuiFlexGroup>
          </EuiFlexGroup>
        </EuiFlexItem>
        <EuiFlexItem>
          <EuiFlexGroup direction="column" gutterSize="m">
            <EuiFlexItem>
              <EuiText>
                <h5>
                  <FormattedMessage
                    id="xpack.searchPlayground.editContext.table.title"
                    defaultMessage="Context fields"
                  />
                </h5>
              </EuiText>
            </EuiFlexItem>
            {Object.entries(fields).map(([index, group]) => (
              <EuiFlexItem grow={false} key={index}>
                <EuiFormRow label={index} fullWidth>
                  <ContextFieldsSelect
                    indexName={index}
                    indexFields={group}
                    selectedContextFields={sourceFields[index] ?? []}
                    updateSelectedContextFields={updateSourceField}
                  />
                </EuiFormRow>
              </EuiFlexItem>
            ))}
          </EuiFlexGroup>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
