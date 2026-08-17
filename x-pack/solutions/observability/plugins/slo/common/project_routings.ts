/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const LOCAL_PROJECT_ROUTING = '_alias:_origin';
export const ALL_PROJECT_ROUTING = '_alias:*';

export function toEsProjectRouting(
  projectRoutings: string | null | undefined,
  preventCrossProjectSearch: boolean | undefined
): string | undefined {
  if (projectRoutings !== undefined) {
    if (
      projectRoutings === null ||
      projectRoutings.trim().length === 0 ||
      projectRoutings === LOCAL_PROJECT_ROUTING
    ) {
      return LOCAL_PROJECT_ROUTING;
    }
    return projectRoutings;
  }

  if (preventCrossProjectSearch === false) {
    return undefined;
  }

  return LOCAL_PROJECT_ROUTING;
}

export function toPickerProjectRouting(
  projectRoutings: string | null | undefined,
  preventCrossProjectSearch: boolean | undefined
): string | undefined {
  if (projectRoutings !== undefined) {
    if (
      projectRoutings === null ||
      projectRoutings.trim().length === 0 ||
      projectRoutings === LOCAL_PROJECT_ROUTING
    ) {
      return LOCAL_PROJECT_ROUTING;
    }
    return projectRoutings;
  }

  if (preventCrossProjectSearch === true) {
    return LOCAL_PROJECT_ROUTING;
  }

  if (preventCrossProjectSearch === false) {
    return ALL_PROJECT_ROUTING;
  }

  return undefined;
}
