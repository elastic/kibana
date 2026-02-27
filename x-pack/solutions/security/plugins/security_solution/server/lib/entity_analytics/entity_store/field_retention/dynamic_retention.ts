/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export const dynamicNewestRetentionSteps = (ignoreFields: string[]) => {
  const staticFields = ignoreFields.map((field) => `"${field}"`).join(',');

  const painless = /* java */ `
    Map mergeFields(Map latest, Map historical, Set staticFields) {
      for (entry in historical.entrySet()) {
        String key = entry.getKey();          
        if (staticFields.contains(key)) {
          continue;
        }
                
        def historicalValue = entry.getValue();
        if (latest.containsKey(key)) {
          def latestValue = latest.get(key);
          if (latestValue instanceof Map && historicalValue instanceof Map) {
            latest.put(key, mergeFields(latestValue, historicalValue, staticFields));
          }
        } else {
          latest.put(key, historicalValue);
        }
      }
      return latest;
    }

    Set staticFields = new HashSet([${staticFields}]); 
    if (ctx.historical != null && ctx.historical instanceof Map) {
      ctx = mergeFields(ctx, ctx.historical, staticFields);
    }
  `;
  return {
    script: {
      source: painless,
      lang: 'painless',
    },
  };
};
