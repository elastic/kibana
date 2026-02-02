/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { SearchResponse } from '@elastic/elasticsearch/lib/api/types';
import { schema } from '@kbn/config-schema';
import type { ElasticsearchClient } from '@kbn/core-elasticsearch-server';
import { transformError } from '@kbn/securitysolution-es-utils';
import {
  DETECTION_RULE_ALERTS_STATUS_API_CURRENT_VERSION,
  GET_DETECTION_RULE_ALERTS_STATUS_PATH,
} from '../../../common/constants';
import type { CspRouter } from '../../types';

const DEFAULT_ALERTS_INDEX = '.alerts-security.alerts-default' as const;

export const getDetectionEngineAlertsCountByRuleTags = async (
  esClient: ElasticsearchClient,
  tags: string[]
) => {
  return await esClient.search<unknown, SearchResponse>({
    size: 0,
    query: {
      bool: {
        filter: [
          { term: { 'kibana.alert.rule.tags': 'Cloud Security' } },
          ...tags.map((tag) => ({ term: { 'kibana.alert.rule.tags': tag } })),
        ],
      },
    },
    sort: '@timestamp:desc',
    index: DEFAULT_ALERTS_INDEX,
  });
};

const getDetectionEngineAlertsStatus = async (esClient: ElasticsearchClient, tags: string[]) => {
  const alertsCountByTags = await getDetectionEngineAlertsCountByRuleTags(esClient, tags);

  const total =
    typeof alertsCountByTags.hits.total === 'number'
      ? alertsCountByTags.hits.total
      : alertsCountByTags.hits.total?.value;

  return {
    total,
  };
};
export const defineGetDetectionEngineAlertsStatus = (router: CspRouter) =>
  router.versioned
    .get({
      access: 'internal',
      path: GET_DETECTION_RULE_ALERTS_STATUS_PATH,
      security: {
        authz: {
          requiredPrivileges: ['cloud-security-posture-read'],
        },
      },
    })
    .addVersion(
      {
        version: DETECTION_RULE_ALERTS_STATUS_API_CURRENT_VERSION,
        validate: {
          request: {
            query: schema.object({
              // maxSize is set to 100 as it's not expected to have more than 100 tags
              tags: schema.arrayOf(schema.string(), { maxSize: 100 }),
            }),
          },
        },
      },
      async (context, request, response) => {
        const requestBody = request.query;
        const cspContext = await context.csp;

        try {
          const alerts = await getDetectionEngineAlertsStatus(
            cspContext.esClient.asCurrentUser,
            requestBody.tags
          );
          return response.ok({ body: alerts });
        } catch (err) {
          const error = transformError(err);
          cspContext.logger.error(`Failed to fetch csp rules templates ${err}`);
          return response.customError({
            body: { message: error.message },
            statusCode: error.statusCode,
          });
        }
      }
    );
