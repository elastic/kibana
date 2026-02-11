/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useCallback, useState, useRef } from 'react';

import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiCallOut, EuiComboBox, EuiFormRow } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import type { QuerySourceFields } from '../../types';

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
  const searchValue = useRef('');
  const [hasError, setHasError] = useState(false);

  const handleSearchChange = (value: string) => {
    searchValue.current = value;
    setHasError(false);
  };

  const handleBlur = () => {
    if (searchValue.current.trim() === '') return;

    const hasExactMatch = selectOptions.some(
      (opt) => opt.label.toLowerCase() === searchValue.current.toLowerCase()
    );

    setHasError(!hasExactMatch);
  };

  const { options: selectOptions, selectedOptions } = useMemo(() => {
    if (!indexFields.source_fields?.length) return { options: [], selectedOptions: [] };

    const options: Array<EuiComboBoxOptionOption<unknown>> = indexFields.source_fields.map(
      (field) => ({
        label: field,
        'data-test-subj': `contextField-${field}`,
      })
    );
    const selected: Array<EuiComboBoxOptionOption<unknown>> =
      selectedContextFields
        ?.map((field) => options.find((opt) => opt.label === field))
        ?.filter(
          (
            val: EuiComboBoxOptionOption<unknown> | undefined
          ): val is EuiComboBoxOptionOption<unknown> => val !== undefined
        ) ?? [];
    return {
      options,
      selectedOptions: selected,
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
        announceOnMount
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
    <EuiFormRow
      fullWidth
      isInvalid={hasError}
      error={
        hasError
          ? `"${searchValue.current}" ${i18n.translate(
              'xpack.searchPlayground.editContext.noSourceFieldWarning',
              {
                defaultMessage: 'does not match any options',
              }
            )}`
          : undefined
      }
    >
      <EuiComboBox
        data-test-subj={`contextFieldsSelectable-${indexName}`}
        options={selectOptions}
        selectedOptions={selectedOptions}
        onChange={onSelectFields}
        isClearable={false}
        fullWidth
        aria-label={i18n.translate('xpack.searchPlayground.editContext.ariaLabel', {
          defaultMessage: 'Select context field options',
        })}
        onSearchChange={handleSearchChange}
        onBlur={handleBlur}
        isInvalid={hasError}
      />
    </EuiFormRow>
  );
};
