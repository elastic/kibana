/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProfilingSchema } from '@kbn/profiling-utils';
import { getSchemaQueryParam } from '../get_schema_query_param';

// URL query params kept by the Chrome navigation links into the profiling app
export interface NavigationLinkQuery {
  kuery?: string;
  schema?: ProfilingSchema;
}

/** Reads the query params the Chrome navigation links keep from a URL query string. */
export const getNavigationLinkQuery = (search: string): NavigationLinkQuery => ({
  kuery: new URLSearchParams(search).get('kuery') || undefined,
  schema: getSchemaQueryParam(search),
});

/** Adds the kept query params to the path of a Chrome navigation link. */
export const withNavigationLinkQuery = (
  path: string,
  { kuery, schema }: NavigationLinkQuery
): string => {
  const searchParams = new URLSearchParams();

  if (kuery) {
    searchParams.set('kuery', kuery);
  }
  if (schema) {
    searchParams.set('schema', schema);
  }

  const search = searchParams.toString();
  return search ? `${path}?${search}` : path;
};
