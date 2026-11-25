/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getManagedWorkflowDefinition,
  SIGNIFICANT_EVENTS_DETECTION_WORKFLOW_ID,
} from '@kbn/workflows/managed';
import { parse } from 'yaml';
import { detectionsMappings } from './data_stream';

const getDetectionWorkflowYaml = (): string => {
  const definition = getManagedWorkflowDefinition(SIGNIFICANT_EVENTS_DETECTION_WORKFLOW_ID);
  if (!definition || !('yaml' in definition) || typeof definition.yaml !== 'string') {
    throw new Error('The Detection workflow definition is missing yaml');
  }
  return definition.yaml;
};

/** Every `exists` field named anywhere in a parsed workflow. */
const collectExistsFields = (node: unknown): string[] => {
  if (Array.isArray(node)) return node.flatMap(collectExistsFields);
  if (node === null || typeof node !== 'object') return [];
  return Object.entries(node).flatMap(([key, value]) =>
    key === 'exists' && typeof value === 'object' && value !== null && 'field' in value
      ? [String(value.field)]
      : collectExistsFields(value)
  );
};

const isMapped = (field: string): boolean => {
  const [head, ...rest] = field.split('.');
  const property: unknown = (detectionsMappings.properties as Record<string, unknown>)[head];
  if (rest.length === 0) return property !== undefined;
  const nested = (property as { properties?: Record<string, unknown> } | undefined)?.properties;
  return nested !== undefined && rest.join('.') in nested;
};

describe('detectionsMappings', () => {
  // The mappings are `dynamic: false`, so an `exists` filter on an unmapped field never matches.
  it('maps every field the Detection workflow filters on with exists', () => {
    const fields = collectExistsFields(parse(getDetectionWorkflowYaml()));

    expect(fields).toContain('observed_change_point_type');
    expect(fields.filter((field) => !isMapped(field))).toEqual([]);
  });
});
