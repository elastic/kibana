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

export {
  QUERY_LABEL,
  EQL_QUERY_LABEL,
  ESQL_QUERY_LABEL,
  SAVED_QUERY_LABEL,
  ML_TYPE_DESCRIPTION,
  EQL_TYPE_DESCRIPTION,
  QUERY_TYPE_DESCRIPTION,
  THRESHOLD_TYPE_DESCRIPTION,
  THREAT_MATCH_TYPE_DESCRIPTION,
  NEW_TERMS_TYPE_DESCRIPTION,
  ESQL_TYPE_DESCRIPTION,
} from '../../../detection_engine/rule_creation_ui/components/description_step/translations';

export const APPLY_TO_RULE_FORM = i18n.translate(
  'xpack.securitySolution.agentBuilder.ruleAttachment.applyToRuleForm',
  { defaultMessage: 'Apply to rule form' }
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

export const getNonEsqlRuleActionDisabledReason = (ruleTypeLabel: string) =>
  i18n.translate('xpack.securitySolution.agentBuilder.ruleAttachment.nonEsqlDisabledReason', {
    defaultMessage: 'AI rule creation is only supported for ES|QL rules. This rule is {ruleType}.',
    values: { ruleType: ruleTypeLabel },
  });

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
