/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { selectPageRows } from './use_entity_grid_data';

const shellRows = [{ 'entity.id': 'host:new' }];
const enrichedRows = [{ 'entity.id': 'host:new', alert_count: 3 }];
const previousEnrichedRows = [{ 'entity.id': 'host:old', alert_count: 1 }];

describe('selectPageRows', () => {
  it('keeps painting the previous enriched page while the new shell loads', () => {
    expect(
      selectPageRows({
        shellRows: [{ 'entity.id': 'host:old' }],
        isShellPrevious: true,
        enrichedRows: previousEnrichedRows,
        isEnrichPrevious: false,
        isEnrichFetching: false,
      })
    ).toEqual({ rows: previousEnrichedRows, isEnriching: false });
  });

  it('paints the new shell and marks it enriching while enrich is in flight', () => {
    expect(
      selectPageRows({
        shellRows,
        isShellPrevious: false,
        enrichedRows: previousEnrichedRows,
        isEnrichPrevious: true,
        isEnrichFetching: true,
      })
    ).toEqual({ rows: shellRows, isEnriching: true });
  });

  it('keeps the previous enriched rows when a refetched shell has the same entities', () => {
    const sameEntitiesEnriched = [{ 'entity.id': 'host:new', alert_count: 2 }];
    expect(
      selectPageRows({
        shellRows,
        isShellPrevious: false,
        enrichedRows: sameEntitiesEnriched,
        isEnrichPrevious: true,
        isEnrichFetching: true,
      })
    ).toEqual({ rows: sameEntitiesEnriched, isEnriching: false });
  });

  it('stops marking the shell as enriching when enrich is no longer fetching', () => {
    expect(
      selectPageRows({
        shellRows,
        isShellPrevious: false,
        enrichedRows: undefined,
        isEnrichPrevious: false,
        isEnrichFetching: false,
      })
    ).toEqual({ rows: shellRows, isEnriching: false });
  });

  it('paints the enriched rows once enrich has data for the current shell', () => {
    expect(
      selectPageRows({
        shellRows,
        isShellPrevious: false,
        enrichedRows,
        isEnrichPrevious: false,
        isEnrichFetching: false,
      })
    ).toEqual({ rows: enrichedRows, isEnriching: false });
  });

  it('returns no rows and is not enriching before the first shell', () => {
    expect(
      selectPageRows({
        shellRows: undefined,
        isShellPrevious: false,
        enrichedRows: undefined,
        isEnrichPrevious: false,
        isEnrichFetching: true,
      })
    ).toEqual({ rows: [], isEnriching: false });
  });
});
