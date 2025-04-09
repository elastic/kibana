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
import { ChatForm, ChatFormFields } from '../../types';
import { AnalyticsEvents } from '../../analytics/constants';
import { ContextFieldsSelect } from './context_fields_select';

export const EditContextPanel: React.FC = () => {
  const usageTracker = useUsageTracker();
  const { fields } = useSourceIndicesFields();

  const {
    field: { onChange: onChangeSize, value: docSize },
  } = useController({
    name: ChatFormFields.docSize,
  });

  const {
    field: { onChange: onChangeSourceFields, value: sourceFields },
  } = useController<ChatForm, ChatFormFields.sourceFields>({
    name: ChatFormFields.sourceFields,
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

  const handleDocSizeButtonGroupChange = (id: string) => {
    usageTracker?.click(AnalyticsEvents.editContextDocSizeChanged);
    onChangeSize(Number(id));
  };

  return (
    <EuiPanel data-test-subj="editContextPanel">
      <EuiFlexGroup direction="column" gutterSize="l">
        <EuiFlexItem grow={false}>
          <EuiFlexGroup direction="row" gutterSize="m">
            <EuiFlexItem>
              <EuiText>
                <FormattedMessage
                  id="xpack.searchPlayground.editContext.docsRetrievedCount"
                  defaultMessage="Number of documents sent to LLM"
                />
              </EuiText>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiButtonGroup
                legend="Number of documents sent"
                isFullWidth={true}
                buttonSize="compressed"
                options={[
                  {
                    id: '1',
                    label: '1',
                  },
                  {
                    id: '3',
                    label: '3',
                  },
                  {
                    id: '5',
                    label: '5',
                  },
                  {
                    id: '10',
                    label: '10',
                  },
                ]}
                idSelected={String(docSize)}
                onChange={(id) => handleDocSizeButtonGroupChange(id)}
              />
            </EuiFlexItem>
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
