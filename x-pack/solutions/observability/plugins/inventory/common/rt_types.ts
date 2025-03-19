/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { decode, encode } from '@kbn/rison';
import { isRight } from 'fp-ts/lib/Either';
import * as t from 'io-ts';

const validate = (validationRt: t.Any) => (input: unknown, context: t.Context) => {
  switch (typeof input) {
    case 'string': {
      try {
        const decoded = decode(input);
        const validation = validationRt.decode(decoded);
        if (isRight(validation)) {
          return t.success(validation.right);
        }

        return t.failure(input, context);
      } catch (e) {
        return t.failure(input, context);
      }
    }

    case 'undefined':
      return t.success(input);

    default: {
      const validation = validationRt.decode(input);

      if (isRight(validation)) {
        return t.success(validation.right);
      }

      return t.failure(input, context);
    }
  }
};

const entityTypeCheckOptions = t.union([t.literal('on'), t.literal('off'), t.literal('mixed')]);
export type EntityTypeCheckOptions = t.TypeOf<typeof entityTypeCheckOptions>;

const entityTypeRt = t.record(t.string, entityTypeCheckOptions);
export type EntityType = t.TypeOf<typeof entityTypeRt>;
export const entityTypesRt = new t.Type<
  Record<string, 'on' | 'off' | 'mixed'> | undefined,
  string,
  unknown
>('entityTypesRt', entityTypeRt.is, validate(entityTypeRt), (o) => encode(o));

const paginationRt = t.record(t.string, t.number);
export type EntityPagination = t.TypeOf<typeof entityPaginationRt>;
export const entityPaginationRt = new t.Type<Record<string, number> | undefined, string, unknown>(
  'entityPaginationRt',
  paginationRt.is,
  validate(paginationRt),
  (o) => encode(o)
);
