/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProfilingSchema } from '@kbn/profiling-utils';
import { profilingSchemaRt } from '@kbn/profiling-utils';

/** Returns the valid `schema` param of a URL query string, if any. */
export const getSchemaQueryParam = (search: string): ProfilingSchema | undefined => {
  const schema = new URLSearchParams(search).get('schema');

  return profilingSchemaRt.is(schema) ? schema : undefined;
};
