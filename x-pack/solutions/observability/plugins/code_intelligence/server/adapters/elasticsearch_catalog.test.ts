/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { catalogDocumentSource } from './elasticsearch_catalog';

describe('catalogDocumentSource', () => {
  it('persists the concrete query under `query` without parameter metadata', () => {
    const source = catalogDocumentSource({
      document: {
        createdAt: '2026-09-28T00:00:00.000Z',
        description: 'Counts a source-instrumented span and its error outcomes.',
        evidence: [],
        extractorVersion: 'test',
        id: 'document-1',
        query: 'FROM traces*\n| WHERE name == "checkout"',
        repository: 'elastic/example',
        revision: 'a'.repeat(40),
        signalType: 'trace',
        sourceHash: `sha256:${'a'.repeat(64)}`,
        title: 'Span outcomes: checkout',
        updatedAt: '2026-09-28T00:00:00.000Z',
      },
      validation: { diagnostics: [], status: 'skipped' },
    });

    expect(source.query).toBe('FROM traces*\n| WHERE name == "checkout"');
    expect(source).not.toHaveProperty('templated_query');
    expect(source).not.toHaveProperty('parameters');
  });
});
