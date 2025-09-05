/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { estypes } from '@elastic/elasticsearch';
import type { MonitoringEntitySource } from '../../../../../../../../common/api/entity_analytics';
import type { PrivilegeMonitoringDataClient } from '../../../../engine/data_client';
import { buildMatcherScript, buildPrivilegedSearchBody } from './queries';

export const createPatternMatcherService = (dataClient: PrivilegeMonitoringDataClient) => {
  const findPrivilegedUsersFromMatchers = async (source: MonitoringEntitySource) => {
    const matcherConfig = source.matchers?.[0]; // maybe don't even need this
    const esClient = dataClient.deps.clusterClient.asCurrentUser;

    const script = buildMatcherScript(matcherConfig);

    try {
      const res = await esClient.search<unknown, estypes.AggregationsAggregate>({
        index: source.indexPattern,
        ...buildPrivilegedSearchBody(script),
      });

      const flattenedResponse = res.hits.hits.flatMap((hit) => hit._source || []);
      // response now in aggregations. TODO: process the aggregated response
      dataClient.log(
        'info',
        `Found ${JSON.stringify(flattenedResponse)} privileged users from matchers`
      );
    } catch (error) {
      dataClient.log('error', `Error finding privileged users from matchers: ${error.message}`);
    }
  };

  const bulkPrivilegeStatusUpdateOperationsFactory = (users: unknown[]) => {
    // implement logic to create bulk update operations for privileged users
  };

  return {
    findPrivilegedUsersFromMatchers,
    bulkPrivilegeStatusUpdateOperationsFactory,
  };
};
