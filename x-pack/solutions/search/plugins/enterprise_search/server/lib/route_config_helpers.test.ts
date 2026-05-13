/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';

const mockBuffer = {};
jest.mock('@kbn/config-schema', () => ({
  schema: {
    buffer: () => mockBuffer,
    object: () => ({}),
  },
}));

const mockSchema = schema.object({});

import { skipBodyValidation } from './route_config_helpers';

describe('skipBodyValidation', () => {
  it('adds "options.body.parse" and "validate.body" properties to a route config', () => {
    expect(
      skipBodyValidation({
        path: '/example/path',
        security: {
          authz: {
            enabled: false,
            reason: '',
          },
        },
        validate: {},
      })
    ).toEqual({
      options: { body: { parse: false } },
      path: '/example/path',
      security: {
        authz: {
          enabled: false,
          reason: '',
        },
      },
      validate: {
        body: mockBuffer,
      },
    });
  });

  it('persists all other properties, e.g. "path" & other non-"body" properties on "options" & "validate"', () => {
    expect(
      skipBodyValidation({
        path: '/example/path',
        security: {
          authz: {
            enabled: false,
            reason: '',
          },
        },
        validate: {
          params: mockSchema,
        },
      })
    ).toEqual({
      options: {
        body: { parse: false },
      },
      path: '/example/path',
      security: {
        authz: {
          enabled: false,
          reason: '',
        },
      },
      validate: {
        body: mockBuffer,
        params: mockSchema,
      },
    });
  });
});
