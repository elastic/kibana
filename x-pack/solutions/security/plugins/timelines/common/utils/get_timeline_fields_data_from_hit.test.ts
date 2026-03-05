/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchHit } from '@elastic/elasticsearch/lib/api/types';

import { ENRICHMENT_DESTINATION_PATH } from '../constants';
import type { EventHit, TimelineEventsDetailsItem } from '../search_strategy';
import { getTimelineFieldsDataFromHit } from './get_timeline_fields_data_from_hit';

describe('getTimelineFieldsDataFromHit', () => {
  it('returns an empty array when hit is undefined', () => {
    expect(getTimelineFieldsDataFromHit(undefined as unknown as SearchHit<EventHit>)).toEqual([]);
  });

  it('merges hit metadata into the fields map', () => {
    const result = getTimelineFieldsDataFromHit({
      fields: {
        'host.name': ['host-a'],
      },
      _id: 'alert-123',
    } as unknown as SearchHit<EventHit>);

    expect(result).toEqual(
      expect.arrayContaining<TimelineEventsDetailsItem>([
        expect.objectContaining({
          field: 'host.name',
          values: ['host-a'],
        }),
        expect.objectContaining({
          field: '_id',
          values: ['alert-123'],
        }),
      ])
    );
  });

  it('adds the enrichment parent field from _source when missing from fields', () => {
    const result = getTimelineFieldsDataFromHit({
      fields: {
        'threat.enrichments.matched.field': ['myhash.mysha256'],
      },
      _source: {
        threat: {
          enrichments: [
            {
              indicator: { type: 'file' },
              matched: { field: 'myhash.mysha256' },
            },
          ],
        },
      },
    } as unknown as SearchHit<EventHit>);

    expect(result.some((item) => item.field === ENRICHMENT_DESTINATION_PATH)).toBe(true);
  });
});
