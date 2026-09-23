/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { z } from '@kbn/zod/v4';
import {
  OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_ENABLED,
  OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_INTERVAL_HOURS,
} from '@kbn/management-settings-ids';
import {
  MAX_ID_LENGTH,
  SIGNIFICANT_EVENTS_KI_EXTRACTION_INFERENCE_FEATURE_ID,
} from '@kbn/significant-events-schema';
import { NIGHTSHIFT_API_PRIVILEGES } from '@kbn/nightshift-shared';
import { createServerRoute } from '../../../create_server_route';
import { assertSignificantEventsAccess } from '../../../utils/assert_significant_events_access';
import {
  DEFAULT_EXTRACTION_INTERVAL_HOURS,
  MAX_SCHEDULED_STREAMS,
} from '../../../../../common/constants';
import { StatusError } from '../../../../lib/errors/status_error';
import { FeatureNotEnabledError } from '../../../../lib/errors/feature_not_enabled_error';
import {
  classifySources,
  type SourceCandidate,
  type SourceClassificationResult,
} from './classify_sources';
import { reconcileSourceCatalog } from '../reconcile_source_catalog';
import { resolveConnectorForFeature } from '../../../utils/resolve_connector_for_feature';

const DEFAULT_LOOKBACK_HOURS = 24;

export interface EligibleStreamsResponse {
  candidates: SourceCandidate[];
  alreadyRunning: SourceClassificationResult['alreadyRunning'];
  upToDate: SourceCandidate[];
  unsupported: string[];
  skipped: SourceCandidate[];
  settings: {
    enabled: boolean;
    intervalHours: number;
  };
  connectorId: string;
  timeRange: {
    from: string;
    to: string;
  };
}

const NumberFromString = z
  .string()
  .max(MAX_ID_LENGTH)
  .optional()
  .transform((value) => {
    if (value === undefined) return undefined;
    const trimmed = value.trim();
    if (trimmed === '') {
      return undefined;
    }
    return Number(trimmed);
  });

const eligibleStreamsRoute = createServerRoute({
  endpoint: 'GET /internal/streams/_extraction/_eligible',
  options: {
    access: 'internal',
    summary: 'List streams eligible for KI extraction',
    description:
      'Classifies streams into eligible candidates, already-running, up-to-date, unsupported, and skipped buckets based on extraction settings and workflow execution state.',
  },
  security: {
    authz: {
      requiredPrivileges: [NIGHTSHIFT_API_PRIVILEGES.read],
    },
  },
  params: z.object({
    query: z
      .object({
        maxScheduledStreams: NumberFromString.pipe(z.number().positive().optional()),
        extractionIntervalHours: NumberFromString.pipe(z.number().min(0).optional()),
        lookbackHours: NumberFromString.pipe(z.number().positive().optional()),
      })
      .optional(),
  }),
  handler: async ({
    params,
    request,
    getScopedClients,
    server,
    workflowClients,
    maintenanceService,
  }): Promise<EligibleStreamsResponse> => {
    const { streamsKIsOnboardingClient } = workflowClients;
    if (!streamsKIsOnboardingClient) {
      throw new FeatureNotEnabledError('Workflows management is not available');
    }

    const { sourcesClient, globalUiSettingsClient, licensing, getKnowledgeIndicatorClient } =
      await getScopedClients({ request });

    await assertSignificantEventsAccess({ server, licensing });

    const query = params?.query ?? {};

    const enabled = await globalUiSettingsClient.get<boolean>(
      OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_ENABLED
    );

    if (!enabled) {
      throw new StatusError('Continuous KI extraction is disabled', 400);
    }

    const intervalHoursSetting = await globalUiSettingsClient.get<number>(
      OBSERVABILITY_STREAMS_CONTINUOUS_KI_EXTRACTION_INTERVAL_HOURS
    );

    const maxStreams = query.maxScheduledStreams ?? MAX_SCHEDULED_STREAMS;
    const lookbackHours = query.lookbackHours ?? DEFAULT_LOOKBACK_HOURS;

    const kiClient = await getKnowledgeIndicatorClient();
    const [connectorId, { sources }] = await Promise.all([
      resolveConnectorForFeature({
        searchInferenceEndpoints: server.searchInferenceEndpoints,
        featureId: SIGNIFICANT_EVENTS_KI_EXTRACTION_INFERENCE_FEATURE_ID,
        featureName: 'knowledge indicator extraction',
        request,
      }),
      reconcileSourceCatalog({
        sourcesClient,
        kiClient,
        onboardingClient: streamsKIsOnboardingClient,
        maintenanceService,
        request,
      }),
    ]);
    const executions = await streamsKIsOnboardingClient.getRecentExecutions();

    const intervalHours =
      query.extractionIntervalHours ?? intervalHoursSetting ?? DEFAULT_EXTRACTION_INTERVAL_HOURS;

    const { alreadyRunning, candidates, upToDate, unsupported } = classifySources({
      sources: sources.filter((source) => source.enabled),
      executions,
      intervalHours,
    });

    const availableSlots = Math.max(0, maxStreams - alreadyRunning.length);
    const toSchedule = candidates.slice(0, availableSlots);
    const skipped = candidates.slice(availableSlots);

    const now = Date.now();
    const start = now - lookbackHours * 3_600_000;

    return {
      candidates: toSchedule,
      alreadyRunning,
      upToDate,
      unsupported,
      skipped,
      settings: {
        enabled,
        intervalHours: intervalHoursSetting ?? DEFAULT_EXTRACTION_INTERVAL_HOURS,
      },
      connectorId,
      timeRange: {
        from: new Date(start).toISOString(),
        to: new Date(now).toISOString(),
      },
    };
  },
});

export const internalKIEligibleStreamsRoutes = {
  ...eligibleStreamsRoute,
};
