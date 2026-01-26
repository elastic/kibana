/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Rule } from '@kbn/alerts-ui-shared';
import type { DiscoverAppLocatorParams } from '@kbn/discover-plugin/common';
import { ALERT_INDEX_PATTERN } from '@kbn/rule-data-utils';
import type { KueryNode } from '@kbn/es-query';
import { nodeBuilder, toKqlExpression } from '@kbn/es-query';
import { ERROR_GROUP_ID, PROCESSOR_EVENT, SERVICE_ENVIRONMENT, SERVICE_NAME } from '@kbn/apm-types';
import type { TypeOf } from '@kbn/config-schema';
import type { errorCountParamsSchema } from '@kbn/response-ops-rule-params/error_count';
import { ProcessorEvent } from '@kbn/apm-types-shared';
import type { TopAlert } from '../../../../../typings/alerts';

const apmErrorCountParamsToKqlQuery = (params: TypeOf<typeof errorCountParamsSchema>): string => {
  const filters: KueryNode[] = [];

  if (params.serviceName) {
    filters.push(nodeBuilder.is(SERVICE_NAME, params.serviceName));
  }

  if (params.errorGroupingKey) {
    filters.push(nodeBuilder.is(ERROR_GROUP_ID, params.errorGroupingKey));
  }

  if (params.environment && params.environment !== 'ENVIRONMENT_ALL') {
    filters.push(nodeBuilder.is(SERVICE_ENVIRONMENT, params.environment));
  }

  filters.push(nodeBuilder.is(PROCESSOR_EVENT, ProcessorEvent.error));

  return toKqlExpression(nodeBuilder.and(filters));
};

type ApmErrorCountRuleDataResult = {
  discoverAppLocatorParams: DiscoverAppLocatorParams & {
    query: { query: string; language: 'kuery' };
  };
} | null;

export const getApmErrorCountRuleData = ({
  alert,
  rule,
}: {
  alert: TopAlert;
  rule: Rule;
}): ApmErrorCountRuleDataResult => {
  const indexPattern =
    ALERT_INDEX_PATTERN in alert.fields ? alert.fields[ALERT_INDEX_PATTERN] : undefined;

  if (typeof indexPattern !== 'string') {
    return null;
  }

  const ruleParams = rule.params as TypeOf<typeof errorCountParamsSchema>;
  const kqlQuery = apmErrorCountParamsToKqlQuery(ruleParams);

  const discoverAppLocatorParams = {
    dataViewSpec: {
      title: indexPattern,
      timeFieldName: '@timestamp',
    },
    query: {
      language: 'kuery' as const,
      query: kqlQuery,
    },
  };

  return {
    discoverAppLocatorParams,
  };
};
