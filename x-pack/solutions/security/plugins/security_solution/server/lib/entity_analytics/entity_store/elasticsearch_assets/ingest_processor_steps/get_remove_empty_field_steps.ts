/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/types';
import { isFieldMissingOrEmpty } from '../../painless';

/**
 * This function creates an ingest processor step that removes a field if it is missing or empty.
 */
export const getRemoveEmptyFieldSteps = (fields: string[]): IngestProcessorContainer[] =>
  fields.map((field) => {
    return {
      remove: {
        if: isFieldMissingOrEmpty(`ctx.${field}`),
        field,
        ignore_missing: true,
      },
    };
  });
