/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useCallback } from 'react';
import { useQuery } from '@tanstack/react-query';
import { lastValueFrom } from 'rxjs';
import type * as estypes from '@elastic/elasticsearch/lib/api/types';
import type { IKibanaSearchResponse, IKibanaSearchRequest } from '@kbn/search-types';
import { useKibana } from '../../common/lib/kibana';
import type {
  SecurityFindingDetail,
  SecurityFindingsDetailResult,
  FindingType,
} from '../../../common/endpoint_assets';

const RAW_OSQUERY_INDEX = 'logs-osquery_manager.result-*';

/**
 * Build the query filter for each finding type.
 * Uses the same field existence checks as the transform to identify finding types.
 * Filters by BOTH host.id AND host.name to match transform grouping (important when
 * multiple hosts share the same host.id but have different host.names).
 */
const getQueryFilterForFindingType = (
  findingType: FindingType,
  hostId: string,
  hostName: string
): estypes.QueryDslQueryContainer => {
  // Filter by both host.id AND host.name to match transform's group_by behavior
  const hostFilters: estypes.QueryDslQueryContainer[] = [
    { term: { 'host.id': hostId } },
    { term: { 'host.name': hostName } },
  ];

  switch (findingType) {
    case 'Suspicious Services':
      // Identified by signature_status field from services signature validation query
      return {
        bool: {
          filter: [...hostFilters, { exists: { field: 'osquery.signature_status' } }],
        },
      };

    case 'Suspicious Tasks (LOTL)':
      // Identified by detection_method field from LOTL detection query
      return {
        bool: {
          filter: [...hostFilters, { exists: { field: 'osquery.detection_method' } }],
        },
      };

    case 'Unsigned Processes':
      // Identified by result field from unsigned processes query
      return {
        bool: {
          filter: [...hostFilters, { exists: { field: 'osquery.result' } }],
        },
      };

    default:
      return {
        bool: {
          filter: hostFilters,
        },
      };
  }
};

/**
 * Extract nested field value from osquery result hit
 */
const getFieldValue = (hit: estypes.SearchHit, fieldPath: string): string | undefined => {
  if (!hit.fields) return undefined;

  const value = hit.fields[fieldPath];
  if (Array.isArray(value)) {
    return value[0] as string | undefined;
  }
  return value as string | undefined;
};

/**
 * Map raw osquery result hit to SecurityFindingDetail interface
 */
const mapHitToFinding = (
  hit: estypes.SearchHit,
  findingType: FindingType
): SecurityFindingDetail => {
  const id = hit._id ?? '';
  const timestamp = getFieldValue(hit, '@timestamp') ?? '';
  const actionId = getFieldValue(hit, 'action_id') ?? '';
  const agentId = getFieldValue(hit, 'agent.id') ?? '';
  const hostId = getFieldValue(hit, 'host.id') ?? '';

  // Common fields
  const name = getFieldValue(hit, 'osquery.name');
  const path = getFieldValue(hit, 'osquery.path');
  const sha256 = getFieldValue(hit, 'osquery.sha256');

  // Build VirusTotal link if sha256 is available
  const vtLink = sha256 ? `https://www.virustotal.com/gui/file/${sha256}` : undefined;

  // Type-specific fields
  let signatureStatus: string | undefined;
  let signatureSigner: string | undefined;
  let detectionMethod: string | undefined;
  let detectionReason: string | undefined;
  let commandLine: string | undefined;
  let result: string | undefined;

  switch (findingType) {
    case 'Suspicious Services':
      signatureStatus = getFieldValue(hit, 'osquery.signature_status');
      signatureSigner = getFieldValue(hit, 'osquery.signature_signer');
      break;

    case 'Suspicious Tasks (LOTL)':
      detectionMethod = getFieldValue(hit, 'osquery.detection_method');
      detectionReason = getFieldValue(hit, 'osquery.detection_reason');
      commandLine = getFieldValue(hit, 'osquery.command_line');
      break;

    case 'Unsigned Processes':
      result = getFieldValue(hit, 'osquery.result');
      break;
  }

  return {
    id,
    timestamp,
    actionId,
    agentId,
    hostId,
    name,
    path,
    sha256,
    vtLink,
    signatureStatus,
    signatureSigner,
    detectionMethod,
    detectionReason,
    commandLine,
    result,
  };
};

/**
 * Hook to fetch detailed security findings from raw osquery data
 *
 * Queries logs-osquery_manager.result-* index for ALL findings of a specific type
 * for a given host, not just the latest finding shown in the transform output.
 *
 * @param hostId - The host.id to filter by
 * @param hostName - The host.name to filter by (needed because transform groups by both)
 * @param findingType - Type of security finding to retrieve
 * @param enabled - Whether the query should be executed
 * @returns Security findings detail result with loading/error states
 */
export const useSecurityFindingsDetail = (
  hostId: string | null,
  hostName: string | null,
  findingType: FindingType | null,
  enabled: boolean
): SecurityFindingsDetailResult => {
  const { services } = useKibana();

  const fetchFindings = useCallback(async (): Promise<{
    findings: SecurityFindingDetail[];
    total: number;
  }> => {
    const { data } = services;
    if (!data?.search) {
      throw new Error('Search service not available');
    }

    if (!hostId || !hostName || !findingType) {
      return { findings: [], total: 0 };
    }

    type FindingsSearchRequest = IKibanaSearchRequest<estypes.SearchRequest>;
    type FindingsSearchResponse = IKibanaSearchResponse<estypes.SearchResponse>;

    // Use field existence filters matching the transform configuration
    // Filter by both host.id AND host.name to match transform grouping
    const queryFilter = getQueryFilterForFindingType(findingType, hostId, hostName);

    const searchRequest: estypes.SearchRequest = {
      index: RAW_OSQUERY_INDEX,
      size: 100, // Pagination: limit to 100 results
      sort: [{ '@timestamp': 'desc' }],
      query: queryFilter,
      fields: [
        '@timestamp',
        'action_id',
        'agent.id',
        'host.id',
        'osquery.name',
        'osquery.path',
        'osquery.sha256',
        'osquery.signature_status',
        'osquery.signature_signer',
        'osquery.detection_method',
        'osquery.detection_reason',
        'osquery.command_line',
        'osquery.result',
      ],
      _source: false,
    };

    const response = await lastValueFrom(
      data.search.search<FindingsSearchRequest, FindingsSearchResponse>({
        params: searchRequest as FindingsSearchRequest['params'],
      })
    );

    const hits = response.rawResponse.hits.hits;
    const total = typeof response.rawResponse.hits.total === 'number'
      ? response.rawResponse.hits.total
      : response.rawResponse.hits.total?.value ?? 0;

    const findings = hits.map((hit) => mapHitToFinding(hit, findingType));

    return { findings, total };
  }, [services, hostId, hostName, findingType]);

  const queryKey = ['security-findings-detail', hostId, hostName, findingType];

  const { data, isLoading, error } = useQuery({
    queryKey,
    queryFn: fetchFindings,
    enabled: enabled && !!hostId && !!hostName && !!findingType,
    staleTime: 60000, // 1 minute
  });

  return {
    findings: data?.findings ?? [],
    total: data?.total ?? 0,
    loading: isLoading,
    error: error as Error | null,
  };
};
