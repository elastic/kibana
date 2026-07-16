/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { InsufficientMLCapabilities, MLPrivilegesUninitialized } from '@kbn/ml-plugin/server';
import {
  GetAnomalyOverviewRequestBody,
  GetAnomalyOverviewRequestParams,
  GetAnomalySummaryRequestBody,
  GetAnomalySummaryRequestParams,
} from '../../../../common/api/entity_analytics';
import {
  API_VERSIONS,
  APP_ID,
  ENTITY_ANOMALY_OVERVIEW_INTERNAL_URL,
  ENTITY_ANOMALY_PRIVILEGES_INTERNAL_URL,
  ENTITY_ANOMALY_SUMMARY_INTERNAL_URL,
  ML_ANOMALIES_INDEX,
} from '../../../../common/constants';
import type { EntityAnalyticsRoutesDeps } from '../types';
import { withMinimumLicense } from '../utils/with_minimum_license';
import { checkEntityExists, EntityStoreAccessError } from '../utils/check_entity_exists';
import { getEntityAnomalies } from './get_anomaly_details';
import { DEFAULT_OVERVIEW_LOOKBACK_MS, getEntityAnomalyOverview } from './get_anomaly_overview';
import { _formatPrivileges, hasReadWritePermissions } from '../utils/check_and_format_privileges';

const ONE_YEAR_MS = 365 * 24 * 60 * 60 * 1000;

const getStartOfDayOneYearAgo = (): number => {
  const d = new Date(Date.now() - ONE_YEAR_MS);
  d.setUTCHours(0, 0, 0, 0);
  return d.getTime();
};

export const registerAnomalySummaryRoutes = ({
  router,
  logger,
  ml,
  getStartServices,
}: EntityAnalyticsRoutesDeps) => {
  router.versioned
    .get({
      access: 'internal',
      path: ENTITY_ANOMALY_PRIVILEGES_INTERNAL_URL,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution', `${APP_ID}-entity-analytics`],
        },
      },
    })
    .addVersion(
      { version: API_VERSIONS.internal.v1, validate: false },
      async (__, request, response) => {
        const siemResponse = buildSiemResponse(response);
        try {
          const [_, { security }] = await getStartServices();
          const checkPrivileges = security.authz.checkPrivilegesDynamicallyWithRequest(request);
          const { privileges, hasAllRequested } = await checkPrivileges({
            elasticsearch: {
              cluster: [],
              index: { [ML_ANOMALIES_INDEX]: ['read'] },
            },
            kibana: [security.authz.actions.ui.get('ml', 'canGetJobs')],
          });

          return response.ok({
            body: {
              privileges: _formatPrivileges(privileges),
              has_all_required: hasAllRequested,
              ...hasReadWritePermissions(privileges.elasticsearch, ML_ANOMALIES_INDEX),
            },
          });
        } catch (e) {
          logger.error(`Error checking privileges for ${ML_ANOMALIES_INDEX}: ${e}`);
          const error = transformError(e);
          return siemResponse.error({ statusCode: error.statusCode, body: error.message });
        }
      }
    );
  router.versioned
    .post({
      access: 'internal',
      path: ENTITY_ANOMALY_OVERVIEW_INTERNAL_URL,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution', `${APP_ID}-entity-analytics`],
        },
      },
      enableQueryVersion: true,
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: GetAnomalyOverviewRequestParams,
            body: GetAnomalyOverviewRequestBody,
          },
        },
      },
      withMinimumLicense(async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);
        try {
          const { entity_id: entityId, entity_type: entityType } = request.params;
          const {
            from,
            to,
            score_ranges: scoreRanges,
            threat_tactics: threatTactics,
          } = request.body ?? {};

          if (from !== undefined && from < getStartOfDayOneYearAgo()) {
            return siemResponse.error({
              statusCode: 400,
              body: '`from` must not be older than 1 year',
            });
          }

          if (scoreRanges?.some((r) => r.max_score !== undefined && r.min_score > r.max_score)) {
            return siemResponse.error({
              statusCode: 400,
              body: "each `score_ranges` entry's `min_score` must not be greater than its `max_score`",
            });
          }

          const core = await context.core;
          const soClient = core.savedObjects.client;
          const securitySolution = await context.securitySolution;
          const entityStoreCrudClient = securitySolution.getEntityStoreUpdateClient();
          const entityExists = await checkEntityExists({
            crudClient: entityStoreCrudClient,
            entityId,
            entityType,
          });
          if (!entityExists) {
            return siemResponse.error({
              statusCode: 404,
              body: `Entity "${entityId}" not found`,
            });
          }

          if (!ml) {
            logger.warn('ML plugin is unavailable; returning empty anomaly overview.');
            const now = Date.now();
            return response.ok({
              body: {
                entityId,
                entityType,
                anomalyByTimeBucket: [],
                recentAnomalies: [],
                tacticCounts: {},
                totalAnomaliesCount: 0,
                from: from ?? now - DEFAULT_OVERVIEW_LOOKBACK_MS,
                to: to ?? now,
                hasJobsMissingThreatTactics: false,
              },
            });
          }

          const overview = await getEntityAnomalyOverview({
            entityId,
            entityType,
            fromMs: from,
            toMs: to,
            scoreRanges,
            threatTactics,
            logger,
            ml,
            request,
            soClient,
          });

          return response.ok({ body: { entityId, entityType, ...overview } });
        } catch (err) {
          logger.error(`Error retrieving anomaly overview - ${err}`);

          if (
            err instanceof InsufficientMLCapabilities ||
            err instanceof MLPrivilegesUninitialized ||
            err instanceof EntityStoreAccessError
          ) {
            return siemResponse.error({ statusCode: 403, body: err.message });
          }

          const error = transformError(err);
          return siemResponse.error({ statusCode: error.statusCode, body: error.message });
        }
      }, 'platinum')
    );

  router.versioned
    .post({
      access: 'internal',
      path: ENTITY_ANOMALY_SUMMARY_INTERNAL_URL,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution', `${APP_ID}-entity-analytics`],
        },
      },
      enableQueryVersion: true,
    })
    .addVersion(
      {
        version: API_VERSIONS.internal.v1,
        validate: {
          request: {
            params: GetAnomalySummaryRequestParams,
            body: GetAnomalySummaryRequestBody,
          },
        },
      },
      withMinimumLicense(async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);
        try {
          const { entity_id: entityId, entity_type: entityType } = request.params;
          const {
            page = 1,
            page_size: pageSize = 100,
            from,
            to,
            score_ranges: scoreRanges,
            job_ids: jobIds,
            threat_tactics: threatTactics,
            sort,
          } = request.body ?? {};

          if (from !== undefined && from < getStartOfDayOneYearAgo()) {
            return siemResponse.error({
              statusCode: 400,
              body: '`from` must not be older than 1 year',
            });
          }

          if (scoreRanges?.some((r) => r.max_score !== undefined && r.min_score > r.max_score)) {
            return siemResponse.error({
              statusCode: 400,
              body: "each `score_ranges` entry's `min_score` must not be greater than its `max_score`",
            });
          }

          const core = await context.core;
          const esClient = core.elasticsearch.client.asCurrentUser;
          const soClient = core.savedObjects.client;
          const securitySolution = await context.securitySolution;
          const entityStoreCrudClient = securitySolution.getEntityStoreUpdateClient();

          const entityExists = await checkEntityExists({
            crudClient: entityStoreCrudClient,
            entityId,
            entityType,
          });
          if (!entityExists) {
            return siemResponse.error({
              statusCode: 404,
              body: `Entity "${entityId}" not found`,
            });
          }

          if (!ml) {
            logger.warn('ML plugin is unavailable; returning empty anomaly summary.');
            return response.ok({
              body: {
                entity_id: entityId,
                entity_type: entityType,
                anomalies: [],
                total: 0,
                page,
                page_size: pageSize,
              },
            });
          }

          const { anomalies, total } = await getEntityAnomalies({
            entityId,
            entityType,
            esClient,
            fromMs: from,
            toMs: to,
            scoreRanges,
            jobIds,
            threatTactics,
            logger,
            ml,
            offset: (page - 1) * pageSize,
            pageSize,
            request,
            sort,
            soClient,
          });

          return response.ok({
            body: {
              entity_id: entityId,
              entity_type: entityType,
              anomalies,
              total,
              page,
              page_size: pageSize,
            },
          });
        } catch (err) {
          logger.error(`Error retrieving anomaly summary - ${err}`);

          if (
            err instanceof InsufficientMLCapabilities ||
            err instanceof MLPrivilegesUninitialized ||
            err instanceof EntityStoreAccessError
          ) {
            return siemResponse.error({ statusCode: 403, body: err.message });
          }

          const error = transformError(err);
          return siemResponse.error({ statusCode: error.statusCode, body: error.message });
        }
      }, 'platinum')
    );
};
