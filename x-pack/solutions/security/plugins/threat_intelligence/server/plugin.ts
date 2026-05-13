/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  CoreSetup,
  CoreStart,
  Logger,
  Plugin,
  PluginInitializerContext,
} from '@kbn/core/server';
import type { InferenceServerStart } from '@kbn/inference-plugin/server';
import type { SpacesServiceStart } from '@kbn/spaces-plugin/server';
import type { WorkflowsServerPluginSetup } from '@kbn/workflows-management-plugin/server';
import { parseExperimentalConfigValue, type ExperimentalFeatures } from '../common';
import type { ThreatIntelligenceConfig } from './config';
import type {
  ThreatIntelligencePluginSetup,
  ThreatIntelligencePluginStart,
  ThreatIntelligenceSetupDependencies,
  ThreatIntelligenceStartDependencies,
} from './types';
import { registerSkills } from './agent_builder/skills';
import { registerAttachmentTypes } from './agent_builder/attachments';
import { analyseEnvironmentTool, extractIocsTool } from './agent_builder/tools';
import { registerThreatIntelligenceFeature } from './features';
import { registerRoutes } from './routes';
import { SavedViewType } from './saved_objects/saved_view';
import { installIndexTemplates } from './setup/index_templates';
import { seedDefaultSources } from './setup/seed_default_sources';
import { threatIntelligenceUiSettings } from './ui_settings';
import { registerIocIndicatorSyncTask, scheduleIocIndicatorSyncTask } from './tasks';
import { installBuiltinWorkflows } from './workflows';

export class ThreatIntelligencePlugin
  implements
    Plugin<
      ThreatIntelligencePluginSetup,
      ThreatIntelligencePluginStart,
      ThreatIntelligenceSetupDependencies,
      ThreatIntelligenceStartDependencies
    >
{
  private readonly logger: Logger;
  private readonly experimentalFeatures: ExperimentalFeatures;
  // Captured during start() so routes registered in setup() can look up the
  // current request's space at call-time without needing the spaces plugin
  // at setup boundary.
  private spacesService: SpacesServiceStart | undefined;
  // Captured during start() so the LLM-backed routes (`hunt_behavior`,
  // `generalize_from_telemetry`) can build a `ScopedModel` per request
  // without requiring the inference plugin at the setup boundary.
  private inferenceService: InferenceServerStart | undefined;
  // Captured during setup() so built-in workflow registration can be deferred
  // to start(), where the WorkflowsManagementApi has finished its async
  // initialization (the API gates every method behind its own `initPromise`).
  private workflowsManagement: WorkflowsServerPluginSetup | undefined;

  constructor(initializerContext: PluginInitializerContext<ThreatIntelligenceConfig>) {
    this.logger = initializerContext.logger.get();
    const config = initializerContext.config.get();
    const { features, invalid } = parseExperimentalConfigValue(config.enableExperimental);
    if (invalid.length > 0) {
      this.logger.warn(
        `Ignoring unknown threat intelligence experimental feature flags: ${invalid.join(', ')}`
      );
    }
    this.experimentalFeatures = features;
  }

  public setup(
    coreSetup: CoreSetup<ThreatIntelligenceStartDependencies, ThreatIntelligencePluginStart>,
    setupDeps: ThreatIntelligenceSetupDependencies
  ): ThreatIntelligencePluginSetup {
    const { agentBuilder, features, taskManager, workflowsManagement } = setupDeps;
    this.workflowsManagement = workflowsManagement;

    // Register the Kibana feature with the three-tier privilege model
    // (read / write / admin) that gates route access. Routes thread the
    // `THREAT_INTELLIGENCE_API_PRIVILEGES` values through
    // `security.authz.requiredPrivileges`.
    registerThreatIntelligenceFeature({ features });

    // Saved-objects type backing the dashboard's saved-view feature.
    coreSetup.savedObjects.registerType(SavedViewType);

    // Per-space advanced setting for the dashboard's location-aware
    // default region filter.
    coreSetup.uiSettings.register(threatIntelligenceUiSettings);

    // `extract_iocs` is registered globally so Workflow 2 can invoke it
    // directly via a `builtin` step. `analyse_environment` is registered
    // globally so the orchestrating agent can call it through the registry
    // when tailoring feed recommendations without consuming one of the
    // skill's seven inline-tool slots. The other `threat_intel.*` tools
    // live inline on the skill (BuiltinSkillBoundedTool — no
    // `tags`/`availability`) so they're surfaced only when the skill is
    // loaded into a conversation.
    agentBuilder.tools.register(extractIocsTool);
    agentBuilder.tools.register(analyseEnvironmentTool);

    registerAttachmentTypes(agentBuilder);

    // Internal HTTP route used by the interactive subscription-confirmation
    // attachment. Wiring it in setup keeps the route available even when the
    // experimental skill flag is off — listing existing subscriptions or
    // submitting via the form should not require the skill.
    const router = coreSetup.http.createRouter();
    registerRoutes({
      router,
      logger: this.logger,
      getSpacesService: () => this.spacesService,
      getInference: () => this.inferenceService,
    });

    if (this.experimentalFeatures.threatIntelligenceSkillEnabled) {
      registerSkills(agentBuilder);
      this.logger.info('Threat Intelligence skill registered (experimental flag is enabled)');
    } else {
      this.logger.debug(
        'Threat Intelligence skill not registered. Enable via xpack.threatIntelligence.enableExperimental: ["threatIntelligenceSkillEnabled"]'
      );
    }

    // IOC indicator sync — registered during setup, scheduled in start.
    // Gating on both the experimental flag AND the optional taskManager
    // dependency keeps the plugin importable on stripped-down deployments.
    if (this.experimentalFeatures.iocIndicatorSyncEnabled) {
      if (taskManager) {
        registerIocIndicatorSyncTask({
          taskManager,
          coreSetup,
          logger: this.logger.get('ioc_indicator_sync'),
        });
        this.logger.info(
          'Threat Intelligence IOC indicator sync task registered (experimental flag is enabled)'
        );
      } else {
        this.logger.warn(
          'iocIndicatorSyncEnabled is set but the optional `taskManager` plugin is not available — skipping registration.'
        );
      }
    }

    return {};
  }

  public start(
    coreStart: CoreStart,
    startDeps: ThreatIntelligenceStartDependencies
  ): ThreatIntelligencePluginStart {
    // Optional: capture the spaces service so routes can resolve the
    // current space id per request. When the spaces plugin is absent the
    // route helpers fall back to `'default'`.
    this.spacesService = startDeps.spaces?.spacesService;
    // Optional: capture the inference service so the LLM-backed routes
    // (`hunt_behavior`, `generalize_from_telemetry`) can resolve a scoped
    // model per request. When the inference plugin is absent the routes
    // return 503 with a structured "no GenAI connector" message.
    this.inferenceService = startDeps.inference;

    // Index template installation + seeding are best-effort — they should not
    // block start. Errors are logged but the plugin continues so the rest of
    // Kibana stays healthy. Seed runs only after templates succeed because the
    // seeded indices depend on the templates having been put.
    //
    // Note: there is no MITRE ATT&CK seed — `hunt_behavior` validates against
    // the canonical catalog in `@kbn/securitysolution-mitre-catalog`, which is
    // produced by `security_solution`'s `yarn extract-mitre-attacks` so it
    // stays in lockstep with `security.create_detection_rule`.
    const esClient = coreStart.elasticsearch.client.asInternalUser;
    installIndexTemplates({ esClient, logger: this.logger })
      .then(async () => {
        await seedDefaultSources({ esClient, logger: this.logger });
      })
      .catch((err) => {
        this.logger.error(
          `Failed to install threat-intelligence index templates / seed data: ${err.message}`
        );
      });

    // Built-in workflows are registered with Workflows Management when the
    // optional plugin is available. The bundled YAMLs are upserted idempotently
    // by stable id on every plugin start, so this call is safe to repeat across
    // restarts and operator edits to the workflow records survive subsequent
    // runs only when the YAML hasn't changed (see BuiltinWorkflowsService).
    if (this.workflowsManagement) {
      installBuiltinWorkflows({
        workflowsManagement: this.workflowsManagement,
        logger: this.logger,
      }).catch((err) => {
        this.logger.error(
          `Failed to install threat-intelligence built-in workflows: ${err.message}`
        );
      });
    } else {
      this.logger.debug(
        'workflowsManagement plugin not available — skipping built-in workflow registration'
      );
    }

    // Schedule the IOC indicator sync after Task Manager is up. The task
    // type itself was registered in setup; this call is idempotent on
    // restart and preserves any operator-customized schedule.
    if (this.experimentalFeatures.iocIndicatorSyncEnabled && startDeps.taskManager) {
      void scheduleIocIndicatorSyncTask({
        taskManager: startDeps.taskManager,
        logger: this.logger.get('ioc_indicator_sync'),
      }).catch((err) => {
        this.logger.error(`Failed to schedule IOC indicator sync task: ${err.message}`);
      });
    }

    return {};
  }

  public stop() {}
}
