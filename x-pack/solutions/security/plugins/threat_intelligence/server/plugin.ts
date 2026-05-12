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
import { extractIocsTool } from './agent_builder/tools';
import { registerRoutes } from './routes';
import { installIndexTemplates } from './setup/index_templates';
import { seedDefaultSources } from './setup/seed_default_sources';
import { registerIocIndicatorSyncTask, scheduleIocIndicatorSyncTask } from './tasks';

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
    const { agentBuilder, taskManager } = setupDeps;

    // `extract_iocs` is registered globally so Workflow 2 can invoke it
    // directly via a `builtin` step. The other `threat_intel.*` tools live
    // inline on the skill (BuiltinSkillBoundedTool — no `tags`/`availability`)
    // so they're surfaced only when the skill is loaded into a conversation.
    agentBuilder.tools.register(extractIocsTool);

    registerAttachmentTypes(agentBuilder);

    // Internal HTTP route used by the interactive subscription-confirmation
    // attachment. Wiring it in setup keeps the route available even when the
    // experimental skill flag is off — listing existing subscriptions or
    // submitting via the form should not require the skill.
    const router = coreSetup.http.createRouter();
    registerRoutes(router, this.logger);

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
