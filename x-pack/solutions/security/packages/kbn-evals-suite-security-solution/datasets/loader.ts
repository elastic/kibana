/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { BaseDatasetExample, DatasetJson } from './types';

/**
 * Type guard validator function signature
 */
export type Validator<T> = (item: unknown) => item is T;

/**
 * Validates and loads dataset examples from raw JSON data.
 * Provides runtime type checking for dataset examples.
 *
 * @param data - Raw data array from JSON import
 * @param validator - Optional type guard function for validation
 * @returns Typed array of dataset examples
 * @throws Error if validation fails
 */
export function loadDatasetExamples<T extends BaseDatasetExample>(
  data: unknown[],
  validator?: Validator<T>
): T[] {
  if (!Array.isArray(data)) {
    throw new Error('Dataset must be an array of examples');
  }

  if (validator) {
    const invalidItems: number[] = [];
    data.forEach((item, index) => {
      if (!validator(item)) {
        invalidItems.push(index);
      }
    });

    if (invalidItems.length > 0) {
      throw new Error(
        `Invalid dataset examples at indices: ${invalidItems.join(', ')}. ` +
          `Expected examples to match the required structure.`
      );
    }
  }

  return data as T[];
}

/**
 * Loads a complete dataset from a JSON structure.
 * Validates the dataset has required fields (name, description, examples).
 *
 * @param json - The dataset JSON object
 * @param validator - Optional type guard for example validation
 * @returns The typed dataset
 */
export function loadDataset<T extends BaseDatasetExample>(
  json: unknown,
  validator?: Validator<T>
): DatasetJson<T> {
  if (!json || typeof json !== 'object') {
    throw new Error('Dataset JSON must be an object');
  }

  const dataset = json as Record<string, unknown>;

  if (typeof dataset.name !== 'string' || !dataset.name) {
    throw new Error('Dataset must have a non-empty "name" field');
  }

  if (typeof dataset.description !== 'string') {
    throw new Error('Dataset must have a "description" field');
  }

  if (!Array.isArray(dataset.examples)) {
    throw new Error('Dataset must have an "examples" array');
  }

  const examples = loadDatasetExamples<T>(dataset.examples, validator);

  return {
    name: dataset.name,
    description: dataset.description,
    examples,
  };
}

/**
 * Type guard for AlertsRagExample
 */
export function isAlertsRagExample(item: unknown): item is import('./types').AlertsRagExample {
  if (!item || typeof item !== 'object') return false;
  const example = item as Record<string, unknown>;

  // Check input structure
  if (!example.input || typeof example.input !== 'object') return false;
  const input = example.input as Record<string, unknown>;
  if (typeof input.question !== 'string') return false;

  // Check output structure (optional fields)
  if (example.output !== undefined && typeof example.output !== 'object') return false;

  return true;
}

/**
 * Type guard for AttackDiscoveryExample
 */
export function isAttackDiscoveryExample(
  item: unknown
): item is import('./types').AttackDiscoveryExample {
  if (!item || typeof item !== 'object') return false;
  const example = item as Record<string, unknown>;

  // Check input structure
  if (!example.input || typeof example.input !== 'object') return false;

  // Check output structure (optional fields)
  if (example.output !== undefined && typeof example.output !== 'object') return false;

  return true;
}

/**
 * Type guard for CustomKnowledgeExample
 */
export function isCustomKnowledgeExample(
  item: unknown
): item is import('./types').CustomKnowledgeExample {
  if (!item || typeof item !== 'object') return false;
  const example = item as Record<string, unknown>;

  // Check input structure
  if (!example.input || typeof example.input !== 'object') return false;
  const input = example.input as Record<string, unknown>;
  if (typeof input.question !== 'string') return false;

  // Check output structure (optional fields)
  if (example.output !== undefined && typeof example.output !== 'object') return false;

  return true;
}

/**
 * Type guard for EsqlExample
 */
export function isEsqlExample(item: unknown): item is import('./types').EsqlExample {
  if (!item || typeof item !== 'object') return false;
  const example = item as Record<string, unknown>;

  // Check input structure
  if (!example.input || typeof example.input !== 'object') return false;
  const input = example.input as Record<string, unknown>;
  if (typeof input.question !== 'string') return false;

  // Check output structure (optional fields)
  if (example.output !== undefined && typeof example.output !== 'object') return false;

  return true;
}

/**
 * Type guard for DefendInsightsExample
 */
export function isDefendInsightsExample(
  item: unknown
): item is import('./types').DefendInsightsExample {
  if (!item || typeof item !== 'object') return false;
  const example = item as Record<string, unknown>;

  // Check input structure
  if (!example.input || typeof example.input !== 'object') return false;

  // Check output structure (must have insights array)
  if (!example.output || typeof example.output !== 'object') return false;
  const output = example.output as Record<string, unknown>;
  if (!Array.isArray(output.insights)) return false;

  return true;
}
