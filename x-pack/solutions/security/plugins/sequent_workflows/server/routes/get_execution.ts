/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter, Logger, CoreSetup } from '@kbn/core/server';
import { API_EXECUTION_STATUS } from '../../common';
import { apiKeyStore } from './run_workflow_v2';

const WORKFLOWS_API_VERSION = '2023-10-31';

const internalFetch = async (
  request: any,
  coreStart: any,
  method: 'GET' | 'POST',
  path: string
) => {
  const { port, protocol, hostname } = coreStart.http.getServerInfo();
  const kibanaUrl = `${protocol}://${hostname}:${port}`;
  const basePath = coreStart.http.basePath.serverBasePath;
  const url = `${kibanaUrl}${basePath}${path}`;

  const cookieHeader = request.headers.cookie;
  const authHeader = request.headers.authorization;

  const headers: Record<string, string> = {
    'kbn-xsrf': 'true',
    'elastic-api-version': WORKFLOWS_API_VERSION,
  };

  if (cookieHeader) {
    headers.cookie = cookieHeader as string;
  }
  if (authHeader) {
    headers.authorization = authHeader as string;
  }

  return fetch(url, { method, headers });
};

export const registerGetExecutionRoute = (
  router: IRouter,
  core: CoreSetup,
  logger: Logger
): void => {
  router.versioned
    .get({
      access: 'internal',
      path: `${API_EXECUTION_STATUS}/{workflowId}`,
      security: {
        authz: {
          requiredPrivileges: ['sequentWorkflows'],
        },
      },
    })
    .addVersion(
      {
        version: '1',
        validate: {
          request: {
            params: schema.object({
              workflowId: schema.string(),
            }),
          },
        },
      },
      async (context, request, response) => {
        const { workflowId } = request.params;

        try {
          const [coreStart] = await core.getStartServices();

          const execRes = await internalFetch(
            request,
            coreStart,
            'GET',
            `/api/workflows/workflow/${workflowId}/executions?size=1`
          );

          if (!execRes.ok) {
            const errorText = await execRes.text();
            logger.error(
              `Failed to get executions for ${workflowId}: ${execRes.status} ${errorText}`
            );
            return response.customError({
              statusCode: execRes.status,
              body: { message: `Failed to get executions: ${errorText}` },
            });
          }

          const execData = await execRes.json();
          logger.debug(
            `Executions for ${workflowId}: ${JSON.stringify(execData).substring(0, 500)}`
          );

          const stepsRes = await internalFetch(
            request,
            coreStart,
            'GET',
            `/api/workflows/workflow/${workflowId}/executions/steps?includeOutput=true&size=100`
          );

          let stepsData = null;
          if (stepsRes.ok) {
            stepsData = await stepsRes.json();
            logger.debug(
              `Steps for ${workflowId}: ${JSON.stringify(stepsData).substring(0, 500)}`
            );
          } else {
            const stepsError = await stepsRes.text();
            logger.warn(`Steps fetch failed for ${workflowId}: ${stepsRes.status} ${stepsError}`);
          }

          const TERMINAL_STATUSES = new Set([
            'completed',
            'failed',
            'cancelled',
            'timed_out',
          ]);
          const latestExec = execData?.results?.[0];
          if (latestExec && TERMINAL_STATUSES.has(latestExec.status) && apiKeyStore.has(workflowId)) {
            const keyInfo = apiKeyStore.get(workflowId)!;

            let allChildrenTerminal = true;
            for (const childId of keyInfo.childWorkflowIds) {
              try {
                const childRes = await internalFetch(
                  request,
                  coreStart,
                  'GET',
                  `/api/workflows/workflow/${childId}/executions?size=1`
                );
                if (childRes.ok) {
                  const childData = await childRes.json();
                  const childExec = childData?.results?.[0];
                  if (childExec && !TERMINAL_STATUSES.has(childExec.status)) {
                    allChildrenTerminal = false;
                    break;
                  }
                }
              } catch (childErr) {
                logger.debug(`Could not check child workflow ${childId}: ${childErr}`);
              }
            }

            if (allChildrenTerminal) {
              apiKeyStore.delete(workflowId);
              try {
                await coreStart.security.authc.apiKeys.invalidateAsInternalUser({
                  ids: [keyInfo.apiKeyId],
                });
                logger.info(
                  `Invalidated API key ${keyInfo.apiKeyId} for completed workflow ${workflowId}`
                );
              } catch (keyErr) {
                logger.warn(`Failed to invalidate API key ${keyInfo.apiKeyId}: ${keyErr}`);
              }
            }
          }

          return response.ok({
            body: {
              executions: execData,
              steps: stepsData,
            },
          });
        } catch (err) {
          logger.error(`Failed to get execution status: ${err}`);
          return response.customError({
            statusCode: 500,
            body: { message: `Failed to get execution status: ${String(err)}` },
          });
        }
      }
    );
};
