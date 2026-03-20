/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { IKibanaResponse, IRouter, Logger } from '@kbn/core/server';
import { transformError } from '@kbn/securitysolution-es-utils';
import { buildRouteValidationWithZod } from '@kbn/zod-helpers';
import { z } from '@kbn/zod';
import type { ElasticAssistantRequestHandlerContext } from '../../types';
import { PLUGIN_ID } from '../../../common/constants';
import {
  PipelineMetricsCollector,
  type PipelineMetrics,
  type PipelineHealthStatus,
} from '../../lib/alert_investigation/metrics';
import type { PipelineConfig } from '../../lib/alert_investigation/types';
import { DEFAULT_PIPELINE_CONFIG } from '../../lib/alert_investigation/types';

const metricsCollectorsBySpace = new Map<string, PipelineMetricsCollector>();

export const getOrCreateMetricsCollector = (spaceId: string): PipelineMetricsCollector => {
  let collector = metricsCollectorsBySpace.get(spaceId);
  if (!collector) {
    collector = new PipelineMetricsCollector();
    metricsCollectorsBySpace.set(spaceId, collector);
  }
  return collector;
};

type MutablePipelineConfig = {
  -readonly [K in keyof PipelineConfig]: PipelineConfig[K] extends object
    ? { -readonly [P in keyof PipelineConfig[K]]: PipelineConfig[K][P] }
    : PipelineConfig[K];
};

const pipelineConfigBySpace = new Map<string, Partial<MutablePipelineConfig>>();

export const getPipelineConfig = (spaceId: string): PipelineConfig => {
  const overrides = pipelineConfigBySpace.get(spaceId) ?? {};
  return {
    ...DEFAULT_PIPELINE_CONFIG,
    ...overrides,
    deduplication: { ...DEFAULT_PIPELINE_CONFIG.deduplication, ...overrides.deduplication },
    entityExtraction: {
      ...DEFAULT_PIPELINE_CONFIG.entityExtraction,
      ...overrides.entityExtraction,
    },
    caseMatching: {
      ...DEFAULT_PIPELINE_CONFIG.caseMatching,
      ...overrides.caseMatching,
      weights: {
        ...DEFAULT_PIPELINE_CONFIG.caseMatching.weights,
        ...overrides.caseMatching?.weights,
      },
    },
    incrementalAd: { ...DEFAULT_PIPELINE_CONFIG.incrementalAd, ...overrides.incrementalAd },
  };
};

const PipelineConfigBody = z.object({
  enabled: z.boolean().optional(),
  interval_minutes: z.number().min(1).max(1440).optional(),
  deduplication: z
    .object({
      enabled: z.boolean().optional(),
      similarity_threshold: z.number().min(0).max(1).optional(),
      max_results: z.number().min(1).max(10000).optional(),
    })
    .optional(),
  entity_extraction: z
    .object({
      enabled: z.boolean().optional(),
    })
    .optional(),
  case_matching: z
    .object({
      enabled: z.boolean().optional(),
      strategy: z.enum(['strict', 'relaxed', 'weighted', 'temporal']).optional(),
      match_threshold: z.number().min(0).max(1).optional(),
      temporal_decay_days: z.number().min(1).max(365).optional(),
    })
    .optional(),
  incremental_ad: z
    .object({
      enabled: z.boolean().optional(),
      min_new_alerts: z.number().min(1).max(1000).optional(),
      auto_trigger_on_attachment: z.boolean().optional(),
    })
    .optional(),
});

export const registerPipelineObservabilityRoutes = (
  router: IRouter<ElasticAssistantRequestHandlerContext>,
  logger: Logger
): void => {
  router.get(
    {
      path: '/internal/elastic_assistant/alert_investigation/_health',
      validate: false,
      options: {
        tags: ['access:elasticAssistant'],
      },
      security: {
        authz: {
          requiredPrivileges: [PLUGIN_ID],
        },
      },
    },
    async (context, _request, response): Promise<IKibanaResponse<PipelineHealthStatus>> => {
      try {
        const assistantContext = await context.elasticAssistant;
        const spaceId = assistantContext.getSpaceId();
        const collector = getOrCreateMetricsCollector(spaceId);

        return response.ok({ body: collector.getHealthStatus() });
      } catch (err) {
        const error = transformError(err);
        logger.error(`Pipeline health check failed: ${error.message}`);
        return response.customError({
          body: { message: 'Pipeline health check failed' },
          statusCode: error.statusCode,
        });
      }
    }
  );

  router.get(
    {
      path: '/internal/elastic_assistant/alert_investigation/_metrics',
      validate: false,
      options: {
        tags: ['access:elasticAssistant'],
      },
      security: {
        authz: {
          requiredPrivileges: [PLUGIN_ID],
        },
      },
    },
    async (context, _request, response): Promise<IKibanaResponse<PipelineMetrics>> => {
      try {
        const assistantContext = await context.elasticAssistant;
        const spaceId = assistantContext.getSpaceId();
        const collector = getOrCreateMetricsCollector(spaceId);

        return response.ok({ body: collector.getMetrics() });
      } catch (err) {
        const error = transformError(err);
        logger.error(`Pipeline metrics fetch failed: ${error.message}`);
        return response.customError({
          body: { message: 'Pipeline metrics fetch failed' },
          statusCode: error.statusCode,
        });
      }
    }
  );

  router.get(
    {
      path: '/internal/elastic_assistant/alert_investigation/_config',
      validate: false,
      options: {
        tags: ['access:elasticAssistant'],
      },
      security: {
        authz: {
          requiredPrivileges: [PLUGIN_ID],
        },
      },
    },
    async (context, _request, response): Promise<IKibanaResponse<PipelineConfig>> => {
      try {
        const assistantContext = await context.elasticAssistant;
        const spaceId = assistantContext.getSpaceId();

        return response.ok({ body: getPipelineConfig(spaceId) });
      } catch (err) {
        const error = transformError(err);
        logger.error(`Pipeline config fetch failed: ${error.message}`);
        return response.customError({
          body: { message: 'Pipeline config fetch failed' },
          statusCode: error.statusCode,
        });
      }
    }
  );

  router.put(
    {
      path: '/internal/elastic_assistant/alert_investigation/_config',
      validate: {
        body: buildRouteValidationWithZod(PipelineConfigBody),
      },
      options: {
        tags: ['access:elasticAssistant'],
      },
      security: {
        authz: {
          requiredPrivileges: [PLUGIN_ID],
        },
      },
    },
    async (context, request, response): Promise<IKibanaResponse<PipelineConfig>> => {
      try {
        const assistantContext = await context.elasticAssistant;
        const spaceId = assistantContext.getSpaceId();
        const body = request.body;

        const existing = pipelineConfigBySpace.get(spaceId) ?? {};
        const updated: Partial<MutablePipelineConfig> = {
          ...existing,
          ...(body.enabled != null ? { enabled: body.enabled } : {}),
          ...(body.interval_minutes != null ? { intervalMinutes: body.interval_minutes } : {}),
        };

        if (body.deduplication) {
          updated.deduplication = {
            ...DEFAULT_PIPELINE_CONFIG.deduplication,
            ...existing.deduplication,
            ...(body.deduplication.enabled != null ? { enabled: body.deduplication.enabled } : {}),
            ...(body.deduplication.similarity_threshold != null
              ? { similarityThreshold: body.deduplication.similarity_threshold }
              : {}),
            ...(body.deduplication.max_results != null
              ? { maxResults: body.deduplication.max_results }
              : {}),
          };
        }

        if (body.case_matching) {
          updated.caseMatching = {
            ...DEFAULT_PIPELINE_CONFIG.caseMatching,
            ...existing.caseMatching,
            ...(body.case_matching.enabled != null ? { enabled: body.case_matching.enabled } : {}),
            ...(body.case_matching.strategy != null
              ? { strategy: body.case_matching.strategy }
              : {}),
            ...(body.case_matching.match_threshold != null
              ? { matchThreshold: body.case_matching.match_threshold }
              : {}),
            ...(body.case_matching.temporal_decay_days != null
              ? { temporalDecayDays: body.case_matching.temporal_decay_days }
              : {}),
          };
        }

        if (body.incremental_ad) {
          updated.incrementalAd = {
            ...DEFAULT_PIPELINE_CONFIG.incrementalAd,
            ...existing.incrementalAd,
            ...(body.incremental_ad.enabled != null
              ? { enabled: body.incremental_ad.enabled }
              : {}),
            ...(body.incremental_ad.min_new_alerts != null
              ? { minNewAlerts: body.incremental_ad.min_new_alerts }
              : {}),
            ...(body.incremental_ad.auto_trigger_on_attachment != null
              ? { autoTriggerOnAttachment: body.incremental_ad.auto_trigger_on_attachment }
              : {}),
          };
        }

        pipelineConfigBySpace.set(spaceId, updated);
        const resolved = getPipelineConfig(spaceId);

        logger.info(`Pipeline config updated for space '${spaceId}'`);

        return response.ok({ body: resolved });
      } catch (err) {
        const error = transformError(err);
        logger.error(`Pipeline config update failed: ${error.message}`);
        return response.customError({
          body: { message: 'Pipeline config update failed' },
          statusCode: error.statusCode,
        });
      }
    }
  );
};
