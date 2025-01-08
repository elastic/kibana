/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState, useCallback, memo, useEffect, useRef } from 'react';
import type { EuiSuperSelectOption, EuiComboBoxOptionOption } from '@elastic/eui';
import {
  EuiForm,
  EuiFormRow,
  EuiFieldText,
  EuiTextArea,
  EuiHorizontalRule,
  EuiText,
  EuiSpacer,
  EuiSuperSelect,
  EuiComboBox,
  EuiTitle,
  EuiFlexGroup,
  EuiFlexItem,
  EuiToolTip,
  EuiIcon,
} from '@elastic/eui';
import type { BlocklistConditionEntryField } from '@kbn/securitysolution-utils';
import { OperatingSystem, isPathValid } from '@kbn/securitysolution-utils';
import { isOneOfOperator, isOperator } from '@kbn/securitysolution-list-utils';
import { uniq } from 'lodash';

import { ListOperatorEnum, ListOperatorTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import { OS_TITLES } from '../../../../common/translations';
import type {
  ArtifactFormComponentOnChangeCallbackProps,
  ArtifactFormComponentProps,
} from '../../../../components/artifact_list_page';
import {
  CONDITIONS_HEADER,
  CONDITIONS_HEADER_DESCRIPTION,
  CONDITION_FIELD_DESCRIPTION,
  CONDITION_FIELD_TITLE,
  DESCRIPTION_LABEL,
  DETAILS_HEADER,
  DETAILS_HEADER_DESCRIPTION,
  FIELD_LABEL,
  NAME_LABEL,
  OPERATOR_LABEL,
  POLICY_SELECT_DESCRIPTION,
  SELECT_OS_LABEL,
  VALUE_LABEL,
  ERRORS,
  VALUE_LABEL_HELPER,
  SINGLE_VALUE_LABEL_HELPER,
} from '../../translations';
import type { EffectedPolicySelection } from '../../../../components/effected_policy_select';
import { EffectedPolicySelect } from '../../../../components/effected_policy_select';
import { useLicense } from '../../../../../common/hooks/use_license';
import { isValidHash } from '../../../../../../common/endpoint/service/artifacts/validations';
import {
  getArtifactTagsByPolicySelection,
  isArtifactGlobal,
} from '../../../../../../common/endpoint/service/artifacts';
import type { PolicyData } from '../../../../../../common/endpoint/types';
import { useTestIdGenerator } from '../../../../hooks/use_test_id_generator';

const testIdPrefix = 'blocklist-form';

interface BlocklistEntryMatch {
  field: BlocklistConditionEntryField;
  operator: ListOperatorEnum.INCLUDED;
  type: ListOperatorTypeEnum.MATCH;
  value: string;
}

interface BlocklistEntryMatchAny {
  field: BlocklistConditionEntryField;
  operator: ListOperatorEnum.INCLUDED;
  type: ListOperatorTypeEnum.MATCH_ANY;
  value: string[];
}

export type BlocklistEntry = BlocklistEntryMatch | BlocklistEntryMatchAny;

type ERROR_KEYS = keyof typeof ERRORS;

type ItemValidationNodes = {
  [K in ERROR_KEYS]?: React.ReactNode;
};

interface ItemValidation {
  name: ItemValidationNodes;
  value: ItemValidationNodes;
}

function createValidationMessage(message: string): React.ReactNode {
  return <div>{message}</div>;
}

function getDropdownDisplay(field: BlocklistConditionEntryField): React.ReactNode {
  return (
    <>
      {CONDITION_FIELD_TITLE[field]}
      <EuiText size="xs" color="subdued">
        {CONDITION_FIELD_DESCRIPTION[field]}
      </EuiText>
    </>
  );
}

function isValid(itemValidation: ItemValidation): boolean {
  return !Object.values(itemValidation).some((errors) => Object.keys(errors).length);
}

// eslint-disable-next-line react/display-name
export const BlockListForm = memo<ArtifactFormComponentProps>(
  ({ item, policies, policiesIsLoading, onChange, mode }) => {
    const [nameVisited, setNameVisited] = useState(false);
    const [valueVisited, setValueVisited] = useState({ value: false }); // Use object to trigger re-render
    const warningsRef = useRef<ItemValidation>({ name: {}, value: {} });
    const errorsRef = useRef<ItemValidation>({ name: {}, value: {} });
    const [selectedPolicies, setSelectedPolicies] = useState<PolicyData[]>([]);
    const isPlatinumPlus = useLicense().isPlatinumPlus();
    const isGlobal = useMemo(() => isArtifactGlobal(item), [item]);
    const [wasByPolicy, setWasByPolicy] = useState(!isArtifactGlobal(item));
    const [hasFormChanged, setHasFormChanged] = useState(false);

    const showAssignmentSection = useMemo(() => {
      return (
        isPlatinumPlus ||
        (mode === 'edit' && (!isGlobal || (wasByPolicy && isGlobal && hasFormChanged)))
      );
    }, [mode, isGlobal, hasFormChanged, isPlatinumPlus, wasByPolicy]);

    // set initial state of `wasByPolicy` that checks if the initial state of the exception was by policy or not
    useEffect(() => {
      if (!hasFormChanged && item.tags) {
        setWasByPolicy(!isArtifactGlobal({ tags: item.tags }));
      }
    }, [item.tags, hasFormChanged]);

    // select policies if editing
    useEffect(() => {
      if (hasFormChanged) return;
      const policyIds = item.tags?.map((tag) => tag.split(':')[1]) ?? [];
      if (!policyIds.length) return;
      const policiesData = policies.filter((policy) => policyIds.includes(policy.id));

      setSelectedPolicies(policiesData);
    }, [hasFormChanged, item.tags, policies]);

    const getTestId = useTestIdGenerator(testIdPrefix);

    const blocklistEntry = useMemo((): BlocklistEntry => {
      if (!item.entries.length) {
        return {
          field: 'file.hash.*',
          operator: ListOperatorEnum.INCLUDED,
          type: ListOperatorTypeEnum.MATCH_ANY,
          value: [],
        };
      }
      return item.entries[0] as BlocklistEntry;
    }, [item.entries]);

    const windowsSignatureField = 'file.Ext.code_signature';
    const isWindowsSignatureEntry = blocklistEntry.field === windowsSignatureField;
    const displaySingleValueInput =
      isWindowsSignatureEntry && blocklistEntry.type === ListOperatorTypeEnum.MATCH;

    const selectedOs = useMemo((): OperatingSystem => {
      if (!item?.os_types?.length) {
        return OperatingSystem.WINDOWS;
      }

      return item.os_types[0] as OperatingSystem;
    }, [item?.os_types]);

    const selectedValues = useMemo(() => {
      if (Array.isArray(blocklistEntry.value)) {
        return blocklistEntry.value.map((label) => ({
          label,
          'data-test-subj': getTestId(`values-input-${label}`),
        }));
      } else {
        return [
          {
            label: blocklistEntry.value,
            'data-test-subj': getTestId(`values-input-${blocklistEntry.value}`),
          },
        ];
      }
    }, [blocklistEntry.value, getTestId]);

    const osOptions: Array<EuiSuperSelectOption<OperatingSystem>> = useMemo(
      () =>
        [OperatingSystem.LINUX, OperatingSystem.MAC, OperatingSystem.WINDOWS].map((os) => ({
          value: os,
          inputDisplay: OS_TITLES[os],
        })),
      []
    );

    const fieldOptions: Array<EuiSuperSelectOption<BlocklistConditionEntryField>> = useMemo(() => {
      const selectableFields: Array<EuiSuperSelectOption<BlocklistConditionEntryField>> = [];

      selectableFields.push({
        value: 'file.hash.*',
        inputDisplay: CONDITION_FIELD_TITLE['file.hash.*'],
        dropdownDisplay: getDropdownDisplay('file.hash.*'),
        'data-test-subj': getTestId('file.hash.*'),
      });

      if (selectedOs === OperatingSystem.LINUX) {
        selectableFields.push({
          value: 'file.path',
          inputDisplay: CONDITION_FIELD_TITLE['file.path'],
          dropdownDisplay: getDropdownDisplay('file.path'),
          'data-test-subj': getTestId('file.path'),
        });
      } else {
        selectableFields.push({
          value: 'file.path.caseless',
          inputDisplay: CONDITION_FIELD_TITLE['file.path.caseless'],
          dropdownDisplay: getDropdownDisplay('file.path.caseless'),
          'data-test-subj': getTestId('file.path.caseless'),
        });
      }

      if (selectedOs === OperatingSystem.WINDOWS) {
        selectableFields.push({
          value: windowsSignatureField,
          inputDisplay: CONDITION_FIELD_TITLE[windowsSignatureField],
          dropdownDisplay: getDropdownDisplay(windowsSignatureField),
          'data-test-subj': getTestId(windowsSignatureField),
        });
      }

      return selectableFields;
    }, [selectedOs, getTestId]);

    const operatorOptions: Array<EuiSuperSelectOption<ListOperatorTypeEnum>> = useMemo(() => {
      return [
        {
          value: isOneOfOperator.type,
          inputDisplay: isOneOfOperator.message,
          dropdownDisplay: isOneOfOperator.message,
        },
        {
          value: isOperator.type,
          inputDisplay: isOperator.message,
          dropdownDisplay: isOperator.message,
        },
      ];
    }, []);

    const valueLabel = useMemo(() => {
      return (
        <div>
          <EuiToolTip
            content={displaySingleValueInput ? SINGLE_VALUE_LABEL_HELPER : VALUE_LABEL_HELPER}
          >
            <>
              {VALUE_LABEL} <EuiIcon color="subdued" type="iInCircle" className="eui-alignTop" />
            </>
          </EuiToolTip>
        </div>
      );
    }, [displaySingleValueInput]);

    const validateValues = useCallback(
      (nextItem: ArtifactFormComponentProps['item'], cleanState = false) => {
        const os = ((nextItem.os_types ?? [])[0] as OperatingSystem) ?? OperatingSystem.WINDOWS;
        const {
          field = 'file.hash.*',
          type = ListOperatorTypeEnum.MATCH_ANY,
          value = [],
        } = (nextItem.entries[0] ?? {}) as BlocklistEntry;

        // value can be a string when isOperator is selected
        const values = Array.isArray(value) ? value : [value].filter(Boolean);

        const newValueWarnings: ItemValidationNodes = cleanState
          ? {}
          : { ...warningsRef.current.value };
        const newNameErrors: ItemValidationNodes = cleanState ? {} : { ...errorsRef.current.name };
        const newValueErrors: ItemValidationNodes = cleanState
          ? {}
          : { ...errorsRef.current.value };

        // error if name empty
        if (!nextItem.name.trim()) {
          newNameErrors.NAME_REQUIRED = createValidationMessage(ERRORS.NAME_REQUIRED);
        } else {
          delete newNameErrors.NAME_REQUIRED;
        }

        // error if no values
        if (!values.length) {
          newValueErrors.VALUE_REQUIRED = createValidationMessage(ERRORS.VALUE_REQUIRED);
        } else {
          delete newValueErrors.VALUE_REQUIRED;
        }

        // error if invalid hash
        if (field === 'file.hash.*' && values.some((v) => !isValidHash(v))) {
          newValueErrors.INVALID_HASH = createValidationMessage(ERRORS.INVALID_HASH);
        } else {
          delete newValueErrors.INVALID_HASH;
        }

        const isInvalidPath = values.some((v) => !isPathValid({ os, field, type, value: v }));
        // warn if invalid path
        if (field !== 'file.hash.*' && isInvalidPath) {
          newValueWarnings.INVALID_PATH = createValidationMessage(ERRORS.INVALID_PATH);
        } else {
          delete newValueWarnings.INVALID_PATH;
        }
        // warn if duplicates
        if (values.length !== uniq(values).length) {
          newValueWarnings.DUPLICATE_VALUES = createValidationMessage(ERRORS.DUPLICATE_VALUES);
        } else {
          delete newValueWarnings.DUPLICATE_VALUES;
        }

        warningsRef.current = { ...warningsRef.current, value: newValueWarnings };
        errorsRef.current = { name: newNameErrors, value: newValueErrors };
      },
      []
    );

    const handleOnNameBlur = useCallback(() => {
      validateValues(item);
      setNameVisited(true);
    }, [item, validateValues]);

    const handleOnValueBlur = useCallback(() => {
      validateValues(item);
      setValueVisited({ value: true });
    }, [item, validateValues]);

    const handleOnNameChange = useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
        const nextItem = {
          ...item,
          name: event.target.value,
        };

        validateValues(nextItem);
        onChange({
          isValid: isValid(errorsRef.current),
          item: nextItem,
        });
        setHasFormChanged(true);
      },
      [validateValues, onChange, item]
    );

    const handleOnDescriptionChange = useCallback(
      (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        const nextItem = {
          ...item,
          description: event.target.value,
        };
        validateValues(nextItem);

        onChange({
          isValid: isValid(errorsRef.current),
          item: nextItem,
        });
        setHasFormChanged(true);
      },
      [onChange, item, validateValues]
    );

    const handleOnOsChange = useCallback(
      (os: OperatingSystem) => {
        const nextItem = {
          ...item,
          os_types: [os],
          entries: [
            {
              ...blocklistEntry,
              field:
                os !== OperatingSystem.WINDOWS && isWindowsSignatureEntry
                  ? 'file.hash.*'
                  : blocklistEntry.field,
              type: ListOperatorTypeEnum.MATCH_ANY,
              ...(typeof blocklistEntry.value === 'string'
                ? { value: blocklistEntry.value.length ? blocklistEntry.value.split(',') : [] }
                : {}),
            },
          ],
        } as ArtifactFormComponentProps['item'];

        validateValues(nextItem);
        onChange({
          isValid: isValid(errorsRef.current),
          item: nextItem,
        });
        setHasFormChanged(true);
      },
      [item, blocklistEntry, isWindowsSignatureEntry, validateValues, onChange]
    );

    const handleOnFieldChange = useCallback(
      (field: BlocklistConditionEntryField) => {
        const nextItem = {
          ...item,
          entries: [
            {
              ...blocklistEntry,
              field,
              type: ListOperatorTypeEnum.MATCH_ANY,
              ...(typeof blocklistEntry.value === 'string'
                ? { value: blocklistEntry.value.length ? blocklistEntry.value.split(',') : [] }
                : {}),
            },
          ],
        } as ArtifactFormComponentProps['item'];

        validateValues(nextItem);
        onChange({
          isValid: isValid(errorsRef.current),
          item: nextItem,
        });
        setHasFormChanged(true);
      },
      [validateValues, onChange, item, blocklistEntry]
    );

    const generateBlocklistEntryValue = useCallback(
      (value: string | string[], newOperator: ListOperatorTypeEnum) => {
        if (newOperator === ListOperatorTypeEnum.MATCH) {
          return { value: Array.isArray(value) ? value.join(',') : value };
        } else {
          return {
            value: (typeof value === 'string' ? value.split(',') : value).filter(Boolean),
          };
        }
      },
      []
    );

    const handleOperatorUpdate = useCallback(
      (newOperator: ListOperatorTypeEnum) => {
        const nextItem = {
          ...item,
          entries: [
            {
              ...blocklistEntry,
              type: newOperator,
              ...generateBlocklistEntryValue(blocklistEntry.value, newOperator),
            },
          ],
        };

        onChange({
          isValid: isValid(errorsRef.current),
          // Type ListOperatorTypeEnum is not assignable to type "wildcard"
          item: nextItem as ArtifactFormComponentOnChangeCallbackProps['item'],
        });
      },
      [item, blocklistEntry, generateBlocklistEntryValue, onChange]
    );

    const handleOnValueTextChange = useCallback(
      (value: string) => {
        const nextWarnings = { ...warningsRef.current.value };

        if (blocklistEntry.value.includes(value)) {
          nextWarnings.DUPLICATE_VALUE = createValidationMessage(ERRORS.DUPLICATE_VALUE);
        } else {
          delete nextWarnings.DUPLICATE_VALUE;
        }

        warningsRef.current = {
          ...warningsRef.current,
          value: nextWarnings,
        };

        // trigger re-render without modifying item
        setValueVisited((prevState) => ({ ...prevState }));
      },
      [blocklistEntry]
    );

    const handleSingleValueUpdate = useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
        const nextItem = {
          ...item,
          entries: [{ ...blocklistEntry, value: event.target.value }],
        } as ArtifactFormComponentProps['item'];

        validateValues(nextItem);

        onChange({
          isValid: isValid(errorsRef.current),
          item: nextItem,
        });
        setHasFormChanged(true);
      },
      [item, blocklistEntry, validateValues, onChange]
    );

    // only triggered on remove / clear
    const handleOnValueChange = useCallback(
      (change: Array<EuiComboBoxOptionOption<string>>) => {
        const value = change.map((option) => option.label);
        const nextItem = {
          ...item,
          entries: [{ ...blocklistEntry, value }],
        } as ArtifactFormComponentProps['item'];

        validateValues(nextItem, true);
        onChange({
          isValid: isValid(errorsRef.current),
          item: nextItem,
        });
        setHasFormChanged(true);
      },
      [validateValues, onChange, item, blocklistEntry]
    );

    const handleOnValueAdd = useCallback(
      (option: string) => {
        const splitValues = option.split(',').filter((value) => value.trim());
        const value = [...blocklistEntry.value, ...splitValues];

        const nextItem = {
          ...item,
          entries: [{ ...blocklistEntry, value }],
        };

        validateValues(nextItem as ArtifactFormComponentProps['item']);
        nextItem.entries[0].value = uniq(nextItem.entries[0].value);

        setValueVisited({ value: true });
        onChange({
          isValid: isValid(errorsRef.current),
          item: nextItem as ArtifactFormComponentProps['item'],
        });
        setHasFormChanged(true);
      },
      [validateValues, onChange, item, blocklistEntry]
    );

    const handleOnPolicyChange = useCallback(
      (change: EffectedPolicySelection) => {
        const tags = getArtifactTagsByPolicySelection(change);

        const nextItem = { ...item, tags };

        // Preserve old selected policies when switching to global
        if (!change.isGlobal) {
          setSelectedPolicies(change.selected);
        }
        validateValues(nextItem);
        onChange({
          isValid: isValid(errorsRef.current),
          item: nextItem,
        });
        setHasFormChanged(true);
      },
      [validateValues, onChange, item]
    );

    return (
      <EuiForm component="div">
        <EuiTitle size="xs">
          <h3>{DETAILS_HEADER}</h3>
        </EuiTitle>
        <EuiSpacer size="xs" />
        {mode === 'create' && (
          <EuiText size="s" data-test-subj={getTestId('header-description')}>
            <p>{DETAILS_HEADER_DESCRIPTION}</p>
          </EuiText>
        )}
        <EuiSpacer size="m" />

        <EuiFormRow
          label={NAME_LABEL}
          isInvalid={nameVisited && !!Object.keys(errorsRef.current.name).length}
          error={Object.values(errorsRef.current.name)}
          fullWidth
        >
          <EuiFieldText
            name="name"
            value={item.name}
            onChange={handleOnNameChange}
            onBlur={handleOnNameBlur}
            required={nameVisited}
            maxLength={256}
            data-test-subj={getTestId('name-input')}
            fullWidth
          />
        </EuiFormRow>
        <EuiFormRow label={DESCRIPTION_LABEL} fullWidth>
          <EuiTextArea
            name="description"
            value={item.description}
            onChange={handleOnDescriptionChange}
            data-test-subj={getTestId('description-input')}
            fullWidth
            compressed
            maxLength={256}
          />
        </EuiFormRow>
        <EuiHorizontalRule />
        <EuiTitle size="xs">
          <h3>{CONDITIONS_HEADER}</h3>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <EuiText size="s">
          <p>{CONDITIONS_HEADER_DESCRIPTION}</p>
        </EuiText>
        <EuiSpacer size="m" />

        <EuiFormRow label={SELECT_OS_LABEL} fullWidth>
          <EuiSuperSelect
            name="os"
            options={osOptions}
            valueOfSelected={selectedOs}
            onChange={handleOnOsChange}
            data-test-subj={getTestId('os-select')}
            fullWidth
          />
        </EuiFormRow>
        <EuiSpacer size="m" />

        <EuiFormRow fullWidth>
          <EuiFlexGroup gutterSize="s">
            <EuiFlexItem grow={1}>
              <EuiFormRow label={FIELD_LABEL} fullWidth>
                <EuiSuperSelect
                  name="field"
                  options={fieldOptions}
                  valueOfSelected={blocklistEntry.field}
                  onChange={handleOnFieldChange}
                  data-test-subj={getTestId('field-select')}
                  fullWidth
                />
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem grow={1}>
              <EuiFormRow label={OPERATOR_LABEL} fullWidth>
                {isWindowsSignatureEntry ? (
                  <EuiSuperSelect
                    name="operator"
                    options={operatorOptions}
                    valueOfSelected={blocklistEntry.type}
                    onChange={handleOperatorUpdate}
                    data-test-subj={getTestId('operator-select-multi')}
                    fullWidth
                  />
                ) : (
                  <EuiFieldText
                    name="operator"
                    value={isOneOfOperator.message}
                    data-test-subj={getTestId('operator-select-single')}
                    readOnly
                  />
                )}
              </EuiFormRow>
            </EuiFlexItem>
            <EuiFlexItem grow={2} />
          </EuiFlexGroup>
        </EuiFormRow>
        <EuiFormRow
          label={valueLabel}
          isInvalid={valueVisited.value && !!Object.keys(errorsRef.current.value).length}
          helpText={Object.values(warningsRef.current.value)}
          error={Object.values(errorsRef.current.value)}
          fullWidth
        >
          {displaySingleValueInput ? (
            <EuiFieldText
              name="value"
              value={blocklistEntry.value as string}
              fullWidth
              onChange={handleSingleValueUpdate}
              onBlur={handleOnValueBlur}
              data-test-subj={getTestId('value-input')}
            />
          ) : (
            <EuiComboBox
              selectedOptions={selectedValues}
              onBlur={handleOnValueBlur}
              onSearchChange={handleOnValueTextChange}
              onChange={handleOnValueChange}
              onCreateOption={handleOnValueAdd}
              data-test-subj={getTestId('values-input')}
              fullWidth
              noSuggestions
            />
          )}
        </EuiFormRow>

        {showAssignmentSection && (
          <>
            <EuiHorizontalRule />
            <EuiFormRow fullWidth>
              <EffectedPolicySelect
                isGlobal={isGlobal}
                isPlatinumPlus={isPlatinumPlus}
                selected={selectedPolicies}
                options={policies}
                onChange={handleOnPolicyChange}
                isLoading={policiesIsLoading}
                description={POLICY_SELECT_DESCRIPTION}
                data-test-subj={getTestId('effectedPolicies')}
              />
            </EuiFormRow>
          </>
        )}
      </EuiForm>
    );
  }
);
