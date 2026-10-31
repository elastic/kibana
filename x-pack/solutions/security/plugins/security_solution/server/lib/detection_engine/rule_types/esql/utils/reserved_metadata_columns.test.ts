/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { removeReservedMetadataColumns } from './reserved_metadata_columns';

describe('removeReservedMetadataColumns', () => {
  it('removes reserved columns and keeps the others', () => {
    const documents = [
      { _source: '{"a":1}', _ignored: 'host.name', 'host.name': 'host-1', _custom: 'value' },
    ];

    expect(removeReservedMetadataColumns(documents).documents).toEqual([
      { 'host.name': 'host-1', _custom: 'value' },
    ]);
  });

  it('returns the removed column names without duplicates across documents', () => {
    const documents: Array<Record<string, string>> = [
      { _source: '{"a":1}', _ignored: 'host.name' },
      { _source: '{"b":2}' },
      { 'host.name': 'host-1' },
    ];

    expect(removeReservedMetadataColumns(documents).removedColumns).toEqual([
      '_source',
      '_ignored',
    ]);
  });

  it('returns no removed columns when no column is reserved', () => {
    const documents = [{ _id: 'doc-1', _score: '1', _custom: 'value', 'host.name': 'host-1' }];

    expect(removeReservedMetadataColumns(documents)).toEqual({ documents, removedColumns: [] });
  });

  it('does not modify the original documents', () => {
    const documents = [{ _source: '{"a":1}', 'host.name': 'host-1' }];

    removeReservedMetadataColumns(documents);

    expect(documents).toEqual([{ _source: '{"a":1}', 'host.name': 'host-1' }]);
  });

  it('handles an empty list of documents', () => {
    expect(removeReservedMetadataColumns([])).toEqual({ documents: [], removedColumns: [] });
  });
});
