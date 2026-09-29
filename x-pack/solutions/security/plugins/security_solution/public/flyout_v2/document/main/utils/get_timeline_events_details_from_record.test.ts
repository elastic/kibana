/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { vi } from 'vitest';
import type { Mock } from 'vitest';

import type { DataTableRecord } from '@kbn/discover-utils';
import { getTimelineFieldsDataFromHit } from '@kbn/timelines-plugin/common';
import { getTimelineEventsDetailsFromRecord } from './get_timeline_events_details_from_record';

vi.mock('@kbn/timelines-plugin/common', () => {
      const mocked = {
      getTimelineFieldsDataFromHit: vi.fn(),
    };
      return { ...mocked, default: mocked };
    });

describe('getTimelineEventsDetailsFromRecord', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('delegates to getTimelineFieldsDataFromHit with the raw hit so object arrays and metadata fields are formatted correctly', () => {
    const raw = {
      _id: 'test-id',
      _index: 'test-index',
      fields: {
        'host.name': ['test-host'],
        'threat.enrichments': [{ 'feed.name': ['AbuseCH malware'] }],
      },
    };
    const expected = [
      {
        category: 'host',
        field: 'host.name',
        isObjectArray: false,
        originalValue: ['test-host'],
        values: ['test-host'],
      },
    ];
    (getTimelineFieldsDataFromHit as Mock).mockReturnValue(expected);

    const hit = {
      id: 'test-id',
      raw,
      flattened: {},
      isAnchor: false,
    } as unknown as DataTableRecord;

    const result = getTimelineEventsDetailsFromRecord(hit);

    expect(getTimelineFieldsDataFromHit).toHaveBeenCalledWith(raw);
    expect(result).toBe(expected);
  });
});
