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
  AESOP_DRIFT_MONITOR_ROUTE_PATH,
  AESOP_DRIFT_MONITOR_ROUTES_API_VERSION,
} from '../../common/aesop_prototype';
import { initSecurityManagedWorkflowsClient } from '../workflows/managed_workflows';
import type {
  AesopDriftMonitorEnablementApi,
  AesopDriftMonitorRequestDeps,
} from './drift_monitor_schedule';
import {
  enableAesopDriftMonitor,
  getAesopDriftMonitorTracingWarnings,
  uninstallAesopDriftMonitor,
} from './drift_monitor_schedule';

/**
 * AESOP prototype: internal routes the A/B compare workflow calls after a
 * variant deploys, so the per-skill drift monitor is installed and enabled
 * from the same identity that approved the deploy. The A/B workflow reaches
 * these over `kibana.request`, which runs as the workflow execution's API key.
 */

const REQUIRED_PRIVILEGES = [RULES_API_ALL];

const LICENSE_ERROR_MESSAGE = i18n.translate(
  'xpack.securitySolution.aesopDriftMonitor.routes.licenseError',
  { defaultMessage: 'Your license does not support this feature.' }
);

const bodySchema = schema.object({
  skill_id: schema.string({ minLength: 1, maxLength: 128 }),
  interval_minutes: schema.number({ min: 5, max: 1440, defaultValue: 60 }),
  lookback_minutes: schema.number({ min: 5, max: 10080, defaultValue: 120 }),
});

export const registerAesopDriftMonitorRoutes = ({
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
      throw new Error('The workflows extensions plugin is required for the AESOP drift monitor');
    }
    const managed = await initSecurityManagedWorkflowsClient(workflowsExtensions);
    return {
      getManagedWorkflowsClient: () => Promise.resolve(managed),
      workflowsManagement: getEnablementApi(),
      logger,
      request,
      // Concrete space: scheduling global workflows is unsupported (security-team#17380),
      // so the monitor must live where its scheduled runs will be stamped.
      spaceId: pluginsStart.spaces?.spacesService?.getSpaceId(request) || DEFAULT_SPACE_ID,
    };
  };

  // Agents load skills by display name more often than by id, so the monitor matches traces on
  // both. An unknown skill (or no Agent Builder) falls back to matching the id alone.
  const resolveSkillName = async (
    request: KibanaRequest,
    skillId: string
  ): Promise<string | undefined> => {
    const [, pluginsStart] = await getStartServices();
    try {
      const registry = await pluginsStart.agentBuilder?.skills.getRegistry({ request });
      return (await registry?.get(skillId))?.name;
    } catch (error) {
      logger.debug(() => `AESOP drift monitor: could not resolve skill '${skillId}': ${error}`);
      return undefined;
    }
  };

  router.versioned
    .post({
      path: AESOP_DRIFT_MONITOR_ROUTE_PATH,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: REQUIRED_PRIVILEGES,
        },
      },
    })
    .addVersion(
      {
        version: AESOP_DRIFT_MONITOR_ROUTES_API_VERSION,
        validate: {
          request: { body: bodySchema },
        },
      },
      async (context, request, response) => {
        const { license } = await context.licensing;
        if (!license.hasAtLeast('enterprise')) {
          return response.forbidden({ body: LICENSE_ERROR_MESSAGE });
        }
        try {
          const { skill_id: skillId } = request.body;
          const { documentId } = await enableAesopDriftMonitor(await resolveDeps(request), {
            skillId,
            skillName: await resolveSkillName(request, skillId),
            intervalMinutes: request.body.interval_minutes,
            lookbackMinutes: request.body.lookback_minutes,
          });
          const { uiSettings } = await context.core;
          const warnings = await getAesopDriftMonitorTracingWarnings((settingId) =>
            uiSettings.client.get<boolean>(settingId)
          );
          return response.ok({ body: { document_id: documentId, warnings } });
        } catch (error) {
          logger.warn('Failed to enable the AESOP drift monitor', { error });
          return response.customError({
            statusCode: 500,
            body: { message: (error as Error).message },
          });
        }
      }
    );

  router.versioned
    .delete({
      path: `${AESOP_DRIFT_MONITOR_ROUTE_PATH}/{skill_id}`,
      access: 'internal',
      security: {
        authz: {
          requiredPrivileges: REQUIRED_PRIVILEGES,
        },
      },
    })
    .addVersion(
      {
        version: AESOP_DRIFT_MONITOR_ROUTES_API_VERSION,
        validate: {
          request: {
            params: schema.object({
              skill_id: schema.string({ minLength: 1, maxLength: 128 }),
            }),
          },
        },
      },
      async (context, request, response) => {
        const { license } = await context.licensing;
        if (!license.hasAtLeast('enterprise')) {
          return response.forbidden({ body: LICENSE_ERROR_MESSAGE });
        }
        try {
          await uninstallAesopDriftMonitor(await resolveDeps(request), {
            skillId: request.params.skill_id,
          });
          return response.noContent();
        } catch (error) {
          logger.warn('Failed to uninstall the AESOP drift monitor', { error });
          return response.customError({
            statusCode: 500,
            body: { message: (error as Error).message },
          });
        }
      }
    );
};
