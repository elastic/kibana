/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ChangeEventHandler } from 'react';
import React, { memo, useCallback, useMemo, useState } from 'react';
import styled from '@emotion/styled';
import { i18n } from '@kbn/i18n';
import type { EuiSuperSelectOption, EuiSuperSelectProps } from '@elastic/eui';
import { EuiButtonIcon, EuiFieldText, EuiFormRow, EuiSuperSelect, EuiText } from '@elastic/eui';
import type { TrustedAppEntryTypes } from '@kbn/securitysolution-utils';
import { ConditionEntryField, OperatingSystem } from '@kbn/securitysolution-utils';
import type { TrustedAppConditionEntry } from '../../../../../../../common/endpoint/types';
import { OperatorFieldIds } from '../../../../../../../common/endpoint/types';

import {
  CONDITION_FIELD_DESCRIPTION,
  CONDITION_FIELD_TITLE,
  ENTRY_PROPERTY_TITLES,
  OPERATOR_TITLES,
} from '../../translations';
import { useTestIdGenerator } from '../../../../../hooks/use_test_id_generator';
import { getPlaceholderTextByOSType } from '../../../../../../../common/utils/path_placeholder';

const ConditionEntryCell = memo<{
  showLabel: boolean;
  label?: string;
  isInvalid?: boolean;
  error?: React.ReactNode[];
  children: React.ReactElement;
}>(({ showLabel, label = '', isInvalid = false, error, children }) => {
  const hasError = !!error?.length;

  // The row is also rendered (without a label) when there is something to report, so that validation
  // messages appear against the input they are about instead of below the whole condition group.
  return showLabel || hasError ? (
    <EuiFormRow
      label={showLabel ? label : undefined}
      isInvalid={isInvalid && hasError}
      error={error}
      fullWidth
    >
      {children}
    </EuiFormRow>
  ) : (
    <>{children}</>
  );
});

ConditionEntryCell.displayName = 'ConditionEntryCell';

/**
 * Validation messages that apply to this specific entry. Both errors and warnings are rendered as
 * the value input's own EUI validation error: a path warning that is not seen is a path warning that
 * does not work, and shipping a silently-broken condition is more expensive than a false alarm.
 */
export interface ConditionEntryValidation {
  isInvalid: boolean;
  errors: React.ReactNode[];
  warnings: React.ReactNode[];
  /** Whether this validation should wait until the input is visited before displaying. */
  showOnVisited?: boolean;
}

export interface ConditionEntryInputProps {
  os: OperatingSystem;
  entry: TrustedAppConditionEntry;
  /** Fields already used by other entries in this AND group. */
  disabledFields?: ConditionEntryField[];
  /** Validation state for this entry, rendered against the value input */
  validation?: ConditionEntryValidation;
  /** controls if remove button is enabled/disabled */
  isRemoveDisabled?: boolean;
  /** If the labels for each Column in the input row should be shown. Normally set on the first row entry */
  showLabels: boolean;
  onRemove: (entry: TrustedAppConditionEntry) => void;
  onChange: (newEntry: TrustedAppConditionEntry, oldEntry: TrustedAppConditionEntry) => void;
  /**
   * Invoked when leading/trailing whitespace was stripped from the value on blur, so that the form
   * can tell the user that its value was changed for them.
   */
  onValueTrimmed?: (entry: TrustedAppConditionEntry) => void;
  /**
   * invoked when at least one field in the entry was visited (triggered when `onBlur` DOM event is dispatched)
   * For this component, that will be triggered only when the `value` field is visited, since that is the
   * only one needs user input.
   */
  onVisited?: (entry: TrustedAppConditionEntry) => void;
  'data-test-subj'?: string;
}

// adding a style prop on EuiFlexGroup works only partially
// and for some odd reason garbles up gridTemplateAreas entry
const InputGroup = styled.div`
  display: grid;
  grid-template-columns: 25% 25% 45% 5%;
  grid-template-areas: 'field operator value remove';
`;

const InputItem = styled.div<{ gridArea: string }>`
  grid-area: ${({ gridArea }) => gridArea};
  /* Keep the controls aligned with the top of the value field when its validation message expands
   * the row. Centering each cell makes Field and Operator move down relative to Value. */
  align-self: start;
  margin-right: ${(props) => props.theme.euiTheme.size.s};
  vertical-align: baseline;
`;

const operatorOptions = (Object.keys(OperatorFieldIds) as OperatorFieldIds[]).map(
  (value): EuiSuperSelectOption<TrustedAppEntryTypes> => ({
    dropdownDisplay: OPERATOR_TITLES[value],
    inputDisplay: OPERATOR_TITLES[value],
    value: value === 'matches' ? 'wildcard' : 'match',
  })
);

export const ConditionEntryInput = memo<ConditionEntryInputProps>(
  ({
    os,
    entry,
    disabledFields = [],
    validation,
    showLabels = false,
    onRemove,
    onChange,
    onValueTrimmed,
    isRemoveDisabled = false,
    onVisited,
    'data-test-subj': dataTestSubj,
  }) => {
    const getTestId = useTestIdGenerator(dataTestSubj);
    const [isVisited, setIsVisited] = useState(false);

    const handleVisited = useCallback(() => {
      onVisited?.(entry);

      if (!isVisited) {
        setIsVisited(true);
      }
    }, [entry, isVisited, onVisited]);

    const fieldOptions = useMemo<Array<EuiSuperSelectOption<ConditionEntryField>>>(() => {
      const getDropdownDisplay = (field: ConditionEntryField) => (
        <>
          {CONDITION_FIELD_TITLE[field]}
          <EuiText size="xs" color="subdued">
            {CONDITION_FIELD_DESCRIPTION[field]}
          </EuiText>
        </>
      );

      return [
        {
          dropdownDisplay: getDropdownDisplay(ConditionEntryField.HASH),
          inputDisplay: CONDITION_FIELD_TITLE[ConditionEntryField.HASH],
          value: ConditionEntryField.HASH,
          disabled: disabledFields.includes(ConditionEntryField.HASH),
          'data-test-subj': getTestId(
            `field-type-${CONDITION_FIELD_TITLE[ConditionEntryField.HASH]}`
          ),
        },
        {
          dropdownDisplay: getDropdownDisplay(ConditionEntryField.PATH),
          inputDisplay: CONDITION_FIELD_TITLE[ConditionEntryField.PATH],
          value: ConditionEntryField.PATH,
          disabled: disabledFields.includes(ConditionEntryField.PATH),
          'data-test-subj': getTestId(
            `field-type-${CONDITION_FIELD_TITLE[ConditionEntryField.PATH]}`
          ),
        },
        ...(os === OperatingSystem.WINDOWS
          ? [
              {
                dropdownDisplay: getDropdownDisplay(ConditionEntryField.SIGNER),
                inputDisplay: CONDITION_FIELD_TITLE[ConditionEntryField.SIGNER],
                value: ConditionEntryField.SIGNER,
                disabled: disabledFields.includes(ConditionEntryField.SIGNER),
                'data-test-subj': getTestId(
                  `field-type-${CONDITION_FIELD_TITLE[ConditionEntryField.SIGNER]}`
                ),
              },
            ]
          : []),
        ...(os === OperatingSystem.MAC
          ? [
              {
                dropdownDisplay: getDropdownDisplay(ConditionEntryField.SIGNER_MAC),
                inputDisplay: CONDITION_FIELD_TITLE[ConditionEntryField.SIGNER_MAC],
                value: ConditionEntryField.SIGNER_MAC,
                disabled: disabledFields.includes(ConditionEntryField.SIGNER_MAC),
                'data-test-subj': getTestId(
                  `field-type-${CONDITION_FIELD_TITLE[ConditionEntryField.SIGNER_MAC]}`
                ),
              },
            ]
          : []),
      ];
    }, [disabledFields, getTestId, os]);

    const handleValueUpdate = useCallback<ChangeEventHandler<HTMLInputElement>>(
      (ev) => onChange({ ...entry, value: ev.target.value }, entry),
      [entry, onChange]
    );

    const handleFieldUpdate = useCallback<
      NonNullable<EuiSuperSelectProps<ConditionEntryField>['onChange']>
    >(
      (newField) => {
        onChange({ ...entry, field: newField }, entry);

        if (entry.value) {
          handleVisited();
        }
      },
      [handleVisited, entry, onChange]
    );

    const handleOperatorUpdate = useCallback<
      NonNullable<EuiSuperSelectProps<TrustedAppEntryTypes>['onChange']>
    >((newOperator) => onChange({ ...entry, type: newOperator }, entry), [entry, onChange]);

    const handleRemoveClick = useCallback(() => onRemove(entry), [entry, onRemove]);

    const handleValueOnBlur = useCallback(() => {
      // Leading/trailing whitespace is invisible in this input but is part of the stored value, and
      // an artifact entry carrying it can never match. It is always a mistake, so fix it silently
      // here rather than asking the user to spot a character they cannot see.
      const trimmedValue = entry.value.trim();

      if (trimmedValue !== entry.value && trimmedValue.length > 0) {
        const trimmedEntry = { ...entry, value: trimmedValue };
        onChange(trimmedEntry, entry);
        onValueTrimmed?.(trimmedEntry);
      }

      handleVisited();
    }, [entry, handleVisited, onChange, onValueTrimmed]);

    const valueValidationMessages = useMemo<React.ReactNode[]>(
      () => [...(validation?.errors ?? []), ...(validation?.warnings ?? [])],
      [validation]
    );
    const showValidation = !validation?.showOnVisited || isVisited;

    return (
      <InputGroup data-test-subj={dataTestSubj}>
        <InputItem gridArea="field">
          <ConditionEntryCell showLabel={showLabels} label={ENTRY_PROPERTY_TITLES.field}>
            <EuiSuperSelect
              options={fieldOptions}
              valueOfSelected={entry.field}
              onChange={handleFieldUpdate}
              data-test-subj={getTestId('field')}
              aria-label={ENTRY_PROPERTY_TITLES.field}
            />
          </ConditionEntryCell>
        </InputItem>
        <InputItem gridArea="operator">
          <ConditionEntryCell showLabel={showLabels} label={ENTRY_PROPERTY_TITLES.operator}>
            {entry.field === ConditionEntryField.PATH ? (
              <EuiSuperSelect
                options={operatorOptions}
                onChange={handleOperatorUpdate}
                valueOfSelected={entry.type}
                data-test-subj={getTestId('operator')}
                aria-label={ENTRY_PROPERTY_TITLES.operator}
              />
            ) : (
              <EuiFieldText
                name="operator"
                value={OPERATOR_TITLES.is}
                data-test-subj={getTestId('operator')}
                readOnly
              />
            )}
          </ConditionEntryCell>
        </InputItem>
        <InputItem gridArea="value">
          <ConditionEntryCell
            showLabel={showLabels}
            label={ENTRY_PROPERTY_TITLES.value}
            isInvalid={!!validation?.isInvalid && showValidation}
            error={showValidation ? valueValidationMessages : undefined}
          >
            <EuiFieldText
              name="value"
              value={entry.value}
              placeholder={getPlaceholderTextByOSType({
                os,
                field: entry.field,
                type: entry.type,
              })}
              fullWidth
              required={isVisited}
              isInvalid={
                !!validation?.isInvalid && showValidation && valueValidationMessages.length > 0
              }
              onChange={handleValueUpdate}
              onBlur={handleValueOnBlur}
              data-test-subj={getTestId('value')}
            />
          </ConditionEntryCell>
        </InputItem>
        <InputItem gridArea="remove">
          {/* Unicode `nbsp` is used below so that Remove button is properly displayed */}
          <ConditionEntryCell showLabel={showLabels} label={'\u00A0'}>
            <EuiButtonIcon
              color="danger"
              iconType="trash"
              onClick={handleRemoveClick}
              isDisabled={isRemoveDisabled}
              aria-label={i18n.translate(
                'xpack.securitySolution.trustedapps.logicalConditionBuilder.entry.removeLabel',
                { defaultMessage: 'Remove Entry' }
              )}
              data-test-subj={getTestId('remove')}
            />
          </ConditionEntryCell>
        </InputItem>
      </InputGroup>
    );
  }
);

ConditionEntryInput.displayName = 'ConditionEntryInput';
