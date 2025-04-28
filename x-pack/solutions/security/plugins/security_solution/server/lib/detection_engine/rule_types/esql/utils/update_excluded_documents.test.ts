/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { updateExcludedDocuments } from './update_excluded_documents';
import type { FetchedDocument } from '../fetch_source_documents';
import type { EsqlTable } from '../esql_request';

const fetchedDocumentMock: FetchedDocument = {
  fields: {},
  _source: { '@timestamp': '2025-04-28T10:00:00Z' },
  _index: 'index',
  _version: 1,
};

const sourceDocuments: Record<string, FetchedDocument> = {
  id1: fetchedDocumentMock,
  id2: fetchedDocumentMock,
  id3: fetchedDocumentMock,
};

const results: EsqlTable = {
  columns: [{ name: '_id', type: 'keyword' }],
  values: [['id1'], ['id2'], ['id3']],
};

describe('updateExcludedDocuments', () => {
  it('should return unchanged excludedDocuments if query is aggregating', () => {
    const excludedDocuments = [
      { id: 'prev-id-0', timestamp: '2025-04-28T09:00:00Z' },
      { id: 'prev-id-1', timestamp: '2025-04-28T09:30:00Z' },
      { id: 'prev-id-2', timestamp: '2025-04-28T09:45:00Z' },
    ];

    const result = updateExcludedDocuments({
      excludedDocuments,
      hasMvExpand: true,
      sourceDocuments,
      results,
      isRuleAggregating: true,
    });

    expect(result).toEqual(excludedDocuments);
  });

  it('should add all source document ids to excluded when hasMvExpand is false', () => {
    const excludedDocuments = [
      { id: 'prev-id-0', timestamp: '2025-04-28T09:00:00Z' },
      { id: 'prev-id-1', timestamp: '2025-04-28T09:30:00Z' },
      { id: 'prev-id-2', timestamp: '2025-04-28T09:45:00Z' },
    ];

    const result = updateExcludedDocuments({
      excludedDocuments,
      hasMvExpand: false,
      sourceDocuments,
      results,
      isRuleAggregating: false,
    });

    expect(result).toEqual([
      { id: 'prev-id-0', timestamp: '2025-04-28T09:00:00Z' },
      { id: 'prev-id-1', timestamp: '2025-04-28T09:30:00Z' },
      { id: 'prev-id-2', timestamp: '2025-04-28T09:45:00Z' },
      { id: 'id1', timestamp: '2025-04-28T10:00:00Z' },
      { id: 'id2', timestamp: '2025-04-28T10:00:00Z' },
      { id: 'id3', timestamp: '2025-04-28T10:00:00Z' },
    ]);
  });

  it('should add all source document ids to excluded when only one document exists', () => {
    const excludedDocuments = [
      { id: 'prev-id-0', timestamp: '2025-04-28T09:00:00Z' },
      { id: 'prev-id-1', timestamp: '2025-04-28T09:30:00Z' },
      { id: 'prev-id-2', timestamp: '2025-04-28T09:45:00Z' },
    ];

    const result = updateExcludedDocuments({
      excludedDocuments,
      hasMvExpand: true,
      sourceDocuments: { id1: fetchedDocumentMock },
      results,
      isRuleAggregating: false,
    });

    expect(result).toEqual([
      { id: 'prev-id-0', timestamp: '2025-04-28T09:00:00Z' },
      { id: 'prev-id-1', timestamp: '2025-04-28T09:30:00Z' },
      { id: 'prev-id-2', timestamp: '2025-04-28T09:45:00Z' },
      { id: 'id1', timestamp: '2025-04-28T10:00:00Z' },
    ]);
  });

  it('should exclude all source document ids except the last one from results when hasMvExpand is true', () => {
    const excludedDocuments = [
      { id: 'prev-id-0', timestamp: '2025-04-28T09:00:00Z' },
      { id: 'prev-id-1', timestamp: '2025-04-28T09:30:00Z' },
      { id: 'prev-id-2', timestamp: '2025-04-28T09:45:00Z' },
    ];

    const result = updateExcludedDocuments({
      excludedDocuments,
      hasMvExpand: true,
      sourceDocuments,
      results,
      isRuleAggregating: false,
    });

    expect(result).toEqual([
      { id: 'prev-id-0', timestamp: '2025-04-28T09:00:00Z' },
      { id: 'prev-id-1', timestamp: '2025-04-28T09:30:00Z' },
      { id: 'prev-id-2', timestamp: '2025-04-28T09:45:00Z' },
      { id: 'id1', timestamp: '2025-04-28T10:00:00Z' },
      { id: 'id2', timestamp: '2025-04-28T10:00:00Z' },
    ]);
  });
});
