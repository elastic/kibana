/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo } from 'react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiTextColor,
  EuiToolTip,
} from '@elastic/eui';
import { UseField } from '../../../../shared_imports';
import { NameComboBox } from './name_combobox';
import { TypeComboBox } from './type_combobox';
import { makeValidateRequiredField } from './make_validate_required_field';
import * as i18n from './translations';

import type { ArrayItem, FieldConfig, FieldHook } from '../../../../shared_imports';
import type {
  RequiredField,
  RequiredFieldInput,
} from '../../../../../common/api/detection_engine/model/rule_schema/common_attributes.gen';

export interface RequiredFieldWarnings {
  nameWarning: string;
  typeWarning: string;
}

interface RequiredFieldRowProps {
  item: ArrayItem;
  isFolded: boolean;
  onFoldedRowError: () => void;
  removeItem: (id: number) => void;
  typesByFieldName: Record<string, string[] | undefined>;
  getAvailableFieldNames: () => string[];
  getWarnings: (value: RequiredFieldInput) => RequiredFieldWarnings;
  parentFieldPath: string;
}

/*
  Rows and their fields are memoized and receive only referentially stable props,
  so a change in one row or in the form state doesn't re-render all the other rows.
*/
export const RequiredFieldRow = React.memo(function RequiredFieldRow({
  item,
  isFolded,
  onFoldedRowError,
  removeItem,
  typesByFieldName,
  getAvailableFieldNames,
  getWarnings,
  parentFieldPath,
}: RequiredFieldRowProps) {
  const handleRemove = useCallback(() => removeItem(item.id), [removeItem, item.id]);

  const rowFieldConfig: FieldConfig<RequiredField | RequiredFieldInput, {}, RequiredFieldInput> =
    useMemo(
      () => ({
        validations: [{ validator: makeValidateRequiredField(parentFieldPath) }],
        defaultValue: { name: '', type: '' },
      }),
      [parentFieldPath]
    );

  const componentProps = useMemo(
    () => ({
      onError: onFoldedRowError,
      itemId: item.id,
      autoFocus: item.isNew,
      onRemove: handleRemove,
      typesByFieldName,
      getWarnings,
      getAvailableFieldNames,
    }),
    [
      onFoldedRowError,
      item.id,
      item.isNew,
      handleRemove,
      typesByFieldName,
      getWarnings,
      getAvailableFieldNames,
    ]
  );

  return (
    <UseField
      key={item.id}
      path={item.path}
      config={rowFieldConfig}
      component={isFolded ? FoldedRequiredFieldField : RequiredFieldField}
      readDefaultValueOnForm={!item.isNew}
      componentProps={componentProps}
    />
  );
});

interface RequiredFieldFieldProps {
  field: FieldHook<RequiredFieldInput>;
  onRemove: () => void;
  autoFocus?: boolean;
  typesByFieldName: Record<string, string[] | undefined>;
  getAvailableFieldNames: () => string[];
  getWarnings: (value: RequiredFieldInput) => RequiredFieldWarnings;
  itemId: string;
}

const RequiredFieldField = React.memo(function RequiredFieldField({
  field,
  typesByFieldName,
  onRemove,
  autoFocus,
  getAvailableFieldNames,
  getWarnings,
  itemId,
}: RequiredFieldFieldProps) {
  const { nameWarning, typeWarning } = getWarnings(field.value);
  const warningMessage = nameWarning || typeWarning;

  const [nameError, typeError] = useMemo(() => {
    return [
      field.errors.find((error) => 'path' in error && error.path === `${field.path}.name`),
      field.errors.find((error) => 'path' in error && error.path === `${field.path}.type`),
    ];
  }, [field.path, field.errors]);
  const hasError = Boolean(nameError) || Boolean(typeError);
  const errorMessage = nameError?.message || typeError?.message;

  return (
    <EuiFormRow
      fullWidth
      isInvalid={hasError}
      error={errorMessage}
      helpText={
        warningMessage && !hasError ? (
          <EuiTextColor
            color="warning"
            id={`warningText-${itemId}`}
            data-test-subj={`${field.value.name}-warningText`}
          >
            {warningMessage}
          </EuiTextColor>
        ) : (
          ''
        )
      }
      color="warning"
    >
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow>
          <NameComboBox
            field={field}
            itemId={itemId}
            autoFocus={autoFocus}
            getAvailableFieldNames={getAvailableFieldNames}
            typesByFieldName={typesByFieldName}
            nameWarning={nameWarning}
            nameError={nameError}
          />
        </EuiFlexItem>
        <EuiFlexItem grow>
          <TypeComboBox
            field={field}
            itemId={itemId}
            typesByFieldName={typesByFieldName}
            typeWarning={typeWarning}
            typeError={typeError}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiToolTip
            content={i18n.REMOVE_REQUIRED_FIELD_BUTTON_ARIA_LABEL}
            disableScreenReaderOutput
          >
            <EuiButtonIcon
              color="danger"
              iconType="trash"
              onClick={onRemove}
              aria-label={i18n.REMOVE_REQUIRED_FIELD_BUTTON_ARIA_LABEL}
              data-test-subj={`removeRequiredFieldButton-${field.value.name}`}
            />
          </EuiToolTip>
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormRow>
  );
});

interface FoldedRequiredFieldFieldProps {
  field: FieldHook<RequiredFieldInput>;
  onError: () => void;
}

/* Keeps a folded row registered in the form without rendering it, unfolds rows on validation errors */
const FoldedRequiredFieldField = ({ field, onError }: FoldedRequiredFieldFieldProps) => {
  const hasErrors = field.errors.length > 0;

  useEffect(() => {
    if (hasErrors) {
      onError();
    }
  }, [hasErrors, onError]);

  return null;
};
