/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  MappingDenseVectorProperty,
  MappingProperty,
} from '@elastic/elasticsearch/lib/api/types';

export function generateSampleDocument(
  mappingProperties: Record<string, MappingProperty>,
  sampleText?: string
): Record<string, unknown> {
  const sampleDocument: Record<string, unknown> = {};

  Object.entries(mappingProperties).forEach(([field, mapping]) => {
    if ('type' in mapping) {
      switch (mapping.type) {
        case 'text':
          sampleDocument[field] = sampleText ?? `Sample text for ${field}`;
          break;
        case 'keyword':
          sampleDocument[field] = `sample-keyword-${field}`;
          break;
        case 'semantic_text':
          sampleDocument[field] = sampleText ?? `Sample text for ${field}`;
          break;
        case 'integer':
        case 'long':
          sampleDocument[field] = Math.floor(Math.random() * 100);
          break;
        case 'float':
        case 'double':
          sampleDocument[field] = Math.random() * 100;
          break;
        case 'boolean':
          sampleDocument[field] = Math.random() < 0.5;
          break;
        case 'date':
          sampleDocument[field] = new Date().toISOString();
          break;
        case 'geo_point':
          sampleDocument[field] = {
            lat: 40.7128,
            lon: -74.006,
          };
          break;
        case 'nested':
          if (mapping.properties) {
            sampleDocument[field] = [generateSampleDocument(mapping.properties)];
          }
          break;
        case 'object':
          if (mapping.properties) {
            sampleDocument[field] = generateSampleDocument(mapping.properties);
          }
          break;
        case 'dense_vector':
          sampleDocument[field] = generateDenseVector(mapping);
          break;
        case 'sparse_vector':
          sampleDocument[field] = generateSparseVector();
          break;
        default:
          // Default to null for unhandled types
          sampleDocument[field] = null;
          break;
      }
    }
  });

  return sampleDocument;
}

function generateDenseVector(mapping: MappingDenseVectorProperty, maxDisplayDims = 10) {
  // Limit the dimensions for better UI display
  const dimension = Math.min(mapping?.dims ?? 10, maxDisplayDims);

  // Generate an array of random floating-point numbers
  const denseVector: Array<number | string> = Array.from({ length: dimension }, () =>
    parseFloat((Math.random() * 10).toFixed(3))
  );
  if (dimension < (mapping?.dims || 0)) {
    denseVector.push('...');
  }

  return denseVector;
}

function generateSparseVector(numElements: number = 5, vectorSize: number = 100) {
  const sparseVector: Record<number, number> = {};
  const usedIndices = new Set<number>();

  while (usedIndices.size < numElements) {
    // Generate a random index for the sparse vector
    const index = Math.floor(Math.random() * vectorSize);

    if (!usedIndices.has(index)) {
      sparseVector[index] = parseFloat((Math.random() * 10).toFixed(3));
      usedIndices.add(index);
    }
  }

  return sparseVector;
}
