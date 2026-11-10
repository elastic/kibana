/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import { OBSERVABILITY_NIGHTSHIFT_CONTINUOUS_ONBOARDING_INTERVAL_HOURS } from '@kbn/management-settings-ids';
import { NIGHTSHIFT_MANAGE_AND_CONFIGURE_API_PRIVILEGES } from '@kbn/nightshift-shared';
import { createServerRoute } from '../../../create_server_route';
import { assertSignificantEventsAccess } from '../../../utils/assert_significant_events_access';
import { assertNotPaused } from '../../../utils/assert_not_paused';
import { FeatureNotEnabledError } from '../../../../lib/errors/feature_not_enabled_error';
import { MIN_EXTRACTION_INTERVAL_HOURS } from '../../../../../common/constants';
import { setContinuousOnboardingEnabled } from '../../../../lib/continuous_onboarding/set_continuous_onboarding_enabled';

const putContinuousKiExtractionSettingsBodySchema = z.object({
  continuousKiExtraction: z.object({
    enabled: z.boolean().optional(),
    intervalHours: z.number().min(MIN_EXTRACTION_INTERVAL_HOURS).optional(),
  }),
});

const putContinuousKIExtractionSettingsRoute = createServerRoute({
  endpoint: 'PUT /internal/streams/_knowledge_indicators/continuous_ki_extraction/settings',
  options: {
    access: 'internal',
    summary: 'Update continuous KI extraction settings',
    description:
      'Updates the continuous KI onboarding settings (enabled, interval) of the current space and enables or disables the space onboarding workflow accordingly.',
  },
  security: {
    authz: {
      requiredPrivileges: NIGHTSHIFT_MANAGE_AND_CONFIGURE_API_PRIVILEGES,
    },
  },
  params: z.object({
    body: putContinuousKiExtractionSettingsBodySchema,
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
    continuousOnboardingWorkflowService,
    maintenanceService,
    logger,
  }): Promise<{ success: true }> => {
    if (!continuousOnboardingWorkflowService) {
      throw new FeatureNotEnabledError('Workflows management is not available');
    }

    const { licensing, uiSettingsClient } = await getScopedClients({
      request,
    });
    await assertSignificantEventsAccess({ server, licensing });

    const { continuousKiExtraction } = params.body;

    // Feature toggles are owned by Pause/Resume while paused — no edits allowed.
    if (
      continuousKiExtraction.enabled !== undefined ||
      continuousKiExtraction.intervalHours !== undefined
    ) {
      await assertNotPaused({ maintenanceService, request });
    }

    const updates: Record<string, boolean | number | string> = {};
    if (continuousKiExtraction.intervalHours !== undefined) {
      updates[OBSERVABILITY_NIGHTSHIFT_CONTINUOUS_ONBOARDING_INTERVAL_HOURS] =
        continuousKiExtraction.intervalHours;
    }

    const previousValues: Record<string, boolean | number | string> = {};
    const keys = Object.keys(updates);
    const allSettings = await uiSettingsClient.getAll<boolean | number | string>();
    if (keys.length > 0) {
      for (const key of keys) {
        previousValues[key] = allSettings[key];
      }
      await uiSettingsClient.setMany(updates);
    }

    try {
      if (continuousKiExtraction.enabled !== undefined) {
        await setContinuousOnboardingEnabled({
          uiSettingsClient,
          workflowService: continuousOnboardingWorkflowService,
          enabled: continuousKiExtraction.enabled,
          request,
          spaceId: request.spaceId,
          logger,
        });
      }
    } catch (err) {
      if (Object.keys(previousValues).length > 0) {
        await uiSettingsClient.setMany(previousValues).catch((rollbackErr) => {
          logger.warn(`Failed to rollback settings after workflow sync error: ${rollbackErr}`);
        });
      }
      throw err;
    }

    return { success: true };
  },
});

export const internalKIContinuousKIExtractionRoutes = {
  ...putContinuousKIExtractionSettingsRoute,
};
