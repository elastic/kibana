/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { writeAttributionEvidence } from './write_attribution_evidence';

describe('writeAttributionEvidence', () => {
  const makeEsClient = () => ({ update: jest.fn().mockResolvedValue({}) });

  it('writes the evidence fields the report list reads back', async () => {
    const esClient = makeEsClient();

    await writeAttributionEvidence(esClient as never, {
      index: '.kibana-threat-reports',
      id: 'report-1',
      spaceId: 'default',
      window: '7d',
      computedAt: '2026-09-30T12:00:00.000Z',
      iocMatchHits: 3,
      techniqueOverlapHits: 2,
      alertHitsTotal: 5,
    });

    expect(esClient.update).toHaveBeenCalledWith(
      expect.objectContaining({
        index: '.kibana-threat-reports',
        id: 'report-1',
        retry_on_conflict: 3,
        script: expect.objectContaining({
          lang: 'painless',
          source: expect.stringContaining('alert_hits_total'),
          params: {
            space_id: 'default',
            window: '7d',
            computed_at: '2026-09-30T12:00:00.000Z',
            ioc_match_hits: 3,
            technique_overlap_hits: 2,
            alert_hits_total: 5,
          },
        }),
      })
    );
  });

  it("keys the evidence element by space, matching Hunt Watch's own writer", async () => {
    const esClient = makeEsClient();

    await writeAttributionEvidence(esClient as never, {
      index: '.kibana-threat-reports',
      id: 'report-1',
      spaceId: 'attribution-space',
      window: '7d',
      computedAt: '2026-09-30T12:00:00.000Z',
      iocMatchHits: 0,
      techniqueOverlapHits: 0,
      alertHitsTotal: 0,
    });

    const [{ script }] = esClient.update.mock.calls[0];
    expect(script.source).toEqual(expect.stringContaining('space_id'));
    expect(script.params.space_id).toBe('attribution-space');
  });

  it("never sets last_hunt_* keys, which belong to Hunt Watch's writer on the same element", async () => {
    const esClient = makeEsClient();

    await writeAttributionEvidence(esClient as never, {
      index: '.kibana-threat-reports',
      id: 'report-1',
      spaceId: 'default',
      window: '7d',
      computedAt: '2026-09-30T12:00:00.000Z',
      iocMatchHits: 0,
      techniqueOverlapHits: 0,
      alertHitsTotal: 0,
    });

    const [{ script }] = esClient.update.mock.calls[0];
    expect(script.source).not.toEqual(expect.stringContaining('last_hunt'));
  });
});
