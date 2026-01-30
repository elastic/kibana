/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import fs from 'node:fs';
import path from 'node:path';
import { test } from './fixtures/base_page';
import { assertEnv } from '../lib/assert_env';

test.beforeEach(async ({ page }) => {
  await page.goto(`${process.env.KIBANA_BASE_URL}/app/fleet/agents`);
});

test('Fleet Elastic Agent enrollment flow', async ({ page, fleetAgentsOverviewPage }) => {
  assertEnv(process.env.ARTIFACTS_FOLDER, 'ARTIFACTS_FOLDER is not defined.');
  assertEnv(process.env.PLATFORM, "PLATFORM (ex. 'Linux x86_64') is not defined.");

  const fileName = 'code_snippet_agent_enrollment.sh';
  const outputPath = path.join(__dirname, '..', process.env.ARTIFACTS_FOLDER, fileName);
  const testNodePlatform = process.env.PLATFORM;

  await fleetAgentsOverviewPage.clickAddAgentCTA();

  /**
   * createNewAgentPolicyLink only exists if there are prior existing agent policies,
   * clicking it will give us the createPolicyButton to create a new agent policy.
   * We would expect first runs of this test in new environments to have no prior agent policies.
   * For second run retries in the same environment, we click the link to allow for new agent policy creation.
   */

  await fleetAgentsOverviewPage.maybeClickCreateNewAgentPolicyLink();

  await fleetAgentsOverviewPage.clickCreatePolicyButton();

  await fleetAgentsOverviewPage.assertAgentPolicyCreated();

  await fleetAgentsOverviewPage.selectEnrollInFleet();

  await fleetAgentsOverviewPage.assertVisibilityCodeBlock();

  await fleetAgentsOverviewPage.clickCodeBlockPlatformSelectorButton();

  await fleetAgentsOverviewPage.selectPlatform(testNodePlatform);

  await fleetAgentsOverviewPage.copyToClipboard();

  const clipboardData = (await page.evaluate('navigator.clipboard.readText()')) as string;

  const nonInteractiveFlag = ' -n';
  fs.writeFileSync(outputPath, clipboardData + nonInteractiveFlag);

  await fleetAgentsOverviewPage.assertAgentEnrolled();
  await fleetAgentsOverviewPage.assertIncomingDataConfirmed();
});
