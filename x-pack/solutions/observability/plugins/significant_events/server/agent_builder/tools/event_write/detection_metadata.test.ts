/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Detection, SignalInputEntry } from '@kbn/significant-events-schema';
import { fillDetectionMetadata } from './detection_metadata';

const stored = {
  '@timestamp': '2026-10-19T09:00:00.000Z',
  detection_id: 'det-1',
  rule_uuid: 'rule-1',
  rule_name: 'Checkout errors',
  source_id: 'source-1',
  change_point_type: 'spike',
  p_value: 0.0003,
  severity_score: 65,
  processed: false,
} as Detection;

const signal = (metadata: Record<string, unknown>): SignalInputEntry =>
  ({
    type: 'detection',
    source_id: 'logs.test',
    description: 'Rows found.',
    verdict: 'inconclusive',
    evidence: { esql_query: 'FROM logs', result: 'empty' },
    metadata,
  } as SignalInputEntry);

const fill = (signals: SignalInputEntry[], hits: Detection[] = [stored]) =>
  fillDetectionMetadata({
    items: [{ signals }],
    findDetections: jest.fn().mockResolvedValue({ hits }),
  });

describe('fillDetectionMetadata', () => {
  it('fills the metadata from the stored detection when the agent names only its ids', async () => {
    const {
      items: [entry],
    } = await fill([signal({ detection_id: 'det-1', rule_uuid: 'rule-1' })]);

    expect(entry.item.signals?.[0].metadata).toEqual({
      detection_id: 'det-1',
      rule_uuid: 'rule-1',
      rule_name: 'Checkout errors',
      change_point_type: 'spike',
      p_value: 0.0003,
      severity_score: 65,
    });
  });

  it('prefers the stored values to ones the agent sent', async () => {
    const {
      items: [entry],
    } = await fill([
      signal({
        detection_id: 'det-1',
        rule_uuid: 'rule-1',
        p_value: 0.9,
        change_point_type: 'dip',
      }),
    ]);

    expect(entry.item.signals?.[0].metadata).toMatchObject({
      p_value: 0.0003,
      change_point_type: 'spike',
    });
  });

  it('refuses a signal that pairs a stored detection with another rule', async () => {
    const { items, rejections } = await fill([
      signal({ detection_id: 'det-1', rule_uuid: 'rule-2' }),
    ]);

    expect(items).toEqual([]);
    expect(rejections).toEqual([
      expect.objectContaining({
        index: 0,
        reason: 'detection_rule_mismatch',
        message: expect.stringMatching(/belongs to rule rule-1, not rule-2/),
      }),
    ]);
  });

  it('keeps complete metadata for a detection that is not stored', async () => {
    const metadata = {
      detection_id: 'det-9',
      rule_uuid: 'rule-9',
      change_point_type: 'dip',
      p_value: 0.01,
    };

    const {
      items: [entry],
    } = await fill([signal(metadata)], []);

    expect(entry.item.signals?.[0].metadata).toMatchObject(metadata);
  });

  it('names the missing fields for a detection that is not stored and metadata that is incomplete', async () => {
    const { rejections } = await fill([signal({ detection_id: 'det-9', rule_uuid: 'rule-9' })], []);

    expect(rejections).toEqual([
      expect.objectContaining({
        index: 0,
        reason: 'detection_not_stored',
        message: expect.stringMatching(/det-9 is not stored.*p_value/),
      }),
    ]);
  });

  it('rejects only the item whose detection belongs to another rule', async () => {
    const { items, rejections } = await fillDetectionMetadata({
      items: [
        { signals: [signal({ detection_id: 'det-1', rule_uuid: 'rule-2' })] },
        { signals: [signal({ detection_id: 'det-1', rule_uuid: 'rule-1' })] },
      ],
      findDetections: jest.fn().mockResolvedValue({ hits: [stored] }),
    });

    expect(rejections).toEqual([
      expect.objectContaining({ index: 0, reason: 'detection_rule_mismatch' }),
    ]);
    expect(items.map(({ index }) => index)).toEqual([1]);
  });
});
