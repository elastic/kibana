/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { memo, useCallback, useMemo, useState } from 'react';
import type { EuiComboBoxOptionOption } from '@elastic/eui';
import {
  EuiForm,
  EuiFormRow,
  EuiFieldText,
  EuiTextArea,
  EuiTitle,
  EuiText,
  EuiSpacer,
  EuiHorizontalRule,
  EuiComboBox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSuperSelect,
} from '@elastic/eui';
import {
  OperatingSystem,
  TrustedDeviceConditionEntryField,
  isTrustedDeviceFieldAvailableForOs,
} from '@kbn/securitysolution-utils';
import type {
  ExceptionListItemSchema,
  CreateExceptionListItemSchema,
  OsTypeArray,
} from '@kbn/securitysolution-io-ts-list-types';
import type { ArtifactFormComponentProps } from '../../../../components/artifact_list_page';
import { FormattedError } from '../../../../components/formatted_error';
import { useTestIdGenerator } from '../../../../hooks/use_test_id_generator';
import { useCanAssignArtifactPerPolicy } from '../../../../hooks/artifacts';
import { useGetTrustedDeviceSuggestions } from '../../hooks/use_get_trusted_device_suggestions';
import { useFetchIndex } from '../../../../../common/containers/source';
import {
  DEVICE_EVENTS_INDEX_PATTERN,
  ENDPOINT_FIELDS_SEARCH_STRATEGY,
} from '../../../../../../common/endpoint/constants';
import type { EffectedPolicySelectProps } from '../../../../components/effected_policy_select';
import { EffectedPolicySelect } from '../../../../components/effected_policy_select';
import { OPERATING_SYSTEM_WINDOWS_AND_MAC, OS_TITLES } from '../../../../common/translations';
import {
  DETAILS_HEADER,
  DETAILS_HEADER_DESCRIPTION,
  NAME_LABEL,
  DESCRIPTION_LABEL,
  CONDITIONS_HEADER,
  CONDITIONS_HEADER_DESCRIPTION,
  SELECT_OS_LABEL,
  POLICY_SELECT_DESCRIPTION,
  CONDITION_FIELD_TITLE,
  OPERATOR_TITLES,
  INPUT_ERRORS,
  VALIDATION_WARNINGS,
  OS_OPTIONS_PLACEHOLDER,
} from '../translations';

interface ValidationResult {
  isValid: boolean;
  errors: Record<string, string[]>;
  warnings: Record<string, string[]>;
}

const OS_OPTIONS: Array<EuiComboBoxOptionOption<OsTypeArray>> = [
  {
    key: 'windows-mac',
    label: OPERATING_SYSTEM_WINDOWS_AND_MAC,
    value: [OperatingSystem.WINDOWS, OperatingSystem.MAC],
  },
  {
    key: 'windows',
    label: OS_TITLES[OperatingSystem.WINDOWS],
    value: [OperatingSystem.WINDOWS],
  },
  {
    key: 'mac',
    label: OS_TITLES[OperatingSystem.MAC],
    value: [OperatingSystem.MAC],
  },
];

const DetailsSection = memo<{
  mode: string;
  getTestId: (suffix?: string) => string | undefined;
  item: ExceptionListItemSchema | CreateExceptionListItemSchema;
  handleNameChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  handleNameBlur: (event: React.FocusEvent<HTMLInputElement>) => void;
  handleDescriptionChange: (event: React.ChangeEvent<HTMLTextAreaElement>) => void;
  disabled: boolean;
  visitedFields: Record<string, boolean>;
  validationResult: ValidationResult;
}>(
  ({
    mode,
    getTestId,
    item,
    handleNameChange,
    handleNameBlur,
    handleDescriptionChange,
    disabled,
    visitedFields,
    validationResult,
  }) => (
    <>
      <EuiTitle size="xs">
        <h3>{DETAILS_HEADER}</h3>
      </EuiTitle>
      <EuiSpacer size="xs" />
      {mode === 'create' && (
        <EuiText size="s" data-test-subj={getTestId('about')}>
          <p>{DETAILS_HEADER_DESCRIPTION}</p>
        </EuiText>
      )}
      <EuiSpacer size="m" />

      <EuiFormRow
        label={NAME_LABEL}
        fullWidth
        data-test-subj={getTestId('nameRow')}
        isInvalid={visitedFields.name && !!validationResult.errors.name}
        error={visitedFields.name ? validationResult.errors.name : undefined}
        helpText={
          visitedFields.name && validationResult.warnings.name
            ? validationResult.warnings.name[0]
            : undefined
        }
      >
        <EuiFieldText
          name="name"
          value={item.name || ''}
          onChange={handleNameChange}
          onBlur={handleNameBlur}
          fullWidth
          maxLength={256}
          data-test-subj={getTestId('nameTextField')}
          disabled={disabled}
          isInvalid={visitedFields.name && !!validationResult.errors.name}
        />
      </EuiFormRow>

      <EuiFormRow
        label={DESCRIPTION_LABEL}
        fullWidth
        data-test-subj={getTestId('descriptionRow')}
        isInvalid={!!validationResult.errors.description}
        error={validationResult.errors.description}
        helpText={
          validationResult.warnings.description
            ? validationResult.warnings.description[0]
            : undefined
        }
      >
        <EuiTextArea
          isInvalid={!!validationResult.errors.description}
          name="description"
          value={item.description || ''}
          onChange={handleDescriptionChange}
          fullWidth
          compressed
          maxLength={256}
          data-test-subj={getTestId('descriptionField')}
          disabled={disabled}
        />
      </EuiFormRow>
    </>
  )
);
DetailsSection.displayName = 'DetailsSection';

const ConditionsSection = memo<{
  getTestId: (suffix?: string) => string | undefined;
  selectedOs: OsTypeArray;
  handleOsChange: (selectedOptions: Array<EuiComboBoxOptionOption<OsTypeArray>>) => void;
  currentEntry: ExceptionListItemSchema['entries'][0];
  handleFieldChange: (value: string) => void;
  handleOperatorChange: (value: string) => void;
  handleValueChange: (options: Array<EuiComboBoxOptionOption<string>>) => void;
  handleValueBlur: () => void;
  disabled: boolean;
  visitedFields: Record<string, boolean>;
  validationResult: ValidationResult;
  indexExists: boolean;
}>(
  ({
    getTestId,
    selectedOs,
    handleOsChange,
    currentEntry,
    handleFieldChange,
    handleOperatorChange,
    handleValueChange,
    handleValueBlur,
    disabled,
    visitedFields,
    validationResult,
    indexExists,
  }) => {
    // Get field options based on selected OS
    const availableFieldOptions = useMemo(() => {
      return getFieldOptionsForOs(selectedOs);
    }, [selectedOs]);

    const suggestionsEnabled = !disabled && indexExists;

    const { data: suggestions = [], isLoading: isLoadingSuggestions } =
      useGetTrustedDeviceSuggestions({
        field: currentEntry.field || '',
        enabled: suggestionsEnabled,
      });

    const showSuggestionsLoading = suggestionsEnabled && isLoadingSuggestions;

    return (
      <>
        <EuiTitle size="xs">
          <h3>{CONDITIONS_HEADER}</h3>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <EuiText size="s">{CONDITIONS_HEADER_DESCRIPTION}</EuiText>
        <EuiSpacer size="m" />

        <EuiFormRow
          label={SELECT_OS_LABEL}
          fullWidth
          data-test-subj={getTestId('osRow')}
          isInvalid={visitedFields.os && !!validationResult.errors.os}
          error={visitedFields.os ? validationResult.errors.os : undefined}
          helpText={
            visitedFields.os && validationResult.warnings.os
              ? validationResult.warnings.os[0]
              : undefined
          }
        >
          <EuiComboBox
            isInvalid={visitedFields.os && !!validationResult.errors.os}
            placeholder={OS_OPTIONS_PLACEHOLDER}
            singleSelection={{ asPlainText: true }}
            options={OS_OPTIONS}
            selectedOptions={OS_OPTIONS.filter(
              (option) => JSON.stringify(option.value) === JSON.stringify(selectedOs)
            )}
            onChange={handleOsChange}
            isClearable={false}
            data-test-subj={getTestId('osSelectField')}
            isDisabled={disabled}
          />
        </EuiFormRow>

        <EuiFormRow
          fullWidth
          data-test-subj={getTestId('conditionsRow')}
          isInvalid={visitedFields.entries && !!validationResult.errors.entries}
          error={visitedFields.entries ? validationResult.errors.entries : undefined}
          helpText={
            visitedFields.entries && validationResult.warnings.entries
              ? validationResult.warnings.entries[0]
              : undefined
          }
        >
          <EuiFlexGroup>
            <EuiFlexItem>
              <EuiFormRow label="Field">
                <EuiSuperSelect
                  options={availableFieldOptions}
                  valueOfSelected={currentEntry.field || TrustedDeviceConditionEntryField.DEVICE_ID}
                  onChange={handleFieldChange}
                  data-test-subj={getTestId('fieldSelect')}
                  disabled={disabled}
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFormRow label="Operator">
                <EuiSuperSelect
                  options={OPERATOR_OPTIONS}
                  valueOfSelected={currentEntry.type === 'match' ? 'is' : 'match'}
                  onChange={handleOperatorChange}
                  data-test-subj={getTestId('operatorSelect')}
                  disabled={disabled}
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem>
              <EuiFormRow label="Value">
                <EuiComboBox
                  placeholder="Enter or select value"
                  singleSelection={{ asPlainText: true }}
                  options={suggestions.map((suggestion, idx) => ({
                    label: suggestion,
                    key: `${suggestion}-${idx}`,
                  }))}
                  selectedOptions={
                    'value' in currentEntry && currentEntry.value
                      ? [{ label: String(currentEntry.value) }]
                      : []
                  }
                  onChange={handleValueChange}
                  onBlur={handleValueBlur}
                  onCreateOption={(searchValue) => {
                    handleValueChange([{ label: searchValue }]);
                  }}
                  isLoading={showSuggestionsLoading}
                  data-test-subj={getTestId('valueField')}
                  isDisabled={disabled}
                  isClearable={false}
                />
              </EuiFormRow>
            </EuiFlexItem>
          </EuiFlexGroup>
        </EuiFormRow>
      </>
    );
  }
);
ConditionsSection.displayName = 'ConditionsSection';

const getFieldOptionsForOs = (osTypes: OsTypeArray) => {
  const allFields = [
    {
      value: TrustedDeviceConditionEntryField.DEVICE_ID,
      inputDisplay: CONDITION_FIELD_TITLE[TrustedDeviceConditionEntryField.DEVICE_ID],
    },
    {
      value: TrustedDeviceConditionEntryField.DEVICE_TYPE,
      inputDisplay: CONDITION_FIELD_TITLE[TrustedDeviceConditionEntryField.DEVICE_TYPE],
    },
    {
      value: TrustedDeviceConditionEntryField.HOST,
      inputDisplay: CONDITION_FIELD_TITLE[TrustedDeviceConditionEntryField.HOST],
    },
    {
      value: TrustedDeviceConditionEntryField.MANUFACTURER,
      inputDisplay: CONDITION_FIELD_TITLE[TrustedDeviceConditionEntryField.MANUFACTURER],
    },
    {
      value: TrustedDeviceConditionEntryField.MANUFACTURER_ID,
      inputDisplay: CONDITION_FIELD_TITLE[TrustedDeviceConditionEntryField.MANUFACTURER_ID],
    },
    {
      value: TrustedDeviceConditionEntryField.PRODUCT_ID,
      inputDisplay: CONDITION_FIELD_TITLE[TrustedDeviceConditionEntryField.PRODUCT_ID],
    },
    {
      value: TrustedDeviceConditionEntryField.PRODUCT_NAME,
      inputDisplay: CONDITION_FIELD_TITLE[TrustedDeviceConditionEntryField.PRODUCT_NAME],
    },
  ];

  if (isTrustedDeviceFieldAvailableForOs(TrustedDeviceConditionEntryField.USERNAME, osTypes)) {
    allFields.push({
      value: TrustedDeviceConditionEntryField.USERNAME,
      inputDisplay: CONDITION_FIELD_TITLE[TrustedDeviceConditionEntryField.USERNAME],
    });
  }

  return allFields;
};

const OPERATOR_OPTIONS = [
  { value: 'is', inputDisplay: OPERATOR_TITLES.is },
  { value: 'match', inputDisplay: OPERATOR_TITLES.matches },
];

const DEVICE_EVENTS_INDEX_NAMES = [DEVICE_EVENTS_INDEX_PATTERN];

export const TrustedDevicesForm = memo<ArtifactFormComponentProps>(
  ({ item, onChange, mode = 'create', disabled = false, error: submitError }) => {
    const [hasUserSelectedOs, setHasUserSelectedOs] = useState<boolean>(false);
    const [hasFormChanged, setHasFormChanged] = useState(false);

    const getTestId = useTestIdGenerator('trustedDevices-form');

    const [isIndexLoading, { indexPatterns }] = useFetchIndex(
      DEVICE_EVENTS_INDEX_NAMES,
      true,
      ENDPOINT_FIELDS_SEARCH_STRATEGY
    );

    const hasIndexWithFields = !isIndexLoading && indexPatterns?.fields?.length > 0;

    const [visitedFields, setVisitedFields] = useState<Record<string, boolean>>({});

    const [validationResult, setValidationResult] = useState<ValidationResult>({
      isValid: false,
      errors: {},
      warnings: {},
    });

    // For new TD items, ensure we start with the correct OS types
    const currentItem = useMemo(() => {
      if (
        mode === 'create' &&
        item.os_types?.length === 1 &&
        item.os_types[0] === 'windows' &&
        !item.name?.trim() &&
        !hasUserSelectedOs // Don't override if user has explicitly selected an OS
      ) {
        return { ...item, os_types: [OperatingSystem.WINDOWS, OperatingSystem.MAC] };
      }
      return item;
    }, [item, mode, hasUserSelectedOs]);

    const showAssignmentSection = useCanAssignArtifactPerPolicy(
      currentItem,
      mode,
      hasFormChanged,
      'enterprise'
    );

    const updateVisitedFields = useCallback((updates: Record<string, boolean>) => {
      setVisitedFields((prev) => ({ ...prev, ...updates }));
    }, []);

    const validateForm = useCallback(
      (formData: typeof item): ValidationResult => {
        const errors: Record<string, string[]> = {};
        const warnings: Record<string, string[]> = {};

        // Name validation
        if (!formData.name?.trim()) {
          errors.name = [INPUT_ERRORS.name];
        } else if (formData.name.trim().length > 256) {
          errors.name = [INPUT_ERRORS.nameMaxLength];
        }

        // Description validation
        if (formData.description && formData.description.length > 256) {
          errors.description = [INPUT_ERRORS.descriptionMaxLength];
        }

        // OS validation
        if (!formData.os_types?.length) {
          errors.os = [INPUT_ERRORS.osRequired];
        }

        // Condition validation (backend schema: entries minSize: 1, value length > 0)
        const hasOsSelected = (formData.os_types?.length ?? 0) > 0;
        const hasVisitedEntries = visitedFields.entries;

        if (hasOsSelected || hasVisitedEntries) {
          const entry = formData.entries?.[0];

          if (!formData.entries?.length || !entry) {
            errors.entries = [INPUT_ERRORS.entriesAtLeastOne];
          } else if ('value' in entry) {
            // Handle string values (matching backend schema: length > 0)
            if (typeof entry.value === 'string') {
              if (!entry.value.trim()) {
                errors.entries = [INPUT_ERRORS.entryValueEmpty];
              }

              // Wildcard validation for "match" operator
              if (entry.type === 'wildcard' && entry.value.includes('**')) {
                warnings.entries = [VALIDATION_WARNINGS.performanceWildcard];
              }
            }
            // Handle array values
            else if (Array.isArray(entry.value) && (!entry.value || entry.value.length === 0)) {
              errors.entries = [INPUT_ERRORS.entryValueEmpty];
            }
          }
        }

        return {
          isValid: Object.keys(errors).length === 0,
          errors,
          warnings,
        };
      },
      [visitedFields]
    );

    const updateField = useCallback(
      (field: string, value: string) => {
        const updatedItem = { ...currentItem, [field]: value };
        const validation = validateForm(updatedItem);

        setValidationResult(validation);
        setHasFormChanged(true);

        onChange({ item: updatedItem, isValid: validation.isValid });
      },
      [currentItem, onChange, validateForm]
    );

    const handleNameChange = useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
        updateField('name', event.target.value);
      },
      [updateField]
    );

    const handleNameBlur = useCallback(
      (event: React.FocusEvent<HTMLInputElement>) => {
        updateVisitedFields({ ...visitedFields, name: true });
      },
      [visitedFields, updateVisitedFields]
    );

    const handleDescriptionChange = useCallback(
      (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        updateField('description', event.target.value);
      },
      [updateField]
    );

    const handleOsChange = useCallback(
      (selectedOptions: Array<EuiComboBoxOptionOption<OsTypeArray>>) => {
        const osTypes = selectedOptions[0]?.value || [];
        const currentEntry = currentItem.entries?.[0];

        // Mark that user has explicitly selected an OS
        setHasUserSelectedOs(true);
        setHasFormChanged(true);

        let fieldToUse = currentEntry?.field || TrustedDeviceConditionEntryField.DEVICE_ID;
        let shouldResetValue = false;

        // If current field is USERNAME but USERNAME is not available for new OS selection, reset to DEVICE_ID
        if (
          fieldToUse === TrustedDeviceConditionEntryField.USERNAME &&
          !isTrustedDeviceFieldAvailableForOs(TrustedDeviceConditionEntryField.USERNAME, osTypes)
        ) {
          fieldToUse = TrustedDeviceConditionEntryField.DEVICE_ID;
          shouldResetValue = true;
        }

        const updatedItem = {
          ...currentItem,
          os_types: osTypes,
          entries: [
            {
              field: fieldToUse,
              operator: 'included' as const,
              type: 'match' as const,
              value: shouldResetValue
                ? ''
                : currentEntry && 'value' in currentEntry
                ? String(currentEntry.value || '')
                : '',
            } as const,
          ],
        };

        const validation = validateForm(updatedItem);

        updateVisitedFields({ ...visitedFields, os: true });

        onChange({ item: updatedItem, isValid: validation.isValid });
      },
      [currentItem, onChange, validateForm, updateVisitedFields, visitedFields]
    );

    const updateConditionField = useCallback(
      (updates: Record<string, string>) => {
        const currentEntry = currentItem.entries?.[0] || {
          field: TrustedDeviceConditionEntryField.DEVICE_ID,
          operator: 'included',
          type: 'match',
          value: '',
        };
        const updatedEntry = { ...currentEntry, ...updates };
        const updatedItem = { ...currentItem, entries: [updatedEntry] };
        const validation = validateForm(updatedItem);

        setValidationResult(validation);
        setHasFormChanged(true);

        onChange({ item: updatedItem, isValid: validation.isValid });
      },
      [currentItem, onChange, validateForm, setValidationResult]
    );

    const handleFieldChange = useCallback(
      (value: string) => {
        updateConditionField({ field: value, value: '' });
        updateVisitedFields({ entries: false });
      },
      [updateConditionField, updateVisitedFields]
    );

    const handleOperatorChange = useCallback(
      (value: string) => {
        const type = value === 'is' ? 'match' : 'wildcard';
        updateConditionField({ type });
      },
      [updateConditionField]
    );

    const handleValueChange = useCallback(
      (options: Array<EuiComboBoxOptionOption<string>>) => {
        const value = options.length > 0 ? options[0].label : '';
        updateConditionField({ value });
      },
      [updateConditionField]
    );

    const handleValueBlur = useCallback(() => {
      updateVisitedFields({ ...visitedFields, entries: true });
    }, [visitedFields, updateVisitedFields]);

    const handlePolicyChange = useCallback<EffectedPolicySelectProps['onChange']>(
      (updatedItem) => {
        const validation = validateForm(updatedItem);

        setHasFormChanged(true);
        onChange({ item: updatedItem, isValid: validation.isValid });
      },
      [onChange, validateForm]
    );

    const selectedOs = useMemo((): OsTypeArray => {
      return currentItem.os_types?.length
        ? currentItem.os_types
        : [OperatingSystem.WINDOWS, OperatingSystem.MAC];
    }, [currentItem.os_types]);

    const currentEntry = useMemo(() => {
      const entry = currentItem.entries?.[0];
      if (entry && 'value' in entry) {
        return entry;
      }
      return {
        field: TrustedDeviceConditionEntryField.DEVICE_ID,
        operator: 'included' as const,
        type: 'match' as const,
        value: '',
      };
    }, [currentItem.entries]);

    return (
      <EuiForm
        component="div"
        data-test-subj={getTestId('')}
        error={
          submitError ? (
            <FormattedError error={submitError} data-test-subj={getTestId('submitError')} />
          ) : undefined
        }
        isInvalid={!!submitError}
      >
        <DetailsSection
          mode={mode}
          getTestId={getTestId}
          item={currentItem}
          handleNameChange={handleNameChange}
          handleNameBlur={handleNameBlur}
          handleDescriptionChange={handleDescriptionChange}
          disabled={disabled}
          visitedFields={visitedFields}
          validationResult={validationResult}
        />

        <EuiHorizontalRule />

        <ConditionsSection
          getTestId={getTestId}
          selectedOs={selectedOs}
          handleOsChange={handleOsChange}
          currentEntry={currentEntry}
          handleFieldChange={handleFieldChange}
          handleOperatorChange={handleOperatorChange}
          handleValueChange={handleValueChange}
          handleValueBlur={handleValueBlur}
          disabled={disabled}
          visitedFields={visitedFields}
          validationResult={validationResult}
          indexExists={hasIndexWithFields}
        />

        {showAssignmentSection ? (
          <>
            <EuiHorizontalRule />

            <EuiFormRow fullWidth data-test-subj={getTestId('policySelection')}>
              <EffectedPolicySelect
                item={currentItem}
                description={POLICY_SELECT_DESCRIPTION}
                data-test-subj={getTestId('effectedPolicies')}
                onChange={handlePolicyChange}
              />
            </EuiFormRow>
          </>
        ) : null}
      </EuiForm>
    );
  }
);

TrustedDevicesForm.displayName = 'TrustedDevicesForm';
