/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from './schema';

describe('schema', () => {
  it('should have the correct ruleName schema', () => {
    expect(schema).toEqual({
      ruleName: {
        label: 'Name',
        type: 'text',
        validations: [
          {
            validator: expect.any(Function),
          },
        ],
      },
    });
  });
});
