/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Values mirror `@kbn/cps-server-utils` (server-only) and `@kbn/cps-common` (private to the
 * platform group); declared here so browser and server code can share one definition.
 */
export const LOCAL_PROJECT_ROUTING = '_alias:_origin';
export const ALL_PROJECT_ROUTING = '_alias:*';

// Only for routings the caller knows are set: `undefined` means "never configured", which
// callers must keep distinct from an explicit origin-only routing.
export const normalizeDefinedRouting = (r: string | null): string =>
  r === null || r.trim().length === 0 || r === LOCAL_PROJECT_ROUTING ? LOCAL_PROJECT_ROUTING : r;

// `undefined` only when neither field was ever configured, so the picker can seed a value.
export function toPickerProjectRouting(
  projectRoutings: string | null | undefined,
  preventCrossProjectSearch: boolean | undefined
): string | undefined {
  if (projectRoutings !== undefined) return normalizeDefinedRouting(projectRoutings);
  if (preventCrossProjectSearch === true) return LOCAL_PROJECT_ROUTING;
  if (preventCrossProjectSearch === false) return ALL_PROJECT_ROUTING;
  return undefined;
}

// Same mapping as the picker, but never-configured falls back to all projects, matching the
// pre-projectRoutings behavior where the absent/false boolean left project_routing unset.
export function toEsProjectRouting(
  projectRoutings: string | null | undefined,
  preventCrossProjectSearch: boolean | undefined
): string {
  return toPickerProjectRouting(projectRoutings, preventCrossProjectSearch) ?? ALL_PROJECT_ROUTING;
}
