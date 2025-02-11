/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback } from 'react';

import { EuiCallOut, EuiComboBox, EuiComboBoxOptionOption } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { QuerySourceFields } from '../../types';

export interface ContextFieldsSelectProps {
  indexName: string;
  indexFields: QuerySourceFields;
  selectedContextFields?: string[];
  updateSelectedContextFields: (index: string, value: string[]) => void;
}

export const ContextFieldsSelect = ({
  indexName,
  indexFields,
  selectedContextFields,
  updateSelectedContextFields,
}: ContextFieldsSelectProps) => {
  const { options: selectOptions, selectedOptions } = useMemo(() => {
    if (!indexFields.source_fields?.length) return { options: [], selectedOptions: [] };

    const options = indexFields.source_fields.map((field) => ({
      label: field,
      'data-test-subj': `contextField-${field}`,
    }));
    return {
      options,
      selectedOptions: options.filter((opt) => selectedContextFields?.includes(opt.label)),
    };
  }, [indexFields.source_fields, selectedContextFields]);
  const onSelectFields = useCallback(
    (updatedSelectedOptions: Array<EuiComboBoxOptionOption<unknown>>) => {
      // always require at least 1 selected field
      if (updatedSelectedOptions.length === 0) return;
      updateSelectedContextFields(
        indexName,
        updatedSelectedOptions.map((opt) => opt.label)
      );
    },
    [indexName, updateSelectedContextFields]
  );

  if (selectOptions.length === 0) {
    return (
      <EuiCallOut
        title={i18n.translate('xpack.searchPlayground.editContext.noSourceFieldWarning', {
          defaultMessage: 'No source fields found',
        })}
        color="warning"
        iconType="warning"
        size="s"
      />
    );
  }

  return (
    <EuiComboBox
      data-test-subj={`contextFieldsSelectable-${indexName}`}
      options={selectOptions}
      selectedOptions={selectedOptions}
      onChange={onSelectFields}
      isClearable={false}
      fullWidth
    />
  );
};
