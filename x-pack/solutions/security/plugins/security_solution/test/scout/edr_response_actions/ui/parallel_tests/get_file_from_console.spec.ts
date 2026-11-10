/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kibanaPackageJson } from '@kbn/repo-info';
import { expect } from '@kbn/scout-security/ui';
import type { ActionDetails } from '../../../../../common/endpoint/types';
import { spaceTest, tags } from '../fixtures';
import { captureEndpointAction } from '../fixtures/page_objects/host_isolation_form';
import { seedEndpointHosts, type SeededEndpointHosts } from '../../common/seed_endpoint_hosts';
import { completeHostAction } from '../../common/complete_host_action';
import {
  cleanupGetFileSpec,
  PARALLEL_HOST_SEED_TIMEOUT_MS,
  requireHost,
} from '../../common/get_file_spec_helpers';

spaceTest.describe(
  'Response console get-file from the endpoint list',
  { tag: tags.stateful.classic },
  () => {
    let seeded: SeededEndpointHosts | undefined;
    const submittedActions: ActionDetails[] = [];

    spaceTest.beforeAll(async ({ esClient, kbnClient, scoutSpace, config }) => {
      spaceTest.setTimeout(PARALLEL_HOST_SEED_TIMEOUT_MS);
      await scoutSpace.setSolutionView('security');
      seeded = await seedEndpointHosts({
        esClient,
        kbnClient,
        spaceId: scoutSpace.id,
        config,
        count: 1,
        isolation: false,
        // get-file needs an agent of 8.6 or later; the Cypress loader also pins the stack version.
        agentVersion: kibanaPackageJson.version,
      });
    });

    spaceTest.beforeEach(async ({ browserAuth }) => {
      // Has file_operations_all, which the download link requires. Same default as Cypress.
      await browserAuth.loginAsSecurityRole('endpoint_operations_analyst');
    });

    spaceTest.afterAll(async ({ esClient, config }) => {
      await cleanupGetFileSpec({ esClient, config, submittedActions, seeded });
    });

    spaceTest(
      'retrieves a file and shows the download link',
      async ({ page, pageObjects, esClient, config }) => {
        const host = requireHost(seeded);
        const { endpointList, responseConsole } = pageObjects;

        await spaceTest.step('open the response console from the endpoint list', async () => {
          await endpointList.goto();
          await expect(endpointList.rowFor(host.hostname)).toBeVisible();
          await endpointList.openResponder(host.hostname);
          await expect(responseConsole.overlay).toBeVisible();
        });

        const action = await spaceTest.step('submit get-file and see it pending', async () => {
          await responseConsole.enterCommand('get-file --path /test/path/test.txt');
          const submitted = await captureEndpointAction(page, 'get_file', () =>
            responseConsole.submitCommand()
          );
          submittedActions.push(submitted);
          await expect(responseConsole.getFilePendingHostStatus).toHaveText('get-file is pending');
          return submitted;
        });

        await spaceTest.step('the agent response completes the action', async () => {
          // Pass the POST response: its agentState is still pending, so a response is written.
          await completeHostAction({ esClient, config, action });
          await expect(responseConsole.getFileSuccessHostStatus).toHaveText(
            'get-file completed successfully'
          );
        });

        await spaceTest.step('the result shows the download link and file notes', async () => {
          await expect(responseConsole.getFileDownloadButton).toBeVisible();
          await expect(responseConsole.getFileDownloadButton).toHaveText('Click here to download');
          await expect(responseConsole.getFilePasscodeMessage).toHaveText(
            '(ZIP file passcode: elastic).'
          );
          await expect(responseConsole.getFileDeleteMessage).toHaveText(
            'Files are periodically deleted to clear storage space. Download and save file locally if needed.'
          );
        });

        await spaceTest.step('the download link serves the uploaded file', async () => {
          // A real browser download through the link: it goes through the space base path, the
          // session cookie and ?apiVersion, which the API spec (default space, API key, version
          // header) does not exercise. Arm the listener before the click so the event is not missed.
          const downloadPromise = page.waitForEvent('download');
          await responseConsole.getFileDownloadButton.click();
          const download = await downloadPromise;
          expect(await download.failure()).toBeNull();
          expect(download.suggestedFilename()).toBe('upload.zip');
        });
      }
    );
  }
);
