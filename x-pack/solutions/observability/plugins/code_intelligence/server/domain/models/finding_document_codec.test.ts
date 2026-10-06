/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isRight } from 'fp-ts/Either';

import { findingDocumentId, findingDocumentRt } from './finding_document_codec';

describe('findingDocumentId', () => {
  it('is stable for the same repository, candidate, and type', () => {
    const input = {
      candidateId: 'src/app.ts:1',
      findingType: 'sensitive-data' as const,
      repository: 'elastic/example',
    };

    expect(findingDocumentId(input)).toBe(findingDocumentId({ ...input }));
    expect(findingDocumentId(input)).toMatch(/^[a-f0-9]{64}$/);
  });

  it('differs across repositories because path-based candidate IDs repeat between them', () => {
    const input = { candidateId: 'cmd/main.go:12', findingType: 'sensitive-data' as const };

    expect(findingDocumentId({ ...input, repository: 'elastic/one' })).not.toBe(
      findingDocumentId({ ...input, repository: 'elastic/two' })
    );
  });

  it('does not collide when the repository and candidate boundary moves', () => {
    expect(
      findingDocumentId({ candidateId: 'b/c.go:1', findingType: 'sensitive-data', repository: 'a' })
    ).not.toBe(
      findingDocumentId({ candidateId: 'c.go:1', findingType: 'sensitive-data', repository: 'a/b' })
    );
  });
});

describe('findingDocumentRt', () => {
  const document = {
    candidateId: 'src/app.ts:1',
    catalogDocumentIds: ['c'.repeat(64)],
    cataloged: true,
    createdAt: '2026-10-02T00:00:00.000Z',
    evidence: [{ excerpt: 'logger.info(user.email)', line: 1, path: 'src/app.ts' }],
    extractorVersion: 'test',
    findingType: 'sensitive-data',
    id: 'f'.repeat(64),
    repository: 'elastic/example',
    revision: 'a'.repeat(40),
    signalType: 'log',
    summary: 'Logs the user email address at info level.',
    title: 'User email logged',
    updatedAt: '2026-10-02T00:00:00.000Z',
  };

  it('accepts a complete finding with and without a log level', () => {
    expect(isRight(findingDocumentRt.decode(document))).toBe(true);
    expect(isRight(findingDocumentRt.decode({ ...document, logLevel: 'info' }))).toBe(true);
  });

  it.each([
    ['an unknown finding type', { findingType: 'bug' }],
    ['a short revision', { revision: 'abc' }],
    ['an unknown signal type', { signalType: 'event' }],
    ['an empty title', { title: ' ' }],
  ])('rejects %s', (_label, invalid) => {
    expect(isRight(findingDocumentRt.decode({ ...document, ...invalid }))).toBe(false);
  });
});
