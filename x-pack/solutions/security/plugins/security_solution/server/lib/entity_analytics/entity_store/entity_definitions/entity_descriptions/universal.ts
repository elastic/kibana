/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/types';
import type { EntityDescription } from '../types';
import { collectValues } from './field_utils';

export const UNIVERSAL_DEFINITION_VERSION = '1.0.0';
export const UNIVERSAL_IDENTITY_FIELD = 'related.entity';

export const entityMetadataExtractorProcessor = {
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
    // Array, boolean, integer, ip, bytes, anything that is not a map, is a leaf field
     void overwriteLeafFields(Object toBeOverwritten, Object toOverwrite) {
        if (!(toBeOverwritten instanceof Map)) {
         // We can't override anything that isn't a map
         return;
        }
        if (toOverwrite instanceof Map) { 
          Map mapToBeOverwritten = (Map) toBeOverwritten;
          for (entryToOverwrite in ((Map) toOverwrite).entrySet()) {
            String keyToOverwrite = entryToOverwrite.getKey();
            Object valueToOverwrite = entryToOverwrite.getValue();
              
            if (valueToOverwrite instanceof Map) {
              // If no initial value, we just put everything we have to overwrite
              if (mapToBeOverwritten.get(keyToOverwrite) == null) { 
                mapToBeOverwritten.put(keyToOverwrite, valueToOverwrite)
              } else {
                overwriteLeafFields(mapToBeOverwritten.get(keyToOverwrite), valueToOverwrite);
              }
            } else {
              mapToBeOverwritten.put(keyToOverwrite, valueToOverwrite)
            }
          }
        }
      }

      def id = ctx.entity.id;
      Map merged = ctx;
      for (meta in ctx.collected.metadata) {
        Object json = Processors.json(meta);
        if (((Map)json)[id] == null) {
          continue;
        }

        if (((Map)json)[id] != null) {
          overwriteLeafFields(merged, ((Map)json)[id]);
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
  fields: [collectValues({ source: 'entities.keyword', destination: 'collected.metadata' })],
  settings: {
    timestampField: 'event.ingested',
  },
  pipeline: (processors: IngestProcessorContainer[]) => {
    const index = processors.findIndex((p) => Boolean(p.enrich));

    if (index === -1) {
      throw new Error('Enrich processor not found');
    }

    const init = processors.slice(0, index);
    const tail = processors.slice(index);
    const pipe = [...init, entityMetadataExtractorProcessor, ...tail];

    return pipe;
  },
  dynamic: true,
};
