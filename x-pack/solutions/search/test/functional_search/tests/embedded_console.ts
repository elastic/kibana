/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../ftr_provider_context';

type PageObjects = Pick<ReturnType<FtrProviderContext['getPageObjects']>, 'embeddedConsole'>;

/**
 * FTR → Scout migration note: this whole flow is already migrated. Use the
 * shared `pageObjects.embeddedConsole` fixture from `@kbn/scout` (methods
 * `controlBar`, `body`, `fullscreenToggle`, `toggle()`); see
 * `x-pack/platform/plugins/shared/ingest_pipelines/test/scout/ui/tests/feature_controls.spec.ts`.
 * When migrating this suite to Scout, drop this helper and consume that fixture
 * instead of re-porting it.
 */
export async function testHasEmbeddedConsole(pageObjects: PageObjects) {
  await pageObjects.embeddedConsole.expectEmbeddedConsoleControlBarExists();
  await pageObjects.embeddedConsole.expectEmbeddedConsoleToBeClosed();
  await pageObjects.embeddedConsole.clickEmbeddedConsoleControlBar();
  await pageObjects.embeddedConsole.expectEmbeddedConsoleHaveFullscreenToggle();
  await pageObjects.embeddedConsole.expectEmbeddedConsoleToBeOpen();
  await pageObjects.embeddedConsole.clickEmbeddedConsoleControlBar();
  await pageObjects.embeddedConsole.expectEmbeddedConsoleToBeClosed();
}
