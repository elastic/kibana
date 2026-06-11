/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import type { IRouter, Logger, CoreSetup } from '@kbn/core/server';
import { API_RUN } from '../../common';
import { generateWorkflowYamls } from '../lib/workflow_templates';

const WORKFLOWS_API_VERSION = '2023-10-31';

const internalFetch = async (
  request: any,
  coreStart: any,
  method: 'GET' | 'POST',
  path: string,
  body?: object
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
  if (method === 'POST') {
    headers['Content-Type'] = 'application/json';
  }

  const opts: RequestInit = { method, headers };
  if (body) {
    opts.body = JSON.stringify(body);
  }

  return fetch(url, opts);
};

export const registerRunWorkflowRoute = (
  router: IRouter,
  core: CoreSetup,
  logger: Logger
): void => {
  router.versioned
    .post({
      access: 'internal',
      path: API_RUN,
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
            body: schema.object({
              base_url: schema.string(),
            }),
          },
        },
      },
      async (context, request, response) => {
        const { base_url: baseUrl } = request.body;

        try {
          const [coreStart] = await core.getStartServices();

          const { runId, mainName, childNames, yamls } = generateWorkflowYamls(baseUrl);

          const createdIds: Record<string, string> = {};

          for (const childName of childNames) {
            const res = await internalFetch(request, coreStart, 'POST', '/api/workflows/workflow', {
              yaml: yamls[childName],
              id: childName,
            });

            if (!res.ok) {
              const errorText = await res.text();
              logger.error(
                `Failed to create child workflow ${childName}: ${res.status} ${errorText}`
              );
              return response.customError({
                statusCode: res.status,
                body: { message: `Failed to create workflow '${childName}': ${errorText}` },
              });
            }

            const data = await res.json();
            createdIds[childName] = data.id ?? childName;
            logger.info(
              `Created child workflow: ${childName}, valid=${data.valid}, enabled=${data.enabled}`
            );
          }

          logger.info(`Main workflow YAML:\n${yamls[mainName]}`);

          const mainRes = await internalFetch(request, coreStart, 'POST', '/api/workflows/workflow', {
            yaml: yamls[mainName],
            id: mainName,
          });

          if (!mainRes.ok) {
            const errorText = await mainRes.text();
            logger.error(`Failed to create main workflow: ${mainRes.status} ${errorText}`);
            return response.customError({
              statusCode: mainRes.status,
              body: { message: `Failed to create main workflow: ${errorText}` },
            });
          }

          const mainData = await mainRes.json();
          createdIds[mainName] = mainData.id ?? mainName;
          logger.info(
            `Created main workflow: ${mainName}, valid=${mainData.valid}, enabled=${mainData.enabled}`
          );

          if (!mainData.valid) {
            logger.error(
              `Main workflow is invalid. Response: ${JSON.stringify(mainData, null, 2)}`
            );
            return response.customError({
              statusCode: 400,
              body: {
                message: `Workflow was created but is invalid. Check the YAML definition for errors.`,
              },
            });
          }

          const runRes = await internalFetch(
            request,
            coreStart,
            'POST',
            `/api/workflows/workflow/${mainName}/run`,
            { inputs: {} }
          );

          if (!runRes.ok) {
            const errorText = await runRes.text();
            logger.error(`Failed to run workflow: ${runRes.status} ${errorText}`);
            return response.customError({
              statusCode: runRes.status,
              body: { message: `Failed to run workflow: ${errorText}` },
            });
          }

          const runData = await runRes.json();
          const executionIdValue = runData.workflowExecutionId ?? 'unknown';
          logger.info(`Started execution: ${executionIdValue} (run_id: ${runId})`);

          return response.ok({
            body: {
              workflow_ids: createdIds,
              execution_id: executionIdValue,
              main_workflow_id: mainName,
              run_id: runId,
            },
          });
        } catch (err) {
          logger.error(`Sequent workflow deploy failed: ${err}`);
          return response.customError({
            statusCode: 500,
            body: { message: `Workflow deploy failed: ${String(err)}` },
          });
        }
      }
    );
};
