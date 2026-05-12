/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, CoreStart, Plugin, PluginInitializerContext } from '@kbn/core/public';
import type {
  ThreatIntelligencePluginPublicSetup,
  ThreatIntelligencePluginPublicStart,
  ThreatIntelligencePublicSetupDependencies,
  ThreatIntelligencePublicStartDependencies,
} from './types';
import { registerAttachmentUiDefinitions } from './agent_builder/attachment_types';

export class ThreatIntelligencePlugin
  implements
    Plugin<
      ThreatIntelligencePluginPublicSetup,
      ThreatIntelligencePluginPublicStart,
      ThreatIntelligencePublicSetupDependencies,
      ThreatIntelligencePublicStartDependencies
    >
{
  constructor(_initContext: PluginInitializerContext) {}

  public setup(
    _core: CoreSetup<
      ThreatIntelligencePublicStartDependencies,
      ThreatIntelligencePluginPublicStart
    >,
    _plugins: ThreatIntelligencePublicSetupDependencies
  ): ThreatIntelligencePluginPublicSetup {
    return {};
  }

  public start(
    core: CoreStart,
    plugins: ThreatIntelligencePublicStartDependencies
  ): ThreatIntelligencePluginPublicStart {
    registerAttachmentUiDefinitions(plugins.agentBuilder, core);
    return {};
  }

  public stop() {}
}
