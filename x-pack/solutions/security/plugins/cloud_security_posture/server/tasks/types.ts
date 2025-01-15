/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LatestTaskStateSchema } from './task_state';

export interface ScoreByPolicyTemplateBucket {
  score_by_policy_template: {
    buckets: Array<{
      key: string; // policy template
      doc_count: number;
      passed_findings: { doc_count: number };
      failed_findings: { doc_count: number };
      total_findings: { value: number };
      score_by_cluster_id: {
        buckets: Array<{
          key: string; // cluster id
          passed_findings: { doc_count: number };
          failed_findings: { doc_count: number };
          total_findings: { value: number };
        }>;
      };
      score_by_benchmark_id: {
        buckets: Array<{
          key: string; // benchmark id
          doc_count: number;
          benchmark_versions: {
            buckets: Array<{
              key: string; // benchmark version
              passed_findings: { doc_count: number };
              failed_findings: { doc_count: number };
              total_findings: { value: number };
            }>;
          };
        }>;
      };
    }>;
  };
}

export interface VulnSeverityAggs {
  critical: {
    doc_count: number;
  };
  high: {
    doc_count: number;
  };
  medium: {
    doc_count: number;
  };
  low: {
    doc_count: number;
  };
  vulnerabilities_stats_by_cloud_account: {
    buckets: Array<{
      key: string; // cloud account id
      critical: {
        doc_count: number;
      };
      high: {
        doc_count: number;
      };
      medium: {
        doc_count: number;
      };
      low: {
        doc_count: number;
      };
      cloud_account_name: {
        buckets: Array<{
          key: string; // cloud account name
        }>;
      };
    }>;
  };
}

export interface FindingsStatsTaskResult {
  state: LatestTaskStateSchema;
}
