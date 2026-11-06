/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  EuiButtonIcon,
  EuiFieldText,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiIcon,
  EuiTextColor,
  EuiToolTip,
  useEuiTheme,
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

/*
  - "full" renders comboboxes
  - "compact" renders cheap text inputs until the user focuses the row
  - "folded" renders nothing but keeps the row registered in the form, invalid folded rows reveal themselves
*/
export type RequiredFieldRowView = 'full' | 'compact' | 'folded';

type RequiredFieldInputKey = keyof RequiredFieldInput;

interface RequiredFieldRowProps {
  item: ArrayItem;
  view: RequiredFieldRowView;
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
  view,
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
      itemId: item.id,
      autoFocus: item.isNew ? 'name' : undefined,
      onRemove: handleRemove,
      typesByFieldName,
      getWarnings,
      getAvailableFieldNames,
    }),
    [item.id, item.isNew, handleRemove, typesByFieldName, getWarnings, getAvailableFieldNames]
  );

  return (
    <UseField
      key={item.id}
      path={item.path}
      config={rowFieldConfig}
      component={ROW_VIEW_COMPONENTS[view]}
      readDefaultValueOnForm={!item.isNew}
      componentProps={componentProps}
    />
  );
});

interface RequiredFieldFieldProps {
  field: FieldHook<RequiredFieldInput>;
  onRemove: () => void;
  autoFocus?: RequiredFieldInputKey;
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
          <WarningText itemId={itemId} name={field.value.name} message={warningMessage} />
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
            autoFocus={autoFocus === 'name'}
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
            autoFocus={autoFocus === 'type'}
            typesByFieldName={typesByFieldName}
            typeWarning={typeWarning}
            typeError={typeError}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <RemoveButton name={field.value.name} onRemove={onRemove} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormRow>
  );
});

/*
  Renders plain text inputs instead of comboboxes, since mounting comboboxes for hundreds of rows is slow.
  Switches to comboboxes for good once the user focuses an input or the row becomes invalid.
*/
const CompactRequiredFieldField = React.memo(function CompactRequiredFieldField(
  props: RequiredFieldFieldProps
) {
  const { field, onRemove, getWarnings, itemId } = props;
  const [isActive, setIsActive] = useState(false);
  const [autoFocus, setAutoFocus] = useState<RequiredFieldInputKey>();
  const hasErrors = field.errors.length > 0;

  const activateName = useCallback(() => {
    setAutoFocus('name');
    setIsActive(true);
  }, []);

  const activateType = useCallback(() => {
    setAutoFocus('type');
    setIsActive(true);
  }, []);

  useEffect(() => {
    if (hasErrors) {
      setIsActive(true);
    }
  }, [hasErrors]);

  if (isActive || hasErrors) {
    return <RequiredFieldField {...props} autoFocus={autoFocus} />;
  }

  const { name, type } = field.value;
  const { nameWarning, typeWarning } = getWarnings(field.value);
  const warningMessage = nameWarning || typeWarning;

  return (
    <EuiFormRow
      fullWidth
      helpText={
        warningMessage ? <WarningText itemId={itemId} name={name} message={warningMessage} /> : ''
      }
      color="warning"
    >
      <EuiFlexGroup alignItems="center">
        <EuiFlexItem grow>
          <EuiFieldText
            value={name}
            onFocus={activateName}
            onChange={activateName}
            aria-label={i18n.FIELD_NAME}
            prepend={nameWarning ? <WarningIcon itemId={itemId} /> : undefined}
            data-test-subj={`requiredFieldNameCompact-${name || 'empty'}`}
          />
        </EuiFlexItem>
        <EuiFlexItem grow>
          <EuiFieldText
            value={type}
            onFocus={activateType}
            onChange={activateType}
            aria-label={i18n.FIELD_TYPE}
            prepend={typeWarning ? <WarningIcon itemId={itemId} /> : undefined}
            data-test-subj={`requiredFieldTypeCompact-${type || 'empty'}`}
          />
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <RemoveButton name={name} onRemove={onRemove} />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiFormRow>
  );
});

/*
  Keeps a folded row registered in the form without rendering it. An invalid folded row
  reveals itself so the user can fix it while the rest of the list stays folded, and it stays
  revealed once fixed so it doesn't disappear while being edited.
*/
const FoldedRequiredFieldField = React.memo(function FoldedRequiredFieldField(
  props: RequiredFieldFieldProps
) {
  const hasErrors = props.field.errors.length > 0;
  const [isRevealed, setIsRevealed] = useState(hasErrors);

  useEffect(() => {
    if (hasErrors) {
      setIsRevealed(true);
    }
  }, [hasErrors]);

  if (!isRevealed && !hasErrors) {
    return null;
  }

  return <CompactRequiredFieldField {...props} />;
});

const ROW_VIEW_COMPONENTS = {
  full: RequiredFieldField,
  compact: CompactRequiredFieldField,
  folded: FoldedRequiredFieldField,
} as const;

interface WarningTextProps {
  itemId: string;
  name: string;
  message: string;
}

function WarningText({ itemId, name, message }: WarningTextProps): JSX.Element {
  return (
    <EuiTextColor
      color="warning"
      id={`warningText-${itemId}`}
      data-test-subj={`${name}-warningText`}
    >
      {message}
    </EuiTextColor>
  );
}

function WarningIcon({ itemId }: { itemId: string }): JSX.Element {
  const { euiTheme } = useEuiTheme();

  return (
    <EuiIcon
      size="s"
      type="warning"
      color={euiTheme.colors.textWarning}
      data-test-subj="warningIcon"
      aria-labelledby={`warningText-${itemId}`}
    />
  );
}

interface RemoveButtonProps {
  name: string;
  onRemove: () => void;
}

function RemoveButton({ name, onRemove }: RemoveButtonProps): JSX.Element {
  return (
    <EuiToolTip content={i18n.REMOVE_REQUIRED_FIELD_BUTTON_ARIA_LABEL} disableScreenReaderOutput>
      <EuiButtonIcon
        color="danger"
        iconType="trash"
        onClick={onRemove}
        aria-label={i18n.REMOVE_REQUIRED_FIELD_BUTTON_ARIA_LABEL}
        data-test-subj={`removeRequiredFieldButton-${name}`}
      />
    </EuiToolTip>
  );
}
