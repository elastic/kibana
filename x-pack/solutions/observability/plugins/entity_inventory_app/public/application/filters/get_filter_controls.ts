/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityInventoryTypeDefinition } from '../../inventory_api_types';

export interface FilterControlsParams {
  types: EntityInventoryTypeDefinition[];
  pageCategory?: string;
  selectedCategory?: string;
  selectedType?: string;
}

export interface FilterControls {
  categoryFilter?: string[];
  typeFilter?: string[];
  attributeFilters: string[];
}

export interface FilterControlsSelection {
  category?: string;
  type?: string;
  attributes: Record<string, string[]>;
}

const getCategoryOfType = ({ category, type }: EntityInventoryTypeDefinition): string =>
  category ?? type;

const getTypesOfCategory = (
  types: EntityInventoryTypeDefinition[],
  category?: string
): EntityInventoryTypeDefinition[] =>
  category ? types.filter((type) => getCategoryOfType(type) === category) : [];

export const getCategories = (types: EntityInventoryTypeDefinition[]): string[] => [
  ...new Set(types.map(getCategoryOfType)),
];

const getDimensionNames = ({ attributes }: EntityInventoryTypeDefinition): string[] =>
  attributes.filter(({ dimension }) => dimension).map(({ name }) => name);

const getAttributeFilters = (typesInScope: EntityInventoryTypeDefinition[]): string[] => {
  const [first, ...others] = typesInScope.map(getDimensionNames);
  return first ? first.filter((name) => others.every((names) => names.includes(name))) : [];
};

export const getTypesInScope = ({
  types,
  pageCategory,
  selectedCategory,
  selectedType,
}: FilterControlsParams): EntityInventoryTypeDefinition[] =>
  selectedType
    ? types.filter(({ type }) => type === selectedType)
    : getTypesOfCategory(types, pageCategory ?? selectedCategory);

export const getFilterControls = (params: FilterControlsParams): FilterControls => {
  const { types, pageCategory, selectedCategory } = params;
  const typesOfCategory = getTypesOfCategory(types, pageCategory ?? selectedCategory);

  return {
    categoryFilter: pageCategory ? undefined : getCategories(types),
    typeFilter: typesOfCategory.length > 1 ? typesOfCategory.map(({ type }) => type) : undefined,
    attributeFilters: getAttributeFilters(getTypesInScope(params)),
  };
};

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
  const type = getTypesOfCategory(types, category).some(({ type: name }) => name === selection.type)
    ? selection.type
    : undefined;
  const { attributeFilters } = getFilterControls({
    types,
    pageCategory,
    selectedCategory: category,
    selectedType: type,
  });

  return {
    category: pageCategory ? undefined : category,
    type,
    attributes: Object.fromEntries(
      Object.entries(selection.attributes).filter(([name]) => attributeFilters.includes(name))
    ),
  };
};
