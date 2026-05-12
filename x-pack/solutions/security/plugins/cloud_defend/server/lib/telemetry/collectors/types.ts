/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  Selector,
  Response,
  SelectorType,
  SelectorCondition,
  ResponseAction,
} from '../../../../common/v1';

export interface CloudDefendUsage {
  indices: CloudDefendIndicesStats;
  pods_stats: CloudDefendPodsStats[];
  accounts_stats: CloudDefendAccountsStats[];
  installation_stats: CloudDefendInstallationStats[];
}

export interface PackageSetupStatus {
  status: string;
  installedPackagePolicies: number;
  healthyAgents: number;
}

export interface CloudDefendIndicesStats {
  alerts: IndexStats | {};
  file: IndexStats | {};
  process: IndexStats | {};
  latestPackageVersion: string;
  packageStatus: PackageSetupStatus;
}

export interface IndexStats {
  doc_count: number;
  deleted: number;
  size_in_bytes: number;
  last_doc_timestamp: string | null;
}

export interface CloudDefendPodsStats {
  account_id: string;
  pod_name: string;
  container_image_name: string;
  container_image_tag: string;
  total_doc_count: number;
  file_doc_count: number;
  process_doc_count: number;
  alert_doc_count: number;
}

export interface CloudDefendAccountsStats {
  account_id: string;
  total_doc_count: number;
  cloud_provider: string;
  kubernetes_version: string | null;
  file_doc_count: number;
  process_doc_count: number;
  alert_doc_count: number;
  agents_count: number;
  nodes_count: number;
  pods_count: number;
}

export type CloudDefendSelectorTypeCounts = {
  [key in SelectorType]: number;
};

export type CloudDefendResponseTypeCounts = {
  [key in SelectorType]: number;
};

export type CloudDefendConditionsCounts = {
  [key in SelectorCondition]?: number;
};

export type CloudDefendActionCounts = {
  [key in ResponseAction]?: number;
};

export interface CloudDefendPolicyYamlStats {
  policy_yaml: string;
  policy_json: string; // to be used for further digging in BigQuery
  selector_counts: CloudDefendSelectorTypeCounts;
  response_counts: CloudDefendResponseTypeCounts;
  selector_conditions_counts: CloudDefendConditionsCounts;
  response_actions_counts: CloudDefendActionCounts;
  response_match_names: string[];
  response_exclude_names: string[];
}

type CloudDefendSelector = Omit<Selector, 'hasErrors'>;
type CloudDefendResponse = Omit<Response, 'hasErrors'>;

export interface CloudDefendInstallationStats {
  package_policy_id: string;
  package_version: string;
  agent_policy_id: string;
  created_at: string;
  agent_count: number;
  policy_yaml: string;
  selectors: CloudDefendSelector[];
  responses: CloudDefendResponse[];
}
