/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { each, map, some, uniq } from 'lodash';
import { containsDynamicQuery } from '@kbn/osquery-plugin/common/utils/replace_params_query';
import { requiredOptional } from '@kbn/zod-helpers';
import { DEFAULT_SPACE_ID } from '@kbn/spaces-utils';
import type { ParsedTechnicalFields } from '@kbn/rule-registry-plugin/common';
import type { ResponseActionAlerts } from './types';
import type { SetupPlugins } from '../../../plugin_contract';
import type { RuleResponseOsqueryAction } from '../../../../common/api/detection_engine/model/rule_response_actions';
import type { EndpointAppContextService } from '../../../endpoint/endpoint_app_context_services';

export const osqueryResponseAction = (
  responseAction: RuleResponseOsqueryAction,
  osqueryCreateActionService: SetupPlugins['osquery']['createActionService'],
  endpointAppContextService: EndpointAppContextService,
  { alerts }: ResponseActionAlerts
) => {
  const logger = osqueryCreateActionService.logger;

  const temporaryQueries = responseAction.params.queries?.length
    ? responseAction.params.queries
    : [{ query: responseAction.params.query }];
  const containsDynamicQueries = some(
    temporaryQueries,
    (query) => query.query && containsDynamicQuery(query.query)
  );

  const { savedQueryId, packId, queries, ecsMapping, ...rest } = responseAction.params;
  // Extract space information from the first alert (all alerts should be from the same space)
  let spaceId = alerts[0]?.kibana?.space_ids?.[0];

  const processResponseActionClientError = (err: Error, endpointIds: string[]): Promise<void> => {
    logger.error(
      `attempt to run osquery queries on host IDs [${endpointIds.join(', ')}] returned error: ${
        err.message
      }`
    );

    return Promise.resolve();
  };

  if (endpointAppContextService.experimentalFeatures.endpointManagementSpaceAwarenessEnabled) {
    if (!spaceId) {
      const ruleId = alerts[0].kibana.alert?.rule.uuid;
      const ruleName = alerts[0].kibana.alert?.rule.name;
      logger.error(
        `Unable to identify the space ID from alert data ('kibana.space_ids') for rule [${ruleName}][${ruleId}]`
      );
      return;
    }
  } else {
    // force the space to `default` when space awareness is not enabled
    spaceId = DEFAULT_SPACE_ID;
  }

  if (!containsDynamicQueries) {
    const agentIds = uniq(map(alerts, 'agent.id'));
    const alertIds = map(alerts, '_id');

    return osqueryCreateActionService
      .create(
        {
          ...rest,
          queries: requiredOptional(queries),
          ecs_mapping: ecsMapping,
          saved_query_id: savedQueryId,
          agent_ids: agentIds,
          alert_ids: alertIds,
        },
        {
          space: { id: spaceId },
        }
      )
      .catch((err) => {
        return processResponseActionClientError(err, agentIds);
      });
  }
  each(alerts, (alert) => {
    const agentIds = alert.agent?.id ? [alert.agent.id] : [];

    return osqueryCreateActionService
      .create(
        {
          ...rest,
          queries: requiredOptional(queries),
          ecs_mapping: ecsMapping,
          saved_query_id: savedQueryId,
          agent_ids: agentIds,
          alert_ids: [(alert as unknown as { _id: string })._id],
        },
        {
          alertData: alert as ParsedTechnicalFields & { _index: string },
          space: { id: spaceId as string },
        }
      )
      .catch((err) => {
        return processResponseActionClientError(err, agentIds);
      });
  });
};
