/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { loadReportHuntContext } from './load_report_hunt_context';
import type { EsReportContextClient } from './load_report_hunt_context';

describe('loadReportHuntContext', () => {
  it('returns the report title and severity level when the report is found', async () => {
    const search = jest.fn().mockResolvedValue({
      hits: {
        hits: [
          {
            _source: {
              content: { title: 'Shadow admin AssumeRole' },
              severity: { level: 'high', score: 80 },
            },
          },
        ],
      },
    });
    const esClient: EsReportContextClient = { search };

    const result = await loadReportHuntContext({ esClient, spaceId: 'default', reportId: 'rpt-1' });

    expect(result).toEqual({ title: 'Shadow admin AssumeRole', severity: 'high' });
  });

  it('returns just the title when the report has no severity', async () => {
    const search = jest.fn().mockResolvedValue({
      hits: { hits: [{ _source: { content: { title: 'Shadow admin AssumeRole' } } }] },
    });
    const esClient: EsReportContextClient = { search };

    const result = await loadReportHuntContext({ esClient, spaceId: 'default', reportId: 'rpt-1' });

    expect(result).toEqual({ title: 'Shadow admin AssumeRole', severity: undefined });
  });

  it('returns undefined when no report matches', async () => {
    const esClient: EsReportContextClient = {
      search: jest.fn().mockResolvedValue({ hits: { hits: [] } }),
    };

    const result = await loadReportHuntContext({ esClient, spaceId: 'default', reportId: 'rpt-1' });

    expect(result).toBeUndefined();
  });

  it('returns undefined rather than throwing when the client fails', async () => {
    const esClient: EsReportContextClient = {
      search: jest.fn().mockRejectedValue(new Error('socket hang up')),
    };

    const result = await loadReportHuntContext({ esClient, spaceId: 'default', reportId: 'rpt-1' });

    expect(result).toBeUndefined();
  });

  it('filters by the current space plus the global sentinel', async () => {
    const search = jest.fn().mockResolvedValue({ hits: { hits: [] } });
    const esClient: EsReportContextClient = { search };

    await loadReportHuntContext({ esClient, spaceId: 'space-a', reportId: 'rpt-1' });

    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({
        query: expect.objectContaining({
          bool: expect.objectContaining({
            filter: expect.arrayContaining([{ terms: { space_id: ['space-a', '*'] } }]),
          }),
        }),
      })
    );
  });
});
