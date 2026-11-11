/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityInventoryTypeDefinition } from '../../inventory_api_types';
import { getAttributeLabel, getCategoryLabel } from './labels';

export interface FilterControlsParams {
  types: EntityInventoryTypeDefinition[];
  pageCategory?: string;
  selectedCategory?: string;
  selectedType?: string;
}

export interface FilterOption {
  name: string;
  label: string;
}

export interface FilterControls {
  categories: FilterOption[];
  types: FilterOption[];
  attributes: FilterOption[];
}

const getCategoryOrTypeId = ({ category, type }: EntityInventoryTypeDefinition): string =>
  category ?? type;

const getActiveCategory = ({
  pageCategory,
  selectedCategory,
}: Pick<FilterControlsParams, 'pageCategory' | 'selectedCategory'>): string | undefined =>
  pageCategory ?? selectedCategory;

export const getTypesOfCategory = (
  types: EntityInventoryTypeDefinition[],
  category?: string
): EntityInventoryTypeDefinition[] => {
  if (!category) {
    return [];
  }

  return types.filter((type) => getCategoryOrTypeId(type) === category);
};

export const getCategories = (types: EntityInventoryTypeDefinition[]): string[] => [
  ...new Set(types.map(getCategoryOrTypeId)),
];

const getSuggestedFilterNamesInScope = (
  typesInScope: EntityInventoryTypeDefinition[]
): string[] => {
  const typeCountByName = new Map<string, number>();
  typesInScope
    .flatMap(({ suggestedFilters }) => [...new Set(suggestedFilters)])
    .forEach((name) => typeCountByName.set(name, (typeCountByName.get(name) ?? 0) + 1));

  return [...typeCountByName.entries()].sort(([, a], [, b]) => b - a).map(([name]) => name);
};

const narrowToType = (
  typesOfCategory: EntityInventoryTypeDefinition[],
  selectedType?: string
): EntityInventoryTypeDefinition[] =>
  selectedType ? typesOfCategory.filter(({ type }) => type === selectedType) : typesOfCategory;

export const getTypesInScope = (params: FilterControlsParams): EntityInventoryTypeDefinition[] =>
  narrowToType(getTypesOfCategory(params.types, getActiveCategory(params)), params.selectedType);

export const getAttributeNamesInScope = (params: FilterControlsParams): string[] =>
  getSuggestedFilterNamesInScope(getTypesInScope(params));

export const getFilterControls = (params: FilterControlsParams): FilterControls => {
  const { types, pageCategory, selectedType } = params;
  const typesOfCategory = getTypesOfCategory(types, getActiveCategory(params));
  const typesInScope = narrowToType(typesOfCategory, selectedType);

  return {
    categories: pageCategory
      ? []
      : getCategories(types).map((name) => ({ name, label: getCategoryLabel(name) })),
    types:
      typesOfCategory.length > 1
        ? typesOfCategory.map(({ type, name }) => ({ name: type, label: name }))
        : [],
    attributes: getSuggestedFilterNamesInScope(typesInScope).map((name) => ({
      name,
      label: getAttributeLabel(typesInScope, name),
    })),
  };
};
