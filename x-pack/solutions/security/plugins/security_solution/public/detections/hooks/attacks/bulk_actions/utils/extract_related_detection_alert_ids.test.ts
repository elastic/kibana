/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimelineItem } from '@kbn/timelines-plugin/common';
import { extractRelatedDetectionAlertIds } from './extract_related_detection_alert_ids';

const ALERT_ATTACK_DISCOVERY_ALERT_IDS = 'kibana.alert.attack_discovery.alert_ids';

describe('extractRelatedDetectionAlertIds', () => {
  it('should extract related alert IDs from attacks', () => {
    const alertItems: TimelineItem[] = [
      {
        _id: 'attack-1',
        data: [
          {
            field: ALERT_ATTACK_DISCOVERY_ALERT_IDS,
            value: ['detection-1', 'detection-2'],
          },
        ],
        ecs: { _id: 'attack-1' },
      } as TimelineItem,
      {
        _id: 'attack-2',
        data: [
          {
            field: ALERT_ATTACK_DISCOVERY_ALERT_IDS,
            value: ['detection-2', 'detection-3'],
          },
        ],
        ecs: { _id: 'attack-2' },
      } as TimelineItem,
    ];

    const result = extractRelatedDetectionAlertIds(alertItems);

    expect(result).toEqual(['detection-1', 'detection-2', 'detection-3']);
  });

  it('should return unique IDs when there are duplicates', () => {
    const alertItems: TimelineItem[] = [
      {
        _id: 'attack-1',
        data: [
          {
            field: ALERT_ATTACK_DISCOVERY_ALERT_IDS,
            value: ['detection-1', 'detection-1'],
          },
        ],
        ecs: { _id: 'attack-1' },
      } as TimelineItem,
    ];

    const result = extractRelatedDetectionAlertIds(alertItems);

    expect(result).toEqual(['detection-1']);
  });

  it('should return empty array when no related alerts exist', () => {
    const alertItems: TimelineItem[] = [
      {
        _id: 'attack-1',
        data: [],
        ecs: { _id: 'attack-1' },
      } as TimelineItem,
    ];

    const result = extractRelatedDetectionAlertIds(alertItems);

    expect(result).toEqual([]);
  });

  it('should handle empty alert items array', () => {
    const alertItems: TimelineItem[] = [];

    const result = extractRelatedDetectionAlertIds(alertItems);

    expect(result).toEqual([]);
  });

  it('should handle missing field value', () => {
    const alertItems: TimelineItem[] = [
      {
        _id: 'attack-1',
        data: [
          {
            field: ALERT_ATTACK_DISCOVERY_ALERT_IDS,
            value: undefined,
          },
        ],
        ecs: { _id: 'attack-1' },
      } as TimelineItem,
    ];

    const result = extractRelatedDetectionAlertIds(alertItems);

    expect(result).toEqual([]);
  });

  it('should handle non-array field value', () => {
    const alertItems: TimelineItem[] = [
      {
        _id: 'attack-1',
        data: [
          {
            field: ALERT_ATTACK_DISCOVERY_ALERT_IDS,
            value: 'not-an-array',
          },
        ],
        ecs: { _id: 'attack-1' },
      } as unknown as TimelineItem,
    ];

    const result = extractRelatedDetectionAlertIds(alertItems);

    expect(result).toEqual([]);
  });
});
