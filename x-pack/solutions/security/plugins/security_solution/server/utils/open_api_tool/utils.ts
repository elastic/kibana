/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type Oas from 'oas';
import { z } from '@kbn/zod';

export type Operation = ReturnType<Oas['operation']>;
export type OperationOrWebhook = ReturnType<Oas['getOperationById']>;

export const isOperation = (operation: OperationOrWebhook): operation is Operation => {
  return operation.isWebhook() === false;
};

/**
 * Formats the tool name to be a valid identifier.
 */
export const formatToolName = (toolName: string) => {
  return toolName
    .replace(/([a-z])([A-Z])/g, '$1_$2')
    .toLowerCase()
    .replace(/[^a-zA-Z0-9_.]/g, '_');
};

/**
 * Checks if the Zod schema has required properties (non optional)
 */
export const zodObjectHasRequiredProperties = (schema: z.ZodTypeAny): boolean => {
  if (schema instanceof z.ZodObject) {
    const shape = schema.shape;
    for (const key in shape) {
      if (Object.prototype.hasOwnProperty.call(shape, key)) {
        const field = shape[key];
        if (!field.isOptional()) {
          return true;
        }
      }
    }
  }
  return false;
};
