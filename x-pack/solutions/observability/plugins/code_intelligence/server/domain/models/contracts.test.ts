/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { catalogDocumentRt, catalogWriteResultRt } from './catalog_document_codec';
import { candidateIdFor, candidateIdRt } from './candidate_id_codec';
import {
  MAX_CLASSIFICATION_CANDIDATES,
  otelClassificationRt,
  otelSignalMetadataRt,
  loggingClassificationRequestRt,
  otelClassificationRequestRt,
} from './classification_codec';
import { resolvedRepositoryRt } from './repository_codec';
import { MAX_SOURCE_WINDOW_LINES, sourceWindowRequestRt, sourceWindowRt } from './source_codec';

describe('Phase 0 domain codecs', () => {
  it('rejects invalid commit SHAs, source paths, and non-positive line numbers', () => {
    expect(
      resolvedRepositoryRt.decode({
        commitSha: 'abc',
        repository: 'elastic/demo',
        requestedRevision: 'main',
      })._tag
    ).toBe('Left');
    /** Supplies a valid repository fixture for codec rejection cases. */
    const repository = {
      commitSha: '0123456789abcdef0123456789abcdef01234567',
      repository: 'elastic/demo',
      requestedRevision: 'main',
    };
    expect(
      sourceWindowRequestRt.decode({
        endLine: 0,
        path: '/payment.ts',
        repository,
        startLine: 1,
      })._tag
    ).toBe('Left');
    expect(
      sourceWindowRequestRt.decode({
        endLine: 1,
        path: '../payment.ts',
        repository,
        startLine: 1,
      })._tag
    ).toBe('Left');
  });

  it('accepts repository-relative source locations as candidate IDs', () => {
    expect(candidateIdRt.decode(candidateIdFor('src/app.ts', 42))._tag).toBe('Right');
    expect(candidateIdRt.decode('src/app.ts:0')._tag).toBe('Left');
    expect(candidateIdRt.decode('../app.ts:42')._tag).toBe('Left');
  });

  it('requires bounded logging excerpts and constrains OTel metadata and severity scores', () => {
    expect(
      loggingClassificationRequestRt.decode({ candidates: [{ evidence: [], id: 'candidate-1' }] })
        ._tag
    ).toBe('Left');
    expect(
      otelClassificationRt.decode({ id: 'candidate-1', keep: true, severityScore: 101 })._tag
    ).toBe('Left');
    expect(otelSignalMetadataRt.decode({ kind: 'span' })._tag).toBe('Left');
    /** Builds a normal bounded candidate used to prove request limits reject rather than truncate. */
    const candidate = { evidence: [], excerpt: 'logger.info("started")', id: 'candidate-1' };
    expect(
      loggingClassificationRequestRt.decode({
        candidates: Array.from({ length: MAX_CLASSIFICATION_CANDIDATES + 1 }, () => candidate),
      })._tag
    ).toBe('Left');
    expect(
      loggingClassificationRequestRt.decode({
        candidates: [
          {
            ...candidate,
            evidence: Array.from({ length: 9 }, () => ({
              excerpt: 'logger.info("started")',
              line: 1,
              path: 'src/app.ts',
            })),
          },
        ],
      })._tag
    ).toBe('Left');
    expect(
      otelClassificationRequestRt.decode({
        candidates: [
          {
            evidence: [{ excerpt: '😀'.repeat(2049), line: 1, path: 'src/app.ts' }],
            id: 'candidate-1',
            signal: { kind: 'span_name' },
          },
        ],
      })._tag
    ).toBe('Left');
  });

  it('enforces the maximum inclusive source-window span', () => {
    /** Reuses a resolved repository without allocating a returned source window. */
    const repository = {
      commitSha: '0123456789abcdef0123456789abcdef01234567',
      repository: 'elastic/demo',
      requestedRevision: 'main',
    };
    expect(
      sourceWindowRequestRt.decode({
        endLine: MAX_SOURCE_WINDOW_LINES,
        path: 'src/a.ts',
        repository,
        startLine: 1,
      })._tag
    ).toBe('Right');
    expect(
      sourceWindowRequestRt.decode({
        endLine: MAX_SOURCE_WINDOW_LINES + 1,
        path: 'src/a.ts',
        repository,
        startLine: 1,
      })._tag
    ).toBe('Left');
  });

  it('enforces inclusive source-window ranges', () => {
    expect(
      sourceWindowRequestRt.decode({
        endLine: 4,
        path: 'src/a.ts',
        repository: {
          commitSha: '0123456789abcdef0123456789abcdef01234567',
          repository: 'elastic/demo',
          requestedRevision: 'main',
        },
        startLine: 5,
      })._tag
    ).toBe('Left');
    expect(
      sourceWindowRt.decode({ endLine: 3, lines: ['one'], path: 'src/a.ts', startLine: 1 })._tag
    ).toBe('Left');
  });

  it('preserves template invariants in catalog documents', () => {
    /** Supplies a catalog document fixture for invariant checks. */
    const document = {
      createdAt: 'now',
      description: 'Description',
      evidence: [],
      extractorVersion: '1',
      id: 'document-1',
      parameters: {
        source: { description: 'Source', kind: 'source', name: 'source', example: 'logs-*' },
      },
      repository: 'elastic/demo',
      revision: '0123456789abcdef0123456789abcdef01234567',
      signalType: 'log',
      sourceHash: `sha256:${'a'.repeat(64)}`,
      templatedQuery: 'FROM [[source]]',
      title: 'Title',
      updatedAt: 'now',
    };
    expect(catalogDocumentRt.decode(document)._tag).toBe('Right');
    expect(
      catalogDocumentRt.decode({
        ...document,
        parameters: {
          ...document.parameters,
          arbitrary: { description: 'Arbitrary', kind: 'string', name: 'arbitrary', example: 'x' },
        },
      })._tag
    ).toBe('Left');
    expect(
      catalogDocumentRt.decode({
        ...document,
        parameters: { source: { ...document.parameters.source, name: 'other' } },
      })._tag
    ).toBe('Left');
    expect(catalogDocumentRt.decode({ ...document, sourceHash: 'sha256:x' })._tag).toBe('Left');
  });

  it('reports one partial write outcome per document ID', () => {
    expect(
      catalogWriteResultRt.decode({ failures: [], writtenIds: ['document-1', 'document-1'] })._tag
    ).toBe('Left');
    expect(
      catalogWriteResultRt.decode({
        failures: [
          {
            documentId: 'document-2',
            error: { code: 'write_failed', message: 'failed', retryable: true },
          },
          {
            documentId: 'document-2',
            error: { code: 'write_failed', message: 'failed again', retryable: true },
          },
        ],
        writtenIds: [],
      })._tag
    ).toBe('Left');
    expect(
      catalogWriteResultRt.decode({
        failures: [
          {
            documentId: 'document-1',
            error: { code: 'write_failed', message: 'failed', retryable: true },
          },
        ],
        writtenIds: ['document-1'],
      })._tag
    ).toBe('Left');
    expect(
      catalogWriteResultRt.decode({
        failures: [
          {
            documentId: 'document-2',
            error: { code: 'write_failed', message: 'failed', retryable: true },
          },
        ],
        writtenIds: ['document-1'],
      })._tag
    ).toBe('Right');
  });

  it('rejects catalog documents without a non-empty identity', () => {
    expect(
      catalogDocumentRt.decode({
        createdAt: 'now',
        description: 'Description',
        evidence: [],
        extractorVersion: '1',
        id: '',
        parameters: {},
        repository: 'elastic/demo',
        revision: '0123456789abcdef0123456789abcdef01234567',
        signalType: 'log',
        sourceHash: 'sha256:x',
        templatedQuery: 'FROM [[source]]',
        title: 'Title',
        updatedAt: 'now',
      })._tag
    ).toBe('Left');
  });
});
