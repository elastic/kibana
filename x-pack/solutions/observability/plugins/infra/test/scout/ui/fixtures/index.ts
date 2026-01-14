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
  KibanaUrl,
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

export interface ExtendedScoutTestFixtures extends ObltTestFixtures {
  pageObjects: ObltPageObjects & {
    inventoryPage: InventoryPage;
  };
}

export const test = base.extend<ExtendedScoutTestFixtures, ObltWorkerFixtures>({
  pageObjects: async (
    {
      pageObjects,
      page,
      kbnUrl,
    }: {
      pageObjects: ExtendedScoutTestFixtures['pageObjects'];
      page: ExtendedScoutTestFixtures['page'];
      kbnUrl: KibanaUrl;
    },
    use: (pageObjects: ExtendedScoutTestFixtures['pageObjects']) => Promise<void>
  ) => {
    const extendedPageObjects = {
      ...pageObjects,
      inventoryPage: createLazyPageObject(InventoryPage, page, kbnUrl),
    };

    await use(extendedPageObjects);
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
