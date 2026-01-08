/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash';
import type { CoreSetup, KibanaRequest, Logger } from '@kbn/core/server';
import {
  ALERT_STATUS,
  ALERT_STATUS_ACTIVE,
  AlertConsumers,
} from '@kbn/rule-registry-plugin/common/technical_rule_data_field_names';
import { OBSERVABILITY_RULE_TYPE_IDS_WITH_SUPPORTED_STACK_RULE_TYPES } from '@kbn/observability-shared-plugin/common';
import type {
  ObservabilityAgentBuilderPluginStart,
  ObservabilityAgentBuilderPluginStartDependencies,
} from '../../types';
import { getRelevantAlertFields } from './get_relevant_alert_fields';
import { getTotalHits } from '../../utils/get_total_hits';
import { kqlFilter as buildKqlFilter } from '../../utils/dsl_filters';
import { getDefaultConnectorId } from '../../utils/get_default_connector_id';

const OMITTED_ALERT_FIELDS = [
  'event.action',
  'event.kind',
  'kibana.alert.rule.execution.uuid',
  'kibana.alert.rule.revision',
  'kibana.alert.rule.tags',
  'kibana.alert.rule.uuid',
  'kibana.alert.workflow_status',
  'kibana.space_ids',
  'kibana.alert.time_range',
  'kibana.version',
] as const;

export async function getToolHandler({
  core,
  request,
  logger,
  start,
  end,
  query,
  kqlFilter,
  includeRecovered,
}: {
  core: CoreSetup<
    ObservabilityAgentBuilderPluginStartDependencies,
    ObservabilityAgentBuilderPluginStart
  >;
  request: KibanaRequest;
  logger: Logger;
  start: string;
  end: string;
  query: string;
  kqlFilter?: string;
  includeRecovered?: boolean;
}) {
  const [coreStart, pluginStart] = await core.getStartServices();
  const { inference, ruleRegistry } = pluginStart;

  const alertsClient = await ruleRegistry.getRacClientWithRequest(request);
  const connectorId = await getDefaultConnectorId({
    coreStart,
    inference,
    request,
    logger,
  });

  const boundInferenceClient = inference.getClient({
    request,
    bindTo: { connectorId },
  });

  const selectedFields = await getRelevantAlertFields({
    coreStart,
    pluginStart,
    request,
    inferenceClient: boundInferenceClient,
    logger,
    query,
  });

  const response = await alertsClient.find({
    ruleTypeIds: OBSERVABILITY_RULE_TYPE_IDS_WITH_SUPPORTED_STACK_RULE_TYPES,
    consumers: [
      AlertConsumers.APM,
      AlertConsumers.INFRASTRUCTURE,
      AlertConsumers.LOGS,
      AlertConsumers.UPTIME,
      AlertConsumers.SLO,
      AlertConsumers.OBSERVABILITY,
      AlertConsumers.ALERTS,
    ],
    query: {
      bool: {
        filter: [
          {
            range: {
              'kibana.alert.start': {
                gte: start,
                lte: end,
              },
            },
          },
          ...buildKqlFilter(kqlFilter),
          ...(includeRecovered ? [] : [{ term: { [ALERT_STATUS]: ALERT_STATUS_ACTIVE } }]),
        ],
      },
    },
    size: 10,
  });

  const total = getTotalHits(response);
  const alerts = response.hits.hits.map((hit) => omit(hit._source ?? {}, ...OMITTED_ALERT_FIELDS));

  return { alerts, selectedFields, total };
}
