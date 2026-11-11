/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { map, uniq } from 'lodash';
import { requiredOptional } from '@kbn/zod-helpers/v4';
import type { ParsedTechnicalFields } from '@kbn/rule-registry-plugin/common';
import type { ResponseActionAlerts } from './types';
import type { SetupPlugins } from '../../../plugin_contract';
import type { RuleResponseOsqueryAction } from '../../../../common/api/detection_engine/model/rule_response_actions';
import type { EndpointAppContextService } from '../../../endpoint/endpoint_app_context_services';

export const osqueryResponseAction = async (
  responseAction: RuleResponseOsqueryAction,
  osqueryCreateActionService: SetupPlugins['osquery']['createActionService'],
  endpointAppContextService: EndpointAppContextService,
  { alerts }: ResponseActionAlerts
) => {
  const logger = osqueryCreateActionService.logger;

  const { savedQueryId, packId, queries, ecsMapping, ...rest } = responseAction.params;
  // Extract space information from the first alert (all alerts should be from the same space)
  const spaceId = alerts[0]?.kibana?.space_ids?.[0];

  const processResponseActionClientError = (err: unknown, endpointIds: string[]): Promise<void> => {
    const message = err instanceof Error ? err.message : String(err);
    logger.error(
      `attempt to run osquery queries on host IDs [${endpointIds.join(
        ', '
      )}] returned error: ${message}`
    );

    return Promise.resolve();
  };

  if (!spaceId) {
    const ruleId = alerts[0].kibana.alert?.rule.uuid;
    const ruleName = alerts[0].kibana.alert?.rule.name;
    logger.error(
      `Unable to identify the space ID from alert data ('kibana.space_ids') for rule [${ruleName}][${ruleId}]`
    );
    return;
  }

  const agentIds = uniq(map(alerts, 'agent.id'));
  const alertIds = map(alerts, '_id');

  // Ask osquery, which resolves the stored saved query / pack, rather than reading the copy
  // persisted on this rule — that copy goes stale the moment the referenced object is edited,
  // and a template added there would otherwise suppress dispatch entirely.
  let isDynamic = false;
  let storedQuery: Awaited<
    ReturnType<typeof osqueryCreateActionService.containsDynamicQueries>
  >['storedQuery'];

  try {
    const preflight = await osqueryCreateActionService.containsDynamicQueries(
      {
        ...rest,
        ...(packId && { pack_id: packId }),
        queries: requiredOptional(queries),
        saved_query_id: savedQueryId,
      },
      { space: { id: spaceId } }
    );
    isDynamic = preflight.isDynamic;
    storedQuery = preflight.storedQuery;
  } catch (err) {
    await processResponseActionClientError(err, agentIds);
    // Fail toward dynamic so per-alert `alertData` is supplied if dispatch still proceeds.
    isDynamic = true;
  }

  if (!isDynamic) {
    return osqueryCreateActionService
      .create(
        {
          ...rest,
          ...(packId && { pack_id: packId }),
          queries: requiredOptional(queries),
          ecs_mapping: ecsMapping,
          saved_query_id: savedQueryId,
          agent_ids: agentIds,
          alert_ids: alertIds,
        },
        {
          space: { id: spaceId },
          storedQuery,
        }
      )
      .catch((err) => {
        return processResponseActionClientError(err, agentIds);
      });
  }

  return Promise.all(
    alerts.map((alert) => {
      const alertAgentIds = alert.agent?.id ? [alert.agent.id] : [];

      return osqueryCreateActionService
        .create(
          {
            ...rest,
            ...(packId && { pack_id: packId }),
            queries: requiredOptional(queries),
            ecs_mapping: ecsMapping,
            saved_query_id: savedQueryId,
            agent_ids: alertAgentIds,
            alert_ids: [(alert as unknown as { _id: string })._id],
          },
          {
            alertData: alert as ParsedTechnicalFields & { _index: string },
            space: { id: spaceId as string },
            storedQuery,
          }
        )
        .catch((err) => {
          return processResponseActionClientError(err, alertAgentIds);
        });
    })
  );
};
