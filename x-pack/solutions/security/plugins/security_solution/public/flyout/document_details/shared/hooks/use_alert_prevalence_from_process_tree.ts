/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { useQuery } from '@kbn/react-query';
import { useMemo } from 'react';
import { useAlertDocumentAnalyzerSchema } from './use_alert_document_analyzer_schema';
import { useHttp } from '../../../../common/lib/kibana';
import { useSecurityDefaultPatterns } from '../../../../data_view_manager/hooks/use_security_default_patterns';

export interface StatsNode {
  /**
   * The data of the node
   */
  data: object;
  /**
   * The ID of the node
   */
  id: string;
  /**
   * The name of the node
   */
  name: string;
  /**
   * The parent ID of the node
   */
  parent?: string;
  stats: {
    /**
     * The total number of alerts
     */
    total: number;
    /**
     * The total number of alerts by category
     */
    byCategory: {
      alerts?: number;
    };
  };
}

interface ProcessTreeAlertPrevalenceResponse {
  /**
   * The alert IDs found in the process tree
   */
  alertIds: string[] | undefined;
  /**
   * The stats nodes found in the process tree
   */
  statsNodes: StatsNode[] | undefined;
}

interface TreeResponse {
  /**
   * The alert IDs found in the process tree
   */
  alertIds: string[];
  /**
   * The stats nodes found in the process tree
   */
  statsNodes: StatsNode[];
}

export interface UseAlertPrevalenceFromProcessTreeParams {
  /**
   * The document ID of the alert to analyze
   */
  documentId: string;
  /**
   * Whether or not the timeline is active
   */
  isActiveTimeline: boolean;
  /**
   * The indices to search for alerts
   */
  indices: string[];
}

export interface UserAlertPrevalenceFromProcessTreeResult {
  /**
   * Whether or not the query is loading
   */
  loading: boolean;
  /**
   * The alert IDs found in the process tree
   */
  alertIds: undefined | string[];
  /**
   * The stats nodes found in the process tree
   */
  statsNodes: undefined | StatsNode[];
  /**
   * Whether or not the query errored
   */
  error: boolean;
}

/**
 * Fetches the alert prevalence from the process tree
 */
export function useAlertPrevalenceFromProcessTree({
  documentId,
  isActiveTimeline,
  indices,
}: UseAlertPrevalenceFromProcessTreeParams): UserAlertPrevalenceFromProcessTreeResult {
  const http = useHttp();

  const { indexPatterns } = useSecurityDefaultPatterns();

  const alertAndOriginalIndices = useMemo(
    () => [...new Set(indexPatterns.concat(indices))],
    [indices, indexPatterns]
  );
  const { loading, id, schema, agentId } = useAlertDocumentAnalyzerSchema({
    documentId,
    indices: alertAndOriginalIndices,
  });

  const query = useQuery<ProcessTreeAlertPrevalenceResponse>(
    ['getAlertPrevalenceFromProcessTree', id],
    () => {
      return http.post<TreeResponse>(`/api/endpoint/resolver/tree`, {
        body: JSON.stringify({
          schema,
          ancestors: 200,
          descendants: 500,
          indexPatterns: alertAndOriginalIndices,
          nodes: [id],
          includeHits: true,
          agentId,
        }),
      });
    },
    { enabled: schema !== null && id !== null }
  );

  if (query.isLoading || loading) {
    return {
      loading: true,
      error: false,
      alertIds: undefined,
      statsNodes: undefined,
    };
  } else if (query.data) {
    return {
      loading: false,
      error: false,
      alertIds: query.data.alertIds,
      statsNodes: query.data.statsNodes,
    };
  } else {
    return {
      loading: false,
      error: true,
      alertIds: undefined,
      statsNodes: undefined,
    };
  }
}
