/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const CORRELATION_TYPE_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.correlationTypeLabel',
  {
    defaultMessage: 'Correlation Type',
  }
);

export const CORRELATION_TYPE_HELP_TEXT = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.correlationTypeHelpText',
  {
    defaultMessage: 'Select how alerts should be correlated',
  }
);

export const CORRELATION_RULES_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.correlationRulesLabel',
  {
    defaultMessage: 'Rules to correlate',
  }
);

export const CORRELATION_RULES_HELP_TEXT = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.correlationRulesHelpText',
  {
    defaultMessage: 'Select the detection rules whose alerts should be correlated',
  }
);

export const CORRELATION_GROUP_BY_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.correlationGroupByLabel',
  {
    defaultMessage: 'Group by',
  }
);

export const CORRELATION_GROUP_BY_HELP_TEXT = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.correlationGroupByHelpText',
  {
    defaultMessage: 'Fields to group correlated alerts by (e.g., host.name, user.name)',
  }
);

export const CORRELATION_TIMESPAN_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.correlationTimespanLabel',
  {
    defaultMessage: 'Timespan',
  }
);

export const CORRELATION_TIMESPAN_HELP_TEXT = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.correlationTimespanHelpText',
  {
    defaultMessage: 'Time window for correlation',
  }
);

export const CORRELATION_CONDITION_OPERATOR_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.correlationConditionOperatorLabel',
  {
    defaultMessage: 'Condition',
  }
);

export const CORRELATION_CONDITION_OPERATOR_HELP_TEXT = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.correlationConditionOperatorHelpText',
  {
    defaultMessage: 'Optional condition for count-based correlations',
  }
);

export const CORRELATION_CONDITION_VALUE_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.correlationConditionValueLabel',
  {
    defaultMessage: 'Count',
  }
);

export const CORRELATION_CONDITION_VALUE_HELP_TEXT = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.correlationConditionValueHelpText',
  {
    defaultMessage: 'Threshold value for the condition',
  }
);

export const CORRELATION_CONDITION_FIELD_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.correlationConditionFieldLabel',
  {
    defaultMessage: 'Field',
  }
);

export const CORRELATION_CONDITION_FIELD_HELP_TEXT = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.correlationConditionFieldHelpText',
  {
    defaultMessage: 'Field to count distinct values of (for value_count type)',
  }
);

export const CORRELATION_ESQL_PREVIEW_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.correlationEsqlPreviewLabel',
  {
    defaultMessage: 'Compiled ES|QL Query',
  }
);

export const CORRELATION_ESQL_PREVIEW_HELP_TEXT = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.correlationEsqlPreviewHelpText',
  {
    defaultMessage: 'Preview of the ES|QL query that will be executed',
  }
);

export const CORRELATION_ESQL_PREVIEW_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.correlationEsqlPreviewPlaceholder',
  {
    defaultMessage: 'The ES|QL query will be compiled server-side when the rule is saved.',
  }
);

export const CORRELATION_RULES_REQUIRED_ERROR = i18n.translate(
  'xpack.securitySolution.detectionEngine.validations.correlationRulesRequired',
  {
    defaultMessage: 'At least one rule is required.',
  }
);

export const CORRELATION_GROUP_BY_REQUIRED_ERROR = i18n.translate(
  'xpack.securitySolution.detectionEngine.validations.correlationGroupByRequired',
  {
    defaultMessage: 'At least one group-by field is required.',
  }
);

export const CORRELATION_CONDITION_VALUE_ERROR = i18n.translate(
  'xpack.securitySolution.detectionEngine.validations.correlationConditionValue',
  {
    defaultMessage: 'Value must be greater than or equal to one.',
  }
);

export const CORRELATION_REMOTE_CLUSTERS_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.correlationRemoteClustersLabel',
  {
    defaultMessage: 'Remote clusters',
  }
);

export const CORRELATION_REMOTE_CLUSTERS_HELP_TEXT = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.correlationRemoteClustersHelpText',
  {
    defaultMessage: 'Optional remote clusters for cross-cluster alert correlation',
  }
);

export const CORRELATION_TYPE_TEMPORAL = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.correlationTypeTemporal',
  {
    defaultMessage: 'Temporal',
  }
);

export const CORRELATION_TYPE_TEMPORAL_ORDERED = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.correlationTypeTemporalOrdered',
  {
    defaultMessage: 'Temporal Ordered',
  }
);

export const CORRELATION_TYPE_EVENT_COUNT = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.correlationTypeEventCount',
  {
    defaultMessage: 'Event Count',
  }
);

export const CORRELATION_TYPE_VALUE_COUNT = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.correlationTypeValueCount',
  {
    defaultMessage: 'Value Count',
  }
);

export const CORRELATION_INFO_ARIA_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.correlationInfoIconAriaLabel',
  {
    defaultMessage: 'Correlation rule info',
  }
);

export const CORRELATION_REMOTE_CLUSTERS_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.correlationRemoteClustersPlaceholder',
  {
    defaultMessage: 'Select or type cluster names',
  }
);

export const CORRELATION_TARGET_SPACES_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.correlationTargetSpacesLabel',
  {
    defaultMessage: 'Target spaces',
  }
);

export const CORRELATION_TARGET_SPACES_HELP_TEXT = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.correlationTargetSpacesHelpText',
  {
    defaultMessage: 'Optional Kibana spaces to include in cross-space alert correlation',
  }
);

export const CORRELATION_TARGET_SPACES_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.correlationTargetSpacesPlaceholder',
  {
    defaultMessage: 'Select or type space IDs',
  }
);

export const CORRELATION_REMOTE_CLUSTERS_LOADING = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.correlationRemoteClustersLoading',
  {
    defaultMessage: 'Loading remote clusters...',
  }
);

export const CORRELATION_REMOTE_CLUSTERS_DISCONNECTED = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.correlationRemoteClustersDisconnected',
  {
    defaultMessage: 'disconnected',
  }
);

export const CONDITION_OPERATOR_EQ = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.conditionOperatorEq',
  {
    defaultMessage: '=',
  }
);

export const CONDITION_OPERATOR_NEQ = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.conditionOperatorNeq',
  {
    defaultMessage: '≠',
  }
);

export const CONDITION_OPERATOR_GT = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.conditionOperatorGt',
  {
    defaultMessage: '>',
  }
);

export const CONDITION_OPERATOR_GTE = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.conditionOperatorGte',
  {
    defaultMessage: '≥',
  }
);

export const CONDITION_OPERATOR_LT = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.conditionOperatorLt',
  {
    defaultMessage: '<',
  }
);

export const CONDITION_OPERATOR_LTE = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.stepDefineRule.conditionOperatorLte',
  {
    defaultMessage: '≤',
  }
);

export const CORRELATION_RECOMMENDATION_ANALYSIS_DETAILS = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.correlationTypeRecommendation.analysisDetails',
  {
    defaultMessage: 'Analysis details',
  }
);

export const CORRELATION_RECOMMENDATION_ALERT_COUNTS = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.correlationTypeRecommendation.alertCounts',
  {
    defaultMessage: 'Alert counts per rule',
  }
);

export const CORRELATION_RECOMMENDATION_CARDINALITY = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.correlationTypeRecommendation.cardinality',
  {
    defaultMessage: 'Group-by field cardinality',
  }
);

export const CORRELATION_RECOMMENDATION_AVG_TIME = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.correlationTypeRecommendation.avgTime',
  {
    defaultMessage: 'Average time between alerts',
  }
);

export const CORRELATION_RECOMMENDATION_LOADING = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.correlationTypeRecommendation.loading',
  {
    defaultMessage: 'Loading recommendation...',
  }
);

export const CORRELATION_RECOMMENDATION_SERVER_ANALYSIS = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.correlationTypeRecommendation.serverAnalysis',
  {
    defaultMessage: 'Server-side analysis',
  }
);
