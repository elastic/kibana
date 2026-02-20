/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { mergeEntityStoreIndices, getEntitiesSnapshotIndexName } from './entity_utils';

describe('mergeEntityStoreIndices', () => {
  it('returns the original indices if indexPattern is empty', () => {
    const indices = ['index1', 'index2'];
    const result = mergeEntityStoreIndices(indices, '');
    expect(result).toEqual(indices);
  });

  it('merges indices with indexPattern when indexPattern is provided', () => {
    const indices = ['index1', 'index2'];
    const indexPattern = 'index3,index4';
    const result = mergeEntityStoreIndices(indices, indexPattern);
    expect(result).toEqual(['index1', 'index2', 'index3', 'index4']);
  });

  it('deduplicate indices', () => {
    const indices = ['index1', 'index2'];
    const indexPattern = 'index2,index3';
    const result = mergeEntityStoreIndices(indices, indexPattern);
    expect(result).toEqual(['index1', 'index2', 'index3']);
  });

  it('returns an empty array if both indices and indexPattern are empty', () => {
    const indices: string[] = [];
    const indexPattern = '';
    const result = mergeEntityStoreIndices(indices, indexPattern);
    expect(result).toEqual([]);
  });

  it('returns correct index patterns for snapshots #1', () => {
    const snapshotDate: Date = new Date('2025-08-20T00:00:01Z');
    const result = getEntitiesSnapshotIndexName('generic', snapshotDate, 'default');
    expect(result).toEqual('.entities.v1.history.2025-08-20.security_generic_default');
  });

  it('returns correct index patterns for snapshots #2', () => {
    const snapshotDate: Date = new Date('2025-09-21T00:00:01Z');
    const result = getEntitiesSnapshotIndexName('host', snapshotDate, 'custom');
    expect(result).toEqual('.entities.v1.history.2025-09-21.security_host_custom');
  });
});
