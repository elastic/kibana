/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { omit } from 'lodash';
import { EuiButtonEmpty, EuiCallOut, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type {
  EntityInventoryAttributeValuesParams,
  EntityInventoryTypeDefinition,
} from '../../inventory_api_types';
import { AttributeFilter } from './attribute_filter';
import { FilterSelect } from './filter_select';
import { getFilterControls, getTypesInScope } from './get_filter_controls';
import { EMPTY_SELECTION, isSelectionEmpty, normalizeSelection } from './selection';
import type { FilterControlsSelection } from './selection';
import type { FilterOption } from './get_filter_controls';
import {
  ALL_CATEGORIES_LABEL,
  ALL_TYPES_LABEL,
  CATEGORY_FILTER_LABEL,
  CLEAR_FILTERS_LABEL,
  TYPES_ERROR_MESSAGE,
  TYPE_FILTER_LABEL,
} from './translations';

interface EntityInventoryFilterControlsProps {
  typeDefinitions: EntityInventoryTypeDefinition[];
  isLoading?: boolean;
  error?: Error;
  pageCategory?: string;
  timeRange: EntityInventoryAttributeValuesParams['timeRange'];
  selection: FilterControlsSelection;
  onSelectionChange: (selection: FilterControlsSelection) => void;
}

interface SingleSelectFilterProps {
  label: string;
  allLabel: string;
  options: FilterOption[];
  value?: string;
  onChange: (value?: string) => void;
  isLoading?: boolean;
  isDisabled?: boolean;
  'data-test-subj': string;
}

function SingleSelectFilter({ value, onChange, ...filterProps }: SingleSelectFilterProps) {
  return (
    <FilterSelect
      {...filterProps}
      selected={value ? [value] : []}
      onChange={([next]) => onChange(next)}
      singleSelection
    />
  );
}

export function EntityInventoryFilterControls({
  typeDefinitions,
  isLoading = false,
  error,
  pageCategory,
  timeRange,
  selection,
  onSelectionChange,
}: EntityInventoryFilterControlsProps) {
  if (error) {
    return <EuiCallOut announceOnMount size="s" color="danger" title={TYPES_ERROR_MESSAGE} />;
  }

  const scope = {
    types: typeDefinitions,
    pageCategory,
    selectedCategory: selection.category,
    selectedType: selection.type,
  };
  const { categories, types, attributes } = getFilterControls(scope);
  const typeIds = getTypesInScope(scope).map(({ type }) => type);

  const updateSelection = (changes: Partial<FilterControlsSelection>) =>
    onSelectionChange(
      normalizeSelection({
        types: typeDefinitions,
        pageCategory,
        selection: { ...selection, ...changes },
      })
    );

  const updateAttribute = (attribute: string, values: string[]) => {
    const otherAttributes = omit(selection.attributes, attribute);
    updateSelection({
      attributes: values.length > 0 ? { ...otherAttributes, [attribute]: values } : otherAttributes,
    });
  };

  const hasSelection = !isSelectionEmpty(selection);

  return (
    <EuiFlexGroup
      gutterSize="s"
      responsive={false}
      wrap
      alignItems="center"
      data-test-subj="entityInventoryFilterControls"
    >
      {isLoading ? (
        <EuiFlexItem grow={false}>
          <SingleSelectFilter
            label={pageCategory ? TYPE_FILTER_LABEL : CATEGORY_FILTER_LABEL}
            allLabel={pageCategory ? ALL_TYPES_LABEL : ALL_CATEGORIES_LABEL}
            options={[]}
            onChange={() => {}}
            isLoading
            isDisabled
            data-test-subj="entityInventoryFilterControlsLoading"
          />
        </EuiFlexItem>
      ) : (
        <>
          {categories.length > 0 && (
            <EuiFlexItem grow={false}>
              <SingleSelectFilter
                label={CATEGORY_FILTER_LABEL}
                allLabel={ALL_CATEGORIES_LABEL}
                options={categories}
                value={selection.category}
                onChange={(category) => updateSelection({ category })}
                data-test-subj="entityInventoryCategoryFilter"
              />
            </EuiFlexItem>
          )}
          {types.length > 0 && (
            <EuiFlexItem grow={false}>
              <SingleSelectFilter
                label={TYPE_FILTER_LABEL}
                allLabel={ALL_TYPES_LABEL}
                options={types}
                value={selection.type}
                onChange={(type) => updateSelection({ type })}
                data-test-subj="entityInventoryTypeFilter"
              />
            </EuiFlexItem>
          )}
          {attributes.map(({ name, label }) => (
            <EuiFlexItem key={name} grow={false}>
              <AttributeFilter
                attribute={name}
                label={label}
                types={typeIds}
                filters={omit(selection.attributes, name)}
                timeRange={timeRange}
                selected={selection.attributes[name] ?? []}
                onChange={(values) => updateAttribute(name, values)}
              />
            </EuiFlexItem>
          ))}
          {hasSelection && (
            <EuiFlexItem grow={false}>
              <EuiButtonEmpty
                size="s"
                iconType="cross"
                onClick={() => onSelectionChange(EMPTY_SELECTION)}
                data-test-subj="entityInventoryClearFilters"
              >
                {CLEAR_FILTERS_LABEL}
              </EuiButtonEmpty>
            </EuiFlexItem>
          )}
        </>
      )}
    </EuiFlexGroup>
  );
}
