/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import Boom from '@hapi/boom';
import * as t from 'io-ts';
import {
  NamingCollisionError,
  FleetUnauthorizedError,
  type PackageClient,
} from '@kbn/fleet-plugin/server';
import { dump } from 'js-yaml';
import { PackageDataStreamTypes, Output } from '@kbn/fleet-plugin/common/types';
import { transformOutputToFullPolicyOutput } from '@kbn/fleet-plugin/server/services/output_client';
import { OBSERVABILITY_ONBOARDING_TELEMETRY_EVENT } from '../../../common/telemetry_events';
import { getObservabilityOnboardingFlow, saveObservabilityOnboardingFlow } from '../../lib/state';
import type { SavedObservabilityOnboardingFlow } from '../../saved_objects/observability_onboarding_status';
import { ObservabilityOnboardingFlow } from '../../saved_objects/observability_onboarding_status';
import { createObservabilityOnboardingServerRoute } from '../create_observability_onboarding_server_route';
import { getHasLogs } from './get_has_logs';
import { getKibanaUrl } from '../../lib/get_fallback_urls';
import { getAgentVersionInfo } from '../../lib/get_agent_version';
import { ElasticAgentStepPayload, InstalledIntegration, StepProgressPayloadRT } from '../types';
import { createShipperApiKey } from '../../lib/api_key/create_shipper_api_key';
import { createInstallApiKey } from '../../lib/api_key/create_install_api_key';
import { hasLogMonitoringPrivileges } from '../../lib/api_key/has_log_monitoring_privileges';
import { makeTar, type Entry } from './make_tar';

const updateOnboardingFlowRoute = createObservabilityOnboardingServerRoute({
  endpoint: 'PUT /internal/observability_onboarding/flow/{onboardingId}',
  security: {
    authz: {
      enabled: false,
      reason: 'Authorization is checked by the Saved Object client',
    },
  },
  params: t.type({
    path: t.type({
      onboardingId: t.string,
    }),
    body: t.partial({
      state: t.record(t.string, t.unknown),
    }),
  }),
  async handler(resources): Promise<{ onboardingId: string }> {
    const {
      params: {
        path: { onboardingId },
        body: { state },
      },
      core,
      request,
    } = resources;
    const coreStart = await core.start();
    const savedObjectsClient = coreStart.savedObjects.getScopedClient(request);
    const { id } = await saveObservabilityOnboardingFlow({
      savedObjectsClient,
      savedObjectId: onboardingId,
      observabilityOnboardingState: {
        type: 'logFiles',
        state,
        progress: {},
      } as ObservabilityOnboardingFlow,
    });
    return { onboardingId: id };
  },
});

const stepProgressUpdateRoute = createObservabilityOnboardingServerRoute({
  endpoint: 'POST /internal/observability_onboarding/flow/{id}/step/{name}',
  security: {
    authz: {
      enabled: false,
      reason:
        "This endpoint is meant to be called from user's terminal and authenticated using API key with a limited privileges. For this reason there is no authorization and saved object is accessed using an internal Kibana user (the API key used by the user should not have those privileges)",
    },
  },
  params: t.type({
    path: t.type({
      id: t.string,
      name: t.string,
    }),
    body: t.intersection([
      t.type({
        status: t.string,
      }),
      t.partial({ message: t.string }),
      t.partial({
        payload: StepProgressPayloadRT,
      }),
    ]),
  }),
  async handler(resources) {
    const {
      params: {
        path: { id, name },
        body: { status, message, payload },
      },
      core,
    } = resources;

    const coreStart = await core.start();
    const savedObjectsClient = coreStart.savedObjects.createInternalRepository();

    const savedObservabilityOnboardingState = await getObservabilityOnboardingFlow({
      savedObjectsClient,
      savedObjectId: id,
    });

    if (!savedObservabilityOnboardingState) {
      throw Boom.notFound('Unable to report setup progress - onboarding session not found.');
    }

    const {
      id: savedObjectId,
      updatedAt,
      ...observabilityOnboardingState
    } = savedObservabilityOnboardingState;

    await saveObservabilityOnboardingFlow({
      savedObjectsClient,
      savedObjectId,
      observabilityOnboardingState: {
        ...observabilityOnboardingState,
        progress: {
          ...observabilityOnboardingState.progress,
          [name]: {
            status,
            message,
            payload,
          },
        },
      },
    });

    coreStart.analytics.reportEvent(OBSERVABILITY_ONBOARDING_TELEMETRY_EVENT.eventType, {
      flow_type: observabilityOnboardingState.type,
      flow_id: id,
      step: name,
      step_status: status,
      step_message: message,
      payload,
    });

    return { name, status, message, payload };
  },
});

const getProgressRoute = createObservabilityOnboardingServerRoute({
  endpoint: 'GET /internal/observability_onboarding/flow/{onboardingId}/progress',
  security: {
    authz: {
      enabled: false,
      reason: 'Authorization is checked by the Saved Object client',
    },
  },
  params: t.type({
    path: t.type({
      onboardingId: t.string,
    }),
  }),
  async handler(resources): Promise<Pick<SavedObservabilityOnboardingFlow, 'progress'>> {
    const {
      params: {
        path: { onboardingId },
      },
      core,
      request,
    } = resources;
    const coreStart = await core.start();
    const savedObjectsClient = coreStart.savedObjects.getScopedClient(request);
    const savedObservabilityOnboardingState = await getObservabilityOnboardingFlow({
      savedObjectsClient,
      savedObjectId: onboardingId,
    });

    if (!savedObservabilityOnboardingState) {
      throw Boom.notFound('Unable to report setup progress - onboarding session not found.');
    }

    const progress = { ...savedObservabilityOnboardingState?.progress };

    const esClient = coreStart.elasticsearch.client.asScoped(request).asCurrentUser;

    if (progress['ea-status']?.status === 'complete') {
      const { agentId } = progress['ea-status']?.payload as ElasticAgentStepPayload;
      try {
        const hasLogs = await getHasLogs(esClient, agentId);
        progress['logs-ingest'] = { status: hasLogs ? 'complete' : 'loading' };
      } catch (error) {
        progress['logs-ingest'] = { status: 'warning', message: error.message };
      }
    } else {
      progress['logs-ingest'] = { status: 'incomplete' };
    }

    return { progress };
  },
});

/**
 * This endpoint starts a new onboarding flow and creates two API keys:
 * 1. A short-lived API key with privileges to install integrations.
 * 2. An API key with privileges to ingest log and metric data used to configure Elastic Agent.
 *
 * It also returns all required information to download the onboarding script and install the
 * Elastic agent.
 *
 * If the user does not have all necessary privileges a 403 Forbidden response is returned.
 *
 * This endpoint differs from the existing `POST /internal/observability_onboarding/logs/flow`
 * endpoint in that it caters for the auto-detect flow where integrations are detected and installed
 * on the host system, rather than in the Kibana UI.
 */
const createFlowRoute = createObservabilityOnboardingServerRoute({
  endpoint: 'POST /internal/observability_onboarding/flow',
  security: {
    authz: {
      enabled: false,
      reason: 'Authorization is checked by the Saved Object client',
    },
  },
  params: t.type({
    body: t.type({
      name: t.string,
    }),
  }),
  async handler(resources) {
    const {
      context,
      params: {
        body: { name },
      },
      core,
      request,
      plugins,
      kibanaVersion,
    } = resources;
    const coreStart = await core.start();
    const {
      elasticsearch: { client },
    } = await context.core;
    const savedObjectsClient = coreStart.savedObjects.getScopedClient(request);

    const hasPrivileges = await hasLogMonitoringPrivileges(client.asCurrentUser);
    if (!hasPrivileges) {
      throw Boom.forbidden('Unauthorized to create log indices');
    }

    const fleetPluginStart = await plugins.fleet.start();

    const [onboardingFlow, ingestApiKey, installApiKey, elasticAgentVersionInfo] =
      await Promise.all([
        saveObservabilityOnboardingFlow({
          savedObjectsClient,
          observabilityOnboardingState: {
            type: 'autoDetect',
            state: undefined,
            progress: {},
          },
        }),
        createShipperApiKey(client.asCurrentUser, `onboarding_ingest_${name}`),
        (
          await context.resolve(['core'])
        ).core.security.authc.apiKeys.create(createInstallApiKey(`onboarding_install_${name}`)),
        getAgentVersionInfo(fleetPluginStart, kibanaVersion),
      ]);

    if (!installApiKey) {
      throw Boom.notFound('License does not allow API key creation.');
    }

    const kibanaUrl = getKibanaUrl(core.setup, plugins.cloud?.setup);
    const scriptDownloadUrl = new URL(
      core.setup.http.staticAssets.getPluginAssetHref('auto_detect.sh'),
      kibanaUrl
    ).toString();

    return {
      onboardingFlow,
      ingestApiKey: ingestApiKey.encoded,
      installApiKey: installApiKey.encoded,
      elasticAgentVersionInfo,
      kibanaUrl,
      scriptDownloadUrl,
    };
  },
});

/**
 * This endpoints installs the requested integrations and returns the corresponding config file for
 * Elastic Agent.
 *
 * The request format is TSV (tab-separated values) to simplify parsing in bash.
 *
 * The response format is a tar archive containing the Elastic Agent configuration, depending on the
 * `Accept` header.
 *
 * Errors during installation are ignore unless all integrations fail to install. When that happens
 * a 500 Internal Server Error is returned with the first error message.
 *
 * Example request:
 *
 * ```text
 * POST /internal/observability_onboarding/flow/${ONBOARDING_ID}/integrations/install
 *
 * system registry
 * product_service custom /path/to/access.log
 * product_service custom /path/to/error.log
 * checkout_service custom /path/to/access.log
 * checkout_service custom /path/to/error.log
 * ```
 *
 * Example response (tarball):
 *
 * ```
 * -rw-r--r--  113 elastic-agent.yml
 * drwxr-xr-x    0 inputs.d/
 * -rw-r--r-- 4890 inputs.d/system.yml
 * -rw-r--r--  240 inputs.d/product_service.yml
 * -rw-r--r--  243 inputs.d/checkout_service.yml
 * ```
 *
 * Example curl:
 *
 * ```bash
 * curl --request POST \
 *  --url "http://localhost:5601/internal/observability_onboarding/flow/${ONBOARDING_ID}/integrations/install" \
 *  --header "Authorization: ApiKey ${ENCODED_API_KEY}" \
 *  --header "Accept: application/x-tar" \
 *  --header "Content-Type: text/tab-separated-values" \
 *  --header "kbn-xsrf: true" \
 *  --header "x-elastic-internal-origin: Kibana" \
 *  --data $'system\tregistry\twebserver01\nproduct_service\tcustom\t/path/to/access.log\ncheckout_service\tcustom\t/path/to/access.log' \
 *  --output - | tar -tvf -
 * ```
 */
const integrationsInstallRoute = createObservabilityOnboardingServerRoute({
  endpoint: 'POST /internal/observability_onboarding/flow/{onboardingId}/integrations/install',
  security: {
    authz: {
      enabled: false,
      reason:
        "This endpoint is meant to be called from user's terminal. Authorization is partially checked by the Package Service client, and saved object is accessed using internal Kibana user because the API key used for installing integrations should not have those privileges.",
    },
  },
  params: t.type({
    path: t.type({
      onboardingId: t.string,
    }),
    body: t.string,
  }),
  async handler({ context, request, response, params, core, plugins, services }) {
    const coreStart = await core.start();
    const fleetStart = await plugins.fleet.start();
    const savedObjectsClient = coreStart.savedObjects.createInternalRepository();
    const packageClient = fleetStart.packageService.asScoped(request);

    const savedObservabilityOnboardingState = await getObservabilityOnboardingFlow({
      savedObjectsClient,
      savedObjectId: params.path.onboardingId,
    });
    if (!savedObservabilityOnboardingState) {
      throw Boom.notFound(`Onboarding session '${params.path.onboardingId}' not found.`);
    }

    const outputClient = await fleetStart.createOutputClient(request);
    const defaultOutputId = await outputClient.getDefaultDataOutputId();
    if (!defaultOutputId) {
      throw Boom.notFound('Default data output not found');
    }
    const output = await outputClient.get(defaultOutputId);

    const integrationsToInstall = parseIntegrationsTSV(params.body);
    if (!integrationsToInstall.length) {
      return response.badRequest({
        body: {
          message: 'Please specify a list of integrations to install',
        },
      });
    }

    let installedIntegrations: InstalledIntegration[] = [];
    try {
      const settledResults = await ensureInstalledIntegrations(
        integrationsToInstall,
        packageClient
      );
      installedIntegrations = settledResults.reduce<InstalledIntegration[]>((acc, result) => {
        if (result.status === 'fulfilled') {
          acc.push(result.value);
        }
        return acc;
      }, []);
      // Errors during installation are ignored unless all integrations fail to install. When that happens
      // a 500 Internal Server Error is returned with the first error message.
      if (!installedIntegrations.length) {
        throw (settledResults[0] as PromiseRejectedResult).reason;
      }
    } catch (error) {
      if (error instanceof FleetUnauthorizedError) {
        return response.forbidden({
          body: {
            message: error.message,
          },
        });
      }
      throw error;
    }

    await saveObservabilityOnboardingFlow({
      savedObjectsClient,
      savedObjectId: params.path.onboardingId,
      observabilityOnboardingState: {
        ...savedObservabilityOnboardingState,
        progress: {
          ...savedObservabilityOnboardingState.progress,
          'install-integrations': {
            status: 'complete',
            payload: installedIntegrations,
          },
        },
      },
    });

    coreStart.analytics.reportEvent(OBSERVABILITY_ONBOARDING_TELEMETRY_EVENT.eventType, {
      flow_type: savedObservabilityOnboardingState.type,
      flow_id: params.path.onboardingId,
      step: 'install-integrations',
      step_status: 'complete',
      payload: {
        integrations: installedIntegrations.map(
          ({ title, pkgName, pkgVersion, installSource }) => ({
            title,
            pkgName,
            pkgVersion,
            installSource,
          })
        ),
      },
    });

    return response.ok({
      headers: {
        'content-type': 'application/x-tar',
      },
      body: generateAgentConfigTar(output, installedIntegrations),
    });
  },
});

interface InstalledSystemIntegrationMetadata {
  hostname: string;
}

type RegistryIntegrationMetadata = InstalledSystemIntegrationMetadata;

export interface RegistryIntegrationToInstall {
  pkgName: string;
  installSource: 'registry';
  metadata?: RegistryIntegrationMetadata;
}
export interface CustomIntegrationToInstall {
  pkgName: string;
  installSource: 'custom';
  logFilePaths: string[];
}
export type IntegrationToInstall = RegistryIntegrationToInstall | CustomIntegrationToInstall;

async function ensureInstalledIntegrations(
  integrationsToInstall: IntegrationToInstall[],
  packageClient: PackageClient
): Promise<Array<PromiseSettledResult<InstalledIntegration>>> {
  return Promise.allSettled(
    integrationsToInstall.map(async (integration) => {
      const { pkgName, installSource } = integration;

      if (installSource === 'registry') {
        const installation = await packageClient.ensureInstalledPackage({ pkgName });
        const pkg = installation.package;
        const config = await packageClient.getAgentPolicyConfigYAML(pkg.name, pkg.version);
        const { packageInfo } = await packageClient.getPackage(pkg.name, pkg.version);

        return {
          installSource,
          pkgName: pkg.name,
          pkgVersion: pkg.version,
          title: packageInfo.title,
          config,
          dataStreams:
            packageInfo.data_streams?.map(({ type, dataset }) => ({ type, dataset })) ?? [],
          kibanaAssets: pkg.installed_kibana,
          metadata: integration.metadata,
        };
      }

      const dataStream = {
        type: 'logs',
        dataset: pkgName,
      };
      const installed: InstalledIntegration = {
        installSource,
        pkgName,
        pkgVersion: '1.0.0', // Custom integrations are always installed as version `1.0.0`
        title: pkgName,
        config: dump({
          inputs: [
            {
              id: `filestream-${pkgName}`,
              type: 'filestream',
              streams: [
                {
                  id: `filestream-${pkgName}`,
                  data_stream: dataStream,
                  paths: integration.logFilePaths,
                  processors: [
                    {
                      add_fields: {
                        target: 'service',
                        fields: {
                          name: pkgName,
                        },
                      },
                    },
                  ],
                },
              ],
            },
          ],
        }),
        dataStreams: [dataStream],
        kibanaAssets: [],
      };
      try {
        await packageClient.installCustomIntegration({
          pkgName,
          datasets: [{ name: dataStream.dataset, type: dataStream.type as PackageDataStreamTypes }],
        });
        return installed;
      } catch (error) {
        // If the error is a naming collision, we can assume the integration is already installed and treat this step as successful
        if (error instanceof NamingCollisionError) {
          return installed;
        } else {
          throw error;
        }
      }
    })
  );
}

/**
 * Parses and validates a TSV (tab-separated values) string of integrations with params.
 *
 * Returns an object of integrations to install.
 *
 * Example input:
 *
 * ```text
 * system registry hostname
 * nginx registry
 * product_service custom /path/to/access.log
 * product_service custom /path/to/error.log
 * checkout_service custom /path/to/access.log
 * checkout_service custom /path/to/error.log
 * ```
 */
function parseIntegrationsTSV(tsv: string) {
  return Object.values(
    tsv
      .trim()
      .split('\n')
      .map((line) => line.split('\t', 3))
      .reduce<Record<string, IntegrationToInstall>>((acc, [pkgName, installSource, parameter]) => {
        const key = `${pkgName}-${installSource}`;
        if (installSource === 'registry') {
          const metadata = parseRegistryIntegrationMetadata(pkgName, parameter);

          acc[key] = {
            pkgName,
            installSource,
            metadata,
          };
          return acc;
        } else if (installSource === 'custom') {
          if (!parameter) {
            throw new Error(`Missing file path for integration: ${pkgName}`);
          }
          // Append file path if integration is already in the list
          const existing = acc[key];
          if (existing && existing.installSource === 'custom') {
            existing.logFilePaths.push(parameter);
            return acc;
          }
          acc[key] = {
            pkgName,
            installSource,
            logFilePaths: [parameter],
          };
          return acc;
        }
        throw new Error(`Invalid install source: ${installSource}`);
      }, {})
  );
}

function parseRegistryIntegrationMetadata(
  pkgName: string,
  parameter: string
): RegistryIntegrationMetadata | undefined {
  switch (pkgName) {
    case 'system':
      if (!parameter) {
        throw new Error('Missing hostname for System integration');
      }

      return { hostname: parameter };
    default:
      return undefined;
  }
}

function generateAgentConfigTar(output: Output, installedIntegrations: InstalledIntegration[]) {
  const now = new Date();

  return makeTar([
    {
      type: 'File',
      path: 'elastic-agent.yml',
      mode: 0o644,
      mtime: now,
      data: dump({
        outputs: {
          default: transformOutputToFullPolicyOutput(output, undefined, true),
        },
      }),
    },
    {
      type: 'Directory',
      path: 'inputs.d/',
      mode: 0o755,
      mtime: now,
    },
    ...installedIntegrations.map<Entry>((integration) => ({
      type: 'File',
      path: `inputs.d/${integration.pkgName}.yml`,
      mode: 0o644,
      mtime: now,
      data: integration.config,
    })),
  ]);
}

export const flowRouteRepository = {
  ...createFlowRoute,
  ...updateOnboardingFlowRoute,
  ...stepProgressUpdateRoute,
  ...getProgressRoute,
  ...integrationsInstallRoute,
};
