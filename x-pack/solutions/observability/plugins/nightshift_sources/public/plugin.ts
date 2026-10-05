/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ApmSourceAccessPluginStart } from '@kbn/apm-sources-access-plugin/public';
import type { CoreStart, Plugin } from '@kbn/core/public';
import type { LogsDataAccessPluginStart } from '@kbn/logs-data-access-plugin/public';
import type { SourceTypePatterns } from '@kbn/nightshift-shared';
import type { NightshiftSourcesRepositoryClient } from './api';
import { getSourceTypePatterns as readSourceTypePatterns } from './lib/get_source_type_patterns';

export interface NightshiftSourcesPublicStartDependencies {
  logsDataAccess?: LogsDataAccessPluginStart;
  apmSourcesAccess?: ApmSourceAccessPluginStart;
}

export interface NightshiftSourcesPublicPluginStart {
  getClient: () => Promise<NightshiftSourcesRepositoryClient>;
  /**
   * Configured log sources and APM trace indices. `null` when an installed plugin failed to
   * answer, so the caller skips the client-side type check.
   */
  getSourceTypePatterns: () => Promise<SourceTypePatterns | null>;
}

export class NightshiftSourcesPublicPlugin
  implements
    Plugin<
      void,
      NightshiftSourcesPublicPluginStart,
      object,
      NightshiftSourcesPublicStartDependencies
    >
{
  setup(): void {}

  start(
    core: CoreStart,
    { logsDataAccess, apmSourcesAccess }: NightshiftSourcesPublicStartDependencies
  ): NightshiftSourcesPublicPluginStart {
    let clientPromise: Promise<NightshiftSourcesRepositoryClient> | undefined;
    return {
      getClient: () => {
        if (!clientPromise) {
          clientPromise = import('./api')
            .then(({ createNightshiftSourcesRepositoryClient }) =>
              createNightshiftSourcesRepositoryClient(core)
            )
            .catch((error) => {
              clientPromise = undefined;
              throw error;
            });
        }
        return clientPromise;
      },
      getSourceTypePatterns: () => readSourceTypePatterns({ logsDataAccess, apmSourcesAccess }),
    };
  }
}
