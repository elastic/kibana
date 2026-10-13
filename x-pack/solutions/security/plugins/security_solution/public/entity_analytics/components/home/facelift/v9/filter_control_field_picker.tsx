/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Field picker for the prototype control editor, mirroring
 * `presentation_util`'s FieldPicker (searchable + type filter + virtualized
 * bordered list) but reading the static Entity Store field catalogue instead
 * of a DataView.
 */

import React, { useCallback, useMemo, useRef, useState } from 'react';
import type { EuiSelectableOption } from '@elastic/eui';
import {
  EuiContextMenuItem,
  EuiContextMenuPanel,
  EuiFilterButton,
  EuiFilterGroup,
  EuiFlexGroup,
  EuiFlexItem,
  EuiFormRow,
  EuiInputPopover,
  EuiSelectable,
  EuiSpacer,
  useEuiTheme,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { getFieldTypeName } from '@kbn/field-utils';
import { i18n } from '@kbn/i18n';
import { FieldIcon } from '@kbn/react-field';
import { sortBy, uniq } from 'lodash';
import type { EntityStoreField } from './entity_store_fields';

const NO_MATCHING_FIELDS = i18n.translate(
  'xpack.securitySolution.entityAnalytics.facelift.controlEditor.noMatchingFields',
  { defaultMessage: 'No matching fields' }
);

const SELECT_A_FIELD = i18n.translate(
  'xpack.securitySolution.entityAnalytics.facelift.controlEditor.selectField',
  { defaultMessage: 'Select a field' }
);

const SEARCH_FIELD_NAMES = i18n.translate(
  'xpack.securitySolution.entityAnalytics.facelift.controlEditor.searchFieldNames',
  { defaultMessage: 'Search field names' }
);

const FILTER_BY_TYPE = i18n.translate(
  'xpack.securitySolution.entityAnalytics.facelift.controlEditor.filterByType',
  { defaultMessage: 'Filter by type' }
);

const FieldTypeFilter: React.FC<{
  availableFieldTypes: string[];
  fieldTypesValue: string[];
  onFieldTypesChange: (types: string[]) => void;
  setFocusToSearch: () => void;
}> = ({ availableFieldTypes, fieldTypesValue, onFieldTypesChange, setFocusToSearch }) => {
  const [isPopoverOpen, setPopoverOpen] = useState(false);

  return (
    <EuiFilterGroup compressed fullWidth>
      <EuiInputPopover
        panelPaddingSize="none"
        display="block"
        isOpen={isPopoverOpen}
        closePopover={() => setPopoverOpen(false)}
        fullWidth
        input={
          <EuiFilterButton
            data-test-subj="eaFaceliftControlEditorTypeFilterButton"
            iconType="chevronSingleDown"
            isSelected={isPopoverOpen}
            numFilters={0}
            hasActiveFilters={fieldTypesValue.length > 0}
            numActiveFilters={fieldTypesValue.length}
            onClick={() => setPopoverOpen((open) => !open)}
          >
            {FILTER_BY_TYPE}
          </EuiFilterButton>
        }
        focusTrapProps={{
          returnFocus: false, // focus is returned to the search input manually
          onDeactivation: setFocusToSearch,
        }}
      >
        <EuiContextMenuPanel
          items={availableFieldTypes.map((type) => (
            <EuiContextMenuItem
              key={type}
              icon={fieldTypesValue.includes(type) ? 'check' : 'empty'}
              data-test-subj={`eaFaceliftControlEditorTypeFilter-${type}`}
              onClick={() =>
                onFieldTypesChange(
                  fieldTypesValue.includes(type)
                    ? fieldTypesValue.filter((value) => value !== type)
                    : [...fieldTypesValue, type]
                )
              }
            >
              <EuiFlexGroup gutterSize="xs" responsive={false}>
                <EuiFlexItem grow={false}>
                  <FieldIcon type={type} label={type} />
                </EuiFlexItem>
                <EuiFlexItem>{getFieldTypeName(type)}</EuiFlexItem>
              </EuiFlexGroup>
            </EuiContextMenuItem>
          ))}
        />
      </EuiInputPopover>
    </EuiFilterGroup>
  );
};

export interface FilterControlFieldPickerProps {
  fields: EntityStoreField[];
  selectedFieldName?: string;
  onSelectField: (field: EntityStoreField) => void;
}

export const FilterControlFieldPicker: React.FC<FilterControlFieldPickerProps> = ({
  fields,
  selectedFieldName,
  onSelectField,
}) => {
  const { euiTheme } = useEuiTheme();
  /** Keeps the initially selected field pinned to the top while the flyout is open. */
  const initialSelection = useRef(selectedFieldName);
  const [typesFilter, setTypesFilter] = useState<string[]>([]);
  const [searchRef, setSearchRef] = useState<HTMLInputElement | null>(null);

  const availableFieldTypes = useMemo(() => uniq(fields.map((field) => field.esType)), [fields]);

  const options: EuiSelectableOption[] = useMemo(
    () =>
      sortBy(
        fields.filter((field) => typesFilter.length === 0 || typesFilter.includes(field.esType)),
        ['name']
      )
        .sort((field) => (field.name === initialSelection.current ? -1 : 1))
        .map((field) => ({
          key: field.name,
          label: field.name,
          checked: field.name === selectedFieldName ? 'on' : undefined,
          className: 'eaFaceliftControlEditor__fieldButton',
          'data-test-subj': `eaFaceliftControlEditorField-${field.name}`,
          prepend: <FieldIcon type={field.esType} label={field.name} className="eui-alignMiddle" />,
        })),
    [fields, selectedFieldName, typesFilter]
  );

  const setFocusToSearch = useCallback(() => {
    searchRef?.focus();
  }, [searchRef]);

  return (
    <EuiSelectable
      data-test-subj="eaFaceliftControlEditorFieldPicker"
      aria-label={SELECT_A_FIELD}
      emptyMessage={NO_MATCHING_FIELDS}
      searchable
      options={options}
      onChange={(_options, _event, changedOption) => {
        const field = fields.find(({ name }) => name === changedOption.key);
        if (field) onSelectField(field);
      }}
      searchProps={{
        'data-test-subj': 'eaFaceliftControlEditorFieldSearch',
        placeholder: SEARCH_FIELD_NAMES,
        compressed: true,
        inputRef: setSearchRef,
      }}
      listProps={{
        isVirtualized: true,
        showIcons: false,
        bordered: true,
        truncationProps: { truncation: 'middle' },
      }}
      height="full"
      css={css`
        height: calc(${euiTheme.size.xxl} * 9);

        .eaFaceliftControlEditor__fieldButton[aria-checked='true'] {
          background-color: ${euiTheme.colors.backgroundBasePrimary};
        }

        .euiSelectableMessage {
          height: 100%;
        }
      `}
    >
      {(list, search) => (
        <>
          {search}
          <EuiSpacer size="s" />
          <EuiFormRow fullWidth>
            <FieldTypeFilter
              availableFieldTypes={availableFieldTypes}
              fieldTypesValue={typesFilter}
              onFieldTypesChange={setTypesFilter}
              setFocusToSearch={setFocusToSearch}
            />
          </EuiFormRow>
          <EuiSpacer size="s" />
          {list}
        </>
      )}
    </EuiSelectable>
  );
};
