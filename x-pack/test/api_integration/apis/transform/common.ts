/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export function generateDestIndex(transformId: string): string {
  return `user-${transformId}`;
}

export function generateTransformConfig(transformId: string) {
  const destinationIndex = generateDestIndex(transformId);

  return {
    id: transformId,
    source: { index: ['farequote-*'] },
    pivot: {
      group_by: { airline: { terms: { field: 'airline' } } },
      aggregations: { '@timestamp.value_count': { value_count: { field: '@timestamp' } } },
    },
    dest: { index: destinationIndex },
  };
}
