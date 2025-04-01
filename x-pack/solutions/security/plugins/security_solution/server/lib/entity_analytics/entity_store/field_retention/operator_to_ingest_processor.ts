/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/types';
import { preferNewestValueProcessor } from './prefer_newest_value';
import { preferOldestValueProcessor } from './prefer_oldest_value';
import { collectValuesProcessor } from './collect_values';
import type { FieldDescription } from '../installation/types';

/**
 * Converts a field retention operator to an ingest processor.
 * An ingest processor is a step that can be added to an ingest pipeline.
 */
export const fieldOperatorToIngestProcessor = (
  field: FieldDescription,
  options: { enrichField: string }
): IngestProcessorContainer => {
  if (!field.retention) {
    throw new Error('Field retention operator is required');
  }

  switch (field.retention.operation) {
    case 'prefer_newest_value':
      return preferNewestValueProcessor(field, options);
    case 'prefer_oldest_value':
      return preferOldestValueProcessor(field, options);
    case 'collect_values':
      return collectValuesProcessor(field, options);
  }
};
