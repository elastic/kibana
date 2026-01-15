/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Logger } from '@kbn/core/server';
import { buildSiemResponse } from '@kbn/lists-plugin/server/routes/utils';
import { transformError } from '@kbn/securitysolution-es-utils';
import { APP_ID } from '../../../../common/constants';
import { API_VERSIONS } from '../../../../common/entity_analytics/constants';
import {
  ENDPOINT_ASSETS_ROUTES,
  ENTITY_STORE_HOST_INDEX_PATTERN,
} from '../../../../common/endpoint_assets';
import type {
  PostureSummaryResponse,
  PrivilegesSummaryResponse,
  UnknownKnownsSummaryResponse,
} from '../../../../common/endpoint_assets';
import type { SecuritySolutionPluginRouter } from '../../../types';
import { createEndpointAssetsService } from '../endpoint_assets_service';
import { registerDriftRoutes } from './drift';
import { registerSnapshotRoutes } from './snapshot';

/**
 * Register routes for Endpoint Assets transform management.
 *
 * These routes allow initialization, starting, stopping, and status checking
 * of the Osquery-to-Endpoint-Assets transform.
 */
export const registerEndpointAssetsRoutes = (
  router: SecuritySolutionPluginRouter,
  logger: Logger
) => {
  // POST /api/endpoint_assets/transform/init - Initialize transform and index
  router.versioned
    .post({
      access: 'public',
      path: `${ENDPOINT_ASSETS_ROUTES.TRANSFORM_STATUS}/init`,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution', `${APP_ID}-entity-analytics`],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: false,
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);

        try {
          const coreContext = await context.core;
          const secSol = await context.securitySolution;

          const service = createEndpointAssetsService({
            esClient: coreContext.elasticsearch.client.asCurrentUser,
            soClient: coreContext.savedObjects.client,
            logger,
            namespace: secSol.getSpaceId(),
          });

          await service.initializeTransform();
          await service.startTransform();

          const status = await service.getTransformStatus();

          return response.ok({
            body: {
              success: true,
              message: 'Transform initialized and started successfully',
              status,
            },
          });
        } catch (e) {
          const error = transformError(e);
          logger.error(`Error initializing endpoint assets transform: ${error.message}`);
          return siemResponse.error({
            statusCode: error.statusCode,
            body: error.message,
          });
        }
      }
    );

  // POST /api/endpoint_assets/transform/start - Start transform
  router.versioned
    .post({
      access: 'public',
      path: ENDPOINT_ASSETS_ROUTES.TRANSFORM_START,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution', `${APP_ID}-entity-analytics`],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: false,
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);

        try {
          const coreContext = await context.core;
          const secSol = await context.securitySolution;

          const service = createEndpointAssetsService({
            esClient: coreContext.elasticsearch.client.asCurrentUser,
            soClient: coreContext.savedObjects.client,
            logger,
            namespace: secSol.getSpaceId(),
          });

          await service.startTransform();
          const status = await service.getTransformStatus();

          return response.ok({
            body: {
              success: true,
              message: 'Transform started successfully',
              status,
            },
          });
        } catch (e) {
          const error = transformError(e);
          logger.error(`Error starting endpoint assets transform: ${error.message}`);
          return siemResponse.error({
            statusCode: error.statusCode,
            body: error.message,
          });
        }
      }
    );

  // POST /api/endpoint_assets/transform/stop - Stop transform
  router.versioned
    .post({
      access: 'public',
      path: ENDPOINT_ASSETS_ROUTES.TRANSFORM_STOP,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution', `${APP_ID}-entity-analytics`],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: false,
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);

        try {
          const coreContext = await context.core;
          const secSol = await context.securitySolution;

          const service = createEndpointAssetsService({
            esClient: coreContext.elasticsearch.client.asCurrentUser,
            soClient: coreContext.savedObjects.client,
            logger,
            namespace: secSol.getSpaceId(),
          });

          await service.stopTransformService();
          const status = await service.getTransformStatus();

          return response.ok({
            body: {
              success: true,
              message: 'Transform stopped successfully',
              status,
            },
          });
        } catch (e) {
          const error = transformError(e);
          logger.error(`Error stopping endpoint assets transform: ${error.message}`);
          return siemResponse.error({
            statusCode: error.statusCode,
            body: error.message,
          });
        }
      }
    );

  // GET /api/endpoint_assets/transform/status - Get transform status
  router.versioned
    .get({
      access: 'public',
      path: ENDPOINT_ASSETS_ROUTES.TRANSFORM_STATUS,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: false,
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);

        try {
          const coreContext = await context.core;
          const secSol = await context.securitySolution;

          const service = createEndpointAssetsService({
            esClient: coreContext.elasticsearch.client.asCurrentUser,
            soClient: coreContext.savedObjects.client,
            logger,
            namespace: secSol.getSpaceId(),
          });

          const status = await service.getTransformStatus();

          return response.ok({
            body: status,
          });
        } catch (e) {
          const error = transformError(e);
          logger.error(`Error getting endpoint assets transform status: ${error.message}`);
          return siemResponse.error({
            statusCode: error.statusCode,
            body: error.message,
          });
        }
      }
    );

  // GET /api/endpoint_assets/posture/summary - Get posture summary aggregations
  router.versioned
    .get({
      access: 'public',
      path: ENDPOINT_ASSETS_ROUTES.POSTURE_SUMMARY,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: false,
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);

        try {
          const coreContext = await context.core;
          const esClient = coreContext.elasticsearch.client.asCurrentUser;

          // Query the Entity Store host index for posture aggregations
          const result = await esClient.search({
            index: ENTITY_STORE_HOST_INDEX_PATTERN,
            size: 0,
            query: {
              exists: { field: 'endpoint.posture.score' },
            },
            aggs: {
              total_assets: {
                value_count: { field: 'entity.id' },
              },
              posture_level_distribution: {
                terms: { field: 'endpoint.posture.level', size: 10 },
              },
              average_score: {
                avg: { field: 'endpoint.posture.score' },
              },
              failed_checks: {
                terms: { field: 'endpoint.posture.failed_checks', size: 20 },
              },
            },
          });

          // Extract aggregation results
          const aggs = result.aggregations as Record<string, unknown> | undefined;
          const totalAssetsAgg = aggs?.total_assets as { value: number } | undefined;
          const postureLevelAgg = aggs?.posture_level_distribution as
            | {
                buckets: Array<{ key: string; doc_count: number }>;
              }
            | undefined;
          const avgScoreAgg = aggs?.average_score as { value: number | null } | undefined;
          const failedChecksAgg = aggs?.failed_checks as
            | {
                buckets: Array<{ key: string; doc_count: number }>;
              }
            | undefined;

          // Build posture distribution from aggregation buckets
          const postureDistribution = {
            critical: 0,
            high: 0,
            medium: 0,
            low: 0,
          };

          if (postureLevelAgg?.buckets) {
            for (const bucket of postureLevelAgg.buckets) {
              const level = bucket.key.toLowerCase() as keyof typeof postureDistribution;
              if (level in postureDistribution) {
                postureDistribution[level] = bucket.doc_count;
              }
            }
          }

          // Build failed checks by type
          const failedChecksByType: Record<string, number> = {};
          if (failedChecksAgg?.buckets) {
            for (const bucket of failedChecksAgg.buckets) {
              failedChecksByType[bucket.key] = bucket.doc_count;
            }
          }

          const summaryResponse: PostureSummaryResponse = {
            total_assets: totalAssetsAgg?.value ?? 0,
            posture_distribution: postureDistribution,
            failed_checks_by_type: failedChecksByType,
            average_score: avgScoreAgg?.value ?? 0,
          };

          return response.ok({
            body: summaryResponse,
          });
        } catch (e) {
          const error = transformError(e);
          logger.error(`Error getting posture summary: ${error.message}`);
          return siemResponse.error({
            statusCode: error.statusCode,
            body: error.message,
          });
        }
      }
    );

  // GET /api/endpoint_assets/privileges/summary - Get privileges summary aggregations
  router.versioned
    .get({
      access: 'public',
      path: ENDPOINT_ASSETS_ROUTES.PRIVILEGES_SUMMARY,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: false,
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);

        try {
          const coreContext = await context.core;
          const esClient = coreContext.elasticsearch.client.asCurrentUser;

          // Query the Entity Store host index for privileges aggregations
          const result = await esClient.search({
            index: ENTITY_STORE_HOST_INDEX_PATTERN,
            size: 0,
            query: {
              exists: { field: 'entity.id' },
            },
            aggs: {
              total_assets: {
                value_count: { field: 'entity.id' },
              },
              elevated_privileges: {
                filter: { term: { 'endpoint.privileges.elevated_risk': true } },
              },
              total_admin_count: {
                sum: { field: 'endpoint.privileges.admin_count' },
              },
              average_admin_count: {
                avg: { field: 'endpoint.privileges.admin_count' },
              },
            },
          });

          // Extract aggregation results
          const aggs = result.aggregations as Record<string, unknown> | undefined;
          const totalAssetsAgg = aggs?.total_assets as { value: number } | undefined;
          const elevatedAgg = aggs?.elevated_privileges as { doc_count: number } | undefined;
          const totalAdminAgg = aggs?.total_admin_count as { value: number | null } | undefined;
          const avgAdminAgg = aggs?.average_admin_count as { value: number | null } | undefined;

          const summaryResponse: PrivilegesSummaryResponse = {
            total_assets: totalAssetsAgg?.value ?? 0,
            assets_with_elevated_privileges: elevatedAgg?.doc_count ?? 0,
            total_local_admins: totalAdminAgg?.value ?? 0,
            average_admin_count: avgAdminAgg?.value ?? 0,
          };

          return response.ok({
            body: summaryResponse,
          });
        } catch (e) {
          const error = transformError(e);
          logger.error(`Error getting privileges summary: ${error.message}`);
          return siemResponse.error({
            statusCode: error.statusCode,
            body: error.message,
          });
        }
      }
    );

  // GET /api/endpoint_assets/unknown_knowns/summary - Get Unknown Knowns (dormant risk) summary
  router.versioned
    .get({
      access: 'public',
      path: ENDPOINT_ASSETS_ROUTES.UNKNOWN_KNOWNS_SUMMARY,
      security: {
        authz: {
          requiredPrivileges: ['securitySolution'],
        },
      },
    })
    .addVersion(
      {
        version: API_VERSIONS.public.v1,
        validate: false,
      },
      async (context, request, response) => {
        const siemResponse = buildSiemResponse(response);

        try {
          const coreContext = await context.core;
          const esClient = coreContext.elasticsearch.client.asCurrentUser;

          // Query the Entity Store host index for Unknown Knowns aggregations
          const result = await esClient.search({
            index: ENTITY_STORE_HOST_INDEX_PATTERN,
            size: 0,
            query: {
              exists: { field: 'entity.id' },
            },
            aggs: {
              total_assets: {
                value_count: { field: 'entity.id' },
              },
              assets_with_dormant_risks: {
                filter: {
                  range: { 'endpoint.unknown_knowns.total_dormant_risks': { gt: 0 } },
                },
              },
              total_ssh_keys: {
                sum: { field: 'endpoint.unknown_knowns.ssh_keys_over_180d' },
              },
              total_dormant_users: {
                sum: { field: 'endpoint.unknown_knowns.dormant_users_30d' },
              },
              total_external_tasks_windows: {
                sum: { field: 'endpoint.unknown_knowns.external_tasks_windows' },
              },
              total_external_cron_jobs: {
                sum: { field: 'endpoint.unknown_knowns.external_cron_jobs' },
              },
              total_external_launch_items: {
                sum: { field: 'endpoint.unknown_knowns.external_launch_items' },
              },
              risk_distribution: {
                terms: { field: 'endpoint.unknown_knowns.risk_level', size: 10 },
              },
              top_risk_assets: {
                top_hits: {
                  size: 10,
                  sort: [{ 'endpoint.unknown_knowns.total_dormant_risks': { order: 'desc' } }],
                  _source: [
                    'entity.id',
                    'entity.name',
                    'asset.platform',
                    'endpoint.unknown_knowns.total_dormant_risks',
                    'endpoint.unknown_knowns.risk_level',
                  ],
                },
              },
              dormant_users_nested: {
                nested: { path: 'endpoint.unknown_knowns.dormant_users_list' },
                aggs: {
                  users: {
                    terms: { field: 'endpoint.unknown_knowns.dormant_users_list.keyword', size: 10 },
                  },
                },
              },
            },
          });

          // Extract aggregation results
          const aggs = result.aggregations as Record<string, unknown> | undefined;
          const totalAssetsAgg = aggs?.total_assets as { value: number } | undefined;
          const assetsWithRisksAgg = aggs?.assets_with_dormant_risks as
            | { doc_count: number }
            | undefined;
          const totalSshKeysAgg = aggs?.total_ssh_keys as { value: number | null } | undefined;
          const totalDormantUsersAgg = aggs?.total_dormant_users as
            | { value: number | null }
            | undefined;
          const totalExternalTasksWindowsAgg = aggs?.total_external_tasks_windows as
            | { value: number | null }
            | undefined;
          const totalExternalCronJobsAgg = aggs?.total_external_cron_jobs as
            | { value: number | null }
            | undefined;
          const totalExternalLaunchItemsAgg = aggs?.total_external_launch_items as
            | { value: number | null }
            | undefined;
          const riskDistributionAgg = aggs?.risk_distribution as
            | {
                buckets: Array<{ key: string; doc_count: number }>;
              }
            | undefined;
          const topRiskAssetsAgg = aggs?.top_risk_assets as
            | {
                hits: {
                  hits: Array<{
                    _source: {
                      entity?: { id?: string; name?: string };
                      asset?: { platform?: string };
                      endpoint?: {
                        unknown_knowns?: {
                          total_dormant_risks?: number;
                          risk_level?: string;
                        };
                      };
                    };
                  }>;
                };
              }
            | undefined;

          // Build risk distribution from aggregation buckets
          const riskDistribution = {
            high: 0,
            medium: 0,
            low: 0,
          };

          if (riskDistributionAgg?.buckets) {
            for (const bucket of riskDistributionAgg.buckets) {
              const level = bucket.key.toLowerCase() as keyof typeof riskDistribution;
              if (level in riskDistribution) {
                riskDistribution[level] = bucket.doc_count;
              }
            }
          }

          // Build top risk assets from top_hits
          const topRiskAssets: Array<{
            entity_id: string;
            entity_name: string;
            platform: string;
            total_dormant_risks: number;
            risk_level: string;
          }> = [];

          if (topRiskAssetsAgg?.hits?.hits) {
            for (const hit of topRiskAssetsAgg.hits.hits) {
              const source = hit._source;
              const dormantRisks = source.endpoint?.unknown_knowns?.total_dormant_risks ?? 0;
              // Only include assets that actually have dormant risks
              if (dormantRisks > 0) {
                topRiskAssets.push({
                  entity_id: source.entity?.id ?? '',
                  entity_name: source.entity?.name ?? '',
                  platform: source.asset?.platform ?? 'unknown',
                  total_dormant_risks: dormantRisks,
                  risk_level: source.endpoint?.unknown_knowns?.risk_level ?? 'low',
                });
              }
            }
          }

          // Calculate total external tasks
          const externalTasksTotal =
            (totalExternalTasksWindowsAgg?.value ?? 0) +
            (totalExternalCronJobsAgg?.value ?? 0) +
            (totalExternalLaunchItemsAgg?.value ?? 0);

          const summaryResponse: UnknownKnownsSummaryResponse = {
            total_assets: totalAssetsAgg?.value ?? 0,
            assets_with_dormant_risks: assetsWithRisksAgg?.doc_count ?? 0,
            ssh_keys_over_180d: totalSshKeysAgg?.value ?? 0,
            dormant_users_30d: totalDormantUsersAgg?.value ?? 0,
            external_tasks_total: externalTasksTotal,
            risk_distribution: riskDistribution,
            top_risk_assets: topRiskAssets,
            top_dormant_users: [], // Will populate if nested aggregation works, otherwise empty
          };

          return response.ok({
            body: summaryResponse,
          });
        } catch (e) {
          const error = transformError(e);
          logger.error(`Error getting Unknown Knowns summary: ${error.message}`);
          return siemResponse.error({
            statusCode: error.statusCode,
            body: error.message,
          });
        }
      }
    );

  registerDriftRoutes(router, logger);
  registerSnapshotRoutes(router, logger);
};
