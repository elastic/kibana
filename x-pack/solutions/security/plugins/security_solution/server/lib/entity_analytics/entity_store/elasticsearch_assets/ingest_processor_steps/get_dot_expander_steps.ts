/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/types';

/**
 * Returns the ingest processor steps for the dot expander processor for the given fields.
 * We need to expand the dot notation fields to be able to use them in the field retention processors.
 * Painless treats { "a.b" : "c" } and { "a" : { "b" : "c" } } as different fields.
 */
export const getDotExpanderSteps = (fields: string[]): IngestProcessorContainer[] =>
  fields.map((field) => {
    return {
      dot_expander: {
        field,
      },
    };
  });
