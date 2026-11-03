/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { omit } from 'lodash';
import { EuiCallOut, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type {
  EntityInventoryAttributeValuesParams,
  EntityInventoryTypeDefinition,
} from '../../inventory_api_types';
import { AttributeFilter } from './attribute_filter';
import { FilterSelect } from './filter_select';
import { getFilterControls, getTypesInScope } from './get_filter_controls';
import { normalizeSelection } from './selection';
import type { FilterControlsSelection } from './selection';
import {
  ALL_CATEGORIES_LABEL,
  ALL_TYPES_LABEL,
  CATEGORY_FILTER_LABEL,
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

export function EntityInventoryFilterControls({
  typeDefinitions,
  isLoading = false,
  error,
  pageCategory,
  timeRange,
  selection,
  onSelectionChange,
}: EntityInventoryFilterControlsProps) {
  const params = {
    types: typeDefinitions,
    pageCategory,
    selectedCategory: selection.category,
    selectedType: selection.type,
  };
  const { categories, types, attributes } = getFilterControls(params);
  const typeIds = getTypesInScope(params).map(({ type }) => type);

  if (error) {
    return <EuiCallOut announceOnMount size="s" color="danger" title={TYPES_ERROR_MESSAGE} />;
  }

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

  return (
    <EuiFlexGroup
      gutterSize="s"
      responsive={false}
      wrap
      data-test-subj="entityInventoryFilterControls"
    >
      {categories.length > 0 && (
        <EuiFlexItem grow={false}>
          <FilterSelect
            label={CATEGORY_FILTER_LABEL}
            allLabel={ALL_CATEGORIES_LABEL}
            options={categories}
            selected={selection.category ? [selection.category] : []}
            onChange={([category]) => updateSelection({ category })}
            singleSelection
            isLoading={isLoading}
            data-test-subj="entityInventoryCategoryFilter"
          />
        </EuiFlexItem>
      )}
      {types.length > 0 && (
        <EuiFlexItem grow={false}>
          <FilterSelect
            label={TYPE_FILTER_LABEL}
            allLabel={ALL_TYPES_LABEL}
            options={types}
            selected={selection.type ? [selection.type] : []}
            onChange={([type]) => updateSelection({ type })}
            singleSelection
            isLoading={isLoading}
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
    </EuiFlexGroup>
  );
}
