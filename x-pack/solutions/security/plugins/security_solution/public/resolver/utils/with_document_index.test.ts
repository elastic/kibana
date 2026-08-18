/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { withDocumentIndex } from './with_document_index';

describe('withDocumentIndex', () => {
  it('prepends a concrete document index that is not already in the list', () => {
    expect(withDocumentIndex(['logs-*'], 'linked-project:logs-endpoint.events-default')).toEqual([
      'linked-project:logs-endpoint.events-default',
      'logs-*',
    ]);
  });

  it('does not duplicate an index that is already present', () => {
    expect(
      withDocumentIndex(['logs-endpoint.events-default'], 'logs-endpoint.events-default')
    ).toEqual(['logs-endpoint.events-default']);
  });

  it('leaves the list unchanged when no document index is provided', () => {
    expect(withDocumentIndex(['logs-*'])).toEqual(['logs-*']);
    expect(withDocumentIndex(['logs-*'], null)).toEqual(['logs-*']);
  });
});
