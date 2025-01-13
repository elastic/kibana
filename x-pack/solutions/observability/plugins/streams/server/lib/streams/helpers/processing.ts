/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ProcessingDefinition, getProcessorType } from '@kbn/streams-schema';
import { get } from 'lodash';
import { IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/types';
import { conditionToPainless } from './condition_to_painless';

export function formatToIngestProcessors(
  processing: ProcessingDefinition[]
): IngestProcessorContainer[] {
  return processing.map((processor) => {
    const type = getProcessorType(processor);
    const config = get(processor.config, type);
    return {
      [type]: {
        ...config,
        if: processor.condition ? conditionToPainless(processor.condition) : undefined,
      },
    };
  });
}
