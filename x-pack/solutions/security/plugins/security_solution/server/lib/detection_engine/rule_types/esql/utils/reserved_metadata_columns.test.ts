/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  getReservedMetadataColumns,
  omitReservedMetadataColumns,
} from './reserved_metadata_columns';

describe('reserved metadata columns', () => {
  describe('getReservedMetadataColumns', () => {
    it('returns the unique reserved column names without duplicates across documents', () => {
      const documents: Array<Record<string, string>> = [
        { _source: '{"a":1}', _ignored: 'host.name' },
        { _source: '{"b":2}' },
        { 'host.name': 'host-1' },
      ];

      expect(getReservedMetadataColumns(documents)).toEqual(['_source', '_ignored']);
    });

    it('includes _data_stream_timestamp, which Elasticsearch rejects as well', () => {
      expect(getReservedMetadataColumns([{ _data_stream_timestamp: 'x' }])).toEqual([
        '_data_stream_timestamp',
      ]);
    });

    it('includes _feature, which Elasticsearch rejects as well', () => {
      expect(getReservedMetadataColumns([{ _feature: 'x' }])).toEqual(['_feature']);
    });

    it('does not include _size, which Elasticsearch only rejects when the mapper-size plugin is installed', () => {
      expect(getReservedMetadataColumns([{ _size: '1' }])).toEqual([]);
    });

    it('returns an empty array when no column is reserved', () => {
      const documents = [{ _id: 'doc-1', _score: '1', _custom: 'value', 'host.name': 'host-1' }];

      expect(getReservedMetadataColumns(documents)).toEqual([]);
    });

    it('handles an empty list of documents', () => {
      expect(getReservedMetadataColumns([])).toEqual([]);
    });
  });

  describe('omitReservedMetadataColumns', () => {
    it('removes reserved fields and keeps the others', () => {
      const source = {
        _source: '{"a":1}',
        _ignored: 'host.name',
        'host.name': 'host-1',
        _custom: 'value',
      };

      expect(omitReservedMetadataColumns(source)).toEqual({
        'host.name': 'host-1',
        _custom: 'value',
      });
    });

    it('does not modify the original source', () => {
      const source = { _source: '{"a":1}', 'host.name': 'host-1' };

      omitReservedMetadataColumns(source);

      expect(source).toEqual({ _source: '{"a":1}', 'host.name': 'host-1' });
    });

    it('returns undefined when there is no source', () => {
      expect(omitReservedMetadataColumns(undefined)).toBeUndefined();
    });
  });
});
