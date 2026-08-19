/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { withDocumentIndex } from './with_document_index';

describe('withDocumentIndex', () => {
  it('prepends a project-qualified document index that is not already in the list', () => {
    expect(withDocumentIndex(['logs-*'], 'linked-project:logs-endpoint.events-default')).toEqual([
      'linked-project:logs-endpoint.events-default',
      'logs-*',
    ]);
  });

  it('does not duplicate an index that is already present', () => {
    expect(
      withDocumentIndex(
        ['linked-project:logs-endpoint.events-default'],
        'linked-project:logs-endpoint.events-default'
      )
    ).toEqual(['linked-project:logs-endpoint.events-default']);
  });

  it('leaves origin-only indices unchanged, including hidden alert backing indices', () => {
    expect(withDocumentIndex(['logs-*'], 'logs-endpoint.events.process-default')).toEqual([
      'logs-*',
    ]);
    expect(
      withDocumentIndex(['logs-*'], '.internal.alerts-security.alerts-default-000001')
    ).toEqual(['logs-*']);
    expect(
      withDocumentIndex(['logs-*'], '.ds-logs-endpoint.events.process-default-2024.01.01-000001')
    ).toEqual(['logs-*']);
  });

  it('leaves the list unchanged when no document index is provided', () => {
    expect(withDocumentIndex(['logs-*'])).toEqual(['logs-*']);
    expect(withDocumentIndex(['logs-*'], null)).toEqual(['logs-*']);
  });
});
