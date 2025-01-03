/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useState, useEffect } from 'react';
import { EuiComboBox, EuiIcon } from '@elastic/eui';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import { euiThemeVars } from '@kbn/ui-theme';
import type { FieldHook } from '../../../../shared_imports';
import type { RequiredFieldInput } from '../../../../../common/api/detection_engine/model/rule_schema/common_attributes.gen';
import { pickTypeForName } from './utils';
import * as i18n from './translations';

interface NameComboBoxProps {
  field: FieldHook<RequiredFieldInput>;
  itemId: string;
  availableFieldNames: string[];
  typesByFieldName: Record<string, string[] | undefined>;
  nameWarning: string;
  nameError: { message: string } | undefined;
}

export function NameComboBox({
  field,
  itemId,
  availableFieldNames,
  typesByFieldName,
  nameWarning,
  nameError,
}: NameComboBoxProps) {
  const { value, setValue } = field;

  const selectableNameOptions: Array<EuiComboBoxOptionOption<string>> = useMemo(
    () =>
      /* Not adding an empty string to the list of selectable field names */
      (value.name ? [value.name] : []).concat(availableFieldNames).map((name) => ({
        label: name,
        value: name,
      })),
    [availableFieldNames, value.name]
  );

  /*
    Using a state for `selectedNameOptions` instead of using the field value directly
    to fix the issue where pressing the backspace key in combobox input would clear the field value
    and trigger a validation error. By using a separate state, we can clear the selected option 
    without clearing the field value.
  */
  const [selectedNameOption, setSelectedNameOption] = useState<
    EuiComboBoxOptionOption<string> | undefined
  >(selectableNameOptions.find((option) => option.label === value.name));

  useEffect(() => {
    /* Re-computing the new selected name option when the field value changes */
    setSelectedNameOption(selectableNameOptions.find((option) => option.label === value.name));
  }, [value.name, selectableNameOptions]);

  const handleNameChange = useCallback(
    (selectedOptions: Array<EuiComboBoxOptionOption<string>>) => {
      const newlySelectedOption: EuiComboBoxOptionOption<string> | undefined = selectedOptions[0];

      if (!newlySelectedOption) {
        /* This occurs when the user hits backspace in combobox */
        setSelectedNameOption(undefined);
        return;
      }

      const updatedName = newlySelectedOption?.value || '';

      const updatedType = pickTypeForName({
        name: updatedName,
        type: value.type,
        typesByFieldName,
      });

      const updatedFieldValue: RequiredFieldInput = {
        name: updatedName,
        type: updatedType,
      };

      setValue(updatedFieldValue);
    },
    [setValue, value.type, typesByFieldName]
  );

  const handleAddCustomName = useCallback(
    (newName: string) => {
      const updatedFieldValue: RequiredFieldInput = {
        name: newName,
        type: pickTypeForName({ name: newName, type: value.type, typesByFieldName }),
      };

      setValue(updatedFieldValue);
    },
    [setValue, value.type, typesByFieldName]
  );

  return (
    <EuiComboBox
      data-test-subj={`requiredFieldNameSelect-${value.name || 'empty'}`}
      aria-label={i18n.FIELD_NAME}
      placeholder={i18n.FIELD_NAME}
      singleSelection={{ asPlainText: true }}
      options={selectableNameOptions}
      selectedOptions={selectedNameOption ? [selectedNameOption] : []}
      onChange={handleNameChange}
      isClearable={false}
      onCreateOption={handleAddCustomName}
      isInvalid={Boolean(nameError)}
      prepend={
        nameWarning ? (
          <EuiIcon
            size="s"
            type="warning"
            color={euiThemeVars.euiColorWarningText}
            data-test-subj="warningIcon"
            aria-labelledby={`warningText-${itemId}`}
          />
        ) : undefined
      }
    />
  );
}
