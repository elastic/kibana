/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import * as t from 'io-ts';
import type { z } from '@kbn/zod';
import type { SchemaOutput } from './schema_output';

/** Lets an io-ts combinator embed a zod schema without collapsing `t.TypeOf`. */
export const zodAsIoTs = <S extends z.ZodType>(
  schema: S
): t.Type<SchemaOutput<S>, SchemaOutput<S>, unknown> =>
  new t.Type<SchemaOutput<S>, SchemaOutput<S>, unknown>(
    'ZodSchema',
    (input): input is SchemaOutput<S> => schema.safeParse(input).success,
    (input, context) => {
      const result = schema.safeParse(input);
      return result.success ? t.success(result.data as SchemaOutput<S>) : t.failure(input, context);
    },
    t.identity
  );
