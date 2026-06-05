/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState, useCallback, memo, useRef } from 'react';
import {
  EuiForm,
  EuiFormRow,
  EuiFieldText,
  EuiTextArea,
  EuiHorizontalRule,
  EuiText,
  EuiSpacer,
  EuiTitle,
} from '@elastic/eui';
import type { BlocklistConditionEntryField } from '@kbn/securitysolution-utils';
import { OperatingSystem, isPathValid } from '@kbn/securitysolution-utils';
import { uniq } from 'lodash';

import { ListOperatorEnum, ListOperatorTypeEnum } from '@kbn/securitysolution-io-ts-list-types';
import { useCanAssignArtifactPerPolicy } from '../../../../hooks/artifacts/use_can_assign_artifact_per_policy';
import { FormattedError } from '../../../../components/formatted_error';
import type { ArtifactFormComponentProps } from '../../../../components/artifact_list_page';
import {
  CONDITION_FIELD_DESCRIPTION,
  CONDITION_FIELD_TITLE,
  DETAILS_HEADER,
  NAME_LABEL,
  POLICY_SELECT_DESCRIPTION,
  ERRORS,
} from '../../translations';
import type { EffectedPolicySelectProps } from '../../../../components/effected_policy_select';
import { EffectedPolicySelect } from '../../../../components/effected_policy_select';
import { isValidHash } from '../../../../../../common/endpoint/service/artifacts/validations';
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
  ({ item, onChange, mode, error: submitError }) => {
    const [nameVisited, setNameVisited] = useState(false);
    const warningsRef = useRef<ItemValidation>({ name: {}, value: {} });
    const errorsRef = useRef<ItemValidation>({ name: {}, value: {} });
    const [hasFormChanged, setHasFormChanged] = useState(false);
    const showAssignmentSection = useCanAssignArtifactPerPolicy(item, mode, hasFormChanged);
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

    const handleEffectedPolicyOnChange: EffectedPolicySelectProps['onChange'] = useCallback(
      (updatedItem) => {
        validateValues(updatedItem);
        onChange({
          isValid: isValid(errorsRef.current),
          item: updatedItem,
        });
        setHasFormChanged(true);
      },
      [onChange, validateValues]
    );

    return (
      <EuiForm
        component="div"
        error={
          submitError ? (
            <FormattedError error={submitError} data-test-subj={getTestId('submitError')} />
          ) : undefined
        }
        isInvalid={!!submitError}
      >
        <EuiTitle size="xs">
          <h3>{DETAILS_HEADER}</h3>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <EuiSpacer size="m" />

        <EuiFormRow
          label={NAME_LABEL}
          isInvalid={nameVisited && !!Object.keys(errorsRef.current.name).length}
          error={Object.values(errorsRef.current.name)}
          fullWidth
        >
          <EuiFieldText
            isInvalid={nameVisited && !!Object.keys(errorsRef.current.name).length}
            name="name"
            value={item.name}
            onChange={handleOnNameChange}
            onBlur={handleOnNameBlur}
            disabled={true}
            required={nameVisited}
            maxLength={256}
            data-test-subj={getTestId('name-input')}
            fullWidth
          />
        </EuiFormRow>

        <EuiFormRow label={'YARA rule'} fullWidth>
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

        <EuiSpacer size="m" />

        {showAssignmentSection && (
          <>
            <EuiHorizontalRule />
            <EuiFormRow fullWidth>
              <EffectedPolicySelect
                item={item}
                onChange={handleEffectedPolicyOnChange}
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
