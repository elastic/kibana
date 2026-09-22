/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { resolveIndexScope } from './resolve_index_scope';
import { HUNT_ALERTS_INDEX_PATTERN_PREFIX } from '../../../../../common/constants';
import type { HuntTechnology } from '@kbn/alertzero-common';

const present = { indices: [{ name: 'x', attributes: [] }], aliases: [], data_streams: [] };
const absent = { indices: [], aliases: [], data_streams: [] };

const createMockEsClient = (presentPatterns: Set<string>): ElasticsearchClient =>
  ({
    indices: {
      resolveIndex: jest
        .fn()
        .mockImplementation(({ name }: { name: string }) =>
          Promise.resolve(presentPatterns.has(name) ? present : absent)
        ),
    },
  } as unknown as ElasticsearchClient);

describe('resolveIndexScope', () => {
  const SPACE_ID = 'default';
  const alertsPattern = `${HUNT_ALERTS_INDEX_PATTERN_PREFIX}${SPACE_ID}`;

  describe.each<{
    technology: HuntTechnology;
    required: string[];
    optional: string[];
  }>([
    { technology: 'aws_iam', required: ['logs-aws.*'], optional: ['logs-endpoint.events.*'] },
    { technology: 'fortigate', required: ['logs-fortinet.*'], optional: [] },
  ])('$technology', ({ technology, required, optional }) => {
    it('is ok when every required and optional pattern (plus alerts) resolves', async () => {
      const esClient = createMockEsClient(new Set([...required, ...optional, alertsPattern]));
      const result = await resolveIndexScope({ esClient, technology, spaceId: SPACE_ID });

      expect(result.status).toBe('ok');
      expect(result.required).toEqual(required);
      expect(result.optional).toEqual([...optional, alertsPattern]);
      expect(result.missing).toEqual([]);
    });

    it('is blocked when a required pattern is absent, even if optional resolves', async () => {
      const esClient = createMockEsClient(new Set([...optional, alertsPattern]));
      const result = await resolveIndexScope({ esClient, technology, spaceId: SPACE_ID });

      expect(result.status).toBe('blocked');
      expect(result.missing).toEqual(expect.arrayContaining(required));
    });

    it('is degraded when required resolves but the alerts pattern is absent', async () => {
      const esClient = createMockEsClient(new Set([...required, ...optional]));
      const result = await resolveIndexScope({ esClient, technology, spaceId: SPACE_ID });

      expect(result.status).toBe('degraded');
      expect(result.missing).toEqual([alertsPattern]);
    });
  });

  it('derives the alerts pattern from the passed spaceId, not a default', async () => {
    const nonDefaultSpace = 'threat-hunting';
    const esClient = createMockEsClient(
      new Set([
        'logs-aws.*',
        'logs-endpoint.events.*',
        `${HUNT_ALERTS_INDEX_PATTERN_PREFIX}${nonDefaultSpace}`,
      ])
    );
    const result = await resolveIndexScope({
      esClient,
      technology: 'aws_iam',
      spaceId: nonDefaultSpace,
    });

    expect(result.status).toBe('ok');
    expect(result.optional).toContain(`${HUNT_ALERTS_INDEX_PATTERN_PREFIX}${nonDefaultSpace}`);
  });

  it('defaults the row limit to 25 and the window to a 30-day lookback', async () => {
    const esClient = createMockEsClient(new Set());
    const before = Date.now();
    const result = await resolveIndexScope({
      esClient,
      technology: 'fortigate',
      spaceId: SPACE_ID,
    });
    const after = Date.now();

    expect(result.rowLimit).toBe(25);
    const fromMs = new Date(result.window.from).getTime();
    const toMs = new Date(result.window.to).getTime();
    expect(toMs).toBeGreaterThanOrEqual(before);
    expect(toMs).toBeLessThanOrEqual(after);
    expect(toMs - fromMs).toBeCloseTo(30 * 24 * 60 * 60 * 1000, -3);
  });

  it('honors a caller-supplied window and row limit', async () => {
    const esClient = createMockEsClient(new Set());
    const window = { from: '2026-01-01T00:00:00.000Z', to: '2026-01-02T00:00:00.000Z' };
    const result = await resolveIndexScope({
      esClient,
      technology: 'fortigate',
      spaceId: SPACE_ID,
      window,
      rowLimit: 100,
    });

    expect(result.window).toEqual(window);
    expect(result.rowLimit).toBe(100);
  });
});
