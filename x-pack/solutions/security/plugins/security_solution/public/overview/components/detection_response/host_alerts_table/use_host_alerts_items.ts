/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback, useEffect, useMemo, useState } from 'react';

import type { EntityIdentifiers } from '../../../../common/components/link_to/redirect_to_users';
import { firstNonNullValue } from '../../../../../common/endpoint/models/ecs_safety_helpers';
import { useQueryInspector } from '../../../../common/components/page/manage_query';
import { useGlobalTime } from '../../../../common/containers/use_global_time';
import type { GenericBuckets } from '../../../../../common/search_strategy';
import { useQueryAlerts } from '../../../../detections/containers/detection_engine/alerts/use_query';
import { ALERTS_QUERY_NAMES } from '../../../../detections/containers/detection_engine/alerts/constants';
import { getPageCount, ITEMS_PER_PAGE } from '../utils';
import type { ESBoolQuery } from '../../../../../common/typed_json';

const HOSTS_BY_SEVERITY_AGG = 'hostsBySeverity';
const defaultPagination = {
  pageCount: 0,
  currentPage: 0,
};

interface TimeRange {
  from: string;
  to: string;
}

export interface UseHostAlertsItemsProps {
  skip: boolean;
  queryId: string;
  signalIndexName: string | null;
  filterQuery?: ESBoolQuery;
}

export interface HostAlertsItem {
  hostName: string;
  totalAlerts: number;
  low: number;
  medium: number;
  high: number;
  critical: number;
  /** When provided, used for precise host resolution in links and alerts navigation */
  entityIdentifiers?: EntityIdentifiers;
}

export type UseHostAlertsItems = (props: UseHostAlertsItemsProps) => {
  items: HostAlertsItem[];
  isLoading: boolean;
  updatedAt: number;
  pagination: Pagination & { setPage: (pageNumber: number) => void };
};

interface Pagination {
  pageCount: number;
  currentPage: number;
}

export const useHostAlertsItems: UseHostAlertsItems = ({
  skip,
  queryId,
  signalIndexName,
  filterQuery,
}) => {
  const [updatedAt, setUpdatedAt] = useState(Date.now());
  const [items, setItems] = useState<HostAlertsItem[]>([]);
  const [paginationData, setPaginationData] = useState<Pagination>(defaultPagination);
  const { to, from, setQuery: setGlobalQuery, deleteQuery } = useGlobalTime();

  const query = useMemo(
    () =>
      buildVulnerableHostAggregationQuery({
        from,
        to,
        currentPage: paginationData.currentPage,
        filterQuery,
      }),
    [filterQuery, from, paginationData.currentPage, to]
  );

  const {
    data,
    request,
    response,
    setQuery,
    loading,
    refetch: refetchQuery,
  } = useQueryAlerts<{}, AlertCountersBySeverityAndHostAggregation>({
    query,
    indexName: signalIndexName,
    skip,
    queryName: ALERTS_QUERY_NAMES.VULNERABLE_HOSTS,
  });

  useEffect(() => {
    setQuery(query);
  }, [setQuery, paginationData.currentPage, query]);

  useEffect(() => {
    if (data == null || !data.aggregations) {
      setItems([]);
    } else {
      setItems(parseHostsData(data.aggregations));

      setPaginationData((p) => ({
        ...p,
        pageCount: getPageCount(data.aggregations?.host_count.value),
      }));
    }
    setUpdatedAt(Date.now());
  }, [data]);

  const refetch = useCallback(() => {
    if (!skip && refetchQuery) {
      refetchQuery();
    }
  }, [skip, refetchQuery]);

  const setPage = (pageNumber: number) => {
    setPaginationData((p) => ({
      ...p,
      currentPage: pageNumber,
    }));
  };

  useQueryInspector({
    deleteQuery,
    inspect: {
      dsl: [request],
      response: [response],
    },
    refetch,
    setQuery: setGlobalQuery,
    queryId,
    loading,
  });

  return {
    items,
    isLoading: loading,
    updatedAt,
    pagination: {
      ...paginationData,
      setPage,
    },
  };
};

export const buildVulnerableHostAggregationQuery = ({
  from,
  to,
  currentPage,
  filterQuery,
}: TimeRange & { currentPage: number; filterQuery?: ESBoolQuery }) => {
  const fromValue = ITEMS_PER_PAGE * currentPage;

  return {
    query: {
      bool: {
        filter: [
          {
            term: {
              'kibana.alert.workflow_status': 'open',
            },
          },
          {
            range: {
              '@timestamp': {
                gte: from,
                lte: to,
              },
            },
          },
          ...(filterQuery ? [filterQuery] : []),
        ],
      },
    },
    size: 0,
    aggs: {
      host_count: { cardinality: { field: 'host.name' } },
      [HOSTS_BY_SEVERITY_AGG]: {
        terms: {
          size: 100,
          field: 'host.name',
          order: [
            {
              'critical.doc_count': 'desc',
            },
            {
              'high.doc_count': 'desc',
            },
            {
              'medium.doc_count': 'desc',
            },
            {
              'low.doc_count': 'desc',
            },
          ],
        },
        aggs: {
          critical: {
            filter: {
              term: {
                'kibana.alert.severity': 'critical',
              },
            },
          },
          high: {
            filter: {
              term: {
                'kibana.alert.severity': 'high',
              },
            },
          },
          medium: {
            filter: {
              term: {
                'kibana.alert.severity': 'medium',
              },
            },
          },
          low: {
            filter: {
              term: {
                'kibana.alert.severity': 'low',
              },
            },
          },
          host_sample: {
            top_hits: {
              size: 1,
              _source: ['host'],
            },
          },
          bucketOfPagination: {
            bucket_sort: {
              from: fromValue,
              size: 4,
            },
          },
        },
      },
    },
  };
};

interface SeverityContainer {
  doc_count: number;
}

/** ECS host object from _source; fields may be string or string[] */
interface EsHostSource {
  entity?: { id?: string | string[] };
  id?: string | string[];
  name?: string | string[];
  domain?: string | string[];
  mac?: string | string[];
  hostname?: string | string[];
}

function getFirst(value: string | string[] | undefined): string | undefined {
  if (value == null) return undefined;
  if (typeof value === 'string') return value;
  return value.length > 0 ? value[0] : undefined;
}

/**
 * Build host entityIdentifiers from an ES hit's host object (same priority as entity store EUID).
 * Priority: host.entity.id > host.id > host.name (with domain, mac) > host.hostname (with domain, mac).
 */
function getHostEntityIdentifiersFromEsHit(
  host: EsHostSource | undefined
): EntityIdentifiers | undefined {
  if (!host) return undefined;
  const identifiers: EntityIdentifiers = {};
  const entityId = getFirst(host.entity?.id);
  if (entityId) {
    identifiers['host.entity.id'] = entityId;
    return identifiers;
  }
  const hostId = getFirst(host.id);
  if (hostId) {
    identifiers['host.id'] = hostId;
    return identifiers;
  }
  const hostName = getFirst(host.name);
  if (hostName) {
    identifiers['host.name'] = hostName;
    const domain = getFirst(host.domain);
    if (domain) identifiers['host.domain'] = domain;
    const mac = getFirst(host.mac);
    if (mac) identifiers['host.mac'] = mac;
    return identifiers;
  }
  const hostname = getFirst(host.hostname);
  if (hostname) {
    identifiers['host.hostname'] = hostname;
    const domain = getFirst(host.domain);
    if (domain) identifiers['host.domain'] = domain;
    const mac = getFirst(host.mac);
    if (mac) identifiers['host.mac'] = mac;
    return identifiers;
  }
  return Object.keys(identifiers).length > 0 ? identifiers : undefined;
}

interface HostSampleHit {
  _source?: { host?: EsHostSource };
}

interface AlertBySeverityBucketData extends GenericBuckets {
  low: SeverityContainer;
  medium: SeverityContainer;
  high: SeverityContainer;
  critical: SeverityContainer;
  host_sample?: {
    hits: { hits: HostSampleHit[] };
  };
}

interface AlertCountersBySeverityAndHostAggregation {
  [HOSTS_BY_SEVERITY_AGG]: {
    buckets: AlertBySeverityBucketData[];
  };
  host_count: { value: number };
}

function parseHostsData(
  rawAggregation: AlertCountersBySeverityAndHostAggregation
): HostAlertsItem[] {
  const buckets = rawAggregation?.[HOSTS_BY_SEVERITY_AGG].buckets ?? [];

  return buckets.reduce<HostAlertsItem[]>((accumalatedAlertsByHost, currentHost) => {
    const hostName = firstNonNullValue(currentHost.key) ?? '-';
    const hostSource = currentHost.host_sample?.hits?.hits?.[0]?._source?.host;
    const entityIdentifiers =
      getHostEntityIdentifiersFromEsHit(hostSource) ??
      ({ 'host.name': hostName } as EntityIdentifiers);

    accumalatedAlertsByHost.push({
      hostName,
      totalAlerts: currentHost.doc_count,
      low: currentHost.low.doc_count,
      medium: currentHost.medium.doc_count,
      high: currentHost.high.doc_count,
      critical: currentHost.critical.doc_count,
      entityIdentifiers,
    });

    return accumalatedAlertsByHost;
  }, []);
}
