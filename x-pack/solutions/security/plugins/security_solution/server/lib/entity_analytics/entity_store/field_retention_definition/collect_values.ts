/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isFieldMissingOrEmpty } from '../painless';
import type { BaseFieldRetentionOperator, FieldRetentionOperatorBuilder } from './types';

export interface CollectValues extends BaseFieldRetentionOperator {
  operation: 'collect_values';
  maxLength: number;
}

/**
 * A field retention operator that collects up to `maxLength` values of the specified field.
 * Values are first collected from the field, then from the enrich field if the field is not present or empty.
 */
export const collectValuesProcessor: FieldRetentionOperatorBuilder<CollectValues> = (
  { field, maxLength },
  { enrichField }
) => {
  const ctxField = `ctx.${field}`;
  const ctxEnrichField = `ctx.${enrichField}.${field}`;
  return {
    script: {
      lang: 'painless',
      source: `
  Set uniqueVals = new HashSet();
  
  if (!(${isFieldMissingOrEmpty(ctxField)})) {
    if(${ctxField} instanceof Collection) {
      uniqueVals.addAll(${ctxField});
    } else {
      uniqueVals.add(${ctxField});
    }
  }
  
  if (uniqueVals.size() < params.max_length && !(${isFieldMissingOrEmpty(ctxEnrichField)})) {
    int remaining = params.max_length - uniqueVals.size();
    List historicalVals = ${ctxEnrichField}.subList(0, (int) Math.min(remaining, ${ctxEnrichField}.size()));
    uniqueVals.addAll(historicalVals);
  }
  
  ${ctxField} = new ArrayList(uniqueVals).subList(0, (int) Math.min(params.max_length, uniqueVals.size()));
  `,
      params: {
        max_length: maxLength,
      },
    },
  };
};
