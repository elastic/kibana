/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kibanaPackageJson } from '@kbn/repo-info';
import { PUBLIC_API_HEADERS } from '@kbn/scout-security';
import { expect } from '@kbn/scout-security/api';
import {
  ACTION_AGENT_FILE_DOWNLOAD_ROUTE,
  ACTION_AGENT_FILE_INFO_ROUTE,
  GET_FILE_ROUTE,
} from '../../../../../common/endpoint/constants';
import type { ActionDetails } from '../../../../../common/endpoint/types';
import { getResponseActionsAccessRole } from '../../ui/fixtures/response_actions_access_role';
import { apiTest, tags } from '../fixtures';
import { seedEndpointHosts, type SeededEndpointHosts } from '../../common/seed_endpoint_hosts';
import {
  completeHostAction,
  deleteGetFileUploads,
  deleteSubmittedHostActions,
  getFileUploadDocIds,
} from '../../common/complete_host_action';

interface FileInfoBody {
  data: { id: string; name: string; status: string; actionId: string; agentId: string };
}

/** Every zip file starts with the local file header signature `PK\x03\x04`. */
const ZIP_SIGNATURE = Buffer.from([0x50, 0x4b, 0x03, 0x04]);

// One host seed waits up to 4 minutes for the current index and 4 for the united index.
const SEED_TIMEOUT_MS = 600_000;

const requireHost = (seeded: SeededEndpointHosts | undefined) => {
  const host = seeded?.hosts[0];
  if (!host) {
    throw new Error('Endpoint host was not seeded');
  }
  return host;
};

const fileRoute = (route: string, actionId: string, fileId: string): string =>
  route
    .replace('{action_id}', encodeURIComponent(actionId))
    .replace('{file_id}', encodeURIComponent(fileId));

apiTest.describe(
  'Endpoint get-file download',
  {
    tag: tags.stateful.classic,
  },
  () => {
    let seeded: SeededEndpointHosts | undefined;
    let headers: Record<string, string>;
    const submittedActions: ActionDetails[] = [];

    apiTest.beforeAll(async ({ esClient, kbnClient, config, requestAuth }) => {
      apiTest.setTimeout(SEED_TIMEOUT_MS);
      const { apiKeyHeader } = await requestAuth.getApiKeyForCustomRole(
        getResponseActionsAccessRole()
      );
      headers = { ...apiKeyHeader, ...PUBLIC_API_HEADERS, 'kbn-xsrf': 'scout' };

      seeded = await seedEndpointHosts({
        esClient,
        kbnClient,
        spaceId: 'default',
        config,
        count: 1,
        isolation: false,
        // get-file needs an agent of 8.6 or later; the Cypress loader also pins the stack version.
        agentVersion: kibanaPackageJson.version,
      });
    });

    apiTest.afterAll(async ({ esClient, config }) => {
      const failures: unknown[] = [];
      for (const cleanup of [
        () => deleteGetFileUploads({ esClient, config, actions: submittedActions }),
        () =>
          deleteSubmittedHostActions({
            esClient,
            config,
            actionIds: submittedActions.map((action) => action.id),
          }),
        () => seeded?.cleanup(),
      ]) {
        try {
          await cleanup();
        } catch (error) {
          failures.push(error);
        }
      }
      if (failures.length === 1) {
        throw failures[0];
      }
      if (failures.length > 1) {
        throw new AggregateError(failures, 'Failed to clean up the get-file host and its action');
      }
    });

    apiTest(
      'serves the file uploaded for a completed get-file action',
      async ({ apiClient, esClient, config }) => {
        const host = requireHost(seeded);

        const created = await apiClient.post(GET_FILE_ROUTE, {
          headers,
          responseType: 'json',
          body: {
            endpoint_ids: [host.agentId],
            parameters: { path: '/test/path/test.txt' },
          },
        });
        expect(created).toHaveStatusCode(200);
        const action = (created.body as { data: ActionDetails }).data;
        submittedActions.push(action);
        expect(action.command).toBe('get-file');
        expect(action.agents).toStrictEqual([host.agentId]);

        // Pass the POST response: its agentState is still pending, so a response and a file are written.
        await completeHostAction({ esClient, config, action });

        const [fileId] = getFileUploadDocIds(action).metadataIds;

        const fileInfo = await apiClient.get(
          fileRoute(ACTION_AGENT_FILE_INFO_ROUTE, action.id, fileId),
          { headers, responseType: 'json' }
        );
        expect(fileInfo).toHaveStatusCode(200);
        expect((fileInfo.body as FileInfoBody).data).toMatchObject({
          id: fileId,
          name: 'upload.zip',
          status: 'READY',
          actionId: action.id,
          agentId: host.agentId,
        });

        const download = await apiClient.get(
          fileRoute(ACTION_AGENT_FILE_DOWNLOAD_ROUTE, action.id, fileId),
          { headers, responseType: 'buffer' }
        );
        expect(download).toHaveStatusCode(200);
        expect(download.headers['content-disposition']).toBe('attachment; filename="upload.zip"');
        const content = download.body as Buffer;
        expect(content.length).toBeGreaterThan(ZIP_SIGNATURE.length);
        expect(content.subarray(0, ZIP_SIGNATURE.length).equals(ZIP_SIGNATURE)).toBe(true);
      }
    );
  }
);
