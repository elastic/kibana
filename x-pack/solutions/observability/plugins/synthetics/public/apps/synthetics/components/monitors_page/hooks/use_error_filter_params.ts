/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { useGetUrlParams } from '../../../hooks';

export function buildErrorFilterParams(urlParams: ReturnType<typeof useGetUrlParams>) {
  const {
    dateRangeStart,
    dateRangeEnd,
    query,
    monitorTypes,
    locations,
    tags,
    projects,
    statusCodes,
  } = urlParams;

  const params: Record<string, string> = {
    from: dateRangeStart,
    to: dateRangeEnd,
  };
  if (monitorTypes) {
    params.monitorTypes = JSON.stringify(
      Array.isArray(monitorTypes) ? monitorTypes : [monitorTypes]
    );
  }
  if (locations) {
    params.locations = JSON.stringify(Array.isArray(locations) ? locations : [locations]);
  }
  if (tags) {
    params.tags = JSON.stringify(Array.isArray(tags) ? tags : [tags]);
  }
  if (projects) {
    params.projects = JSON.stringify(Array.isArray(projects) ? projects : [projects]);
  }
  if (statusCodes?.length) {
    params.statusCodes = JSON.stringify(statusCodes);
  }
  if (query) {
    params.query = query;
  }
  return params;
}
