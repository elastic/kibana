/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { schema } from '@kbn/config-schema';
import { i18n } from '@kbn/i18n';
import { RULES_API_ALL } from '@kbn/security-solution-features/constants';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import type { KibanaRequest, Logger, StartServicesAccessor } from '@kbn/core/server';
import type { StartPlugins } from '../plugin';
import type { SecuritySolutionPluginRouter } from '../types';
import {
  AESOP_EXPLORER_AGENT_ID,
  AESOP_EXPLORER_INTERVAL_MINUTES,
  AESOP_EXPLORER_ROUTE_PATH,
  AESOP_EXPLORER_ROUTES_API_VERSION,
} from '../../common/aesop_prototype';
import { initSecurityManagedWorkflowsClient } from '../workflows/managed_workflows';
import type {
  AesopDriftMonitorEnablementApi,
  AesopDriftMonitorRequestDeps,
} from './drift_monitor_schedule';
import { enableAesopExplorer, uninstallAesopExplorer } from './explorer_schedule';

/**
 * AESOP prototype: internal routes that install and enable the explorer in the request's space.
 * The explorer is installed on demand rather than at boot because enabling it mints an API key
 * from the calling identity, which a boot-time install does not have.
 */

const REQUIRED_PRIVILEGES = [RULES_API_ALL];

const LICENSE_ERROR_MESSAGE = i18n.translate(
  'xpack.securitySolution.aesopExplorer.routes.licenseError',
  { defaultMessage: 'Your license does not support this feature.' }
);

const modeSchema = schema.oneOf([schema.literal('discovery'), schema.literal('telemetry')]);

// These ids are rendered into the explorer workflow's YAML, which the engine
// evaluates as Liquid, so template delimiters, quotes and whitespace are refused.
const SAFE_ID = /^[A-Za-z0-9._:-]+$/;

const validateSafeId = (value: string): string | undefined =>
  SAFE_ID.test(value)
    ? undefined
    : 'must only contain letters, digits, periods, underscores, colons and hyphens';

const idSchema = schema.string({ minLength: 1, maxLength: 512, validate: validateSafeId });

const bodySchema = schema.object({
  mode: modeSchema,
  interval_minutes: schema.number({
    min: 5,
    max: 10080,
    defaultValue: AESOP_EXPLORER_INTERVAL_MINUTES,
  }),
  connector_id: idSchema,
  dataset_id: idSchema,
  ab_agent_id: schema.string({
    minLength: 1,
    maxLength: 512,
    validate: validateSafeId,
    defaultValue: AESOP_EXPLORER_AGENT_ID,
  }),
  investigation_id: idSchema,
});

export const registerAesopExplorerRoutes = ({
  router,
  getStartServices,
  logger,
  getEnablementApi,
}: {
  router: SecuritySolutionPluginRouter;
  getStartServices: StartServicesAccessor<StartPlugins>;
  logger: Logger;
  getEnablementApi: () => AesopDriftMonitorEnablementApi | undefined;
}): void => {
  const resolveDeps = async (request: KibanaRequest): Promise<AesopDriftMonitorRequestDeps> => {
    const [, pluginsStart] = await getStartServices();
    const workflowsExtensions = pluginsStart.workflowsExtensions;
    if (!workflowsExtensions) {
      throw new Error('The workflows extensions plugin is required for the AESOP explorer');
    }
    const managed = await initSecurityManagedWorkflowsClient(workflowsExtensions);
    return {
      getManagedWorkflowsClient: () => Promise.resolve(managed),
      workflowsManagement: getEnablementApi(),
      logger,
      request,
      // Concrete space: scheduling global workflows is unsupported.
      spaceId: pluginsStart.spaces?.spacesService?.getSpaceId(request) || DEFAULT_SPACE_ID,
    };
  };

  router.versioned
    .post({
      path: AESOP_EXPLORER_ROUTE_PATH,
      access: 'internal',
      security: { authz: { requiredPrivileges: REQUIRED_PRIVILEGES } },
    })
    .addVersion(
      {
        version: AESOP_EXPLORER_ROUTES_API_VERSION,
        validate: { request: { body: bodySchema } },
      },
      async (context, request, response) => {
        const { license } = await context.licensing;
        if (!license.hasAtLeast('enterprise')) {
          return response.forbidden({ body: LICENSE_ERROR_MESSAGE });
        }
        try {
          const { documentId } = await enableAesopExplorer(await resolveDeps(request), {
            mode: request.body.mode,
            intervalMinutes: request.body.interval_minutes,
            connectorId: request.body.connector_id,
            datasetId: request.body.dataset_id,
            abAgentId: request.body.ab_agent_id,
            investigationId: request.body.investigation_id,
          });
          return response.ok({ body: { document_id: documentId } });
        } catch (error) {
          logger.warn('Failed to enable the AESOP explorer', { error });
          return response.customError({
            statusCode: 500,
            body: { message: error instanceof Error ? error.message : String(error) },
          });
        }
      }
    );

  router.versioned
    .delete({
      path: `${AESOP_EXPLORER_ROUTE_PATH}/{mode}`,
      access: 'internal',
      security: { authz: { requiredPrivileges: REQUIRED_PRIVILEGES } },
    })
    .addVersion(
      {
        version: AESOP_EXPLORER_ROUTES_API_VERSION,
        validate: { request: { params: schema.object({ mode: modeSchema }) } },
      },
      async (context, request, response) => {
        const { license } = await context.licensing;
        if (!license.hasAtLeast('enterprise')) {
          return response.forbidden({ body: LICENSE_ERROR_MESSAGE });
        }
        try {
          await uninstallAesopExplorer(await resolveDeps(request), { mode: request.params.mode });
          return response.noContent();
        } catch (error) {
          logger.warn('Failed to uninstall the AESOP explorer', { error });
          return response.customError({
            statusCode: 500,
            body: { message: error instanceof Error ? error.message : String(error) },
          });
        }
      }
    );
};
