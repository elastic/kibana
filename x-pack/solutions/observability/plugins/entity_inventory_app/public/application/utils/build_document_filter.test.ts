/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Filter, Query } from '@kbn/es-query';
import { buildDocumentFilter } from './build_document_filter';

const KQL_QUERY: Query = { language: 'kuery', query: 'host.name: web-1' };

const createPhraseFilter = (negate = false): Filter => ({
  meta: {
    alias: null,
    disabled: false,
    negate,
    type: 'phrase',
    key: 'host.os.type',
    params: { query: 'linux' },
  },
  query: { match_phrase: { 'host.os.type': 'linux' } },
});

describe('buildDocumentFilter', () => {
  it('returns undefined when nothing narrows the documents', () => {
    expect(buildDocumentFilter({})).toBeUndefined();
    expect(
      buildDocumentFilter({
        query: { language: 'kuery', query: '' },
        filters: [],
        attributes: {},
      })
    ).toBeUndefined();
  });

  it('ignores a query that is only whitespace', () => {
    expect(buildDocumentFilter({ query: { language: 'kuery', query: '   ' } })).toBeUndefined();
  });

  it('ignores an empty or whitespace-only Lucene query', () => {
    expect(buildDocumentFilter({ query: { language: 'lucene', query: '' } })).toBeUndefined();
    expect(buildDocumentFilter({ query: { language: 'lucene', query: '   ' } })).toBeUndefined();
  });

  it('builds a Lucene query as a query string clause', () => {
    const documentFilter = buildDocumentFilter({
      query: { language: 'lucene', query: 'host.name:web-1' },
    });

    expect(JSON.stringify(documentFilter)).toContain('query_string');
    expect(JSON.stringify(documentFilter)).toContain('host.name:web-1');
  });

  it('ignores attributes with no selected values', () => {
    expect(buildDocumentFilter({ attributes: { 'os.type': [] } })).toBeUndefined();
  });

  it('builds the KQL query as a clause on its field and value', () => {
    const documentFilter = buildDocumentFilter({ query: KQL_QUERY });

    expect(documentFilter).toBeDefined();
    expect(JSON.stringify(documentFilter)).toContain('host.name');
    expect(JSON.stringify(documentFilter)).toContain('web-1');
  });

  it('adds the filter bar filters and keeps a negated one as a must not clause', () => {
    const included = buildDocumentFilter({ filters: [createPhraseFilter()] });
    const excluded = buildDocumentFilter({ filters: [createPhraseFilter(true)] });

    expect(included?.bool.filter).toContainEqual({ match_phrase: { 'host.os.type': 'linux' } });
    expect(excluded?.bool.must_not).toContainEqual({ match_phrase: { 'host.os.type': 'linux' } });
    expect(excluded?.bool.filter).toEqual([]);
  });

  it('adds one terms clause on the attribute name for each attribute with values', () => {
    const documentFilter = buildDocumentFilter({
      attributes: { 'os.type': ['linux', 'windows'], 'cloud.provider': ['aws'] },
    });

    expect(documentFilter?.bool.filter).toEqual([
      { terms: { 'os.type': ['linux', 'windows'] } },
      { terms: { 'cloud.provider': ['aws'] } },
    ]);
  });

  it('leaves out the excluded attribute and keeps the others', () => {
    const documentFilter = buildDocumentFilter({
      attributes: { 'os.type': ['linux'], 'cloud.provider': ['aws'] },
      excludeAttribute: 'os.type',
    });

    expect(documentFilter?.bool.filter).toEqual([{ terms: { 'cloud.provider': ['aws'] } }]);
  });

  it('returns undefined when the only attribute is the excluded one', () => {
    expect(
      buildDocumentFilter({ attributes: { 'os.type': ['linux'] }, excludeAttribute: 'os.type' })
    ).toBeUndefined();
  });

  it('combines the query, the filter bar and the attributes in one filter', () => {
    const documentFilter = buildDocumentFilter({
      query: KQL_QUERY,
      filters: [createPhraseFilter()],
      attributes: { 'cloud.provider': ['aws'] },
    });

    const serialized = JSON.stringify(documentFilter);
    expect(serialized).toContain('web-1');
    expect(documentFilter?.bool.filter).toContainEqual({
      match_phrase: { 'host.os.type': 'linux' },
    });
    expect(documentFilter?.bool.filter).toContainEqual({ terms: { 'cloud.provider': ['aws'] } });
  });
});
