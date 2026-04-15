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
import { test as base, createLazyPageObject } from '@kbn/scout-oblt';
import { FunctionsPage } from './page_objects/functions';
import { DifferentialFunctionsPage } from './page_objects/differential_functions';
import { ProfilingStorageExplorerPage } from './page_objects/storage_explorer';
import { ProfilingSettingsPage } from './page_objects/settings';
import { ProfilingHomePage } from './page_objects/home';
import { FlamegraphPage } from './page_objects/flamegraph';

export interface ExtendedScoutTestFixtures extends ObltTestFixtures {
  pageObjects: ObltPageObjects & {
    functionsPage: FunctionsPage;
    differentialFunctionsPage: DifferentialFunctionsPage;
    profilingStorageExplorerPage: ProfilingStorageExplorerPage;
    profilingSettingsPage: ProfilingSettingsPage;
    profilingHomePage: ProfilingHomePage;
    flamegraphPage: FlamegraphPage;
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
      functionsPage: createLazyPageObject(FunctionsPage, page, kbnUrl),
      differentialFunctionsPage: createLazyPageObject(DifferentialFunctionsPage, page, kbnUrl),
      profilingStorageExplorerPage: createLazyPageObject(
        ProfilingStorageExplorerPage,
        page,
        kbnUrl
      ),
      profilingSettingsPage: createLazyPageObject(ProfilingSettingsPage, page, kbnUrl),
      profilingHomePage: createLazyPageObject(ProfilingHomePage, page, kbnUrl),
      flamegraphPage: createLazyPageObject(FlamegraphPage, page, kbnUrl),
    };

    await use(extendedPageObjects);
  },
});

export * as testData from '../../common/fixtures/constants';
export const EXTENDED_TIMEOUT = 45000 as const;
