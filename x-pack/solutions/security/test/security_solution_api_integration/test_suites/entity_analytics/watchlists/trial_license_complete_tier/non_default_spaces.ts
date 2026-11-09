/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { v4 as uuidv4 } from 'uuid';
import type { WatchlistObject } from '@kbn/security-solution-plugin/common/api/entity_analytics/watchlists/management/common.gen';
import type { FtrProviderContext } from '../../../../ftr_provider_context';
import { cleanUpWatchlists, watchlistRouteHelpersFactory } from '../../utils';

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');
  const spaces = getService('spaces');

  describe('@ess @serverless @skipInServerlessMKI Watchlists in non-default spaces', () => {
    const spaceId = `wl-space-${uuidv4().slice(0, 8)}`;
    const defaultSpaceRoutes = watchlistRouteHelpersFactory(supertest);
    const customSpaceRoutes = watchlistRouteHelpersFactory(supertest, spaceId);

    before(async () => {
      await spaces.create({ id: spaceId, name: spaceId, disabledFeatures: [] });
    });

    afterEach(async () => {
      await cleanUpWatchlists(defaultSpaceRoutes);
      await cleanUpWatchlists(customSpaceRoutes);
    });

    after(async () => {
      await spaces.delete(spaceId);
    });

    it('lists only the watchlists that belong to the requested space', async () => {
      const suffix = uuidv4().slice(0, 8);
      const defaultName = `default-space-watchlist-${suffix}`;
      const customName = `custom-space-watchlist-${suffix}`;

      await defaultSpaceRoutes.create({ name: defaultName, riskModifier: 1.2 });
      await customSpaceRoutes.create({ name: customName, riskModifier: 1.4 });

      const defaultNames = (await defaultSpaceRoutes.list()).body.map(
        ({ name }: WatchlistObject) => name
      );
      const customNames = (await customSpaceRoutes.list()).body.map(
        ({ name }: WatchlistObject) => name
      );

      expect(defaultNames).toContain(defaultName);
      expect(defaultNames).not.toContain(customName);
      expect(customNames).toContain(customName);
      expect(customNames).not.toContain(defaultName);
    });
  });
};
