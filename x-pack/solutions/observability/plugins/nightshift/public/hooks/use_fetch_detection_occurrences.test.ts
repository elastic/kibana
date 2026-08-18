/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { LifecycleDetection } from '@kbn/significant-events-schema';
import {
  buildDetectionOccurrencesRequest,
  mapOccurrencesByRuleUuid,
} from './use_fetch_detection_occurrences';

const detection = (overrides: Partial<LifecycleDetection> = {}): LifecycleDetection => ({
  detection_id: 'detection-1',
  rule_name: 'Error spike',
  rule_uuid: 'rule-1',
  stream_name: 'logs.api',
  change_point_type: 'spike',
  '@timestamp': '2026-07-10T12:00:00.000Z',
  ...overrides,
});

describe('buildDetectionOccurrencesRequest', () => {
  it('batches rules and streams across the complete detection time range', () => {
    expect(
      buildDetectionOccurrencesRequest([
        detection(),
        detection({
          detection_id: 'detection-2',
          rule_uuid: 'rule-2',
          stream_name: 'logs.worker',
          '@timestamp': '2026-07-10T13:00:00.000Z',
        }),
      ])
    ).toEqual({
      from: '2026-07-10T11:00:00.000Z',
      to: '2026-07-10T13:15:00.000Z',
      ruleUuids: ['rule-1', 'rule-2'],
      streamNames: ['logs.api', 'logs.worker'],
    });
  });

  it('returns undefined when no detection has a rule UUID', () => {
    expect(buildDetectionOccurrencesRequest([detection({ rule_uuid: undefined })])).toBeUndefined();
  });
});

describe('mapOccurrencesByRuleUuid', () => {
  it('maps occurrence series by rule UUID and skips rows without one', () => {
    expect(
      mapOccurrencesByRuleUuid([
        {
          rule_uuid: 'rule-1',
          occurrences: [
            { date: '2026-07-10T11:55:00.000Z', count: 2 },
            { date: '2026-07-10T12:00:00.000Z', count: 8 },
          ],
        },
        {
          occurrences: [{ date: '2026-07-10T12:00:00.000Z', count: 1 }],
        },
      ])
    ).toEqual(
      new Map([
        [
          'rule-1',
          [
            { x: new Date('2026-07-10T11:55:00.000Z').getTime(), y: 2 },
            { x: new Date('2026-07-10T12:00:00.000Z').getTime(), y: 8 },
          ],
        ],
      ])
    );
  });

  it('keeps the longer series when multiple query links share a rule UUID', () => {
    expect(
      mapOccurrencesByRuleUuid([
        {
          rule_uuid: 'rule-1',
          occurrences: [{ date: '2026-07-10T12:00:00.000Z', count: 1 }],
        },
        {
          rule_uuid: 'rule-1',
          occurrences: [
            { date: '2026-07-10T11:55:00.000Z', count: 2 },
            { date: '2026-07-10T12:00:00.000Z', count: 8 },
          ],
        },
      ])
    ).toEqual(
      new Map([
        [
          'rule-1',
          [
            { x: new Date('2026-07-10T11:55:00.000Z').getTime(), y: 2 },
            { x: new Date('2026-07-10T12:00:00.000Z').getTime(), y: 8 },
          ],
        ],
      ])
    );
  });

  it('filters invalid occurrence dates', () => {
    expect(
      mapOccurrencesByRuleUuid([
        {
          rule_uuid: 'rule-1',
          occurrences: [
            { date: 'invalid', count: 1 },
            { date: '2026-07-10T12:00:00.000Z', count: 3 },
          ],
        },
      ])
    ).toEqual(new Map([['rule-1', [{ x: new Date('2026-07-10T12:00:00.000Z').getTime(), y: 3 }]]]));
  });
});
