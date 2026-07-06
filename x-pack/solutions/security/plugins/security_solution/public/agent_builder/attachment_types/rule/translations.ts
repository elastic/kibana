/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const INDEX_FIELD_LABEL = i18n.translate(
  'xpack.securitySolution.agentBuilder.ruleAttachment.indexPatternsHeading',
  { defaultMessage: 'Index patterns' }
);

export const RULE_TYPE_FIELD_LABEL = i18n.translate(
  'xpack.securitySolution.agentBuilder.ruleAttachment.ruleTypeLabel',
  { defaultMessage: 'Rule type' }
);

export const QUERY_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.queryLabel',
  { defaultMessage: 'Custom query' }
);

export const EQL_QUERY_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.eqlQueryLabel',
  { defaultMessage: 'EQL query' }
);

export const ESQL_QUERY_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.esqlQueryLabel',
  { defaultMessage: 'ES|QL query' }
);

export const SAVED_QUERY_LABEL = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.savedQueryLabel',
  { defaultMessage: 'Saved query' }
);

export const ML_TYPE_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.mlRuleTypeDescription',
  { defaultMessage: 'Machine Learning' }
);

export const EQL_TYPE_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.eqlRuleTypeDescription',
  { defaultMessage: 'Event Correlation' }
);

export const QUERY_TYPE_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.queryRuleTypeDescription',
  { defaultMessage: 'Query' }
);

export const THRESHOLD_TYPE_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.thresholdRuleTypeDescription',
  { defaultMessage: 'Threshold' }
);

export const THREAT_MATCH_TYPE_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.threatMatchRuleTypeDescription',
  { defaultMessage: 'Indicator Match' }
);

export const NEW_TERMS_TYPE_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.newTermsRuleTypeDescription',
  { defaultMessage: 'New Terms' }
);

export const ESQL_TYPE_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.detectionEngine.createRule.esqlRuleTypeDescription',
  { defaultMessage: 'ES|QL' }
);

export const APPLY_TO_FORM = i18n.translate(
  'xpack.securitySolution.agentBuilder.ruleAttachment.applyToForm',
  { defaultMessage: 'Apply to form' }
);

export const EDIT_RULE_SETTINGS = i18n.translate(
  'xpack.securitySolution.agentBuilder.ruleAttachment.editRuleSettings',
  { defaultMessage: 'Edit rule settings' }
);

export const VIEW_RULE = i18n.translate(
  'xpack.securitySolution.agentBuilder.ruleAttachment.viewRule',
  { defaultMessage: 'View rule' }
);

export const UPDATE_RULE = i18n.translate(
  'xpack.securitySolution.agentBuilder.ruleAttachment.updateRule',
  { defaultMessage: 'Update rule' }
);

export const CREATE_RULE = i18n.translate(
  'xpack.securitySolution.agentBuilder.ruleAttachment.createRule',
  { defaultMessage: 'Create rule' }
);

export const SAVING_TEXT = i18n.translate(
  'xpack.securitySolution.agentBuilder.ruleAttachment.savingText',
  { defaultMessage: 'Saving…' }
);

export const DESCRIPTION_HEADING = i18n.translate(
  'xpack.securitySolution.agentBuilder.ruleAttachment.descriptionHeading',
  { defaultMessage: 'Description' }
);

export const SEVERITY_LABEL = i18n.translate(
  'xpack.securitySolution.agentBuilder.ruleAttachment.severityLabel',
  { defaultMessage: 'Severity:' }
);

export const RISK_SCORE_LABEL = i18n.translate(
  'xpack.securitySolution.agentBuilder.ruleAttachment.riskScoreLabel',
  { defaultMessage: 'Risk Score:' }
);

export const TAGS_HEADING = i18n.translate(
  'xpack.securitySolution.agentBuilder.ruleAttachment.tagsHeading',
  { defaultMessage: 'Tags' }
);

export const MITRE_HEADING = i18n.translate(
  'xpack.securitySolution.agentBuilder.ruleAttachment.mitreHeading',
  { defaultMessage: 'MITRE ATT&CK' }
);

export const INTERVAL_LABEL = i18n.translate(
  'xpack.securitySolution.agentBuilder.ruleAttachment.intervalLabel',
  { defaultMessage: 'Interval:' }
);

export const LOOKBACK_LABEL = i18n.translate(
  'xpack.securitySolution.agentBuilder.ruleAttachment.lookbackLabel',
  { defaultMessage: 'Lookback time:' }
);

export const LIMITATIONS_TITLE = i18n.translate(
  'xpack.securitySolution.agentBuilder.ruleAttachment.limitationsTitle',
  { defaultMessage: 'AI rule creation limitations' }
);

export const LIMITATIONS_BODY = i18n.translate(
  'xpack.securitySolution.agentBuilder.ruleAttachment.limitationsBody',
  {
    defaultMessage:
      'Only ES|QL rules are supported. Requires existing index data. Severity and risk score default to Low / 21 — ask the assistant to change them.',
  }
);
