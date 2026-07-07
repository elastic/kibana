/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { TimeRangeMetadata } from '@kbn/apm-data-access-plugin/common';
import type { GetInfraMetricsResponsePayload } from '../../../../../common/http_api/infra';
import { DEFAULT_SCHEMA } from '../../../../../common/constants';
import { getFilteredHostNames } from './get_filtered_hosts';
import type { GetHostParameters } from '../types';
import { getAllHosts } from './get_all_hosts';
import { getHostsAlertsCount } from './get_hosts_alerts_count';
import { assertQueryStructure, extractExcludedMetadataValues } from '../utils';
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

  const excludedValues = extractExcludedMetadataValues(query);
  const filteredHostMetrics = hostMetricsResponse.filter((host) =>
    host.metadata.every((meta) => {
      const excluded = excludedValues.get(meta.name);
      if (!excluded || meta.value === null) return true;
      if (Array.isArray(meta.value)) {
        return meta.value.every((v) => !excluded.has(String(v)));
      }
      return !excluded.has(String(meta.value));
    })
  );

  const alertsByHostName = alertsCountResponse.reduce((acc, { name, alertsCount }) => {
    acc[name] = { alertsCount };
    return acc;
  }, {} as Record<string, { alertsCount: number }>);

  const hosts = filteredHostMetrics.map((host) => {
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
  schema = DEFAULT_SCHEMA,
}: Pick<
  GetHostParameters,
  'apmDataAccessServices' | 'infraMetricsClient' | 'from' | 'to' | 'limit' | 'query' | 'schema'
> & {
  apmDocumentSources?: TimeRangeMetadata['sources'];
}) => {
  assertQueryStructure(query);

  const [filteredHosts, apmHosts] = await Promise.all([
    getFilteredHostNames({
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

  return [...new Set([...filteredHosts, ...(apmHosts ?? [])])];
};
