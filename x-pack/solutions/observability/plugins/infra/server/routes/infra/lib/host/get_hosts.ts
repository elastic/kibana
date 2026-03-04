/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimeRangeMetadata } from '@kbn/apm-data-access-plugin/common';
import type { GetInfraMetricsResponsePayload } from '../../../../../common/http_api/infra';
import { getInfraHostNames } from './get_filtered_hosts';
import type { GetHostParameters } from '../types';
import { getAllHosts } from './get_all_hosts';
import { getHostsAlertsCount } from './get_hosts_alerts_count';
import { assertQueryStructure } from '../utils';
import { getApmHostNames } from './get_apm_hosts';

export const getHosts = async ({
  metrics,
  from,
  to,
  limit,
  query,
  alertsClient,
  apmDataAccessServices,
  infraMetricsClient,
  schema,
}: GetHostParameters): Promise<GetInfraMetricsResponsePayload> => {
  const apmDocumentSources = await apmDataAccessServices?.getDocumentSources({
    start: from,
    end: to,
  });

  const hostNames = await getHostNames({
    infraMetricsClient,
    apmDataAccessServices,
    apmDocumentSources,
    from,
    to,
    limit,
    query,
    schema,
  });

  if (hostNames.length === 0) {
    return {
      entityType: 'host',
      nodes: [],
    };
  }

  const [hostMetricsResponse, alertsCountResponse] = await Promise.all([
    getAllHosts({
      infraMetricsClient,
      apmDocumentSources,
      from,
      to,
      limit,
      metrics,
      hostNames,
      schema,
    }),
    getHostsAlertsCount({
      alertsClient,
      hostNames,
      from,
      to,
      limit,
    }),
  ]);

  const alertsByHostName = alertsCountResponse.reduce((acc, { name, alertsCount }) => {
    acc[name] = { alertsCount };
    return acc;
  }, {} as Record<string, { alertsCount: number }>);

  const hosts = hostMetricsResponse.map((host) => {
    const { alertsCount } = alertsByHostName[host.name] ?? {};
    return {
      ...host,
      alertsCount,
    };
  });

  return {
    entityType: 'host',
    nodes: hosts,
  };
};

const getHostNames = async ({
  infraMetricsClient,
  apmDataAccessServices,
  apmDocumentSources,
  from,
  to,
  limit,
  query,
  schema = 'ecs',
}: Pick<
  GetHostParameters,
  'apmDataAccessServices' | 'infraMetricsClient' | 'from' | 'to' | 'limit' | 'query' | 'schema'
> & {
  apmDocumentSources?: TimeRangeMetadata['sources'];
}) => {
  assertQueryStructure(query);

  const [{ allHosts, availableHosts }, apmHosts] = await Promise.all([
    getInfraHostNames({
      infraMetricsClient,
      query,
      from,
      to,
      limit,
      schema,
    }),
    apmDataAccessServices && apmDocumentSources
      ? getApmHostNames({
          apmDataAccessServices,
          apmDocumentSources,
          query,
          from,
          to,
          limit,
          schema,
        })
      : undefined,
  ]);

  const availableHostsSet = new Set(availableHosts);
  const hostsToRemove = new Set(allHosts.filter((h) => !availableHostsSet.has(h)));
  const verifiedApmHosts = (apmHosts ?? []).filter((h) => !hostsToRemove.has(h));

  return [...new Set([...availableHosts, ...verifiedApmHosts])];
};
