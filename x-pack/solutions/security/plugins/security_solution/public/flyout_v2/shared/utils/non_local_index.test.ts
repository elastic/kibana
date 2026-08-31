/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getNonLocalQualifiedIndex, withDocumentIndex } from './non_local_index';

describe('getNonLocalQualifiedIndex', () => {
  it('returns the index unchanged when the parent document is local', () => {
    expect(getNonLocalQualifiedIndex('my-index-000001', '.alerts-security.alerts-default')).toBe(
      'my-index-000001'
    );
  });

  it('prefixes the index with the remote alias when the parent document is remote', () => {
    expect(
      getNonLocalQualifiedIndex('my-index-000001', 'remote-cluster:.alerts-security.alerts-default')
    ).toBe('remote-cluster:my-index-000001');
  });

  it('returns an already-qualified index unchanged when it shares the same remote alias as the parent', () => {
    expect(
      getNonLocalQualifiedIndex(
        'remote-cluster:my-index-000001',
        'remote-cluster:.alerts-security.alerts-default'
      )
    ).toBe('remote-cluster:my-index-000001');
  });

  it('returns an already-qualified index unchanged when it has a different remote alias than the parent', () => {
    expect(
      getNonLocalQualifiedIndex(
        'remote-cluster-b:my-index-000001',
        'remote-cluster-a:.alerts-security.alerts-default'
      )
    ).toBe('remote-cluster-b:my-index-000001');
  });

  it('returns an empty index unchanged even when the parent is remote', () => {
    expect(getNonLocalQualifiedIndex('', 'remote-cluster:.alerts-security.alerts-default')).toBe(
      ''
    );
  });

  it('returns the index unchanged when the parent index is empty', () => {
    expect(getNonLocalQualifiedIndex('my-index-000001', '')).toBe('my-index-000001');
  });

  it('does not treat a datemath parent as remote', () => {
    expect(
      getNonLocalQualifiedIndex('my-index-000001', '<.alerts-security.alerts-default-{now/d}>')
    ).toBe('my-index-000001');
  });

  it('does not treat a ::failures selector parent as remote', () => {
    expect(
      getNonLocalQualifiedIndex('my-index-000001', '.alerts-security.alerts-default::failures')
    ).toBe('my-index-000001');
  });
});

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

  it('does not treat datemath or selector document indices as project-qualified', () => {
    expect(withDocumentIndex(['logs-*'], '<logs-endpoint.events-default-{now/d}>')).toEqual([
      'logs-*',
    ]);
    expect(withDocumentIndex(['logs-*'], 'logs-endpoint.events-default::failures')).toEqual([
      'logs-*',
    ]);
  });

  it('leaves the list unchanged when no document index is provided', () => {
    expect(withDocumentIndex(['logs-*'])).toEqual(['logs-*']);
    expect(withDocumentIndex(['logs-*'], null)).toEqual(['logs-*']);
  });

  it('normalizes a scalar index string instead of spreading it into characters', () => {
    // getFieldValue unwraps a single-element field to a scalar string; prepending a non-local
    // document index must not explode it into single-character index names.
    expect(
      withDocumentIndex('apm-*-transaction*', 'linked-project:.ds-logs-endpoint.events-default')
    ).toEqual(['linked-project:.ds-logs-endpoint.events-default', 'apm-*-transaction*']);
  });

  it('wraps a scalar index string when no document index is provided', () => {
    expect(withDocumentIndex('apm-*-transaction*')).toEqual(['apm-*-transaction*']);
  });

  it('does not duplicate a scalar index that already equals the document index', () => {
    expect(
      withDocumentIndex(
        'linked-project:.ds-logs-endpoint.events-default',
        'linked-project:.ds-logs-endpoint.events-default'
      )
    ).toEqual(['linked-project:.ds-logs-endpoint.events-default']);
  });
});
