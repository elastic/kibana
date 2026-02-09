/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { castArray, isPlainObject, forEach, unset } from 'lodash';
import type { CompatibleJSONSchema } from '@kbn/observability-ai-assistant-plugin/common/functions/types';
import { z } from '@kbn/zod';

function dropUnknownProperties(object: CompatibleJSONSchema) {
  if (!isPlainObject(object)) {
    return object;
  }

  forEach(object, (value, key) => {
    switch (key) {
      case 'type':
      case 'minLength':
      case 'maxLength':
      case 'required':
      case 'description':
        break;

      case 'enum':
      case 'const':
      case 'items':
      case 'allOf':
      case 'anyOf':
      case 'oneOf':
        castArray(value).forEach((innerSchema) => {
          if (isPlainObject(innerSchema)) {
            dropUnknownProperties(innerSchema as CompatibleJSONSchema);
          }
        });
        break;

      case 'properties':
        forEach(object.properties, (propertyValue, propertyKey) => {
          dropUnknownProperties(propertyValue as CompatibleJSONSchema);
        });
        break;

      default:
        unset(object, key);
        break;
    }
  });

  return object;
}

export function convertSchemaToOpenApi(typeSchema: z.ZodType<any>): CompatibleJSONSchema {
  const plainOpenApiSchema = z.toJSONSchema(typeSchema, {
    target: 'openapi-3.0',
    reused: 'inline',
  });

  return dropUnknownProperties(plainOpenApiSchema as CompatibleJSONSchema);
}
