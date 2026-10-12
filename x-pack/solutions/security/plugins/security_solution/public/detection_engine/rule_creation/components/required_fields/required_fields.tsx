/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useCallback, useMemo, useRef } from 'react';
import { EuiButtonEmpty, EuiCallOut, EuiFormRow, EuiSpacer, EuiText } from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import type { DataViewFieldBase } from '@kbn/es-query';
import useToggle from 'react-use/lib/useToggle';
import type { RequiredFieldInput } from '../../../../../common/api/detection_engine';
import { UseArray, useFormData } from '../../../../shared_imports';
import type { FormHook, ArrayItem } from '../../../../shared_imports';
import { RequiredFieldsHelpInfo } from './required_fields_help_info';
import * as defineRuleI18n from '../../../rule_creation_ui/components/step_define_rule/translations';
import { OptionalFieldLabel } from '../optional_field_label';
import { RequiredFieldRow } from './required_fields_row';
import type { RequiredFieldRowView, RequiredFieldWarnings } from './required_fields_row';
import { getFlattenedArrayFieldNames } from '../utils';
import { MAX_UNFOLDED_REQUIRED_FIELDS } from './constants';
import * as i18n from './translations';

interface RequiredFieldsComponentProps {
  path: string;
  indexPatternFields?: DataViewFieldBase[];
  isIndexPatternLoading?: boolean;
}

const RequiredFieldsComponent = ({
  path,
  indexPatternFields = [],
  isIndexPatternLoading = false,
}: RequiredFieldsComponentProps) => {
  return (
    <UseArray path={path} initialNumberOfItems={0}>
      {({ items, addItem, removeItem, form }) => (
        <RequiredFieldsList
          items={items}
          addItem={addItem}
          removeItem={removeItem}
          indexPatternFields={indexPatternFields}
          isIndexPatternLoading={isIndexPatternLoading}
          path={path}
          form={form}
        />
      )}
    </UseArray>
  );
};

interface RequiredFieldsListProps {
  items: ArrayItem[];
  addItem: () => void;
  removeItem: (id: number) => void;
  indexPatternFields: DataViewFieldBase[];
  isIndexPatternLoading: boolean;
  path: string;
  form: FormHook;
}

const RequiredFieldsList = ({
  items,
  addItem,
  removeItem,
  indexPatternFields,
  isIndexPatternLoading,
  path,
  form,
}: RequiredFieldsListProps) => {
  /*
    This component should only re-render when either the "index" form field (index patterns) or the required fields change.

    By default, the `useFormData` hook triggers a re-render whenever any form field changes.
    It also allows optimization by passing a "watch" array of field names. The component then only re-renders when these specified fields change.

    However, it doesn't work with fields created using the `UseArray` component.
    In `useFormData`, these array fields are stored as "flattened" objects with numbered keys, like { "requiredFields[0]": { ... }, "requiredFields[1]": { ... } }.
    The "watch" feature of `useFormData` only works if you pass these "flattened" field names, such as ["requiredFields[0]", "requiredFields[1]", ...], not just "requiredFields".

    To work around this, we manually construct a list of "flattened" field names to watch, based on the current state of the form.
    This is a temporary solution and ideally, `useFormData` should be updated to handle this scenario.
  */
  const flattenedFieldNames = getFlattenedArrayFieldNames(form, path);

  /*
    Not using "watch" for the initial render, to let row components render and initialize form fields.
    Then we can use the "watch" feature to track their changes.
  */
  const hasRenderedInitially = flattenedFieldNames.length > 0;
  const fieldsToWatch = hasRenderedInitially ? ['index', ...flattenedFieldNames] : [];

  const [formData] = useFormData({ watch: fieldsToWatch });

  const fieldValue: RequiredFieldInput[] = formData[path] ?? [];

  const typesByFieldName: Record<string, string[]> = useMemo(
    () =>
      indexPatternFields.reduce((accumulator, field) => {
        if (field.esTypes?.length) {
          accumulator[field.name] = field.esTypes;
        }
        return accumulator;
      }, {} as Record<string, string[]>),
    [indexPatternFields]
  );

  const allFieldNames = useMemo(() => Object.keys(typesByFieldName), [typesByFieldName]);

  const esFlattenedFieldNames = useMemo(
    () =>
      new Set(
        Object.entries(typesByFieldName)
          .filter(([, types]) => types.includes('flattened'))
          .map(([name]) => name)
      ),
    [typesByFieldName]
  );

  const allFieldNamesSet = useMemo(() => new Set(allFieldNames), [allFieldNames]);

  const selectedFieldNamesKey = fieldValue.map(({ name }) => name).join('\u0000');

  const availableFieldNames = useMemo(() => {
    const selectedFieldNames = new Set(selectedFieldNamesKey.split('\u0000'));

    return allFieldNames.filter((name) => !selectedFieldNames.has(name));
  }, [allFieldNames, selectedFieldNamesKey]);

  /*
    Rows read available field names via a stable getter so editing one row's name
    doesn't re-render every other row. Name comboboxes read it when focused.
  */
  const availableFieldNamesRef = useRef(availableFieldNames);
  availableFieldNamesRef.current = availableFieldNames;
  const getAvailableFieldNames = useCallback(() => availableFieldNamesRef.current, []);

  /* Stable across row value changes, so rows can compute their own warnings without re-rendering each other */
  const getWarnings = useCallback(
    ({ name, type }: RequiredFieldInput): RequiredFieldWarnings => {
      /* Creating warnings only if "name" value is filled in */
      if (isIndexPatternLoading || name === '') {
        return NO_WARNINGS;
      }

      const typesForName = typesByFieldName[name];
      const isNameFound =
        allFieldNamesSet.has(name) || isSubfieldOfFlattenedField(name, esFlattenedFieldNames);

      return {
        nameWarning: isNameFound ? '' : i18n.FIELD_NAME_NOT_FOUND_WARNING(name),
        typeWarning:
          typesForName && !typesForName.includes(type)
            ? i18n.FIELD_TYPE_NOT_FOUND_WARNING(name, type)
            : '',
      };
    },
    [isIndexPatternLoading, typesByFieldName, allFieldNamesSet, esFlattenedFieldNames]
  );

  const hasEmptyFieldName = fieldValue.some(({ name }) => name === '');

  /*
    Rendering a row is expensive (two comboboxes per row), so long lists are folded.
    Folded rows are still mounted as form fields to keep their values in the form.
    Unfolded rows beyond the first ones render compact until the user focuses them.
  */
  const [isExpanded, toggleExpanded] = useToggle(false);
  const foldedRowsCount = isExpanded
    ? 0
    : items.filter((item, index) => getRowView({ item, index, isExpanded }) === 'folded').length;

  const hasWarnings = fieldValue.some((value) => {
    const { nameWarning, typeWarning } = getWarnings(value);

    return nameWarning !== '' || typeWarning !== '';
  });

  return (
    <>
      {hasWarnings && (
        <EuiCallOut
          announceOnMount
          title={i18n.REQUIRED_FIELDS_GENERAL_WARNING_TITLE}
          color="warning"
          iconType="question"
          data-test-subj="requiredFieldsGeneralWarning"
        >
          <p>
            <FormattedMessage
              id="xpack.securitySolution.detectionEngine.ruleDescription.requiredFields.generalWarningDescription"
              defaultMessage="This doesn't break rule execution, but it might indicate that required fields were set incorrectly. Please check that indices specified in the rule's {source} exist and have expected fields and types in mappings."
              values={{
                source: <strong>{defineRuleI18n.SOURCE}</strong>,
              }}
            />
          </p>
        </EuiCallOut>
      )}
      <EuiSpacer size="m" />
      <EuiFormRow
        fullWidth
        label={
          <>
            {i18n.REQUIRED_FIELDS_LABEL}
            <RequiredFieldsHelpInfo />
          </>
        }
        labelAppend={
          <EuiText color="subdued" size="xs">
            {OptionalFieldLabel}
          </EuiText>
        }
        hasChildLabel={false}
        labelType="legend"
        data-test-subj="requiredFieldsFormRow"
      >
        <>
          {items.map((item, index) => (
            <RequiredFieldRow
              key={item.id}
              item={item}
              view={getRowView({ item, index, isExpanded })}
              removeItem={removeItem}
              getWarnings={getWarnings}
              typesByFieldName={typesByFieldName}
              getAvailableFieldNames={getAvailableFieldNames}
              parentFieldPath={path}
            />
          ))}

          {(foldedRowsCount > 0 || isExpanded) && (
            <EuiButtonEmpty
              size="xs"
              iconType={isExpanded ? 'arrowUp' : 'arrowDown'}
              onClick={toggleExpanded}
              data-test-subj="toggleRequiredFieldsFoldButton"
            >
              {isExpanded
                ? i18n.SHOW_LESS_REQUIRED_FIELDS
                : i18n.SHOW_MORE_REQUIRED_FIELDS(foldedRowsCount)}
            </EuiButtonEmpty>
          )}

          <EuiSpacer size="s" />
          <EuiButtonEmpty
            size="xs"
            iconType="plusCircle"
            onClick={addItem}
            isDisabled={isIndexPatternLoading || hasEmptyFieldName}
            data-test-subj="addRequiredFieldButton"
          >
            {i18n.ADD_REQUIRED_FIELD}
          </EuiButtonEmpty>
        </>
      </EuiFormRow>
    </>
  );
};

export const RequiredFields = React.memo(RequiredFieldsComponent);

/* Newly added rows are always fully rendered so the user can fill them in */
const getRowView = ({
  item,
  index,
  isExpanded,
}: {
  item: ArrayItem;
  index: number;
  isExpanded: boolean;
}): RequiredFieldRowView => {
  if (index < MAX_UNFOLDED_REQUIRED_FIELDS || item.isNew) {
    return 'full';
  }

  return isExpanded ? 'compact' : 'folded';
};

const NO_WARNINGS: RequiredFieldWarnings = { nameWarning: '', typeWarning: '' };

const isSubfieldOfFlattenedField = (
  fieldName: string,
  esFlattenedFieldNames: Set<string>
): boolean => {
  const parts = fieldName.split('.');

  for (let i = parts.length - 1; i > 0; i--) {
    const parentPath = parts.slice(0, i).join('.');

    if (esFlattenedFieldNames.has(parentPath)) {
      return true;
    }
  }

  return false;
};
