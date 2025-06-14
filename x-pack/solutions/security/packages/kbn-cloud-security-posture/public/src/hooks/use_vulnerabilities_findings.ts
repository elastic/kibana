/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { useQuery } from '@tanstack/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import { lastValueFrom } from 'rxjs';
import type { IKibanaSearchResponse, IKibanaSearchRequest } from '@kbn/search-types';
import {
  SearchRequest,
  SearchResponse,
  AggregationsMultiBucketAggregateBase,
  AggregationsStringRareTermsBucketKeys,
} from '@elastic/elasticsearch/lib/api/types';
import type {
  CspVulnerabilityFinding,
  Vulnerability,
} from '@kbn/cloud-security-posture-common/schema/vulnerabilities/latest';
import type { CoreStart } from '@kbn/core/public';
import type { CspClientPluginStartDeps, UseCspOptions } from '../types';
import { showErrorToast } from '../..';
import {
  getVulnerabilitiesAggregationCount,
  getVulnerabilitiesQuery,
} from '../utils/findings_query_builders';

export enum VULNERABILITY {
  TITLE = 'vulnerability.title',
  ID = 'vulnerability.id',
  SEVERITY = 'vulnerability.severity',
  PACKAGE_NAME = 'package.name',
}

type LatestFindingsRequest = IKibanaSearchRequest<SearchRequest>;
type LatestFindingsResponse = IKibanaSearchResponse<
  SearchResponse<CspVulnerabilityFinding, FindingsAggs>
>;

export interface VulnerabilitiesPackage extends Vulnerability {
  package: {
    name: string;
    version: string;
  };
}

export interface VulnerabilitiesFindingTableDetailsFields {
  [VULNERABILITY.TITLE]: string;
  [VULNERABILITY.ID]: string;
  [VULNERABILITY.SEVERITY]: string;
  [VULNERABILITY.PACKAGE_NAME]: string;
}

export type VulnerabilitiesFindingDetailFields = Pick<Vulnerability, 'score'> &
  Pick<CspVulnerabilityFinding, 'vulnerability' | 'resource' | 'event'> &
  VulnerabilitiesFindingTableDetailsFields;

interface FindingsAggs {
  count: AggregationsMultiBucketAggregateBase<AggregationsStringRareTermsBucketKeys>;
}

export const useVulnerabilitiesFindings = (options: UseCspOptions) => {
  const {
    data,
    notifications: { toasts },
  } = useKibana<CoreStart & CspClientPluginStartDeps>().services;
  /**
   * We're using useInfiniteQuery in this case to allow the user to fetch more data (if available and up to 10k)
   * useInfiniteQuery differs from useQuery because it accumulates and caches a chunk of data from the previous fetches into an array
   * it uses the getNextPageParam to know if there are more pages to load and retrieve the position of
   * the last loaded record to be used as a from parameter to fetch the next chunk of data.
   */
  return useQuery(
    ['csp_vulnerabilities_findings', { params: options }],
    async ({ pageParam }) => {
      const {
        rawResponse: { aggregations, hits },
      } = await lastValueFrom(
        data.search.search<LatestFindingsRequest, LatestFindingsResponse>({
          params: getVulnerabilitiesQuery(options, pageParam) as LatestFindingsRequest['params'],
        })
      );

      return {
        count: getVulnerabilitiesAggregationCount(aggregations?.count?.buckets),
        rows: hits.hits.map((finding) => ({
          vulnerability: finding._source?.vulnerability,
          resource: finding._source?.resource,
          score: finding._source?.vulnerability?.score,
          [VULNERABILITY.ID]: finding._source?.vulnerability?.id,
          [VULNERABILITY.SEVERITY]: finding._source?.vulnerability?.severity,
          [VULNERABILITY.PACKAGE_NAME]: finding._source?.package?.name,
          event: finding._source?.event,
        })) as VulnerabilitiesFindingDetailFields[],
      };
    },
    {
      keepPreviousData: true,
      enabled: options.enabled,
      onError: (err: Error) => showErrorToast(toasts, err),
    }
  );
};
