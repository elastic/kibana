/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  DEFAULT_APP_CATEGORIES,
  type CoreSetup,
  type CoreStart,
  type KibanaRequest,
  type Logger,
  type Plugin,
  type PluginInitializerContext,
} from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import {
  detectionChangeSignalTriggerCommonDefinition,
  PND_MANAGE_AUTONOMY_PRIVILEGE_ID,
} from '@kbn/pnd-common';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import {
  PND_API_PRIVILEGE_AUTONOMY_WRITE,
  PND_API_PRIVILEGE_PROPOSALS_RESPOND,
  PND_API_PRIVILEGE_READ,
  PND_API_PRIVILEGE_THREADS_WRITE,
  PND_API_PRIVILEGE_WRITE,
  PND_FEATURE_ID,
  PND_PLUGIN_NAME,
} from '../common/constants';
import { incidentClosedTriggerCommonDefinition } from '../common/workflow_triggers/incident_closed';
import type { PndConfig } from './config';
import type {
  PndPluginSetup,
  PndPluginStart,
  PndSetupDependencies,
  PndStartDependencies,
} from './types';
import { registerRoutes } from './routes/register_routes';
import { registerOwner } from './managed_workflows/register_owner';
import { initializeManagedWorkflows } from './managed_workflows/initialize_managed_workflows';
import { getSpaceId } from './lib/get_space_id';
import { createPndLogger } from './lib/pnd_logger';
import { WatchesService } from './services/watches/watches_service';
import type { WatchWorkflowsManagementClient } from './services/watches/watch_workflows_management_client';
import { WatchWorkflowsManagementClientImpl } from './services/watches/watch_workflows_management_client';

export class PndPlugin
  implements Plugin<PndPluginSetup, PndPluginStart, PndSetupDependencies, PndStartDependencies>
{
  /**
   * The one logger the PND server hands to every route, service, and helper — already wrapped by
   * {@link createPndLogger}, so every message it emits carries the `[kibana-pnd]` marker the README
   * documents for grepping (finding R3). Never bypass it with a fresh `context.logger.get()`.
   */
  private readonly logger: Logger;
  private readonly config: PndConfig;
  private spaces?: PndStartDependencies['spaces'];
  private workflowsManagementApi?: WorkflowsServerPluginSetup['management'];
  private workflowsManagementClient?: WatchWorkflowsManagementClient;

  /** Created during `start`; routes resolve it lazily after managed-workflow initialization. */
  private watchesService?: WatchesService;

  constructor(context: PluginInitializerContext<PndConfig>) {
    this.logger = createPndLogger(context.logger.get());
    this.config = context.config.get();
  }

  setup(
    coreSetup: CoreSetup<PndStartDependencies, PndPluginStart>,
    { features, workflowsExtensions, workflowsManagement }: PndSetupDependencies
  ): PndPluginSetup {
    if (!this.config.enabled) {
      this.logger.info('PND plugin is disabled');
      return {};
    }

    this.logger.info('Setting up PND plugin');

    this.workflowsManagementApi = workflowsManagement.management;

    registerOwner({ workflowsExtensions });

    // P3 / D14: incident containment is a first-class subscribable signal. Registered in setup so
    // a watch can subscribe to it; emitted from the `_respond` handler on containment.
    workflowsExtensions.registerTriggerDefinition(incidentClosedTriggerCommonDefinition);

    // The cross-watch coverage-gap contract. Registered here rather than behind a feature flag
    // because trigger registration is setup-only and synchronous, where flags are unreadable; it is
    // inert until something emits it and something subscribes.
    workflowsExtensions.registerTriggerDefinition(detectionChangeSignalTriggerCommonDefinition);

    features.registerKibanaFeature({
      id: PND_FEATURE_ID,
      name: PND_PLUGIN_NAME,
      order: 1101,
      category: DEFAULT_APP_CATEGORIES.security,
      app: ['kibana', PND_FEATURE_ID],
      privileges: {
        all: {
          app: ['kibana', PND_FEATURE_ID],
          api: [
            PND_API_PRIVILEGE_READ,
            PND_API_PRIVILEGE_WRITE,
            PND_API_PRIVILEGE_PROPOSALS_RESPOND,
            PND_API_PRIVILEGE_THREADS_WRITE,
          ],
          savedObject: { all: [], read: [] },
          ui: ['show', 'write'],
        },
        read: {
          app: ['kibana', PND_FEATURE_ID],
          api: [PND_API_PRIVILEGE_READ],
          savedObject: { all: [], read: [] },
          ui: ['show'],
        },
      },
      subFeatures: [
        {
          name: i18n.translate('xpack.pnd.features.manageAutonomy.name', {
            defaultMessage: 'Manage autonomy',
          }),
          description: i18n.translate('xpack.pnd.features.manageAutonomy.description', {
            defaultMessage:
              'Change the autonomy level of managed watches. This decides how many consequential actions execute without a human, so it is granted independently of the base PND privilege.',
          }),
          privilegeGroups: [
            {
              groupType: 'independent',
              privileges: [
                {
                  id: PND_MANAGE_AUTONOMY_PRIVILEGE_ID,
                  name: i18n.translate('xpack.pnd.features.manageAutonomy.privilege.name', {
                    defaultMessage: 'Manage autonomy',
                  }),
                  // Not folded into `all`: changing autonomy is its own grant.
                  includeIn: 'none',
                  api: [PND_API_PRIVILEGE_AUTONOMY_WRITE],
                  savedObject: { all: [], read: [] },
                  ui: ['manageAutonomy'],
                },
              ],
            },
          ],
        },
      ],
    });

    const router = coreSetup.http.createRouter();

    registerRoutes({
      router,
      logger: this.logger,
      config: this.config,
      getEsClient: async (context) => (await context.core).elasticsearch.client,
      getSpaceId: (request) => this.getSpaceId(request),
      getStartServices: coreSetup.getStartServices,
      getWatchesService: () => this.requireWatchesService(),
      getWorkflowsManagementClient: () => this.workflowsManagementClient,
    });

    return {};
  }

  start(_core: CoreStart, plugins: PndStartDependencies): PndPluginStart {
    this.spaces = plugins.spaces;

    if (!this.config.enabled) {
      return {};
    }

    this.workflowsManagementClient =
      this.workflowsManagementApi == null
        ? undefined
        : new WatchWorkflowsManagementClientImpl(this.workflowsManagementApi);

    const managedWorkflows = initializeManagedWorkflows({
      workflowsExtensions: plugins.workflowsExtensions,
      logger: this.logger,
    }).catch((error) => {
      this.logger.error(
        `PND managed workflow initialization failed: ${
          error instanceof Error ? error.message : String(error)
        }`
      );
      return undefined;
    });

    // Mock mode changes presentation data only; durable settings and enablement still use Workflows.
    this.watchesService = new WatchesService(
      this.workflowsManagementClient,
      managedWorkflows,
      this.logger,
      this.config.ui.useMockData
    );

    return {};
  }

  private requireWatchesService(): WatchesService {
    if (!this.watchesService) {
      throw new Error('Watches service is not available until the PND plugin has started');
    }
    return this.watchesService;
  }

  private getSpaceId(request: KibanaRequest): string {
    return getSpaceId(this.spaces, request);
  }

  stop() {}
}
