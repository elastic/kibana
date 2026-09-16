/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EuiComboBoxOptionOption } from '@elastic/eui';
import {
  EuiComboBox,
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiHorizontalRule,
  EuiSpacer,
  EuiText,
  EuiTextArea,
  EuiTitle,
} from '@elastic/eui';
import React, { memo, useCallback, useMemo, useState } from 'react';
import { OperatingSystem } from '@kbn/securitysolution-utils';
import { useTestIdGenerator } from '../../../../hooks/use_test_id_generator';
import type { EffectedPolicySelectProps } from '../../../../components/effected_policy_select';
import { EffectedPolicySelect } from '../../../../components/effected_policy_select';
import type { ArtifactFormComponentProps } from '../../../../components/artifact_list_page';
import { FormattedError } from '../../../../components/formatted_error';
import { OS_TITLES } from '../../../../common/translations';
import {
  DESCRIPTION_LABEL,
  DETAILS_DESCRIPTION,
  FORM_TITLE,
  NAME_ERROR,
  NAME_LABEL,
  OPTIONAL_LABEL,
  OS_ERROR,
  OS_LABEL,
  OS_PLACEHOLDER,
} from './translations';

const OS_OPTIONS: Array<EuiComboBoxOptionOption<OperatingSystem>> = [
  {
    label: OS_TITLES[OperatingSystem.WINDOWS],
    value: OperatingSystem.WINDOWS,
  },
  {
    label: OS_TITLES[OperatingSystem.MAC],
    value: OperatingSystem.MAC,
  },
  {
    label: OS_TITLES[OperatingSystem.LINUX],
    value: OperatingSystem.LINUX,
  },
];

const isItemValid = (nextItem: ArtifactFormComponentProps['item']): boolean =>
  !!nextItem.name?.trim() && (nextItem.os_types?.length ?? 0) > 0;

export const testIdPrefix = 'customYaraSignatures-form';

export const CustomYaraSignaturesForm = memo<ArtifactFormComponentProps>(
  ({ item, onChange, disabled, error }) => {
    const getTestId = useTestIdGenerator(testIdPrefix);
    const [hasBeenInputNameVisited, setHasBeenInputNameVisited] = useState(false);
    const [hasBeenOsVisited, setHasBeenOsVisited] = useState(false);

    const [hasNameError, setHasNameError] = useState(!item.name?.trim());
    const [hasOsError, setHasOsError] = useState(!(item.os_types?.length ?? 0));

    const selectedOsOptions = useMemo(
      () =>
        OS_OPTIONS.filter(
          (option) => option.value !== undefined && item.os_types?.includes(option.value)
        ),
      [item.os_types]
    );

    const notifyOfChange = useCallback(
      (updatedItem?: Partial<ArtifactFormComponentProps['item']>) => {
        const nextItem = updatedItem
          ? {
              ...item,
              ...updatedItem,
            }
          : item;

        onChange({
          item: nextItem,
          isValid: isItemValid(nextItem),
        });
      },
      [item, onChange]
    );

    const handleOnChangeName = useCallback(
      (event: React.ChangeEvent<HTMLInputElement>) => {
        const name = event.target.value;
        setHasNameError(!name.trim());
        notifyOfChange({ name });
      },
      [notifyOfChange]
    );

    const handleOnDescriptionChange = useCallback(
      (event: React.ChangeEvent<HTMLTextAreaElement>) => {
        notifyOfChange({ description: event.target.value });
      },
      [notifyOfChange]
    );

    const handleOnOsChange = useCallback(
      (selectedOptions: Array<EuiComboBoxOptionOption<OperatingSystem>>) => {
        const osTypes: OperatingSystem[] = selectedOptions
          .filter(({ value }) => value)
          .map(({ value }) => value as OperatingSystem);

        setHasOsError(osTypes.length === 0);
        notifyOfChange({ os_types: osTypes });
      },
      [notifyOfChange]
    );

    const handleEffectedPolicyOnChange: EffectedPolicySelectProps['onChange'] = useCallback(
      (updatedItem) => {
        notifyOfChange(updatedItem);
      },
      [notifyOfChange]
    );

    const handleOnNameBlur = useCallback(() => {
      if (!hasBeenInputNameVisited) {
        setHasBeenInputNameVisited(true);
      }
    }, [hasBeenInputNameVisited]);

    const handleOnOsBlur = useCallback(() => {
      if (!hasBeenOsVisited) {
        setHasBeenOsVisited(true);
      }
    }, [hasBeenOsVisited]);

    const nameInput = useMemo(
      () => (
        <EuiFormRow
          label={NAME_LABEL}
          fullWidth
          isInvalid={hasNameError && hasBeenInputNameVisited}
          error={NAME_ERROR}
          isDisabled={disabled}
          data-test-subj={getTestId('name-input-formRow')}
        >
          <EuiFieldText
            name="name"
            isInvalid={hasNameError && hasBeenInputNameVisited}
            value={item.name ?? ''}
            onChange={handleOnChangeName}
            onBlur={handleOnNameBlur}
            fullWidth
            aria-label={NAME_LABEL}
            required={hasBeenInputNameVisited}
            maxLength={256}
            data-test-subj={getTestId('name-input')}
            disabled={disabled}
          />
        </EuiFormRow>
      ),
      [
        disabled,
        getTestId,
        hasBeenInputNameVisited,
        hasNameError,
        handleOnChangeName,
        handleOnNameBlur,
        item.name,
      ]
    );

    const osInput = useMemo(
      () => (
        <EuiFormRow
          label={OS_LABEL}
          fullWidth
          isInvalid={hasOsError && hasBeenOsVisited}
          error={OS_ERROR}
          isDisabled={disabled}
          data-test-subj={getTestId('os-input-formRow')}
        >
          <EuiComboBox<OperatingSystem>
            placeholder={OS_PLACEHOLDER}
            options={OS_OPTIONS}
            selectedOptions={selectedOsOptions}
            onChange={handleOnOsChange}
            onBlur={handleOnOsBlur}
            isClearable={false}
            fullWidth
            isDisabled={disabled}
            isInvalid={hasOsError && hasBeenOsVisited}
            data-test-subj={getTestId('os-input')}
            aria-label={OS_LABEL}
          />
        </EuiFormRow>
      ),
      [
        disabled,
        getTestId,
        handleOnOsBlur,
        handleOnOsChange,
        hasBeenOsVisited,
        hasOsError,
        selectedOsOptions,
      ]
    );

    const descriptionInput = useMemo(
      () => (
        <EuiFormRow
          label={DESCRIPTION_LABEL}
          labelAppend={
            <EuiText size="xs" color="subdued">
              {OPTIONAL_LABEL}
            </EuiText>
          }
          fullWidth
          isDisabled={disabled}
          data-test-subj={getTestId('description-input-formRow')}
        >
          <EuiTextArea
            name="description"
            value={item.description ?? ''}
            onChange={handleOnDescriptionChange}
            fullWidth
            compressed
            data-test-subj={getTestId('description-input')}
            aria-label={DESCRIPTION_LABEL}
            maxLength={256}
            disabled={disabled}
          />
        </EuiFormRow>
      ),
      [disabled, getTestId, handleOnDescriptionChange, item.description]
    );

    return (
      <EuiForm
        component="div"
        error={error && <FormattedError error={error} data-test-subj={getTestId('submitError')} />}
        isInvalid={!!error}
        data-test-subj={getTestId()}
      >
        <EuiTitle size="xs">
          <h2>{FORM_TITLE}</h2>
        </EuiTitle>
        <EuiSpacer size="xs" />

        <EuiText size="s" data-test-subj={getTestId('about')}>
          <p>{DETAILS_DESCRIPTION}</p>
        </EuiText>
        <EuiSpacer size="m" />

        {nameInput}
        {osInput}
        {descriptionInput}
        <EuiHorizontalRule />

        <EuiFormRow
          fullWidth={true}
          data-test-subj={'effectedPolicies-container'}
          isDisabled={disabled}
        >
          <EffectedPolicySelect
            item={item}
            onChange={handleEffectedPolicyOnChange}
            data-test-subj={getTestId('effectedPolicies')}
            disabled={disabled}
          />
        </EuiFormRow>
      </EuiForm>
    );
  }
);

CustomYaraSignaturesForm.displayName = 'CustomYaraSignaturesForm';
