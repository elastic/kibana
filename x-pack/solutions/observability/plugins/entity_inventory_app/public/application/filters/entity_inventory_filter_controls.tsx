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
import { getAttributeLabel, getCategoryLabel, getTypeLabel } from './labels';
import {
  ALL_CATEGORIES_LABEL,
  ALL_TYPES_LABEL,
  CATEGORY_FILTER_LABEL,
  TYPES_ERROR_MESSAGE,
  TYPE_FILTER_LABEL,
} from './translations';

interface EntityInventoryFilterControlsProps {
  types: EntityInventoryTypeDefinition[];
  isLoading?: boolean;
  error?: Error;
  pageCategory?: string;
  timeRange: EntityInventoryAttributeValuesParams['timeRange'];
  selection: FilterControlsSelection;
  onSelectionChange: (selection: FilterControlsSelection) => void;
}

export function EntityInventoryFilterControls({
  types,
  isLoading = false,
  error,
  pageCategory,
  timeRange,
  selection,
  onSelectionChange,
}: EntityInventoryFilterControlsProps) {
  const params = {
    types,
    pageCategory,
    selectedCategory: selection.category,
    selectedType: selection.type,
  };
  const { categoryOptions, typeOptions, attributeNames } = getFilterControls(params);
  const definitionsInScope = getTypesInScope(params);
  const typeIdsInScope = definitionsInScope.map(({ type }) => type);

  if (error) {
    return <EuiCallOut announceOnMount size="s" color="danger" title={TYPES_ERROR_MESSAGE} />;
  }

  const updateSelection = (changes: Partial<FilterControlsSelection>) =>
    onSelectionChange(
      normalizeSelection({ types, pageCategory, selection: { ...selection, ...changes } })
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
      {categoryOptions && (
        <EuiFlexItem grow={false}>
          <FilterSelect
            label={CATEGORY_FILTER_LABEL}
            allLabel={ALL_CATEGORIES_LABEL}
            options={categoryOptions}
            selected={selection.category ? [selection.category] : []}
            onChange={([category]) => updateSelection({ category })}
            singleSelection
            isLoading={isLoading}
            getOptionLabel={getCategoryLabel}
            data-test-subj="entityInventoryCategoryFilter"
          />
        </EuiFlexItem>
      )}
      {typeOptions && (
        <EuiFlexItem grow={false}>
          <FilterSelect
            label={TYPE_FILTER_LABEL}
            allLabel={ALL_TYPES_LABEL}
            options={typeOptions}
            selected={selection.type ? [selection.type] : []}
            onChange={([type]) => updateSelection({ type })}
            singleSelection
            isLoading={isLoading}
            getOptionLabel={(type) => getTypeLabel(types, type)}
            data-test-subj="entityInventoryTypeFilter"
          />
        </EuiFlexItem>
      )}
      {attributeNames.map((attribute) => (
        <EuiFlexItem key={attribute} grow={false}>
          <AttributeFilter
            attribute={attribute}
            label={getAttributeLabel(definitionsInScope, attribute)}
            types={typeIdsInScope}
            filters={omit(selection.attributes, attribute)}
            timeRange={timeRange}
            selected={selection.attributes[attribute] ?? []}
            onChange={(values) => updateAttribute(attribute, values)}
          />
        </EuiFlexItem>
      ))}
    </EuiFlexGroup>
  );
}
