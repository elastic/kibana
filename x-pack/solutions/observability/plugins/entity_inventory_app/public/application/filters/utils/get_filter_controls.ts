/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { InventoryType } from '@kbn/entity-inventory-plugin/common';
import { getCategoryOfType } from '../../utils/entity_categories';
import { getAttributeLabel, getCategoryLabel } from './labels';

export interface FilterControlsParams {
  types: InventoryType[];
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

const getCategoryOrTypeId = ({ type }: InventoryType): string => getCategoryOfType(type) ?? type;

const getActiveCategory = ({
  pageCategory,
  selectedCategory,
}: Pick<FilterControlsParams, 'pageCategory' | 'selectedCategory'>): string | undefined =>
  pageCategory ?? selectedCategory;

export const getTypesOfCategory = (types: InventoryType[], category?: string): InventoryType[] => {
  if (!category) {
    return [];
  }

  return types.filter((type) => getCategoryOrTypeId(type) === category);
};

export const getCategories = (types: InventoryType[]): string[] => [
  ...new Set(types.map(getCategoryOrTypeId)),
];

const getSuggestedFilterNamesInScope = (typesInScope: InventoryType[]): string[] => {
  const typeCountByName = new Map<string, number>();
  typesInScope
    .flatMap(({ suggestedFilters }) => [...new Set(suggestedFilters)])
    .forEach((name) => typeCountByName.set(name, (typeCountByName.get(name) ?? 0) + 1));

  return [...typeCountByName.entries()].sort(([, a], [, b]) => b - a).map(([name]) => name);
};

const narrowToType = (typesOfCategory: InventoryType[], selectedType?: string): InventoryType[] =>
  selectedType ? typesOfCategory.filter(({ type }) => type === selectedType) : typesOfCategory;

export const getTypesInScope = (params: FilterControlsParams): InventoryType[] =>
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
