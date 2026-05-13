/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { timelineEventsAllSchema } from './events_all';
import { mockBaseTimelineRequest } from './mocks/base_timeline_request';

const mockEventsAllRequest = {
  ...mockBaseTimelineRequest,
  factoryQueryType: 'eventsAll',
  excludeEcsData: false,
  pagination: { activePage: 0, querySize: 25 },
  fieldRequested: [
    '@timestamp',
    '_index',
    'message',
    'host.name',
    'event.module',
    'agent.type',
    'event.dataset',
    'event.action',
    'user.name',
    'source.ip',
    'destination.ip',
  ],
  sort: [
    {
      field: '@timestamp',
      type: 'date',
      direction: 'desc',
      esTypes: [],
    },
  ],
  fields: [],
  language: 'kuery',
};

describe('timelineEventsAllSchema', () => {
  it('should correctly parse the events request object', () => {
    expect(timelineEventsAllSchema.parse(mockEventsAllRequest)).toEqual(mockEventsAllRequest);
  });

  it('should correctly parse the events request object and remove unknown fields', () => {
    const invalidEventsRequest = {
      ...mockEventsAllRequest,
      unknownField: 'shouldBeRemoved',
    };
    expect(timelineEventsAllSchema.parse(invalidEventsRequest)).toEqual(mockEventsAllRequest);
  });

  it('should correctly error if an incorrect field type is provided for a schema key', () => {
    const invalidEventsRequest = {
      ...mockEventsAllRequest,
      excludeEcsData: 'notABoolean',
    };

    expect(() => {
      timelineEventsAllSchema.parse(invalidEventsRequest);
    }).toThrowErrorMatchingInlineSnapshot(`
      "[
        {
          \\"code\\": \\"invalid_type\\",
          \\"expected\\": \\"boolean\\",
          \\"received\\": \\"string\\",
          \\"path\\": [
            \\"excludeEcsData\\"
          ],
          \\"message\\": \\"Expected boolean, received string\\"
        }
      ]"
    `);
  });
});
