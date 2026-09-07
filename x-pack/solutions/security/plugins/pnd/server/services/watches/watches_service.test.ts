/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SYSTEM_SECURITY_WATCH_FLOOR_ID } from '@kbn/pnd-common';
import { WatchesService } from './watches_service';

const FLOOR = SYSTEM_SECURITY_WATCH_FLOOR_ID;
const SPACE = 'default';

describe('WatchesService', () => {
  describe('list', () => {
    it('projects catalog groupings without Watch settings or runtime data', async () => {
      const floor = (await new WatchesService().list(SPACE)).watches.find(({ id }) => id === FLOOR);

      expect(floor).toEqual(
        expect.objectContaining({
          id: FLOOR,
          name: 'Watch Floor',
          enabled: false,
          mandate: '',
          description: '',
          skills: [],
          coverage: [],
          scopes: [],
          recentRuns: [],
          metrics: { lastRun: null },
        })
      );
      expect(floor?.schedule.set).toBe(false);
      expect(floor).not.toHaveProperty('settings');
    });
  });

  describe('get', () => {
    it('returns only the catalog Watch', async () => {
      const body = await new WatchesService().get(FLOOR, SPACE);

      expect(body).toEqual({
        watch: expect.objectContaining({ id: FLOOR, name: 'Watch Floor' }),
      });
      expect(body).not.toHaveProperty('settings');
      expect(body).not.toHaveProperty('settingsRevision');
    });

    it('returns undefined for an unknown Watch', async () => {
      expect(await new WatchesService().get('nope', SPACE)).toBeUndefined();
    });
  });
});
