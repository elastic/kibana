/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ProfilingSetupOptions } from '@kbn/profiling-data-access-plugin/common/setup';
import { DEFAULT_SPACE_ID } from '@kbn/core-spaces-common';
import type { RouteRegisterParameters } from '..';
import { getRoutePaths } from '../../../common';
import { getHasSetupPrivileges } from '../../lib/setup/get_has_setup_privileges';
import { handleRouteHandlerError } from '../../utils/handle_route_error_handler';
import { getClient } from '../compat';
import { getCloudSetupInstructions } from './get_cloud_setup_instructions';
import { getSelfManagedInstructions } from './get_self_managed_instructions';
import { setupStatusOASOperationObject } from './oas_examples';
import { setupStatusResponseSchema } from './schemas';
import { setupCloud } from './setup_cloud';
import { setupSelfManaged } from './setup_self_managed';

const SERVERLESS_ERROR_MESSAGE = 'Universal Profiling is not supported in serverless';

export function registerSetupRoute({
  router,
  logger,
  services: { createProfilingEsClient },
  dependencies,
}: RouteRegisterParameters) {
  // Universal Profiling setup is not supported on serverless. Skipping registration keeps these
  // routes out of serverless builds and out of the serverless OAS docs, whose generation
  // force-enables every plugin regardless of `xpack.profiling.enabled`.
  if (dependencies.buildFlavor === 'serverless') {
    return;
  }

  const paths = getRoutePaths();
  router.get(
    {
      path: paths.HasSetupESResources,
      security: {
        authz: {
          requiredPrivileges: ['profiling'],
        },
      },
      options: {
        access: 'public',
        summary: 'Get Universal Profiling setup status',
        description: 'Check if Universal Profiling has been set up and configured properly',
        tags: ['oas-tag:Universal Profiling'],
        oasOperationObject: () => setupStatusOASOperationObject,
      },
      validate: {
        request: {},
        response: {
          200: {
            description: 'Indicates a successful call.',
            body: setupStatusResponseSchema,
          },
          403: {
            description:
              'The user does not have the privileges required to read the Universal Profiling setup status.',
          },
          500: {
            description:
              'An unexpected error occurred while checking the Universal Profiling setup status.',
          },
        },
      },
    },
    async (context, request, response) => {
      try {
        // Fallback: these routes are not registered on serverless builds anyway.
        if (dependencies.esCapabilities.serverless) {
          return response.badRequest({
            body: { message: SERVERLESS_ERROR_MESSAGE },
          });
        }

        const hasRequiredRole = dependencies.start.security
          ? await getHasSetupPrivileges({
              securityPluginStart: dependencies.start.security,
              request,
            })
          : true;

        const core = await context.core;

        const profilingStatus = await dependencies.start.profilingDataAccess.services.getStatus({
          esClient: core.elasticsearch.client,
          soClient: core.savedObjects.client,
          spaceId: dependencies.setup.spaces?.spacesService?.getSpaceId(request),
        });

        return response.ok({ body: { ...profilingStatus, has_required_role: hasRequiredRole } });
      } catch (error) {
        return handleRouteHandlerError({
          error,
          logger,
          response,
          message: 'Error while checking plugin setup',
        });
      }
    }
  );

  router.post(
    {
      path: paths.HasSetupESResources,
      security: {
        authz: {
          requiredPrivileges: ['profiling'],
        },
      },
      options: {
        access: 'public',
        summary: 'Initialize Universal Profiling setup',
        description: 'Set up Universal Profiling resources and configuration',
        tags: ['oas-tag:Universal Profiling'],
      },
      validate: {
        request: {},
        response: {
          202: {
            description:
              'Setup was accepted. Enabling resource management in Elasticsearch is asynchronous and may not have completed by the time this response is sent.',
          },
          403: {
            description:
              'The user does not have the privileges required to set up Universal Profiling.',
          },
          500: {
            description: 'An unexpected error occurred. Setup failed.',
          },
        },
      },
    },
    async (context, request, response) => {
      try {
        /* 
        The `elasticsearch` config option is meant to grant read-only access to a remote cluster and
        redirects every profiling ES client to it. This setup call would write to the remote cluster,
        which is not allowed. Therefore, we reject the setup request if a remote profiling cluster is configured.
        This branch can only be reached during local development, since the config option is forbidden in distributions.
        The verbose error message is meant to be read by developers, not end users. 
        */
        if (dependencies.config.elasticsearch) {
          return response.badRequest({
            body: {
              message:
                'Universal Profiling setup is not supported while "xpack.profiling.elasticsearch" is configured: ' +
                'the setup status is read from the configured remote cluster, but setup would write to the cluster ' +
                'Kibana is connected to. Set up Universal Profiling on the remote cluster itself, point the setting ' +
                'at a cluster that is already set up, or remove the setting to set up the local cluster.',
            },
          });
        }

        // Fallback: these routes are not registered on serverless builds anyway.
        if (dependencies.esCapabilities.serverless) {
          return response.badRequest({
            body: { message: SERVERLESS_ERROR_MESSAGE },
          });
        }

        const esClient = await getClient(context);
        const core = await context.core;

        const client = createProfilingEsClient({ esClient, request });

        const commonSetupParams: ProfilingSetupOptions = {
          client,
          clientWithProfilingAuth: client,
          logger,
          soClient: core.savedObjects.client,
          spaceId:
            dependencies.setup.spaces?.spacesService?.getSpaceId(request) ?? DEFAULT_SPACE_ID,
        };

        const { services } = dependencies.start.profilingDataAccess;
        const setupStateParams = {
          esClient: core.elasticsearch.client,
          soClient: core.savedObjects.client,
          spaceId: commonSetupParams.spaceId,
        };

        const isCloudEnabled = dependencies.setup.cloud?.isCloudEnabled;
        if (isCloudEnabled) {
          if (!dependencies.start.fleet) {
            const msg = `Elastic Fleet is required to set up Universal Profiling on Cloud`;
            logger.error(msg);
            return response.custom({
              statusCode: 500,
              body: { message: msg },
            });
          }
          logger.debug('Setting up Universal Profiling on Cloud');

          const setupState = await services.getCloudSetupState(setupStateParams);
          await setupCloud({
            setupState,
            setupParams: {
              ...commonSetupParams,
              packagePolicyClient: dependencies.start.fleet.packagePolicyService,
              isCloudEnabled,
              config: dependencies.config,
            },
          });

          logger.debug('[DONE] Setting up Universal Profiling on Cloud');
        } else {
          logger.debug('Setting up self-managed Universal Profiling');

          const setupState = await services.getSelfManagedSetupState(setupStateParams);
          await setupSelfManaged({
            setupState,
            setupParams: commonSetupParams,
          });

          logger.debug('[DONE] Setting up self-managed Universal Profiling');
        }

        // Wait until Profiling ES plugin creates all resources
        await client.profilingStatus({ waitForResourcesCreated: true });

        if (dependencies.telemetryUsageCounter) {
          dependencies.telemetryUsageCounter.incrementCounter({
            counterName: `POST ${paths.HasSetupESResources}`,
            counterType: 'success',
          });
        }

        // We return a status code of 202 instead of 200 because enabling
        // resource management in Elasticsearch is an asynchronous action
        // and is not guaranteed to complete before Kibana sends a response.
        return response.accepted();
      } catch (error) {
        if (dependencies.telemetryUsageCounter) {
          dependencies.telemetryUsageCounter.incrementCounter({
            counterName: `POST ${paths.HasSetupESResources}`,
            counterType: 'error',
          });
        }
        return handleRouteHandlerError({
          error,
          logger,
          response,
          message: 'Error while setting up Universal Profiling',
        });
      }
    }
  );
  // Show users the instructions on how to set up Universal Profiling agents
  router.get(
    {
      path: paths.SetupDataCollectionInstructions,
      security: {
        authz: {
          requiredPrivileges: ['profiling'],
        },
      },
      validate: false,
    },
    async (context, request, response) => {
      try {
        // Fallback: these routes are not registered on serverless builds anyway.
        if (dependencies.esCapabilities.serverless) {
          return response.badRequest({
            body: { message: SERVERLESS_ERROR_MESSAGE },
          });
        }

        const stackVersion = dependencies.stackVersion;
        const isCloudEnabled = dependencies.setup.cloud?.isCloudEnabled;
        if (isCloudEnabled) {
          if (!dependencies.start.fleet) {
            const msg = `Elastic Fleet is required to set up Universal Profiling on Cloud`;
            logger.error(msg);
            return response.custom({
              statusCode: 500,
              body: { message: msg },
            });
          }

          const apmServerHost = dependencies.setup.cloud?.apm?.url;
          const setupInstructions = await getCloudSetupInstructions({
            packagePolicyClient: dependencies.start.fleet?.packagePolicyService,
            soClient: (await context.core).savedObjects.client,
            apmServerHost,
            stackVersion,
          });

          return response.ok({ body: setupInstructions });
        }

        return response.ok({ body: getSelfManagedInstructions({ stackVersion }) });
      } catch (error) {
        return handleRouteHandlerError({
          error,
          logger,
          response,
          message: 'Error while fetching Universal Profiling instructions',
        });
      }
    }
  );
}
