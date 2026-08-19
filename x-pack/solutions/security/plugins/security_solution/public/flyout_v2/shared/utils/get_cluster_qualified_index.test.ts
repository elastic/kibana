/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getClusterQualifiedIndex } from './get_cluster_qualified_index';

describe('getClusterQualifiedIndex', () => {
  it('returns the index unchanged when the parent document is local', () => {
    expect(getClusterQualifiedIndex('my-index-000001', '.alerts-security.alerts-default')).toBe(
      'my-index-000001'
    );
  });

  it('prefixes the index with the remote alias when the parent document is remote', () => {
    expect(
      getClusterQualifiedIndex('my-index-000001', 'remote-cluster:.alerts-security.alerts-default')
    ).toBe('remote-cluster:my-index-000001');
  });

  it('returns an already-qualified index unchanged when it shares the same remote alias as the parent', () => {
    expect(
      getClusterQualifiedIndex(
        'remote-cluster:my-index-000001',
        'remote-cluster:.alerts-security.alerts-default'
      )
    ).toBe('remote-cluster:my-index-000001');
  });

  it('returns an already-qualified index unchanged when it has a different remote alias than the parent', () => {
    expect(
      getClusterQualifiedIndex(
        'remote-cluster-b:my-index-000001',
        'remote-cluster-a:.alerts-security.alerts-default'
      )
    ).toBe('remote-cluster-b:my-index-000001');
  });

  it('returns an empty index unchanged even when the parent is remote', () => {
    expect(getClusterQualifiedIndex('', 'remote-cluster:.alerts-security.alerts-default')).toBe('');
  });

  it('returns the index unchanged when the parent index is empty', () => {
    expect(getClusterQualifiedIndex('my-index-000001', '')).toBe('my-index-000001');
  });

  it('does not treat a datemath parent as remote', () => {
    expect(
      getClusterQualifiedIndex('my-index-000001', '<.alerts-security.alerts-default-{now/d}>')
    ).toBe('my-index-000001');
  });

  it('does not treat a ::failures selector parent as remote', () => {
    expect(
      getClusterQualifiedIndex('my-index-000001', '.alerts-security.alerts-default::failures')
    ).toBe('my-index-000001');
  });
});
