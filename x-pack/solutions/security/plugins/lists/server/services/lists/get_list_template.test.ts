/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';

import { getListTemplate } from './get_list_template';

vi.mock('./list_mappings.json', () => {
      const mocked = {
      dynamic: 'strict',
      properties: {},
    };
      return { ...mocked, default: mocked };
    });

describe('get_list_template', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  test('it returns a list template with the string filled in', async () => {
    const template = getListTemplate('some_index');
    expect(template).toEqual({
      data_stream: {},
      index_patterns: ['some_index'],
      template: {
        lifecycle: {},
        mappings: { dynamic: 'strict', properties: {} },
        settings: {
          mapping: { total_fields: { limit: 10000 } },
        },
      },
    });
  });
});
