/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED } from '@kbn/management-settings-ids';
import { NIGHTSHIFT_MANAGE_AND_CONFIGURE_API_PRIVILEGES } from '@kbn/nightshift-shared';
import { createServerRoute } from '../../create_server_route';
import { assertSignificantEventsAccess } from '../../utils/assert_significant_events_access';
import { assertNotPaused } from '../../utils/assert_not_paused';
import { FeatureNotEnabledError } from '../../../lib/errors/feature_not_enabled_error';
import {
  SCHEDULED_DISCOVERY_NUMERIC_SETTINGS,
  assertValidDetectionWindow,
  resolveScheduledDiscoveryConfig,
  type ScheduledDiscoveryNumericField,
} from '../../../lib/scheduled_discovery/scheduled_discovery_config';
import { setScheduledDiscoveryEnabled } from '../../../lib/scheduled_discovery/set_scheduled_discovery_enabled';
import {
  MAX_SIG_EVENTS_SCHEDULED_BATCH_SIZE,
  MAX_SIG_EVENTS_SCHEDULED_DETECTION_BUCKET_INTERVAL_MINUTES,
  MAX_SIG_EVENTS_SCHEDULED_REVIEW_PASSES,
  MAX_SIG_EVENTS_FLAKY_RULE_DETECTION_THRESHOLD,
  MAX_SIG_EVENTS_FLAKY_RULE_PROBE_AFTER_MINUTES,
  MAX_SIG_EVENTS_FLAKY_RULE_EXEMPT_SEVERITY_SCORE,
  MIN_SIG_EVENTS_SCHEDULED_BATCH_SIZE,
  MIN_SIG_EVENTS_SCHEDULED_DETECTION_BUCKET_INTERVAL_MINUTES,
  MIN_SIG_EVENTS_SCHEDULED_DETECTION_LOOKBACK_MINUTES,
  MIN_SIG_EVENTS_SCHEDULED_INTERVAL_MINUTES,
  MIN_SIG_EVENTS_SCHEDULED_REVIEW_PASSES,
  MIN_SIG_EVENTS_FLAKY_RULE_DETECTION_THRESHOLD,
  MIN_SIG_EVENTS_FLAKY_RULE_PROBE_AFTER_MINUTES,
  MIN_SIG_EVENTS_FLAKY_RULE_EXEMPT_SEVERITY_SCORE,
} from '../../../../common/constants';

const scheduledDiscoverySettingsSchema = z.object({
  enabled: z.boolean().optional(),
  detectionIntervalMinutes: z.number().min(MIN_SIG_EVENTS_SCHEDULED_INTERVAL_MINUTES).optional(),
  detectionBucketIntervalMinutes: z
    .number()
    .min(MIN_SIG_EVENTS_SCHEDULED_DETECTION_BUCKET_INTERVAL_MINUTES)
    .max(MAX_SIG_EVENTS_SCHEDULED_DETECTION_BUCKET_INTERVAL_MINUTES)
    .optional(),
  detectionLookbackMinutes: z
    .number()
    .min(MIN_SIG_EVENTS_SCHEDULED_DETECTION_LOOKBACK_MINUTES)
    .optional(),
  targetCoverageMinutes: z.number().min(MIN_SIG_EVENTS_SCHEDULED_INTERVAL_MINUTES).optional(),
  reviewIntervalMinutes: z.number().min(MIN_SIG_EVENTS_SCHEDULED_INTERVAL_MINUTES).optional(),
  discoveryBatchSize: z
    .number()
    .min(MIN_SIG_EVENTS_SCHEDULED_BATCH_SIZE)
    .max(MAX_SIG_EVENTS_SCHEDULED_BATCH_SIZE)
    .optional(),
  maxReviewPasses: z
    .number()
    .min(MIN_SIG_EVENTS_SCHEDULED_REVIEW_PASSES)
    .max(MAX_SIG_EVENTS_SCHEDULED_REVIEW_PASSES)
    .optional(),
  flakyRuleDetectionThreshold: z
    .number()
    .min(MIN_SIG_EVENTS_FLAKY_RULE_DETECTION_THRESHOLD)
    .max(MAX_SIG_EVENTS_FLAKY_RULE_DETECTION_THRESHOLD)
    .optional(),
  flakyRuleProbeAfterMinutes: z
    .number()
    .min(MIN_SIG_EVENTS_FLAKY_RULE_PROBE_AFTER_MINUTES)
    .max(MAX_SIG_EVENTS_FLAKY_RULE_PROBE_AFTER_MINUTES)
    .optional(),
  flakyRuleExemptSeverityScore: z
    .number()
    .min(MIN_SIG_EVENTS_FLAKY_RULE_EXEMPT_SEVERITY_SCORE)
    .max(MAX_SIG_EVENTS_FLAKY_RULE_EXEMPT_SEVERITY_SCORE)
    .optional(),
});

const putScheduledDiscoverySettingsBodySchema = z.object({
  scheduledDiscovery: scheduledDiscoverySettingsSchema,
});

const putScheduledDiscoverySettingsRoute = createServerRoute({
  endpoint: 'PUT /internal/streams/_significant_events/scheduled_discovery/settings',
  options: {
    access: 'internal',
    summary: 'Update scheduled Significant Events discovery settings',
    description:
      'Updates per-space scheduled Significant Events discovery settings and reconciles the associated workflows when the scheduling settings change.',
  },
  security: {
    authz: {
      requiredPrivileges: NIGHTSHIFT_MANAGE_AND_CONFIGURE_API_PRIVILEGES,
    },
  },
  params: z.object({
    body: putScheduledDiscoverySettingsBodySchema,
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
    significantEventsScheduledWorkflowsService,
    maintenanceService,
    getSpaceId,
    logger,
  }): Promise<{ success: true }> => {
    const { licensing, uiSettingsClient } = await getScopedClients({ request });
    await assertSignificantEventsAccess({ server, licensing });

    const workflowService = significantEventsScheduledWorkflowsService;
    if (!workflowService) {
      throw new FeatureNotEnabledError('Workflows management is not available');
    }

    const { scheduledDiscovery } = params.body;

    const spaceUpdates: Record<string, number> = {};
    for (const field of Object.keys(
      SCHEDULED_DISCOVERY_NUMERIC_SETTINGS
    ) as ScheduledDiscoveryNumericField[]) {
      const value = scheduledDiscovery[field];
      if (value !== undefined) {
        spaceUpdates[SCHEDULED_DISCOVERY_NUMERIC_SETTINGS[field].settingId] = value;
      }
    }

    const previousSpaceValues: Record<string, number> = {};
    const spaceKeys = Object.keys(spaceUpdates);
    const spaceSettings = await uiSettingsClient.getAll<boolean | number>();

    const previousEnabled =
      (spaceSettings[
        OBSERVABILITY_STREAMS_SIGNIFICANT_EVENTS_SCHEDULED_DISCOVERY_ENABLED
      ] as boolean) ?? false;
    const nextEnabled = scheduledDiscovery.enabled ?? previousEnabled;

    // Feature toggles are owned by Pause/Resume while paused — no edits allowed
    // (enable, disable, or config-only updates).
    if (scheduledDiscovery.enabled !== undefined || spaceKeys.length > 0) {
      await assertNotPaused({ maintenanceService, request });
    }

    for (const key of spaceKeys) {
      const previous = spaceSettings[key];
      if (typeof previous === 'number') {
        previousSpaceValues[key] = previous;
      }
    }

    // Request values win over stored settings, which win over the registered default.
    // Validated before either write so a partial update cannot combine into an invalid
    // change_point configuration.
    const resolvedConfig = resolveScheduledDiscoveryConfig({
      ...spaceSettings,
      ...spaceUpdates,
    });
    assertValidDetectionWindow(resolvedConfig);

    const rollbackSettings = async () => {
      if (Object.keys(previousSpaceValues).length === 0) {
        return;
      }
      await uiSettingsClient.setMany(previousSpaceValues).catch((rollbackErr) => {
        logger.warn(`Failed to rollback space settings after workflow sync error: ${rollbackErr}`);
      });
    };

    try {
      // Persist numeric settings inside the try so a partial write failure is reverted
      // alongside a downstream workflow reconciliation failure. The enabled toggle is
      // written by setScheduledDiscoveryEnabled, which rolls that write back itself.
      if (spaceKeys.length > 0) {
        await uiSettingsClient.setMany(spaceUpdates);
      }

      const enabledChanged =
        scheduledDiscovery.enabled !== undefined && scheduledDiscovery.enabled !== previousEnabled;
      const configChanged = spaceKeys.length > 0;

      if (enabledChanged || (nextEnabled && configChanged)) {
        await setScheduledDiscoveryEnabled({
          uiSettingsClient,
          workflowService,
          agentBuilder: server.agentBuilder,
          request,
          spaceId: await getSpaceId(request),
          enabled: nextEnabled,
          config: resolvedConfig,
          logger,
          ...(enabledChanged ? {} : { reconcileWhenUnchanged: true }),
        });
      }
    } catch (err) {
      await rollbackSettings();
      throw err;
    }

    return { success: true };
  },
});

export const internalScheduledDiscoveryRoutes = {
  ...putScheduledDiscoverySettingsRoute,
};
