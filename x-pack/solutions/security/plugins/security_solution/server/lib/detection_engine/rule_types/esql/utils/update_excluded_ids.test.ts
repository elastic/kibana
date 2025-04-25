/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { updateExcludedIds } from './update_excluded_ids';
import type { FetchedDocument } from '../fetch_source_documents';
import type { EsqlTable } from '../esql_request';

const fetchedDocumentMock: FetchedDocument = {
  fields: {},
  _index: 'index',
  _version: 1,
};

const sourceDocuments: Record<string, FetchedDocument[]> = {
  id1: [fetchedDocumentMock],
  id2: [fetchedDocumentMock],
  id3: [fetchedDocumentMock],
};

const results: EsqlTable = {
  columns: [{ name: '_id', type: 'keyword' }],
  values: [['id1'], ['id2'], ['id3']],
};

describe('updateExcludedIds', () => {
  it('should return unchanged excludedDocumentIds if query is aggregating', () => {
    const excludedDocumentIds = ['prev-id-0', 'prev-id-1', 'prev-id-2'];

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
    const excludedDocumentIds = ['prev-id-0', 'prev-id-1', 'prev-id-2'];
    const result = updateExcludedIds({
      excludedDocumentIds,
      hasMvExpand: false,
      sourceDocuments,
      results,
      isRuleAggregating: false,
    });

    expect(result).toEqual(['prev-id-0', 'prev-id-1', 'prev-id-2', 'id1', 'id2', 'id3']);
  });

  it('should add all source document ids to excluded when only one document exists', () => {
    const excludedDocumentIds = ['prev-id-0', 'prev-id-1', 'prev-id-2'];
    const result = updateExcludedIds({
      excludedDocumentIds,
      hasMvExpand: true,
      sourceDocuments: { id1: [fetchedDocumentMock] },
      results,
      isRuleAggregating: false,
    });

    expect(result).toEqual(['prev-id-0', 'prev-id-1', 'prev-id-2', 'id1']);
  });

  it('should exclude all source document ids except the last one from results when hasMvExpand is true', () => {
    const excludedDocumentIds = ['prev-id-0', 'prev-id-1', 'prev-id-2'];

    const result = updateExcludedIds({
      excludedDocumentIds,
      hasMvExpand: true,
      sourceDocuments,
      results,
      isRuleAggregating: false,
    });

    expect(result).toEqual(['prev-id-0', 'prev-id-1', 'prev-id-2', 'id1', 'id2']);
  });
});
