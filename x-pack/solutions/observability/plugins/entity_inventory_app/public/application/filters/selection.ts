/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityInventoryTypeDefinition } from '../../inventory_api_types';
import { getAttributeNamesInScope, getCategories, getTypesOfCategory } from './get_filter_controls';

export interface FilterControlsSelection {
  category?: string;
  type?: string;
  attributes: Record<string, string[]>;
}

export const EMPTY_SELECTION: FilterControlsSelection = { attributes: {} };

export const isSelectionEmpty = ({
  category,
  type,
  attributes,
}: FilterControlsSelection): boolean => !category && !type && Object.keys(attributes).length === 0;

export const normalizeSelection = ({
  types,
  pageCategory,
  selection,
}: {
  types: EntityInventoryTypeDefinition[];
  pageCategory?: string;
  selection: FilterControlsSelection;
}): FilterControlsSelection => {
  const category =
    pageCategory ??
    (selection.category && getCategories(types).includes(selection.category)
      ? selection.category
      : undefined);
  const type = getTypesOfCategory(types, category).some(
    ({ type: typeId }) => typeId === selection.type
  )
    ? selection.type
    : undefined;
  const attributeNames = getAttributeNamesInScope({
    types,
    pageCategory,
    selectedCategory: category,
    selectedType: type,
  });

  return {
    category: pageCategory ? undefined : category,
    type,
    attributes: Object.fromEntries(
      Object.entries(selection.attributes).filter(([name]) => attributeNames.includes(name))
    ),
  };
};
