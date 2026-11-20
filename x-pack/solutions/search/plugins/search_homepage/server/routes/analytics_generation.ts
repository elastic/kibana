/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { apiPrivileges } from '@kbn/agent-builder-plugin/common/features';
import { schema } from '@kbn/config-schema';
import type { IRouter, Logger } from '@kbn/core/server';
import { i18n } from '@kbn/i18n';
import {
  ANALYTICS_GENERATION_AVAILABILITY_PATH,
  ANALYTICS_GENERATION_PATH,
  ANALYTICS_USE_CASE_IDS,
} from '../../common/analytics';
import type {
  AnalyticsGenerationAvailability,
  AnalyticsSourceGeneration,
} from '../../common/analytics';
import type { EsqlRunner, GenerationModel } from '../lib/analytics_generation';
import { GenerationOutputError, generateSourceAnalytics } from '../lib/analytics_generation';
import type {
  AnalyticsGenerationConfig,
  GenerationDependencies,
  PreferredEndpointTracker,
} from '../lib/analytics_generation_availability';
import { resolveGenerationModel } from '../lib/analytics_generation_availability';
import type { GenerationCache } from '../lib/analytics_generation_cache';
import { getGenerationCacheKey } from '../lib/analytics_generation_cache';
import { fetchSourceProfile, fetchSourceSchema } from '../lib/analytics_generation_profile';
import { getStatusCode } from './analytics_cluster_state';

const FAILURE_MESSAGE = 'Failed to generate analytics for the event source';
// The longest index name and a generous bound for a field path.
const MAX_SOURCE_NAME_LENGTH = 255;
const MAX_FIELD_NAME_LENGTH = 1024;
/** A generation is given up on before the browser or a proxy would drop the request. */
const GENERATION_DEADLINE_MS = 100_000;

/** One concrete index or data stream: no pattern, list, remote cluster or hidden name. */
export const validateSourceName = (name: string): string | undefined =>
  /^[^\s*?,:"<>|\\/#]+$/.test(name) && !/^[-_+.]/.test(name)
    ? undefined
    : 'must name one index or data stream';

const bodySchema = schema.object({
  source: schema.string({
    minLength: 1,
    maxLength: MAX_SOURCE_NAME_LENGTH,
    validate: validateSourceName,
  }),
  timeField: schema.maybe(schema.string({ minLength: 1, maxLength: MAX_FIELD_NAME_LENGTH })),
  useCaseId: schema.maybe(
    schema.oneOf([
      schema.literal(ANALYTICS_USE_CASE_IDS[0]),
      schema.literal(ANALYTICS_USE_CASE_IDS[1]),
      schema.literal(ANALYTICS_USE_CASE_IDS[2]),
      schema.literal(ANALYTICS_USE_CASE_IDS[3]),
      schema.literal(ANALYTICS_USE_CASE_IDS[4]),
      schema.literal(ANALYTICS_USE_CASE_IDS[5]),
    ])
  ),
  schemaOnly: schema.maybe(schema.boolean()),
  refresh: schema.maybe(schema.boolean()),
});

export interface AnalyticsGenerationRouteDependencies {
  config: AnalyticsGenerationConfig;
  /** Resolved per request: the plugins start after the routes are registered. */
  getDependencies: () => Promise<GenerationDependencies>;
  cache: GenerationCache;
  preferredEndpoint: PreferredEndpointTracker;
}

export const registerAnalyticsGenerationRoutes = (
  router: IRouter,
  logger: Logger,
  { config, getDependencies, cache, preferredEndpoint }: AnalyticsGenerationRouteDependencies
): void => {
  // Both routes ask for the privilege Agent Builder's own routes ask for, as they use its models.
  router.get(
    {
      path: ANALYTICS_GENERATION_AVAILABILITY_PATH,
      validate: false,
      options: { access: 'internal' },
      security: { authz: { requiredPrivileges: [apiPrivileges.readAgentBuilder] } },
    },
    async (context, request, response) => {
      try {
        const resolved = await resolveGenerationModel({
          request,
          config,
          dependencies: await getDependencies(),
          preferredEndpoint,
          logger,
        });
        const body: AnalyticsGenerationAvailability = {
          available: resolved.available,
          ...(!resolved.available && { reason: resolved.reason }),
          sampleValues: config.sampleValues,
        };

        return response.ok({ body });
      } catch (error) {
        logger.error(`Failed to check whether analytics can be generated: ${error.message}`);
        return response.customError({
          statusCode: getStatusCode(error),
          body: { message: 'Failed to check whether analytics can be generated' },
        });
      }
    }
  );

  router.post(
    {
      path: ANALYTICS_GENERATION_PATH,
      validate: { body: bodySchema },
      options: { access: 'internal' },
      security: { authz: { requiredPrivileges: [apiPrivileges.readAgentBuilder] } },
    },
    async (context, request, response) => {
      const { source, timeField, useCaseId, refresh } = request.body;
      const schemaOnly = request.body.schemaOnly === true || !config.sampleValues;
      const abortController = new AbortController();
      const deadline = setTimeout(() => abortController.abort(), GENERATION_DEADLINE_MS);
      const abortSubscription = request.events.aborted$.subscribe(() => abortController.abort());

      try {
        const resolved = await resolveGenerationModel({
          request,
          config,
          dependencies: await getDependencies(),
          preferredEndpoint,
          logger,
        });
        if (!resolved.available) {
          return response.customError({
            statusCode: resolved.reason === 'license' ? 403 : 503,
            body: {
              message: `Analytics cannot be generated: ${resolved.reason}`,
              attributes: { reason: resolved.reason },
            },
          });
        }

        const { model } = resolved;
        const core = await context.core;
        const client = core.elasticsearch.client;
        const user = core.security.authc.getCurrentUser();
        const locale = i18n.getLocale();
        const sourceSchema = await fetchSourceSchema({ client, source, timeField });

        const generate = async (): Promise<AnalyticsSourceGeneration> => {
          const startedAt = Date.now();
          const profile = await fetchSourceProfile({
            client,
            schema: sourceSchema,
            withValues: !schemaOnly,
          });
          const callModel: GenerationModel = async ({ id, system, input, schema: toolSchema }) => {
            const { output } = await model.output({
              id,
              system,
              input,
              schema: toolSchema,
              abortSignal: abortController.signal,
              maxRetries: 1,
              retry: { onValidationError: 1 },
            });
            return output;
          };
          const run: EsqlRunner = async ({ query, filter, params }) => {
            const { columns, values } = await client.asCurrentUser.esql.query(
              { query, ...(filter && { filter }), ...(params && { params }) },
              { signal: abortController.signal }
            );
            return {
              columns: columns.map(({ name, type }) => ({ name, type })),
              rowCount: values.length,
            };
          };

          const { modelCalls, counts, ...generated } = await generateSourceAnalytics({
            profile,
            model: callModel,
            run,
            useCaseId,
            locale,
            logger,
          });
          const calls = model.getCalls();

          return {
            ...generated,
            model: calls.find(({ model: name }) => name !== undefined)?.model ?? model.name,
            schemaOnly,
            cached: false,
            generatedAt: Date.now(),
            stats: {
              latencyMs: Date.now() - startedAt,
              modelCalls,
              inputTokens: calls.reduce((sum, { tokens }) => sum + (tokens?.prompt ?? 0), 0),
              outputTokens: calls.reduce((sum, { tokens }) => sum + (tokens?.completion ?? 0), 0),
              ...counts,
            },
          };
        };

        const body = await cache.getOrGenerate(
          getGenerationCacheKey({
            userId: user?.profile_uid ?? `${user?.authentication_realm.name}:${user?.username}`,
            source,
            mappingHash: sourceSchema.mappingHash,
            timeField: sourceSchema.timeField,
            useCaseId,
            schemaOnly,
            connectorId: model.connectorId,
            locale,
          }),
          generate,
          { refresh }
        );
        logger.debug(
          `Generated analytics for ${source} with ${body.model}: cached=${
            body.cached
          } ${JSON.stringify(body.stats)}`
        );

        return response.ok({ body });
      } catch (error) {
        const statusCode = getStatusCode(error);
        if (statusCode === 403) {
          logger.debug(`${FAILURE_MESSAGE}, the caller lacks privileges: ${error.message}`);
          return response.forbidden({
            body: { message: 'Insufficient privileges to read this event source' },
          });
        }
        if (statusCode === 404) {
          return response.notFound({ body: { message: 'The event source does not exist' } });
        }
        if (error instanceof GenerationOutputError) {
          logger.warn(`${FAILURE_MESSAGE} ${source}: ${error.message}`);
          return response.customError({ statusCode: 502, body: { message: FAILURE_MESSAGE } });
        }
        logger.error(`${FAILURE_MESSAGE} ${source}: ${error.message}`);
        return response.customError({ statusCode, body: { message: FAILURE_MESSAGE } });
      } finally {
        clearTimeout(deadline);
        abortSubscription.unsubscribe();
      }
    }
  );
};
