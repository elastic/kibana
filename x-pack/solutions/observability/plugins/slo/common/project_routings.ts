/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const LOCAL_PROJECT_ROUTING = '_alias:_origin';
export const ALL_PROJECT_ROUTING = '_alias:*';

// Folds null / blank / LOCAL into LOCAL; passes any other defined value through.
export const normalizeDefinedRouting = (r: string | null): string =>
  r === null || r.trim().length === 0 || r === LOCAL_PROJECT_ROUTING ? LOCAL_PROJECT_ROUTING : r;

export function toEsProjectRouting(
  projectRoutings: string | null | undefined,
  preventCrossProjectSearch: boolean | undefined
): string | undefined {
  if (projectRoutings !== undefined) return normalizeDefinedRouting(projectRoutings);
  if (preventCrossProjectSearch === false) return undefined;
  return LOCAL_PROJECT_ROUTING;
}

export function toPickerProjectRouting(
  projectRoutings: string | null | undefined,
  preventCrossProjectSearch: boolean | undefined
): string | undefined {
  if (projectRoutings !== undefined) return normalizeDefinedRouting(projectRoutings);
  if (preventCrossProjectSearch === true) return LOCAL_PROJECT_ROUTING;
  if (preventCrossProjectSearch === false) return ALL_PROJECT_ROUTING;
  return undefined;
}
