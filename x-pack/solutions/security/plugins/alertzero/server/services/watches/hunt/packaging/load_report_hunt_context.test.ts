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

  describe('extracted fields', () => {
    const fullSource = {
      content: { title: 'Sign-in watch bulletin', body_text: 'Failures across eu-central-1.' },
      severity: { level: 'medium' },
      extracted: {
        ttps: { techniques: ['T1110.003', 'T1110'] },
        iocs: [
          { type: 'ip', value: '203.0.113.60' },
          { type: 'ip' },
          { value: 'orphan' },
          { type: 'email', value: 'signin-watch@lab-demo.test' },
        ],
        vulnerability: { vendor: ' Amazon ', product: 'IAM' },
      },
    };

    const load = async (source: Record<string, unknown>) =>
      loadReportHuntContext({
        esClient: {
          search: jest.fn().mockResolvedValue({ hits: { hits: [{ _source: source }] } }),
        },
        spaceId: 'default',
        reportId: 'rpt-1',
      });

    it('returns the extracted technique ids', async () => {
      expect((await load(fullSource))?.techniques).toEqual(['T1110.003', 'T1110']);
    });

    it('returns only the IOCs that carry both a type and a value', async () => {
      expect((await load(fullSource))?.iocs).toEqual([
        { type: 'ip', value: '203.0.113.60' },
        { type: 'email', value: 'signin-watch@lab-demo.test' },
      ]);
    });

    it('returns the trimmed vendor', async () => {
      expect((await load(fullSource))?.vendor).toBe('Amazon');
    });

    it('returns the product', async () => {
      expect((await load(fullSource))?.product).toBe('IAM');
    });

    it('returns the full body text without slicing it', async () => {
      const bodyText = 'x'.repeat(20_000);
      expect(
        (await load({ ...fullSource, content: { title: 't', body_text: bodyText } }))?.bodyText
      ).toHaveLength(20_000);
    });

    it('returns a context when the report has body text but no title or severity', async () => {
      expect((await load({ content: { body_text: 'only a body' } }))?.bodyText).toBe('only a body');
    });
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
