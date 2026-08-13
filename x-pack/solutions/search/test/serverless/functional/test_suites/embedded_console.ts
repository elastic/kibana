/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FtrProviderContext } from '../ftr_provider_context';

type PageObjects = Pick<ReturnType<FtrProviderContext['getPageObjects']>, 'embeddedConsole'>;

/**
 * FTR → Scout migration note: this whole flow is already migrated. Reuse the
 * `EmbeddedConsole` page object owned by the console plugin
 * (`@kbn/console-plugin/test/scout/ui/fixtures/page_objects`; members
 * `controlBar`, `body`, `fullscreenToggle`, `toggle()`) by registering it on the
 * suite's own `pageObjects` fixture (see the "reusing a page object from another
 * plugin" pattern in the `@kbn/scout` README); example:
 * `x-pack/platform/plugins/shared/ingest_pipelines/test/scout/ui/tests/feature_controls.spec.ts`.
 * When migrating this suite to Scout, drop this helper and consume that page
 * object instead of re-porting it.
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
