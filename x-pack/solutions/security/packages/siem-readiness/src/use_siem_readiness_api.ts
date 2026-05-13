/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useKibana } from '@kbn/kibana-react-plugin/public';
import type { CoreStart } from '@kbn/core/public';
import type {
  SiemReadinessPackageInfo,
  RelatedIntegrationRuleResponse,
  CompiledContinuityData,
  CompiledRetentionData,
  CompiledQualityData,
  CompiledCoverageData,
} from './types';
import {
  GET_SIEM_READINESS_PIPELINES_API_PATH,
  GET_SIEM_READINESS_RETENTION_API_PATH,
  GET_SIEM_READINESS_QUALITY_API_PATH,
  GET_SIEM_READINESS_COVERAGE_API_PATH,
} from './constants';

const REFETCH_INTERVAL = 30000;

const GET_READINESS_COVERAGE_QUERY_KEY = ['readiness-coverage'] as const;
const GET_READINESS_RETENTION_QUERY_KEY = ['readiness-retention'] as const;
const GET_READINESS_PIPELINES_QUERY_KEY = ['readiness-pipelines'] as const;
const GET_READINESS_QUALITY_QUERY_KEY = ['readiness-quality'] as const;
const GET_DETECTION_RULES_QUERY_KEY = ['detection-rules'] as const;
const GET_INTEGRATIONS_QUERY_KEY = ['fleet-integrations-packages'] as const;

export const useSiemReadinessApi = () => {
  const { http } = useKibana<CoreStart>().services;

  const getReadinessCoverage = useQuery({
    queryKey: GET_READINESS_COVERAGE_QUERY_KEY,
    queryFn: () => {
      return http.get<CompiledCoverageData>(GET_SIEM_READINESS_COVERAGE_API_PATH);
    },
    refetchInterval: REFETCH_INTERVAL,
  });

  const getIntegrations = useQuery({
    queryKey: GET_INTEGRATIONS_QUERY_KEY,
    queryFn: () =>
      http.get<{ items: SiemReadinessPackageInfo[] }>('/api/fleet/epm/packages', {
        query: { withPackagePoliciesCount: true },
      }),
  });

  const getDetectionRules = useQuery({
    queryKey: GET_DETECTION_RULES_QUERY_KEY,
    queryFn: () => {
      return http.get<{ data: RelatedIntegrationRuleResponse[] }>(
        '/api/detection_engine/rules/_find',
        {
          query: {
            filter: 'alert.attributes.enabled:true',
            per_page: 10000,
          },
        }
      );
    },
  });

  const getReadinessPipelines = useQuery({
    queryKey: GET_READINESS_PIPELINES_QUERY_KEY,
    queryFn: () => {
      return http.get<CompiledContinuityData>(GET_SIEM_READINESS_PIPELINES_API_PATH);
    },
    refetchInterval: REFETCH_INTERVAL,
  });

  const getReadinessRetention = useQuery({
    queryKey: GET_READINESS_RETENTION_QUERY_KEY,
    queryFn: () => {
      return http.get<CompiledRetentionData>(GET_SIEM_READINESS_RETENTION_API_PATH);
    },
    refetchInterval: REFETCH_INTERVAL,
  });

  const getReadinessQuality = useQuery({
    queryKey: GET_READINESS_QUALITY_QUERY_KEY,
    queryFn: () => {
      return http.get<CompiledQualityData>(GET_SIEM_READINESS_QUALITY_API_PATH);
    },
    refetchInterval: REFETCH_INTERVAL,
  });

  return {
    getReadinessCoverage,
    getIntegrations,
    getDetectionRules,
    getReadinessRetention,
    getReadinessPipelines,
    getReadinessQuality,
  };
};
