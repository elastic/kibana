/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

type PageObjects = Pick<ReturnType<FtrProviderContext['getPageObjects']>, 'svlCommonNavigation'>;

export async function testHasEmbeddedConsole(pageObjects: PageObjects) {
  await pageObjects.svlCommonNavigation.devConsole.expectEmbeddedConsoleControlBarExists();
  await pageObjects.svlCommonNavigation.devConsole.expectEmbeddedConsoleToBeClosed();
  await pageObjects.svlCommonNavigation.devConsole.clickEmbeddedConsoleControlBar();
  await pageObjects.svlCommonNavigation.devConsole.expectEmbeddedConsoleToBeOpen();
  await pageObjects.svlCommonNavigation.devConsole.clickEmbeddedConsoleControlBar();
  await pageObjects.svlCommonNavigation.devConsole.expectEmbeddedConsoleToBeClosed();
}
