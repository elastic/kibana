/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CloudSecurityPolicyTemplate, PostureInput } from '../../common/types_old';
import type { CLOUDBEAT_AKS, CLOUDBEAT_GKE } from '../../common/constants';

export const DEFAULT_VISIBLE_ROWS_PER_PAGE = 25;

export const LOCAL_STORAGE_DATA_TABLE_PAGE_SIZE_KEY = 'cloudPosture:dataTable:pageSize';
export const LOCAL_STORAGE_DATA_TABLE_COLUMNS_KEY = 'cloudPosture:dataTable:columns';
export const LOCAL_STORAGE_PAGE_SIZE_BENCHMARK_KEY = 'cloudPosture:benchmark:pageSize';
export const LOCAL_STORAGE_PAGE_SIZE_RULES_KEY = 'cloudPosture:rules:pageSize';
export const LOCAL_STORAGE_DASHBOARD_BENCHMARK_SORT_KEY =
  'cloudPosture:complianceDashboard:benchmarkSort';
export const LOCAL_STORAGE_FINDINGS_LAST_SELECTED_TAB_KEY = 'cloudPosture:findings:lastSelectedTab';

export const LOCAL_STORAGE_3P_INTEGRATIONS_CALLOUT_KEY =
  'cloudPosture:findings:3pIntegrationsCallout';

export const LOCAL_STORAGE_VULNERABILITIES_GROUPING_KEY = 'cspLatestVulnerabilitiesGrouping';
export const LOCAL_STORAGE_FINDINGS_GROUPING_KEY = 'cspLatestFindingsGrouping';

export const LOCAL_STORAGE_NAMESPACE_KEY = 'cloudPosture:dashboard:namespace';

export const SESSION_STORAGE_FIELDS_MODAL_SHOW_SELECTED = 'cloudPosture:fieldsModal:showSelected';

export const DEFAULT_NAMESPACE = 'default';

export type CloudPostureIntegrations = Record<
  CloudSecurityPolicyTemplate,
  CloudPostureIntegrationProps
>;
export interface CloudPostureIntegrationProps {
  policyTemplate: CloudSecurityPolicyTemplate;
  name: string;
  shortName: string;
  options?: Array<{
    type: PostureInput | typeof CLOUDBEAT_AKS | typeof CLOUDBEAT_GKE;
    name: string;
    benchmark: string;
    disabled?: boolean;
    icon?: string;
    tooltip?: string;
    isBeta?: boolean;
    testId?: string;
  }>;
}

export const FINDINGS_DOCS_URL = 'https://ela.st/findings';
export const MIN_VERSION_GCP_CIS = '1.5.2';

export const NO_FINDINGS_STATUS_REFRESH_INTERVAL_MS = 10000;

export const DETECTION_ENGINE_RULES_KEY = 'detection_engine_rules';
export const DETECTION_ENGINE_ALERTS_KEY = 'detection_engine_alerts';

export const DEFAULT_GROUPING_TABLE_HEIGHT = 512;

export const FINDINGS_GROUPING_OPTIONS = {
  NONE: 'none',
  RESOURCE_ID: 'resource.id',
  RESOURCE_NAME: 'resource.name',
  RULE_NAME: 'rule.name',
  RULE_SECTION: 'rule.section',
  CLOUD_ACCOUNT_NAME: 'cloud.account.name',
  CLOUD_ACCOUNT_ID: 'cloud.account.id',
  ORCHESTRATOR_CLUSTER_NAME: 'orchestrator.cluster.name',
  ORCHESTRATOR_CLUSTER_ID: 'orchestrator.cluster.id',
  NAMESPACE: 'data_stream.namespace',
};

export const VULNERABILITY_FIELDS = {
  VULNERABILITY_TITLE: 'vulnerability.title',
  VULNERABILITY_ID: 'vulnerability.id',
  SCORE_BASE: 'vulnerability.score.base',
  RESOURCE_NAME: 'resource.name',
  RESOURCE_ID: 'resource.id',
  SEVERITY: 'vulnerability.severity',
  PACKAGE_NAME: 'package.name',
  PACKAGE_VERSION: 'package.version',
  PACKAGE_FIXED_VERSION: 'package.fixed_version',
  CLOUD_ACCOUNT_NAME: 'cloud.account.name',
  CLOUD_ACCOUNT_ID: 'cloud.account.id',
  CLOUD_PROVIDER: 'cloud.provider',
  DESCRIPTION: 'vulnerability.description',
  VENDOR: 'observer.vendor',
} as const;

export const VULNERABILITY_GROUPING_OPTIONS = {
  NONE: 'none',
  RESOURCE_ID: VULNERABILITY_FIELDS.RESOURCE_ID,
  CLOUD_ACCOUNT_ID: VULNERABILITY_FIELDS.CLOUD_ACCOUNT_ID,
  CVE: VULNERABILITY_FIELDS.VULNERABILITY_ID,
} as const;

export const FINDINGS_FILTER_OPTIONS = {
  CLOUD_PROVIDER: 'cloud.provider',
  NAMESPACE: 'data_stream.namespace',
  RULE_BENCHMARK_ID: 'rule.benchmark.id',
  RULE_BENCHMARK_POSTURE_TYPE: 'rule.benchmark.posture_type',
  RULE_BENCHMARK_VERSION: 'rule.benchmark.version',
  RESULT_EVALUATION: 'result.evaluation',
  RULE_SECTION: 'rule.section',
} as const;

/*
 * ECS schema unique field to describe the event
 * https://www.elastic.co/guide/en/ecs/current/ecs-event.html
 */
export const EVENT_ID = 'event.id';

export const VULNERABILITY_GROUPING_MULTIPLE_VALUE_FIELDS: string[] = [
  VULNERABILITY_FIELDS.VULNERABILITY_ID,
  VULNERABILITY_FIELDS.PACKAGE_NAME,
  VULNERABILITY_FIELDS.PACKAGE_VERSION,
  VULNERABILITY_FIELDS.PACKAGE_FIXED_VERSION,
];

/*
The fields below are default columns of the Cloud Security Data Table that need to have keyword mapping.
The runtime mappings are used to prevent filtering out the data when any of these columns are sorted in the Data Table.
TODO: Remove the fields below once they are mapped as Keyword in the Third Party integrations, or remove
the fields from the runtime mappings if they are removed from the Data Table.
*/
export const CDR_VULNERABILITY_DATA_TABLE_RUNTIME_MAPPING_FIELDS: string[] = [];
export const CDR_MISCONFIGURATION_DATA_TABLE_RUNTIME_MAPPING_FIELDS: string[] = [
  'rule.benchmark.rule_number',
  'rule.section',
  'resource.sub_type',
];

/*
The fields below are used to group the data in the Cloud Security Data Table.
The keys are the fields that are used to group the data, and the values are the fields that need to have keyword mapping
to prevent filtering out the data when grouping by the key field.
WARNING: only add keys which are not mapped as keywords - casting to keywords could have negative effect on performance.
TODO: Remove the fields below once they are mapped as Keyword in the Third Party integrations, or remove
the fields from the runtime mappings if they are removed from the Data Table.
*/
export const CDR_VULNERABILITY_GROUPING_RUNTIME_MAPPING_FIELDS: Record<string, string[]> = {};
export const CDR_MISCONFIGURATION_GROUPING_RUNTIME_MAPPING_FIELDS: Record<string, string[]> = {
  [FINDINGS_GROUPING_OPTIONS.ORCHESTRATOR_CLUSTER_ID]: ['orchestrator.cluster.id'],
  [FINDINGS_GROUPING_OPTIONS.CLOUD_ACCOUNT_ID]: ['cloud.account.id'],
};
