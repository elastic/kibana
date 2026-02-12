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
  CategoriesResponse,
  SiemReadinessPackageInfo,
  RelatedIntegrationRuleResponse,
  DataQualityResultDocument,
  PipelineStats,
} from './types';
import {
  GET_SIEM_READINESS_CATEGORIES_API_PATH,
  GET_SIEM_READINESS_PIPELINES_API_PATH,
  GET_INDEX_RESULTS_LATEST_API_PATH,
} from './constants';

const GET_READINESS_CATEGORIES_QUERY_KEY = ['readiness-categories'] as const;
const GET_READINESS_PIPELINES_QUERY_KEY = ['readiness-pipelines'] as const;
const GET_DETECTION_RULES_QUERY_KEY = ['detection-rules'] as const;
const GET_INTEGRATIONS_QUERY_KEY = ['fleet-integrations-packages'] as const;
const GET_INDEX_RESULTS_LATEST_QUERY_KEY = ['index-results-latest'] as const;

export const useSiemReadinessApi = () => {
  const { http } = useKibana<CoreStart>().services;

  const getReadinessCategories = useQuery({
    queryKey: GET_READINESS_CATEGORIES_QUERY_KEY,
    queryFn: () => {
      return http.get<CategoriesResponse>(GET_SIEM_READINESS_CATEGORIES_API_PATH);
    },
  });

  const getIntegrations = useQuery({
    queryKey: GET_INTEGRATIONS_QUERY_KEY,
    queryFn: () => http.get<{ items: SiemReadinessPackageInfo[] }>('/api/fleet/epm/packages'),
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

  const getIndexQualityResultsLatest = useQuery({
    queryKey: GET_INDEX_RESULTS_LATEST_QUERY_KEY,
    queryFn: () => {
      return http.get<DataQualityResultDocument[]>(`${GET_INDEX_RESULTS_LATEST_API_PATH}/*`, {
        version: '1',
      });
    },
  });

  const getReadinessPipelines = useQuery({
    queryKey: GET_READINESS_PIPELINES_QUERY_KEY,
    queryFn: () => {
      return http.get<PipelineStats[]>(GET_SIEM_READINESS_PIPELINES_API_PATH);
    },
  });

  return {
    getReadinessCategories,
    getIntegrations,
    getDetectionRules,
    getIndexQualityResultsLatest,
    getReadinessPipelines,
  };
};
