/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { updateExcludedIds } from './update_excluded_ids';
import type { FetchedDocument } from '../fetch_source_documents';

const fetchedDocumentMock: FetchedDocument = {
  fields: {},
  _index: 'auditbeat',
  _version: 1,
  _id: 'id1',
};

const sourceDocuments: Record<string, FetchedDocument[]> = {
  id1: [fetchedDocumentMock],
  id2: [{ ...fetchedDocumentMock, _id: 'id2' }],
  id3: [{ ...fetchedDocumentMock, _id: 'id3' }],
};

const results = [
  { _id: 'id1', _index: 'auditbeat' },
  { _id: 'id2', _index: 'auditbeat' },
  { _id: 'id3', _index: 'auditbeat' },
];

describe('updateExcludedIds', () => {
  it('should return unchanged excludedDocumentIds if query is aggregating', () => {
    const excludedDocumentIds: Record<string, Set<string>> = {
      auditbeat: new Set(['prev-id-0', 'prev-id-1', 'prev-id-2']),
    };

    const result = updateExcludedIds({
      excludedDocumentIds,
      hasMvExpand: true,
      sourceDocuments,
      results,
      isRuleAggregating: true,
    });

    expect(result).toEqual(excludedDocumentIds);
  });

  it('should add all source document ids to excluded when hasMvExpand is false', () => {
    const excludedDocumentIds: Record<string, Set<string>> = {
      auditbeat: new Set(['prev-id-0', 'prev-id-1', 'prev-id-2']),
    };

    const result = updateExcludedIds({
      excludedDocumentIds,
      hasMvExpand: false,
      sourceDocuments,
      results,
      isRuleAggregating: false,
    });

    expect(result).toEqual({
      auditbeat: new Set(['prev-id-0', 'prev-id-1', 'prev-id-2', 'id1', 'id2', 'id3']),
    });
  });

  it('should add all source document ids to excluded when only one document exists', () => {
    const excludedDocumentIds: Record<string, Set<string>> = {
      auditbeat: new Set(['prev-id-0', 'prev-id-1', 'prev-id-2']),
    };

    const result = updateExcludedIds({
      excludedDocumentIds,
      hasMvExpand: true,
      sourceDocuments: { id1: [fetchedDocumentMock] },
      results: [{ _id: 'id1', _index: 'auditbeat' }],
      isRuleAggregating: false,
    });

    expect(result).toEqual({
      auditbeat: new Set(['prev-id-0', 'prev-id-1', 'prev-id-2', 'id1']),
    });
  });

  it('should exclude all source document ids except the last one from results when hasMvExpand is true', () => {
    const excludedDocumentIds: Record<string, Set<string>> = {
      auditbeat: new Set(['prev-id-0', 'prev-id-1', 'prev-id-2']),
    };

    const result = updateExcludedIds({
      excludedDocumentIds,
      hasMvExpand: true,
      sourceDocuments,
      results,
      isRuleAggregating: false,
    });

    expect(result).toEqual({
      auditbeat: new Set(['prev-id-0', 'prev-id-1', 'prev-id-2', 'id1', 'id2']),
    });
  });

  describe('identical ids in different indices', () => {
    it('should exclude all source documents for same id from different indices', () => {
      const excludedDocumentIds: Record<string, Set<string>> = {
        auditbeat: new Set(['prev-id-0', 'prev-id-1', 'prev-id-2']),
      };

      const result = updateExcludedIds({
        excludedDocumentIds,
        hasMvExpand: false,
        sourceDocuments: {
          id1: [fetchedDocumentMock],
          id2: [
            { ...fetchedDocumentMock, _id: 'id2' },
            { ...fetchedDocumentMock, _id: 'id2', _index: 'filebeat' },
          ],
          id3: [{ ...fetchedDocumentMock, _id: 'id3' }],
        },
        results: [
          { _id: 'id1', _index: 'auditbeat' },
          { _id: 'id2', _index: 'filebeat' },
          { _id: 'id2', _index: 'auditbeat' },
          { _id: 'id3', _index: 'auditbeat' },
        ],
        isRuleAggregating: false,
      });

      expect(result).toEqual({
        auditbeat: new Set(['prev-id-0', 'prev-id-1', 'prev-id-2', 'id1', 'id2', 'id3']),
        filebeat: new Set(['id2']),
      });
    });

    it('should respect index of last id or results', () => {
      const excludedDocumentIds: Record<string, Set<string>> = {
        auditbeat: new Set(['prev-id-0', 'prev-id-1', 'prev-id-2']),
      };

      const result = updateExcludedIds({
        excludedDocumentIds,
        hasMvExpand: false,
        sourceDocuments: {
          id1: [fetchedDocumentMock],
          id2: [
            { ...fetchedDocumentMock, _id: 'id2' },
            { ...fetchedDocumentMock, _id: 'id2', _index: 'filebeat' },
          ],
        },
        results: [
          { _id: 'id1', _index: 'auditbeat' },
          { _id: 'id2', _index: 'filebeat' },
        ],
        isRuleAggregating: false,
      });

      // id2 excluded only to filebeat, because it is the last id in the results, not in auditbeat index
      expect(result).toEqual({
        auditbeat: new Set(['prev-id-0', 'prev-id-1', 'prev-id-2', 'id1']),
        filebeat: new Set(['id2']),
      });
    });
  });
});
