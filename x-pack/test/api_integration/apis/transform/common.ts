/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PutTransformsRequestSchema } from '@kbn/transform-plugin/common/api_schemas/transforms';

export async function asyncForEach(array: any[], callback: Function) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array);
  }
}

export function generateDestIndex(transformId: string): string {
  return `user-${transformId}`;
}

export function generateTransformConfig(transformId: string): PutTransformsRequestSchema {
  const destinationIndex = generateDestIndex(transformId);

  return {
    source: { index: ['ft_farequote'] },
    pivot: {
      group_by: { airline: { terms: { field: 'airline' } } },
      aggregations: { '@timestamp.value_count': { value_count: { field: '@timestamp' } } },
    },
    dest: { index: destinationIndex },
  };
}
