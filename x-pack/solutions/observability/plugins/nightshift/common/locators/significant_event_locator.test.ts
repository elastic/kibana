/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  NIGHTSHIFT_APP_ID,
  NIGHTSHIFT_SIGNIFICANT_EVENT_LOCATOR_ID,
} from '@kbn/deeplinks-observability';
import {
  NIGHTSHIFT_EVENT_ID_QUERY_PARAM,
  SignificantEventLocatorDefinition,
} from './significant_event_locator';

describe('SignificantEventLocatorDefinition', () => {
  const locator = new SignificantEventLocatorDefinition();

  it('has the shared locator id', () => {
    expect(locator.id).toBe(NIGHTSHIFT_SIGNIFICANT_EVENT_LOCATOR_ID);
  });

  it('links to the events page with the event id, which opens its flyout', async () => {
    await expect(locator.getLocation({ eventId: 'evt-001' })).resolves.toEqual({
      app: NIGHTSHIFT_APP_ID,
      path: `/detections/events?${NIGHTSHIFT_EVENT_ID_QUERY_PARAM}=evt-001`,
      state: {},
    });
  });

  it('encodes the event id', async () => {
    await expect(locator.getLocation({ eventId: 'a&b=c' })).resolves.toEqual({
      app: NIGHTSHIFT_APP_ID,
      path: `/detections/events?${NIGHTSHIFT_EVENT_ID_QUERY_PARAM}=a%26b%3Dc`,
      state: {},
    });
  });
});
