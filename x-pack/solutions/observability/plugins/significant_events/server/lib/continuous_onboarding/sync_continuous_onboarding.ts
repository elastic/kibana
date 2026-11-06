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
import type { ContinuousOnboardingWorkflowService } from '../workflows/continuous_onboarding_workflow';
import { canManageSecurity } from '../service_accounts/detection_engine_account';
import { getContinuousOnboardingTarget } from './get_continuous_onboarding_target';
import { setContinuousOnboardingEnabled } from './set_continuous_onboarding_enabled';

interface StartServices {
  coreStart: Pick<CoreStart, 'savedObjects' | 'uiSettings' | 'elasticsearch'>;
  pluginsStart: Pick<SignificantEventsPluginStartDependencies, 'nightshiftSources'>;
}

export const syncContinuousOnboarding = async ({
  event,
  workflowService,
  maintenanceService,
  getStartServices,
  logger,
}: {
  event: SourceChangeEvent;
  workflowService?: ContinuousOnboardingWorkflowService;
  maintenanceService?: Pick<
    SignificantEventsMaintenanceService,
    'getState' | 'clearContinuousOnboardingRestore'
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
      await maintenanceService?.clearContinuousOnboardingRestore({ request: event.request });
    }
    return;
  }

  const enabled = getContinuousOnboardingTarget({
    eventType: event.type,
    total,
  });
  if (enabled === undefined) {
    return;
  }

  // Installing and switching on a workflow bound to the detection engine account needs the
  // caller's `manage_security`, which a source author usually lacks. Say so instead of failing
  // the toggle and rolling it back: an administrator turns continuous extraction on.
  if (enabled && !(await canManageSecurity({ core: coreStart, request: event.request }))) {
    logger.warn(
      'Continuous onboarding was not turned on after the first source was created: it needs a user with the manage_security privilege. Turn it on from an administrator account.'
    );
    return;
  }

  const uiSettingsClient = coreStart.uiSettings.asScopedToClient(
    coreStart.savedObjects.getUnsafeInternalClient().asScopedToNamespace(event.request.spaceId)
  );
  await setContinuousOnboardingEnabled({
    uiSettingsClient,
    workflowService,
    request: event.request,
    spaceId: event.request.spaceId,
    enabled,
    logger,
    // Last-source reconciliation cancels that source's run. This listener only stops future
    // schedules so the source DELETE does not wait for or race a space-wide execution drain.
    ...(enabled ? {} : { skipExecutionDrain: true }),
  });
};
