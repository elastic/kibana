/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreStart, Logger } from '@kbn/core/server';
import type { SourceChangeEvent } from '@kbn/nightshift-sources-plugin/server';
import type { SignificantEventsPluginStartDependencies } from '../../types';
import type { SignificantEventsMaintenanceService } from '../maintenance/maintenance_service';
import type { SignificantEventsScheduledWorkflowsService } from '../workflows/significant_events_scheduled_workflows';
import { getSourcePresenceEnabledTarget } from '../source_presence/get_source_presence_enabled_target';
import {
  assertValidDetectionWindow,
  resolveScheduledDiscoveryConfig,
} from './scheduled_discovery_config';
import { setScheduledDiscoveryEnabled } from './set_scheduled_discovery_enabled';

interface StartServices {
  coreStart: Pick<CoreStart, 'savedObjects' | 'uiSettings'>;
  pluginsStart: Pick<
    SignificantEventsPluginStartDependencies,
    'nightshiftSources' | 'agentBuilder'
  >;
}

/** Enables scheduled discovery on the first source and disables it when the last source is deleted. */
export const syncScheduledDiscovery = async ({
  event,
  workflowService,
  maintenanceService,
  getStartServices,
  logger,
}: {
  event: SourceChangeEvent;
  workflowService?: SignificantEventsScheduledWorkflowsService;
  maintenanceService?: Pick<
    SignificantEventsMaintenanceService,
    'getState' | 'clearScheduledDiscoveryRestore'
  >;
  getStartServices: () => Promise<StartServices>;
  logger: Logger;
}): Promise<void> => {
  if (event.type === 'updated' || !workflowService) {
    return;
  }

  const maintenanceState = await maintenanceService?.getState({ request: event.request });
  if (maintenanceState === 'paused' && event.type !== 'deleted') {
    return;
  }

  const { coreStart, pluginsStart } = await getStartServices();
  const sourcesClient = await pluginsStart.nightshiftSources.getSourcesClient({
    request: event.request,
  });
  // Concurrent first creates can both observe total 2 and miss the transition.
  const { total } = await sourcesClient.list({ page: 1, perPage: 1 });

  if (maintenanceState === 'paused') {
    if (total === 0) {
      await maintenanceService?.clearScheduledDiscoveryRestore({ request: event.request });
    }
    return;
  }

  const enabled = getSourcePresenceEnabledTarget({
    eventType: event.type,
    total,
  });
  if (enabled === undefined) {
    return;
  }

  const uiSettingsClient = coreStart.uiSettings.asScopedToClient(
    coreStart.savedObjects.getUnsafeInternalClient().asScopedToNamespace(event.request.spaceId)
  );
  const settings = await uiSettingsClient.getAll<boolean | number>();
  const config = resolveScheduledDiscoveryConfig(settings);
  // An invalid stored window fails the install. It must not block last-source teardown.
  if (enabled) {
    assertValidDetectionWindow(config);
  }
  await setScheduledDiscoveryEnabled({
    uiSettingsClient,
    workflowService,
    agentBuilder: pluginsStart.agentBuilder,
    request: event.request,
    spaceId: event.request.spaceId,
    enabled,
    config,
    logger,
    // Last-source teardown must not wait on in-flight runs, or the source DELETE races the drain.
    ...(enabled ? {} : { skipExecutionDrain: true }),
  });
};
