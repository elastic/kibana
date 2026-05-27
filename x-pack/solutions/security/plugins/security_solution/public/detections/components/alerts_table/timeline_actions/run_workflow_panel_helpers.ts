/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { JsonModelSchemaType } from '@kbn/workflows/spec/schema/common/json_model_schema';
import { hasDefaultsRecursive } from '@kbn/workflows/spec/lib/field_conversion';

/**
 * Returns true when at least one `required` property in the normalized inputs schema
 * has no default value anywhere in its subtree. This matches the engine's
 * validation rule (validateWorkflowInputs) so we only prompt the user when they
 * actually have something to provide.
 */
export const requiresUserSuppliedInputs = (normalized?: JsonModelSchemaType): boolean => {
  if (!normalized?.properties) return false;
  const required = new Set(normalized.required ?? []);
  if (required.size === 0) return false;
  for (const name of required) {
    const propSchema = normalized.properties[name];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if (propSchema && !hasDefaultsRecursive(propSchema as any, normalized)) return true;
  }
  return false;
};
