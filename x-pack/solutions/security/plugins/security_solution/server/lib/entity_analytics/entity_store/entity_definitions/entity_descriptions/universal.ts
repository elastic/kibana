/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityDescription } from '../types';
import { collectValues as collect } from './field_utils';

export const UNIVERSAL_DEFINITION_VERSION = '1.0.0';
export const UNIVERSAL_IDENTITY_FIELD = 'related.entity';

const entityMetadataExtractorProcessor = {
  script: {
    tag: 'entity_metadata_extractor',
    on_failure: [
      {
        set: {
          field: 'error.message',
          value:
            'Processor {{ _ingest.on_failure_processor_type }} with tag {{ _ingest.on_failure_processor_tag }} in pipeline {{ _ingest.on_failure_pipeline }} failed with message {{ _ingest.on_failure_message }}',
        },
      },
    ],
    lang: 'painless',
    source: /* java */ `
      Map merged = ctx;
      def id = ctx.entity.id;

      for (meta in ctx.collected.metadata) {
        Object json = Processors.json(meta);

        if (((Map)json)[id] == null) {
          continue;
        }

        for (entry in ((Map)json)[id].entrySet()) {
          String key = entry.getKey();
          Object value = entry.getValue();
          merged.put(key, value);
        }
      }

      merged.entity.id = id;
      ctx = merged;
    `,
  },
};

export const universalEntityEngineDescription: EntityDescription = {
  version: UNIVERSAL_DEFINITION_VERSION,
  entityType: 'universal',
  identityField: UNIVERSAL_IDENTITY_FIELD,
  fields: [collect({ source: 'entities.keyword', destination: 'collected.metadata' })],
  settings: {
    timestampField: 'event.ingested',
  },
  pipeline: [entityMetadataExtractorProcessor],
};
