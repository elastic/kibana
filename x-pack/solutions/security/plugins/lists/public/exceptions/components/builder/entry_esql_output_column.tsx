/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { EuiComboBox, EuiFieldText, EuiFlexGroup, EuiFlexItem, EuiFormRow } from '@elastic/eui';
import styled from '@emotion/styled';
import type { ColumnType } from '@kbn/securitysolution-io-ts-list-types';
import { ListOperatorTypeEnum as OperatorTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import { getEntryValueProblems } from '@kbn/securitysolution-exceptions-common/esql_output_columns';
import type { InvalidValueProblem } from '@kbn/securitysolution-exceptions-common/esql_output_columns';
import type { BuilderEntry, OperatorOption } from '@kbn/securitysolution-list-utils';
import {
  ESQL_OUTPUT_COLUMN_OPERATORS,
  getColumnTypesForOperator,
  getEntryOnEsqlOutputColumnFieldChange,
  getEntryOnEsqlOutputColumnOperatorChange,
  getEntryOnEsqlOutputColumnTypeChange,
  getEntryOnEsqlOutputColumnValueChange,
  getEsqlOutputColumnOperator,
} from '@kbn/securitysolution-list-utils';

import { getEmptyValue } from '../../../common/empty_value';

import type { EntryFieldError } from './reducer';
import * as i18n from './translations';

const SINGLE_SELECTION = { asPlainText: true };
const FIXED_WIDTH_STYLE = { width: '150px' };

const FieldFlexItem = styled(EuiFlexItem)`
  overflow: hidden;
`;

export interface EsqlOutputColumnEntryItemProps {
  entry: BuilderEntry;
  entryIndex: number;
  exceptionItemIndex: number;
  isDisabled?: boolean;
  onChange: (entry: BuilderEntry, entryIndex: number) => void;
  /** Tells the form that the entry has an error, so that the item cannot be saved until the user fixes it */
  setErrorsExist: (error: EntryFieldError) => void;
  showLabel: boolean;
}

const MAX_PROBLEMS_SHOWN = 3;

/** The problem as the user reads it in the form. The API returns the same problems in English. */
const describeProblem = (problem: InvalidValueProblem): string => {
  if (problem.code === 'value_not_valid_for_column_type') {
    return i18n.ESQL_OUTPUT_COLUMN_VALUE_NOT_VALID(problem.value, problem.columnType);
  }
  if (problem.code === 'wildcard_ends_with_backslash') {
    return i18n.ESQL_OUTPUT_COLUMN_WILDCARD_ENDS_WITH_BACKSLASH(problem.value);
  }
  if (problem.code === 'wildcard_too_long') {
    return i18n.ESQL_OUTPUT_COLUMN_WILDCARD_TOO_LONG(problem.maxLength);
  }
  return i18n.ESQL_OUTPUT_COLUMN_OPERATOR_NOT_SUPPORTED(problem.columnType);
};

const getValues = (entry: BuilderEntry): string[] =>
  'value' in entry && Array.isArray(entry.value) ? entry.value : [];

const getValue = (entry: BuilderEntry): string =>
  'value' in entry && typeof entry.value === 'string' ? entry.value : '';

/**
 * An entry of an item that applies to the ES|QL output columns. The field is the name of a column that the query returns,
 * so it is typed, and the column type that the user picks is limited to the types that the operator supports.
 */
export const BuilderEsqlOutputColumnEntryItem: React.FC<EsqlOutputColumnEntryItemProps> = ({
  entry,
  entryIndex,
  exceptionItemIndex,
  isDisabled = false,
  onChange,
  setErrorsExist,
  showLabel,
}): JSX.Element => {
  const operator = getEsqlOutputColumnOperator(entry);
  // The same check as the API makes, from the exceptions package, so that the user fixes the value before saving
  const valueErrors = useMemo(
    (): string[] => [
      ...new Set(getEntryValueProblems(entry).map(({ problem }) => describeProblem(problem))),
    ],
    [entry]
  );
  const hasErrors = valueErrors.length > 0;
  const errorKey = entry.id ?? `${exceptionItemIndex}-${entryIndex}`;
  useEffect(() => {
    setErrorsExist({ [errorKey]: hasErrors });
    return (): void => setErrorsExist({ [errorKey]: false });
  }, [errorKey, hasErrors, setErrorsExist]);
  const columnTypes = useMemo(() => getColumnTypesForOperator(operator), [operator]);
  const ariaLabel = useCallback(
    (name: string): string => i18n.EXCEPTION_ITEM_ARIA_LABEL(name, exceptionItemIndex, entryIndex),
    [exceptionItemIndex, entryIndex]
  );

  const handleFieldChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      onChange(getEntryOnEsqlOutputColumnFieldChange(entry, event.target.value), entryIndex);
    },
    [entry, entryIndex, onChange]
  );

  const operatorOptions = useMemo(
    (): Array<EuiComboBoxOptionOption<OperatorOption>> =>
      ESQL_OUTPUT_COLUMN_OPERATORS.map((option) => ({ label: option.message, value: option })),
    []
  );
  const selectedOperatorOptions = useMemo(
    () => operatorOptions.filter(({ value }) => value === operator),
    [operatorOptions, operator]
  );
  const handleOperatorChange = useCallback(
    ([selected]: Array<EuiComboBoxOptionOption<OperatorOption>>): void => {
      if (selected?.value) {
        onChange(getEntryOnEsqlOutputColumnOperatorChange(entry, selected.value), entryIndex);
      }
    },
    [entry, entryIndex, onChange]
  );

  const columnTypeOptions = useMemo(
    (): Array<EuiComboBoxOptionOption<ColumnType>> =>
      columnTypes.map((type) => ({ label: type, value: type })),
    [columnTypes]
  );
  const selectedColumnType = 'column_type' in entry ? entry.column_type : undefined;
  const selectedColumnTypeOptions = useMemo(
    () => columnTypeOptions.filter(({ value }) => value === selectedColumnType),
    [columnTypeOptions, selectedColumnType]
  );
  const handleColumnTypeChange = useCallback(
    ([selected]: Array<EuiComboBoxOptionOption<ColumnType>>): void => {
      onChange(getEntryOnEsqlOutputColumnTypeChange(entry, selected?.value), entryIndex);
    },
    [entry, entryIndex, onChange]
  );

  const handleValueChange = useCallback(
    (event: React.ChangeEvent<HTMLInputElement>): void => {
      onChange(getEntryOnEsqlOutputColumnValueChange(entry, event.target.value), entryIndex);
    },
    [entry, entryIndex, onChange]
  );
  const handleValuesChange = useCallback(
    (selected: EuiComboBoxOptionOption[]): void => {
      onChange(
        getEntryOnEsqlOutputColumnValueChange(
          entry,
          selected.map(({ label }) => label)
        ),
        entryIndex
      );
    },
    [entry, entryIndex, onChange]
  );
  const handleCreateValue = useCallback(
    (searchValue: string): void => {
      const value = searchValue.trim();
      if (value !== '' && !getValues(entry).includes(value)) {
        onChange(
          getEntryOnEsqlOutputColumnValueChange(entry, [...getValues(entry), value]),
          entryIndex
        );
      }
    },
    [entry, entryIndex, onChange]
  );

  const renderValue = (): JSX.Element => {
    switch (entry.type) {
      case OperatorTypeEnum.MATCH_ANY:
        return (
          <EuiComboBox
            noSuggestions
            fullWidth
            isDisabled={isDisabled}
            isInvalid={hasErrors}
            placeholder={i18n.ESQL_OUTPUT_COLUMN_VALUES_PLACEHOLDER}
            selectedOptions={getValues(entry).map((label) => ({ label }))}
            onChange={handleValuesChange}
            onCreateOption={handleCreateValue}
            aria-label={ariaLabel(i18n.VALUE)}
            data-test-subj="exceptionBuilderEsqlEntryValueMatchAny"
          />
        );
      case OperatorTypeEnum.EXISTS:
        return (
          <EuiFieldText
            fullWidth
            disabled
            placeholder={getEmptyValue()}
            aria-label={ariaLabel(i18n.VALUE)}
            data-test-subj="exceptionBuilderEsqlEntryValueExists"
          />
        );
      default:
        return (
          <EuiFieldText
            fullWidth
            disabled={isDisabled}
            isInvalid={hasErrors}
            placeholder={i18n.ESQL_OUTPUT_COLUMN_VALUE_PLACEHOLDER}
            value={getValue(entry)}
            onChange={handleValueChange}
            aria-label={ariaLabel(i18n.VALUE)}
            data-test-subj="exceptionBuilderEsqlEntryValue"
          />
        );
    }
  };

  return (
    <EuiFlexGroup
      direction="row"
      gutterSize="s"
      alignItems="flexStart"
      data-test-subj="exceptionItemEntryContainer"
    >
      <FieldFlexItem grow={4}>
        <EuiFormRow
          fullWidth
          label={showLabel ? i18n.FIELD : ''}
          helpText={showLabel ? i18n.ESQL_OUTPUT_COLUMN_FIELD_HELP_TEXT : undefined}
        >
          <EuiFieldText
            fullWidth
            disabled={isDisabled}
            placeholder={i18n.ESQL_OUTPUT_COLUMN_FIELD_PLACEHOLDER}
            value={entry.field ?? ''}
            onChange={handleFieldChange}
            aria-label={ariaLabel(i18n.FIELD)}
            data-test-subj="exceptionBuilderEsqlEntryField"
          />
        </EuiFormRow>
      </FieldFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFormRow label={showLabel ? i18n.OPERATOR : ''}>
          <EuiComboBox
            isClearable={false}
            isDisabled={isDisabled}
            options={operatorOptions}
            selectedOptions={selectedOperatorOptions}
            singleSelection={SINGLE_SELECTION}
            onChange={handleOperatorChange}
            style={FIXED_WIDTH_STYLE}
            aria-label={ariaLabel(i18n.OPERATOR)}
            data-test-subj="exceptionBuilderEsqlEntryOperator"
          />
        </EuiFormRow>
      </EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiFormRow label={showLabel ? i18n.COLUMN_TYPE : ''}>
          <EuiComboBox
            isClearable={false}
            isDisabled={isDisabled}
            options={columnTypeOptions}
            placeholder={i18n.COLUMN_TYPE_PLACEHOLDER}
            selectedOptions={selectedColumnTypeOptions}
            singleSelection={SINGLE_SELECTION}
            onChange={handleColumnTypeChange}
            style={FIXED_WIDTH_STYLE}
            aria-label={ariaLabel(i18n.COLUMN_TYPE)}
            data-test-subj="exceptionBuilderEsqlEntryColumnType"
          />
        </EuiFormRow>
      </EuiFlexItem>
      <FieldFlexItem grow={5}>
        <EuiFormRow
          fullWidth
          label={showLabel ? i18n.VALUE : ''}
          isInvalid={hasErrors}
          error={valueErrors.slice(0, MAX_PROBLEMS_SHOWN)}
        >
          {renderValue()}
        </EuiFormRow>
      </FieldFlexItem>
    </EuiFlexGroup>
  );
};

BuilderEsqlOutputColumnEntryItem.displayName = 'BuilderEsqlOutputColumnEntryItem';
