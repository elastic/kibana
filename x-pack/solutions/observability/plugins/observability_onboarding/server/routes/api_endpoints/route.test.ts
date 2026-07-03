/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { hasManagedElasticsearchEndpoint } from './route';

describe('hasManagedElasticsearchEndpoint', () => {
  it('uses managed URL presence as the Elasticsearch-compatible endpoint availability signal', () => {
    expect(hasManagedElasticsearchEndpoint('https://otlp.example.com:443')).toBe(true);
  });

  it('treats missing or blank managed URLs as unavailable', () => {
    expect(hasManagedElasticsearchEndpoint(undefined)).toBe(false);
    expect(hasManagedElasticsearchEndpoint('   ')).toBe(false);
  });
});
