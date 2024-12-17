/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IngestProcessorContainer } from '@elastic/elasticsearch/lib/api/types';

/**
 * Deeply copies ctx object to the debug_ctx field for debugging purposes
 * Deep copy is necessary because the context is a mutable object and painless copies by ref
 */
export const debugDeepCopyContextStep = (): IngestProcessorContainer => ({
  script: {
    lang: 'painless',
    source: `
  Map deepCopy(Map original) {
      Map copy = new HashMap();
      for (entry in original.entrySet()) {
          if (entry.getValue() instanceof Map) {
              // Recursively deep copy nested maps
              copy.put(entry.getKey(), deepCopy((Map)entry.getValue()));
          } else if (entry.getValue() instanceof List) {
              // Deep copy lists
              List newList = new ArrayList();
              for (item in (List)entry.getValue()) {
                  if (item instanceof Map) {
                      newList.add(deepCopy((Map)item));
                  } else {
                      newList.add(item);
                  }
              }
              copy.put(entry.getKey(), newList);
          } else {
              // Copy by value for other types
              copy.put(entry.getKey(), entry.getValue());
          }
      }
      return copy;
  }
  
  ctx.debug_ctx = deepCopy(ctx);
    `,
  },
});
