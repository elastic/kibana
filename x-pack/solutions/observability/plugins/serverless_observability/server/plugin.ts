/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, Logger, Plugin, PluginInitializerContext } from '@kbn/core/server';
import {
  OBSERVABILITY_AI_ASSISTANT_PROJECT_SETTINGS,
  OBSERVABILITY_MACHINE_LEARNING_PROJECT_SETTINGS,
  OBSERVABILITY_PROJECT_SETTINGS,
  OBSERVABILITY_STREAMS_TIERED_PROJECT_SETTINGS,
} from '@kbn/serverless-observability-settings';
import { SIGNIFICANT_EVENTS_TIERED_FEATURE } from '@kbn/significant-events-plugin/common';
import type {
  ServerlessObservabilityPluginSetup,
  ServerlessObservabilityPluginStart,
  SetupDependencies,
  StartDependencies,
} from './types';

const OBSERVABILITY_COMPLETE_OVERVIEW_FEATURE_ID = 'observability:complete_overview';
const OBSERVABILITY_GEN_AI_SETTINGS_FEATURE_ID = 'observability:gen_ai_settings';

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
    coreSetup.pricing.registerProductFeatures([
      {
        id: OBSERVABILITY_COMPLETE_OVERVIEW_FEATURE_ID,
        products: [{ name: 'observability', tier: 'complete' }],
        description:
          'Observability Overview Complete - Enables overview of the Observability solution.',
      },
      {
        id: 'observability:workflows',
        products: [{ name: 'observability', tier: 'complete' }],
        description: 'Workflows - Enables the Workflows application in the Observability solution.',
      },
      {
        id: OBSERVABILITY_GEN_AI_SETTINGS_FEATURE_ID,
        products: [{ name: 'observability', tier: 'complete' }],
        description:
          'GenAI Settings management page - Enables Stack Management GenAI Settings for Observability.',
      },
    ]);

    Promise.all([
      coreSetup.pricing.isFeatureAvailable(SIGNIFICANT_EVENTS_TIERED_FEATURE.id),
      coreSetup.pricing.isFeatureAvailable(OBSERVABILITY_COMPLETE_OVERVIEW_FEATURE_ID),
    ])
      .then(([isSignificantEventsAvailable, isCompleteOverviewAvailable]) => {
        pluginsSetup.serverless.setupProjectSettings([
          ...OBSERVABILITY_PROJECT_SETTINGS,
          ...(isCompleteOverviewAvailable ? OBSERVABILITY_MACHINE_LEARNING_PROJECT_SETTINGS : []),
          ...(isSignificantEventsAvailable ? OBSERVABILITY_STREAMS_TIERED_PROJECT_SETTINGS : []),
          ...(pluginsSetup.observabilityAIAssistant
            ? OBSERVABILITY_AI_ASSISTANT_PROJECT_SETTINGS
            : []),
        ]);
      })
      .catch((error) => {
        this.logger.error(`Error setup serverless project settings: ${error}`);
      });

    return {};
  }

  public start() {
    return {};
  }

  public stop() {}
}
