/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildEntityCandidatesQuery,
  CORRELATED_ENTITY_TYPES,
  getEuidAggName,
  getEuidRuntimeFieldName,
} from '.';

describe('buildEntityCandidatesQuery', () => {
  const alertIds = ['alert-1', 'alert-2'];

  it('queries exactly the provided alert ids', () => {
    const query = buildEntityCandidatesQuery({ alertIds });

    expect(query.query).toEqual({ ids: { values: alertIds } });
  });

  it('requests zero hits (aggregations only)', () => {
    const query = buildEntityCandidatesQuery({ alertIds });

    expect(query.size).toBe(0);
  });

  it.each([...CORRELATED_ENTITY_TYPES])(
    'defines a keyword EUID runtime field for %s',
    (entityType) => {
      const query = buildEntityCandidatesQuery({ alertIds });

      expect(query.runtime_mappings?.[getEuidRuntimeFieldName(entityType)]).toEqual(
        expect.objectContaining({ type: 'keyword' })
      );
    }
  );

  it.each([...CORRELATED_ENTITY_TYPES])(
    'defines a terms agg over the %s EUID runtime field with a one-doc top_hits sample',
    (entityType) => {
      const query = buildEntityCandidatesQuery({ alertIds });
      const agg = query.aggs?.[getEuidAggName(entityType)];

      expect(agg?.terms).toEqual(
        expect.objectContaining({ field: getEuidRuntimeFieldName(entityType), min_doc_count: 1 })
      );
      expect(agg?.aggs).toEqual({ sample: { top_hits: { size: 1, _source: true } } });
    }
  );
});
