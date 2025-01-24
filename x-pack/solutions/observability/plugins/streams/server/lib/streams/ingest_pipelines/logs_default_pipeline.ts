/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const logsDefaultPipelineProcessors = [
  {
    set: {
      description: "If '@timestamp' is missing, set it with the ingest timestamp",
      field: '@timestamp',
      override: false,
      copy_from: '_ingest.timestamp',
    },
  },
  {
    pipeline: {
      name: 'logs@json-pipeline',
      ignore_missing_pipeline: true,
    },
  },
  {
    script: {
      lang: 'painless',
      source: `
    void collectFieldNames(def ctx, Map map, String parent) {
      for (Map.Entry entry : map.entrySet()) {
        String key = entry.getKey();
        if (ctx == map && (key.startsWith('_') || key.equals('original_fields'))) { continue; }
        Object value = entry.getValue();
        String fullPath = parent == null ? key : parent + "." + key;
        
        ctx.original_fields.add(fullPath);
        
        if (value instanceof Map) {
          collectFieldNames(ctx, (Map) value, fullPath);
        } else if (value instanceof List) {
          for (Object item : (List) value) {
            if (item instanceof Map) {
              collectFieldNames(ctx, (Map) item, fullPath);
            }
          }
        }
      }
    }
          ctx.original_fields = new ArrayList();

    collectFieldNames(ctx, ctx, null);
  `,
    },
  },
  {
    dot_expander: {
      field: '*',
    },
  },
];
