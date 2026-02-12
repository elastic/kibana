/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { pick } from 'lodash';
import type { CoreSetup, KibanaRequest } from '@kbn/core/server';
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
import { getTotalHits } from '../../utils/get_total_hits';
import { kqlFilter as buildKqlFilter } from '../../utils/dsl_filters';
import { defaultFields } from './tool';

export async function getToolHandler({
  core,
  request,
  start,
  end,
  kqlFilter,
  includeRecovered,
  fields,
}: {
  core: CoreSetup<
    ObservabilityAgentBuilderPluginStartDependencies,
    ObservabilityAgentBuilderPluginStart
  >;
  request: KibanaRequest;
  start: string;
  end: string;
  kqlFilter?: string;
  includeRecovered?: boolean;
  fields?: string[];
}) {
  const [, pluginStart] = await core.getStartServices();
  const { ruleRegistry } = pluginStart;

  const alertsClient = await ruleRegistry.getRacClientWithRequest(request);

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
  const fieldsToReturn = fields ?? defaultFields;
  const alerts = response.hits.hits.map((hit) => pick(hit._source ?? {}, fieldsToReturn));

  return { alerts, total };
}
