/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MakeSchemaFrom } from '@kbn/usage-collection-plugin/server';
import type { CspmUsage } from './types';

export const cspmUsageSchema: MakeSchemaFrom<CspmUsage> = {
  indices: {
    findings: {
      doc_count: {
        type: 'long',
      },
      deleted: {
        type: 'long',
      },
      size_in_bytes: {
        type: 'long',
      },
      last_doc_timestamp: {
        type: 'date',
      },
    },
    latest_findings: {
      doc_count: {
        type: 'long',
      },
      deleted: {
        type: 'long',
      },
      size_in_bytes: {
        type: 'long',
      },
      last_doc_timestamp: {
        type: 'date',
      },
    },
    vulnerabilities: {
      doc_count: {
        type: 'long',
      },
      deleted: {
        type: 'long',
      },
      size_in_bytes: {
        type: 'long',
      },
      last_doc_timestamp: {
        type: 'date',
      },
    },
    latest_vulnerabilities: {
      doc_count: {
        type: 'long',
      },
      deleted: {
        type: 'long',
      },
      size_in_bytes: {
        type: 'long',
      },
      last_doc_timestamp: {
        type: 'date',
      },
    },
    score: {
      doc_count: {
        type: 'long',
      },
      deleted: {
        type: 'long',
      },
      size_in_bytes: {
        type: 'long',
      },
      last_doc_timestamp: {
        type: 'date',
      },
    },
    latestPackageVersion: { type: 'keyword' },
    cspm: {
      status: { type: 'keyword' },
      installedPackagePolicies: { type: 'long' },
      healthyAgents: { type: 'long' },
    },
    kspm: {
      status: { type: 'keyword' },
      installedPackagePolicies: { type: 'long' },
      healthyAgents: { type: 'long' },
    },
    vuln_mgmt: {
      status: { type: 'keyword' },
      installedPackagePolicies: { type: 'long' },
      healthyAgents: { type: 'long' },
    },
  },
  resources_stats: {
    type: 'array',
    items: {
      account_id: { type: 'keyword' },
      resource_type: { type: 'keyword' },
      resource_type_doc_count: { type: 'long' },
      resource_sub_type: { type: 'keyword' },
      resource_sub_type_doc_count: { type: 'long' },
      passed_findings_count: { type: 'long' },
      failed_findings_count: { type: 'long' },
    },
  },
  accounts_stats: {
    type: 'array',
    items: {
      account_id: { type: 'keyword' },
      posture_score: { type: 'long' },
      latest_findings_doc_count: { type: 'long' },
      benchmark_id: { type: 'keyword' },
      benchmark_name: { type: 'keyword' },
      benchmark_version: { type: 'keyword' },
      kubernetes_version: { type: 'keyword' },
      passed_findings_count: { type: 'long' },
      failed_findings_count: { type: 'long' },
      agents_count: { type: 'short' },
      nodes_count: { type: 'short' },
      pods_count: { type: 'short' },
    },
  },
  rules_stats: {
    type: 'array',
    items: {
      account_id: { type: 'keyword' },
      rule_id: { type: 'keyword' },
      rule_name: { type: 'keyword' },
      rule_section: { type: 'keyword' },
      rule_version: { type: 'keyword' },
      rule_number: { type: 'keyword' },
      posture_type: { type: 'keyword' },
      benchmark_id: { type: 'keyword' },
      benchmark_name: { type: 'keyword' },
      benchmark_version: { type: 'keyword' },
      passed_findings_count: { type: 'long' },
      failed_findings_count: { type: 'long' },
    },
  },
  installation_stats: {
    type: 'array',
    items: {
      package_policy_id: { type: 'keyword' },
      feature: { type: 'keyword' },
      package_version: { type: 'keyword' },
      agent_policy_id: { type: 'keyword' },
      deployment_mode: { type: 'keyword' },
      created_at: { type: 'date' },
      agent_count: { type: 'long' },
      is_agentless: { type: 'boolean' },
      account_type: { type: 'keyword' },
      is_setup_automatic: { type: 'boolean' },
      setup_access_option: { type: 'keyword' },
    },
  },
  alerts_stats: {
    type: 'array',
    items: {
      posture_type: { type: 'keyword' },
      rules_count: { type: 'long' },
      alerts_count: { type: 'long' },
      alerts_open_count: { type: 'long' },
      alerts_closed_count: { type: 'long' },
      alerts_acknowledged_count: { type: 'long' },
    },
  },
  cloud_account_stats: {
    type: 'array',
    items: {
      account_id: { type: 'keyword' },
      cloud_provider: { type: 'keyword' },
      product: { type: 'keyword' },
      package_policy_id: { type: 'keyword' },
      latest_doc_count: { type: 'long' },
      latest_doc_updated_timestamp: { type: 'date' },
      posture_management_stats: {
        posture_score: { type: 'long' },
        benchmark_name: { type: 'keyword' },
        benchmark_version: { type: 'keyword' },
        passed_findings_count: { type: 'long' },
        failed_findings_count: { type: 'long' },
      },
      posture_management_stats_enabled_rules: {
        posture_score: { type: 'long' },
        benchmark_name: { type: 'keyword' },
        benchmark_version: { type: 'keyword' },
        passed_findings_count: { type: 'long' },
        failed_findings_count: { type: 'long' },
      },
      kspm_stats: {
        kubernetes_version: { type: 'keyword' },
        agents_count: { type: 'short' },
        nodes_count: { type: 'short' },
        pods_count: { type: 'short' },
      },
      has_muted_rules: { type: 'boolean' },
    },
  },
  muted_rules_stats: {
    type: 'array',
    items: {
      id: { type: 'keyword' },
      name: { type: 'keyword' },
      section: { type: 'keyword' },
      benchmark_id: { type: 'keyword' },
      benchmark_name: { type: 'keyword' },
      benchmark_version: { type: 'keyword' },
      rule_number: { type: 'keyword' },
      posture_type: { type: 'keyword' },
      version: { type: 'keyword' },
    },
  },
};
