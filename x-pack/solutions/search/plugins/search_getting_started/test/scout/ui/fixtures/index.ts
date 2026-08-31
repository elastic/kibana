/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  BrowserAuthFixture,
  KibanaUrl,
  PageObjects,
  ScoutTestFixtures,
  ScoutWorkerFixtures,
} from '@kbn/scout-search';
import { test as base, createLazyPageObject } from '@kbn/scout-search';

import { EmbeddedConsole } from '@kbn/console-plugin/test/scout/ui/fixtures/page_objects';
import { GettingStarted } from './page_objects/getting_started';

export interface ExtendedScoutTestFixtures extends ScoutTestFixtures {
  pageObjects: PageObjects & {
    gettingStarted: GettingStarted;
    embeddedConsole: EmbeddedConsole;
  };
  browserAuth: BrowserAuthFixture;
}

export const test = base.extend<ExtendedScoutTestFixtures, ScoutWorkerFixtures>({
  pageObjects: async (
    {
      pageObjects,
      page,
    }: {
      pageObjects: ExtendedScoutTestFixtures['pageObjects'];
      page: ExtendedScoutTestFixtures['page'];
      kbnUrl: KibanaUrl;
    },
    use: (pageObjects: ExtendedScoutTestFixtures['pageObjects']) => Promise<void>
  ) => {
    const extendedPageObjects = {
      ...pageObjects,
      gettingStarted: createLazyPageObject(GettingStarted, page),
      embeddedConsole: createLazyPageObject(EmbeddedConsole, page),
    };
    await use(extendedPageObjects);
  },
});
