/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EntityEngineInstallationDescriptor } from '../installation/types';

export const dynamicNewestRetentionSteps = (description: EntityEngineInstallationDescriptor) => {
  const staticFields = description.fields.map((field) => `"${field.destination}"`).join(',');

  const painless = /* java */ `
    Set staticFields = new HashSet([${staticFields}]); 
    Map mergeFields(Map latest, Map historical) {
      for (entry in historical.entrySet()) {
        String key = entry.getKey();
            
        if (staticFields.contains(key)) {
            continue;
        }
            
        def historicalValue = entry.getValue();
        if (latest.containsKey(key)) {
          def latestValue = latest.get(key);
          if (latestValue instanceof Map && historicalValue instanceof Map) {
            latest.put(key, mergeFields(latestValue, historicalValue));
          }
        else {
          latest.put(key, historicalValue);
        }
      }
      return latest;
    }

    if (ctx.historical != null && ctx.historical instanceof Map) {
        ctx = mergeFields(ctx, ctx.historical);
    }
  `;
  return [
    {
      script: {
        source: painless,
        lang: 'painless',
      },
    },
  ];
};
