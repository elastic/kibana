/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProfilingSchema } from '@kbn/profiling-utils';
import { useEffect } from 'react';
import { getDefaultSchema } from '../utils/get_default_schema';

interface UseSelectDefaultSchemaParams {
  /** Schemas with profiling data, undefined while unknown */
  schemas?: ProfilingSchema[];
  /** Schemas the deployment supports, regardless of their data */
  supportedSchemas: ProfilingSchema[];
  /** Whether the schemas with data or the supported schemas are loading */
  isLoading: boolean;
  /** Whether a schema is already selected, in which case no default is selected */
  hasSelectedSchema: boolean;
  /** Called with the default schema once the schemas with data are settled, while no schema is selected */
  onSelectDefaultSchema: (schema: ProfilingSchema) => void;
}

/** Selects the default schema while none is selected, once the schemas with data load or fail to load. */
export const useSelectDefaultSchema = ({
  schemas,
  supportedSchemas,
  isLoading,
  hasSelectedSchema,
  onSelectDefaultSchema,
}: UseSelectDefaultSchemaParams): void => {
  useEffect(() => {
    // When the schemas with data cannot be fetched, the default is still selected so the data can be queried
    if (!hasSelectedSchema && !isLoading) {
      onSelectDefaultSchema(getDefaultSchema(schemas ?? [], supportedSchemas));
    }
  }, [hasSelectedSchema, isLoading, schemas, supportedSchemas, onSelectDefaultSchema]);
};
