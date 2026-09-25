/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createMemoryInternalClient } from './internal_client';

describe('createMemoryInternalClient', () => {
  it('lazily returns the internal Elasticsearch client', () => {
    const internalClient = { search: jest.fn() };
    const getElasticsearch = jest.fn().mockReturnValue({
      client: { asInternalUser: internalClient },
    });
    const service = createMemoryInternalClient({ getElasticsearch });

    expect(getElasticsearch).not.toHaveBeenCalled();
    expect(service.getClient()).toBe(internalClient);
  });

  it('fails clearly before the plugin start client is available', () => {
    const service = createMemoryInternalClient({ getElasticsearch: () => undefined });

    expect(() => service.getClient()).toThrow(
      'Semantic Memory internal Elasticsearch client is unavailable'
    );
  });
});
