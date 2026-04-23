/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FakeRawRequest } from '@kbn/core-http-server';
import type { IScopedClusterClient } from '@kbn/core-elasticsearch-server';
import { kibanaRequestFactory } from '@kbn/core-http-server-utils';
import { addSpaceIdToPath } from '@kbn/spaces-plugin/server';
import type { HttpServiceSetup, Logger } from '@kbn/core/server';
import type { WorkflowsExtensionsServerPluginStart } from '@kbn/workflows-extensions/server';
import type { SecurityAlertsCreatedEvent } from '../../../common/workflows/triggers';
import { SECURITY_ALERTS_CREATED_TRIGGER_ID } from '../../../common/workflows/triggers';

export type EmitAlertsCreatedEvent = (params: {
  spaceId: string;
  event: SecurityAlertsCreatedEvent;
  scopedClusterClient: IScopedClusterClient;
}) => Promise<void>;

/**
 * Creates a base64-encoded API key using the rule executor's scoped ES client.
 * The scoped client authenticates as the rule creator (e.g. elastic), so the
 * resulting key inherits that user's full privileges (actions, indices, etc.).
 */
const createWorkflowApiKey = async (
  scopedClusterClient: IScopedClusterClient,
  logger: Logger
): Promise<string | undefined> => {
  try {
    const result = await scopedClusterClient.asCurrentUser.security.createApiKey({
      name: 'security-solution-workflow-events',
      role_descriptors: {},
      metadata: { managed: true, description: 'API key for scheduling workflow event executions' },
    });
    return Buffer.from(`${result.id}:${result.api_key}`).toString('base64');
  } catch (err) {
    logger.warn(
      `Failed to create API key for workflow events: ${
        err instanceof Error ? err.message : String(err)
      }`
    );
    return undefined;
  }
};

export const createEmitAlertsCreatedEvent = ({
  getWorkflowsExtensionsStart,
  http,
  logger,
}: {
  getWorkflowsExtensionsStart: () => Promise<WorkflowsExtensionsServerPluginStart | undefined>;
  http: HttpServiceSetup;
  logger: Logger;
}): EmitAlertsCreatedEvent => {
  let cachedApiKey: string | undefined;

  return async ({ spaceId, event, scopedClusterClient }) => {
    try {
      const workflowsExtensions = await getWorkflowsExtensionsStart();
      if (!workflowsExtensions) {
        return;
      }

      if (!cachedApiKey) {
        cachedApiKey = await createWorkflowApiKey(scopedClusterClient, logger);
      }

      const path = addSpaceIdToPath('/', spaceId);
      const headers: Record<string, string> = {};
      if (cachedApiKey) {
        headers.authorization = `ApiKey ${cachedApiKey}`;
      }
      const fakeRawRequest: FakeRawRequest = {
        headers,
        path,
        url: new URL(`https://fake-request${path}`),
      };
      const fakeRequest = kibanaRequestFactory(fakeRawRequest);
      http.basePath.set(fakeRequest, path);

      await workflowsExtensions.emitEvent({
        triggerId: SECURITY_ALERTS_CREATED_TRIGGER_ID,
        spaceId,
        payload: event as unknown as Record<string, unknown>,
        request: fakeRequest,
      });
    } catch (err) {
      logger.warn(
        `Failed to emit ${SECURITY_ALERTS_CREATED_TRIGGER_ID} workflow event: ${
          err instanceof Error ? err.message : String(err)
        }`
      );
    }
  };
};
