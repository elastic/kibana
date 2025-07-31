/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger, Plugin, PluginInitializerContext } from '@kbn/core/server';
import {
  OBSERVABILITY_AI_ASSISTANT_PROJECT_SETTINGS,
  OBSERVABILITY_PROJECT_SETTINGS,
  OBSERVABILITY_STREAMS_TIERED_PROJECT_SETTINGS,
} from '@kbn/serverless-observability-settings';
import { STREAMS_TIERED_SIGNIFICANT_EVENT_FEATURE } from '@kbn/streams-plugin/common';
import type {
  ServerlessObservabilityPluginSetup,
  ServerlessObservabilityPluginStart,
  SetupDependencies,
  StartDependencies,
} from './types';

export class ServerlessObservabilityPlugin
  implements
    Plugin<
      ServerlessObservabilityPluginSetup,
      ServerlessObservabilityPluginStart,
      SetupDependencies,
      StartDependencies
    >
{
  private logger: Logger;

  constructor(context: PluginInitializerContext) {
    this.logger = context.logger.get();
  }

  public setup(
    coreSetup: CoreSetup<StartDependencies, ServerlessObservabilityPluginStart>,
    pluginsSetup: SetupDependencies
  ) {
    coreSetup.pricing
      .isFeatureAvailable(STREAMS_TIERED_SIGNIFICANT_EVENT_FEATURE.id)
      .then((isSignificantEventsAvailable) => {
        pluginsSetup.serverless.setupProjectSettings([
          ...OBSERVABILITY_PROJECT_SETTINGS,
          ...(isSignificantEventsAvailable ? OBSERVABILITY_STREAMS_TIERED_PROJECT_SETTINGS : []),
          ...(pluginsSetup.observabilityAIAssistant
            ? OBSERVABILITY_AI_ASSISTANT_PROJECT_SETTINGS
            : []),
        ]);
      })
      .catch((error) => {
        this.logger.error(`Error setup serverless project settings: ${error}`);
      });

    coreSetup.pricing.registerProductFeatures([
      {
        id: 'observability:complete_overview',
        products: [{ name: 'observability', tier: 'complete' }],
        description:
          'Observability Overview Complete - Enables overview of the Observability solution.',
      },
    ]);
    return {};
  }

  public start() {
    return {};
  }

  public stop() {}
}
