/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, KibanaRequest } from '@kbn/core/server';
import type {
  SyntheticsPluginsSetupDependencies,
  SyntheticsPluginsStartDependencies,
} from '../types';
import { MonitorConfigRepository } from '../services/monitor_config_repository';
import { ConfigKey } from '../../common/runtime_types';

export function registerDataProviders({
  core,
  plugins,
}: {
  core: CoreSetup;
  plugins: SyntheticsPluginsSetupDependencies;
}) {
  const { observabilityAgentBuilder } = plugins;
  if (!observabilityAgentBuilder) {
    return;
  }

  observabilityAgentBuilder.registerDataProvider(
    'syntheticsMonitorDetails',
    async ({ request, configId }: { request: KibanaRequest; configId: string }) => {
      const [coreStart, pluginsStart] = await (
        core as CoreSetup<SyntheticsPluginsStartDependencies>
      ).getStartServices();

      const savedObjectsClient = coreStart.savedObjects.getScopedClient(request);
      const encryptedSavedObjectsClient = pluginsStart.encryptedSavedObjects.getClient();

      const monitorConfigRepository = new MonitorConfigRepository(
        savedObjectsClient,
        encryptedSavedObjectsClient
      );

      const monitor = await monitorConfigRepository.get(configId);
      const { attributes } = monitor;

      return {
        id: monitor.id,
        name: attributes[ConfigKey.NAME],
        type: attributes[ConfigKey.MONITOR_TYPE],
        enabled: attributes[ConfigKey.ENABLED],
        schedule: attributes[ConfigKey.SCHEDULE],
        locations: attributes[ConfigKey.LOCATIONS],
        tags: attributes[ConfigKey.TAGS],
      };
    }
  );
}
