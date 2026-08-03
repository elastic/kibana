/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { timelineEventsDetailsSchema } from './events_details';

const mockEventsDetails = {
  entityType: 'events',
  indexName: 'test-large-index',
  eventId: 'enfXnY0Byt9Ce9tO1aWh',
  factoryQueryType: 'eventsDetails',
  runtimeMappings: {},
};

describe('timelineEventsDetailsSchema', () => {
  it('should correctly parse the event details request schema', () => {
    expect(timelineEventsDetailsSchema.parse(mockEventsDetails)).toEqual(mockEventsDetails);
  });

  it('should correctly parse the event details request schema and remove unknown fields', () => {
    const invalidEventsDetailsRequest = {
      ...mockEventsDetails,
      unknownField: 'should-be-removed',
    };
    expect(timelineEventsDetailsSchema.parse(invalidEventsDetailsRequest)).toEqual(
      mockEventsDetails
    );
  });

  it('should correctly error if an incorrect field type is provided for a schema key', () => {
    const invalidEventsDetailsRequest = {
      ...mockEventsDetails,
      indexName: 123,
    };

    expect(() => {
      timelineEventsDetailsSchema.parse(invalidEventsDetailsRequest);
    }).toThrowErrorMatchingInlineSnapshot(`
      "[
        {
          \\"code\\": \\"invalid_type\\",
          \\"expected\\": \\"string\\",
          \\"received\\": \\"number\\",
          \\"path\\": [
            \\"indexName\\"
          ],
          \\"message\\": \\"Expected string, received number\\"
        }
      ]"
    `);
  });
});
