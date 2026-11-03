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
  categoryOptions?: string[];
  typeOptions?: string[];
  attributeNames: string[];
}

const getCategoryOfType = ({ category, type }: EntityInventoryTypeDefinition): string =>
  category ?? type;

export const getTypesOfCategory = (
  types: EntityInventoryTypeDefinition[],
  category?: string
): EntityInventoryTypeDefinition[] =>
  category ? types.filter((type) => getCategoryOfType(type) === category) : [];

export const getCategories = (types: EntityInventoryTypeDefinition[]): string[] => [
  ...new Set(types.map(getCategoryOfType)),
];

const getDimensionNames = ({ attributes }: EntityInventoryTypeDefinition): string[] =>
  attributes.filter(({ dimension }) => dimension).map(({ name }) => name);

const getDimensionNamesInScope = (typesInScope: EntityInventoryTypeDefinition[]): string[] => {
  const typeCountByName = new Map<string, number>();
  typesInScope
    .flatMap((type) => [...new Set(getDimensionNames(type))])
    .forEach((name) => typeCountByName.set(name, (typeCountByName.get(name) ?? 0) + 1));

  return [...typeCountByName.entries()].sort(([, a], [, b]) => b - a).map(([name]) => name);
};

export const getTypesInScope = ({
  types,
  pageCategory,
  selectedCategory,
  selectedType,
}: FilterControlsParams): EntityInventoryTypeDefinition[] => {
  const typesOfCategory = getTypesOfCategory(types, pageCategory ?? selectedCategory);

  return selectedType
    ? typesOfCategory.filter(({ type }) => type === selectedType)
    : typesOfCategory;
};

export const getFilterControls = (params: FilterControlsParams): FilterControls => {
  const { types, pageCategory, selectedCategory } = params;
  const typesOfCategory = getTypesOfCategory(types, pageCategory ?? selectedCategory);

  return {
    categoryOptions: pageCategory ? undefined : getCategories(types),
    typeOptions: typesOfCategory.length > 1 ? typesOfCategory.map(({ type }) => type) : undefined,
    attributeNames: getDimensionNamesInScope(getTypesInScope(params)),
  };
};
