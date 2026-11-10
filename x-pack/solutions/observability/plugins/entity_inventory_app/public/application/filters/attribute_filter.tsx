/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { ENTITY_INVENTORY_EBT_ELEMENTS } from '../../ebt_constants';
import type { EntityInventoryAttributeValuesParams } from '../../inventory_api_types';
import { FilterSelect } from './filter_select';
import { VALUES_ERROR_MESSAGE } from './translations';
import { useAttributeValues } from './use_attribute_values';

interface AttributeFilterProps {
  attribute: string;
  label: string;
  types: string[];
  filters: Record<string, string[]>;
  timeRange: EntityInventoryAttributeValuesParams['timeRange'];
  selected: string[];
  onChange: (selected: string[]) => void;
}

export function AttributeFilter({
  attribute,
  label,
  types,
  filters,
  timeRange,
  selected,
  onChange,
}: AttributeFilterProps) {
  const { values, invalidSelections, isLoading, error } = useAttributeValues({
    attribute,
    types,
    filters,
    selected,
    timeRange,
  });

  return (
    <FilterSelect
      label={label}
      options={values.map((value) => ({ name: value, label: value }))}
      invalidOptions={invalidSelections}
      selected={selected}
      onChange={onChange}
      isLoading={isLoading}
      errorMessage={error ? VALUES_ERROR_MESSAGE : undefined}
      ebt={{ element: ENTITY_INVENTORY_EBT_ELEMENTS.FILTER_BAR, detail: attribute }}
      data-test-subj={`entityInventoryAttributeFilter-${attribute}`}
    />
  );
}
