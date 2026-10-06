/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProfilingSchema } from '@kbn/profiling-utils';
import { useLocation } from 'react-router-dom';
import { getSchemaQueryParam } from '../utils/get_schema_query_param';

/**
 * Returns the valid `schema` URL param, if any. It reads the URL rather than the router params so
 * it can be used above route matching, where the current route might lack its required params.
 */
export const useSchemaQueryParam = (): ProfilingSchema | undefined => {
  const { search } = useLocation();

  return getSchemaQueryParam(search);
};
