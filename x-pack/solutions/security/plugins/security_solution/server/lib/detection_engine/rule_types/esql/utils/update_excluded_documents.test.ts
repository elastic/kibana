/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { updateExcludedDocuments } from './update_excluded_documents';
import type { FetchedDocument } from '../fetch_source_documents';

const fetchedDocumentMock: FetchedDocument = {
  fields: { '@timestamp': ['2025-04-28T10:00:00Z'] },
  _source: { '@timestamp': '2025-04-28T10:00:00Z' },
  _index: 'index',
  _version: 1,
};

const sourceDocuments: Record<string, FetchedDocument> = {
  id1: fetchedDocumentMock,
  id2: fetchedDocumentMock,
  id3: fetchedDocumentMock,
};

const results: Array<Record<string, string>> = [{ _id: 'id1' }, { _id: 'id2' }, { _id: 'id3' }];

describe('updateExcludedDocuments', () => {
  it('should return unchanged excludedDocuments if query is aggregating', () => {
    const excludedDocuments = [
      { id: 'prev-id-0', timestamp: '2025-04-28T09:00:00Z' },
      { id: 'prev-id-1', timestamp: '2025-04-28T09:30:00Z' },
      { id: 'prev-id-2', timestamp: '2025-04-28T09:45:00Z' },
    ];

    updateExcludedDocuments({
      excludedDocuments,
      sourceDocuments,
      results,
      isRuleAggregating: true,
      aggregatableTimestampField: '@timestamp',
    });

    expect(excludedDocuments).toEqual([
      { id: 'prev-id-0', timestamp: '2025-04-28T09:00:00Z' },
      { id: 'prev-id-1', timestamp: '2025-04-28T09:30:00Z' },
      { id: 'prev-id-2', timestamp: '2025-04-28T09:45:00Z' },
    ]);
  });

  it('should add all source document ids except last one to excluded when hasMvExpand is false', () => {
    const excludedDocuments = [
      { id: 'prev-id-0', timestamp: '2025-04-28T09:00:00Z' },
      { id: 'prev-id-1', timestamp: '2025-04-28T09:30:00Z' },
      { id: 'prev-id-2', timestamp: '2025-04-28T09:45:00Z' },
    ];

    updateExcludedDocuments({
      excludedDocuments,
      sourceDocuments,
      results,
      isRuleAggregating: false,
      aggregatableTimestampField: '@timestamp',
    });

    expect(excludedDocuments).toEqual([
      { id: 'prev-id-0', timestamp: '2025-04-28T09:00:00Z' },
      { id: 'prev-id-1', timestamp: '2025-04-28T09:30:00Z' },
      { id: 'prev-id-2', timestamp: '2025-04-28T09:45:00Z' },
      { id: 'id1', timestamp: '2025-04-28T10:00:00Z' },
      { id: 'id2', timestamp: '2025-04-28T10:00:00Z' },
    ]);
  });

  it('should add all source document ids to excluded when only one document exists', () => {
    const excludedDocuments = [
      { id: 'prev-id-0', timestamp: '2025-04-28T09:00:00Z' },
      { id: 'prev-id-1', timestamp: '2025-04-28T09:30:00Z' },
      { id: 'prev-id-2', timestamp: '2025-04-28T09:45:00Z' },
    ];

    updateExcludedDocuments({
      excludedDocuments,
      sourceDocuments: { id1: fetchedDocumentMock },
      results,
      isRuleAggregating: false,
      aggregatableTimestampField: '@timestamp',
    });

    expect(excludedDocuments).toEqual([
      { id: 'prev-id-0', timestamp: '2025-04-28T09:00:00Z' },
      { id: 'prev-id-1', timestamp: '2025-04-28T09:30:00Z' },
      { id: 'prev-id-2', timestamp: '2025-04-28T09:45:00Z' },
      { id: 'id1', timestamp: '2025-04-28T10:00:00Z' },
    ]);
  });

  it('should use kibana.combined_timestamp as timestamp field', () => {
    const fetchedDocumentWithCombined: FetchedDocument = {
      fields: { 'kibana.combined_timestamp': ['2025-04-28T11:11:11Z'] },
      _source: { '@timestamp': '2025-04-28T11:11:11Z' },
      _index: 'index',
      _version: 1,
    };

    const sourceDocumentsWithCombined = {
      id1: fetchedDocumentWithCombined,
      id2: fetchedDocumentWithCombined,
    };

    const excludedDocuments = [{ id: 'prev-id-0', timestamp: '2025-04-28T09:00:00Z' }];

    updateExcludedDocuments({
      excludedDocuments,
      sourceDocuments: sourceDocumentsWithCombined,
      results: [{ _id: 'id1' }, { _id: 'id2' }],
      isRuleAggregating: false,
      aggregatableTimestampField: 'kibana.combined_timestamp',
    });

    expect(excludedDocuments).toEqual([
      { id: 'prev-id-0', timestamp: '2025-04-28T09:00:00Z' },
      { id: 'id1', timestamp: '2025-04-28T11:11:11Z' },
    ]);
  });
});
