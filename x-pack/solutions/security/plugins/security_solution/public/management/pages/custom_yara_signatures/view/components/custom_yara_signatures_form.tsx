/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiFieldText,
  EuiForm,
  EuiFormRow,
  EuiSpacer,
  EuiText,
  EuiTextArea,
  EuiTitle,
} from '@elastic/eui';
import React, { memo, useCallback, useMemo, useState } from 'react';
import { useTestIdGenerator } from '../../../../hooks/use_test_id_generator';
import type { ArtifactFormComponentProps } from '../../../../components/artifact_list_page';
import { FormattedError } from '../../../../components/formatted_error';
import {
  DESCRIPTION_LABEL,
  DETAILS_DESCRIPTION,
  FORM_TITLE,
  NAME_ERROR,
  NAME_LABEL,
  OPTIONAL_LABEL,
} from './translations';

export const testIdPrefix = 'customYaraSignatures-form';

export const CustomYaraSignaturesForm = memo<ArtifactFormComponentProps>(
  ({ item, onChange, disabled, error }) => {
    const getTestId = useTestIdGenerator(testIdPrefix);
    const [hasBeenInputNameVisited, setHasBeenInputNameVisited] = useState(false);
    const [hasNameError, setHasNameError] = useState(!item.name?.trim());

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
          isValid: !!nextItem.name?.trim(),
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

    const handleOnNameBlur = useCallback(() => {
      if (!hasBeenInputNameVisited) {
        setHasBeenInputNameVisited(true);
      }
    }, [hasBeenInputNameVisited]);

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
        {descriptionInput}
      </EuiForm>
    );
  }
);

CustomYaraSignaturesForm.displayName = 'CustomYaraSignaturesForm';
