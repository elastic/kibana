/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { v4 as uuidv4 } from 'uuid';
import type { FtrProviderContext } from '../../../../ftr_provider_context';
import { EntityStoreUtils, watchlistRouteHelpersFactory } from '../../utils';

export default ({ getService }: FtrProviderContext) => {
  const es = getService('es');
  const supertest = getService('supertest');
  const retry = getService('retry');
  const spaces = getService('spaces');

  describe('@ess Entity Analytics - Watchlist backing index in a new space', () => {
    const namespace = `watchlist-index-${uuidv4().slice(0, 8)}`;
    const watchlistIndex = `.entity_analytics.watchlists.${namespace}`;
    const entityStoreUtils = EntityStoreUtils(getService, namespace);
    const watchlistRoutes = watchlistRouteHelpersFactory(supertest, namespace);

    before(async () => {
      await spaces.create({ id: namespace, name: namespace, disabledFeatures: [] });
    });

    after(async () => {
      await entityStoreUtils.cleanEngines();
      await spaces.delete(namespace);
      await es.indices.delete(
        { index: watchlistIndex, expand_wildcards: 'all' },
        { ignore: [404] }
      );
    });

    it('can create and delete a watchlist before the Entity Store is installed in the space', async () => {
      const { body: watchlist } = await watchlistRoutes.create({
        name: 'new-space-no-entity-store',
        riskModifier: 1,
      });

      await watchlistRoutes.delete(watchlist.id as string);
    });

    it('creates the watchlist index once the Entity Store is installed in a space created after startup', async () => {
      expect(await es.indices.exists({ index: watchlistIndex })).to.be(false);

      await entityStoreUtils.installEntityStoreV2({
        entityTypes: ['user'],
        waitForEntities: false,
        // The watchlist maintainer is what creates the index, so it must keep running.
        stopMaintainerAfterInstall: false,
      });

      await retry.waitForWithTimeout(`${watchlistIndex} to be created`, 60_000, async () =>
        es.indices.exists({ index: watchlistIndex })
      );
    });
  });
};
