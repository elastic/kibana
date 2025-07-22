/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { z } from '@kbn/zod';
import type { ElasticRule as ElasticRuleType } from '../../../../../../common/siem_migrations/model/rule_migration.gen';
import { ElasticRule } from '../../../../../../common/siem_migrations/model/rule_migration.gen';

type Nullable<T> = { [K in keyof T]: T[K] | null };

/**
 * This function takes a Zod schema and an object, and returns a new object
 * where any missing values of `only first-level keys` in the object are set to null, according to the schema.
 *
 * Raises an error if the object does not conform to the schema.
 *
 * This is specially beneficial for `unsetting` fields in Elasticsearch documents.
 */
export const nullifyMissingPropertiesInObject = <T extends z.AnyZodObject>(
  zodType: T,
  obj: z.infer<T>
): Nullable<z.infer<T>> => {
  const schemaWithNullValues = zodType.transform((value: z.infer<T>) => {
    const result: Nullable<z.infer<T>> = { ...value };
    Object.keys(zodType.shape).forEach((key) => {
      if (!(key in value)) {
        result[key as keyof z.infer<T>] = null;
      }
    });
    return result;
  });

  return schemaWithNullValues.parse(obj);
};

/**
 * This function takes an ElasticRule object and returns a new object
 * where any missing values are set to null, according to the ElasticRule schema.
 *
 * If an error occurs during the transformation, it calls the onError callback
 * with the error and returns the original object.
 */
export const nullifyElasticRule = (obj: ElasticRuleType, onError?: (error: Error) => void) => {
  try {
    return nullifyMissingPropertiesInObject(ElasticRule, obj);
  } catch (error) {
    onError?.(error);
    return obj;
  }
};
