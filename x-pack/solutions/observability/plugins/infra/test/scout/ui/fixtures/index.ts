/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  ObltPageObjects,
  ObltTestFixtures,
  ObltWorkerFixtures,
  ObltApiServicesFixture,
} from '@kbn/scout-oblt';
import {
  test as base,
  createLazyPageObject,
  globalSetupHook as baseGlobalSetupHook,
  getSynthtraceClient,
} from '@kbn/scout-oblt';
import type { InfraDocument, SynthtraceGenerator } from '@kbn/synthtrace-client';
import { Readable } from 'stream';
import { InventoryPage } from './page_objects/inventory';
import { AssetDetailsPage } from './page_objects/asset_details/asset_details';
import { getInventoryViewsApiService, type InventoryViewApiService } from './apis/inventory_views';
import { NodeDetailsPage } from './page_objects/node_details/node_details';
import { SavedViews } from './page_objects/saved_views';

export interface ExtendedScoutTestFixtures extends ObltTestFixtures {
  pageObjects: ObltPageObjects & {
    inventoryPage: InventoryPage;
    assetDetailsPage: AssetDetailsPage;
    nodeDetailsPage: NodeDetailsPage;
    savedViews: SavedViews;
  };
}

export interface ExtendedScoutWorkerFixtures extends ObltWorkerFixtures {
  apiServices: ObltApiServicesFixture & {
    inventoryViews: InventoryViewApiService;
    nodeDetailsPage: NodeDetailsPage;
  };
}

export const test = base.extend<ExtendedScoutTestFixtures, ExtendedScoutWorkerFixtures>({
  pageObjects: async (
    { pageObjects, page, kbnUrl },
    use: (pageObjects: ExtendedScoutTestFixtures['pageObjects']) => Promise<void>
  ) => {
    const savedViews = createLazyPageObject(SavedViews, page);

    const extendedPageObjects = {
      ...pageObjects,
      inventoryPage: createLazyPageObject(InventoryPage, page, kbnUrl, savedViews),
      assetDetailsPage: createLazyPageObject(AssetDetailsPage, page, kbnUrl),
      nodeDetailsPage: createLazyPageObject(NodeDetailsPage, page, kbnUrl),
      savedViews,
    };

    await use(extendedPageObjects);
  },
  apiServices: async (
    { apiServices, kbnClient, log },
    use: (apiServices: ExtendedScoutWorkerFixtures['apiServices']) => Promise<void>
  ) => {
    const extendedApiServices: ExtendedScoutWorkerFixtures['apiServices'] = {
      ...apiServices,
      inventoryViews: getInventoryViewsApiService({
        kbnClient,
        log,
      }),
    };

    await use(extendedApiServices);
  },
});

export const globalSetupHook = baseGlobalSetupHook.extend({
  infraSynthtraceEsClient: async ({ esClient, config, kbnUrl, log }, use) => {
    const { infraEsClient } = await getSynthtraceClient(
      'infraEsClient',
      {
        esClient,
        kbnUrl: kbnUrl.get(),
        log,
        config,
      },
      // Metrics system indexes are TSDS and thus, time bound.
      // In order to have fixed dates in the tests, we need to skip the system package installation so that the TSDS configuration doesn't get applied.
      // Otherwise, time-bound indexes will reject documents outside their time range, which depends on the time the test is being ran, making them less deterministic.
      { skipInstallation: true }
    );

    const index = async (events: SynthtraceGenerator<InfraDocument>) => {
      await infraEsClient.index(Readable.from(Array.from(events)));
    };

    const clean = async () => await infraEsClient.clean();

    await use({ index, clean });
  },
});
