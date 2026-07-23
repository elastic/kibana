/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { hasManagedElasticsearchBulkEndpoint } from './route';

describe('hasManagedElasticsearchBulkEndpoint', () => {
  it('uses managed URL presence as the Elasticsearch-compatible bulk endpoint availability signal', () => {
    expect(hasManagedElasticsearchBulkEndpoint('https://otlp.example.com:443')).toBe(true);
  });

  it('treats missing or blank managed URLs as unavailable', () => {
    expect(hasManagedElasticsearchBulkEndpoint(undefined)).toBe(false);
    expect(hasManagedElasticsearchBulkEndpoint('   ')).toBe(false);
  });
});
