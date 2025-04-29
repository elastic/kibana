/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { WrappedTranslatedExceptionList } from './lists';

export const getTranslatedExceptionListMock = (): WrappedTranslatedExceptionList => {
  return {
    entries: [
      {
        type: 'simple',
        entries: [
          {
            entries: [
              {
                field: 'some.nested.field',
                operator: 'included',
                type: 'exact_cased',
                value: 'some value',
              },
            ],
            field: 'some.parentField',
            type: 'nested',
          },
          {
            field: 'some.not.nested.field',
            operator: 'included',
            type: 'exact_cased',
            value: 'some value',
          },
        ],
      },
      {
        type: 'simple',
        entries: [
          {
            field: 'some.other.not.nested.field',
            operator: 'included',
            type: 'exact_cased',
            value: 'some other value',
          },
        ],
      },
    ],
  };
};
