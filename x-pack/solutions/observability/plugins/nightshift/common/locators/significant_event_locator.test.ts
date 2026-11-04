/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { NIGHTSHIFT_APP_ID } from '@kbn/deeplinks-observability';
import { getNightshiftEventIdFromSearch } from '../../public/common/url_params';
import { SignificantEventLocatorDefinition } from './significant_event_locator';

describe('SignificantEventLocatorDefinition', () => {
  const locator = new SignificantEventLocatorDefinition();

  it('links to the events page with the event id', async () => {
    await expect(locator.getLocation({ eventId: 'evt-1' })).resolves.toEqual({
      app: NIGHTSHIFT_APP_ID,
      path: '/detections/events?eventId=evt-1',
      state: {},
    });
  });

  it.each(['a&b', 'a=b', 'a#b', 'a%b', 'a+b', 'a/b', 'a b', 'a%20b'])(
    'round-trips the id %p through the page param reader',
    async (eventId) => {
      const { path } = await locator.getLocation({ eventId });
      const [, search] = path.split('?');

      expect(getNightshiftEventIdFromSearch(search)).toBe(eventId);
    }
  );
});
