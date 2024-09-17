/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../../ftr_provider_context';

type PageObjects = Pick<ReturnType<FtrProviderContext['getPageObjects']>, 'embeddedConsole'>;

export async function testHasEmbeddedConsole(pageObjects: PageObjects) {
  await pageObjects.embeddedConsole.expectEmbeddedConsoleControlBarExists();
  await pageObjects.embeddedConsole.expectEmbeddedConsoleToBeClosed();
  await pageObjects.embeddedConsole.clickEmbeddedConsoleControlBar();
  await pageObjects.embeddedConsole.expectEmbeddedConsoleToBeOpen();
  await pageObjects.embeddedConsole.clickEmbeddedConsoleControlBar();
  await pageObjects.embeddedConsole.expectEmbeddedConsoleToBeClosed();
}
