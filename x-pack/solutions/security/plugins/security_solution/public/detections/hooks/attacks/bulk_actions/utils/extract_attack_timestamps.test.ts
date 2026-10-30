/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimelineItem } from '@kbn/securitysolution-timeline-common';
import { TIMESTAMP } from '@kbn/rule-data-utils';
import { extractAttackTimestamps } from './extract_attack_timestamps';

const item = (id: string, data: TimelineItem['data']): TimelineItem => ({
  _id: id,
  data,
  ecs: { _id: id },
});

describe('extractAttackTimestamps', () => {
  it('reads the timestamp carried by each item', () => {
    expect(
      extractAttackTimestamps([
        item('attack-1', [{ field: TIMESTAMP, value: ['2024-05-02T09:00:00.000Z'] }]),
        item('attack-2', [{ field: TIMESTAMP, value: ['2024-04-28T06:00:00.000Z'] }]),
      ])
    ).toEqual(['2024-05-02T09:00:00.000Z', '2024-04-28T06:00:00.000Z']);
  });

  it('yields undefined for an item carrying no timestamp', () => {
    expect(
      extractAttackTimestamps([
        item('attack-1', [{ field: 'other.field', value: ['x'] }]),
        item('attack-2', [{ field: TIMESTAMP, value: [] }]),
      ])
    ).toEqual([undefined, undefined]);
  });

  it('returns an empty array when given no items', () => {
    expect(extractAttackTimestamps([])).toEqual([]);
  });
});
