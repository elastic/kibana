/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  buildHuntFindingsQueryClauses,
  buildHuntFindingsSortClause,
  listHuntFindings,
} from './list_hunt_findings';

describe('buildHuntFindingsQueryClauses', () => {
  it('returns space filter and time range when provided', () => {
    const { filter, must } = buildHuntFindingsQueryClauses({
      spaceId: 'default',
      from: '2026-01-01T00:00:00.000Z',
      to: '2026-01-08T00:00:00.000Z',
    });

    expect(must).toEqual([]);
    expect(filter).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          range: {
            '@timestamp': {
              gte: '2026-01-01T00:00:00.000Z',
              lte: '2026-01-08T00:00:00.000Z',
            },
          },
        }),
      ])
    );
  });

  it('adds min_confidence range filter', () => {
    const { filter } = buildHuntFindingsQueryClauses({
      spaceId: 'default',
      min_confidence: 0.75,
    });

    expect(filter).toEqual(expect.arrayContaining([{ range: { confidence: { gte: 0.75 } } }]));
  });

  it('filters deployed status with a term clause', () => {
    const { filter } = buildHuntFindingsQueryClauses({
      spaceId: 'default',
      statuses: ['deployed'],
    });

    expect(filter).toEqual(
      expect.arrayContaining([
        {
          bool: {
            should: [{ term: { status: 'deployed' } }],
            minimum_should_match: 1,
          },
        },
      ])
    );
  });

  it('treats missing status as new when filtering for new', () => {
    const { filter } = buildHuntFindingsQueryClauses({
      spaceId: 'default',
      statuses: ['new'],
    });

    expect(filter).toEqual(
      expect.arrayContaining([
        {
          bool: {
            should: [
              { term: { status: 'new' } },
              { bool: { must_not: { exists: { field: 'status' } } } },
            ],
            minimum_should_match: 1,
          },
        },
      ])
    );
  });

  it('adds severity terms filter', () => {
    const { filter } = buildHuntFindingsQueryClauses({
      spaceId: 'default',
      severities: ['high', 'critical'],
    });

    expect(filter).toEqual(expect.arrayContaining([{ terms: { severity: ['high', 'critical'] } }]));
  });

  it('adds search must clauses for q', () => {
    const { must } = buildHuntFindingsQueryClauses({
      spaceId: 'default',
      q: 'powershell',
    });

    expect(must).toHaveLength(1);
    expect(must[0]).toEqual(
      expect.objectContaining({
        bool: expect.objectContaining({
          minimum_should_match: 1,
        }),
      })
    );
  });
});

describe('buildHuntFindingsSortClause', () => {
  it('returns timestamp sort for recency', () => {
    expect(buildHuntFindingsSortClause('recency', 'desc')).toEqual([
      { '@timestamp': { order: 'desc' } },
    ]);
  });

  it('returns confidence sort', () => {
    expect(buildHuntFindingsSortClause('confidence', 'asc')).toEqual([
      { confidence: { order: 'asc', missing: 0 } },
    ]);
  });

  it('returns risk_score sort', () => {
    expect(buildHuntFindingsSortClause('risk_score', 'desc')).toEqual([
      { risk_score: { order: 'desc', missing: 0 } },
    ]);
  });

  it('returns script sort for severity', () => {
    const clause = buildHuntFindingsSortClause('severity', 'desc');
    expect(clause[0]).toEqual(
      expect.objectContaining({
        _script: expect.objectContaining({
          type: 'number',
          order: 'desc',
        }),
      })
    );
  });
});

describe('listHuntFindings', () => {
  const esClient = {
    search: jest.fn(),
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('passes offset, size, sort, and filters into the findings search', async () => {
    esClient.search
      .mockResolvedValueOnce({
        hits: {
          total: { value: 42 },
          hits: [
            {
              _id: 'finding-1',
              _source: {
                '@timestamp': '2026-01-01T12:00:00.000Z',
                report_id: 'report-1',
                technique_id: 'T1059',
                hypothesis: 'test',
                confidence: 0.9,
                severity: 'high',
                risk_score: 70,
                proposed_esql_rule: 'FROM logs',
                status: 'new',
              },
            },
          ],
        },
      })
      .mockResolvedValueOnce({ hits: { hits: [] } })
      .mockResolvedValueOnce({ hits: { hits: [] } }); // report enrichment

    const result = await listHuntFindings(esClient as never, {
      spaceId: 'default',
      from: '2026-01-01T00:00:00.000Z',
      to: '2026-01-08T00:00:00.000Z',
      offset: 25,
      size: 25,
      sort_by: 'confidence',
      sort_order: 'desc',
      statuses: ['new'],
      severities: ['high'],
      min_confidence: 0.5,
      q: 'powershell',
    });

    expect(result.total).toBe(42);
    expect(result.findings).toHaveLength(1);
    expect(esClient.search).toHaveBeenCalledWith(
      expect.objectContaining({
        from: 25,
        size: 25,
        sort: [{ confidence: { order: 'desc', missing: 0 } }],
      })
    );
  });
});
