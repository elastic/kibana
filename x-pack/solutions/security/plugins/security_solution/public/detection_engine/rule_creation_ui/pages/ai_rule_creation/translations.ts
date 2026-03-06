/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const AI_RULE_CREATION_INFO_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.aiRuleCreation.infoTitle',
  {
    defaultMessage: 'Note on AI rule creation',
  }
);

export const AI_RULE_CREATION_INFO_MESSAGE = i18n.translate(
  'xpack.securitySolution.detectionEngine.aiRuleCreation.infoMessage',
  {
    defaultMessage:
      'AI rule creation generates a detection rule with name, description, data source, query, tags, severity, risk score, schedule and MITRE ATT&CK mapping fields. Always review the rule before creating and enabling it.',
  }
);

export const AI_RULE_CREATION_ERROR_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.aiRuleCreation.errorTitle',
  {
    defaultMessage: 'AI rule creation error',
  }
);

export const AI_RULE_CREATION_FAILURE_TITLE = i18n.translate(
  'xpack.securitySolution.detectionEngine.aiRuleCreation.failureTitle',
  {
    defaultMessage: 'Failure to suggest rule with AI agent',
  }
);

export const AI_RULE_CREATION_BACK_TO_PROMPT = i18n.translate(
  'xpack.securitySolution.detectionEngine.aiRuleCreation.backToPrompt',
  {
    defaultMessage: 'Back to AI prompt',
  }
);

export const AI_RULE_CREATION_DESCRIBE_RULE_HEADING = i18n.translate(
  'xpack.securitySolution.detectionEngine.aiRuleCreation.describeRuleHeading',
  {
    defaultMessage: 'Describe the rule you want to create',
  }
);

export const AI_RULE_CREATION_REGENERATE_BUTTON = i18n.translate(
  'xpack.securitySolution.detectionEngine.aiRuleCreation.regenerateButton',
  {
    defaultMessage: 'Regenerate',
  }
);

export const AI_RULE_CREATION_CANCEL_BUTTON = i18n.translate(
  'xpack.securitySolution.detectionEngine.aiRuleCreation.cancelButton',
  {
    defaultMessage: 'Cancel',
  }
);

export const AI_RULE_CREATION_CANCELLED_MESSAGE = i18n.translate(
  'xpack.securitySolution.detectionEngine.aiRuleCreation.cancelledMessage',
  {
    defaultMessage: 'The AI rule creation process was cancelled.',
  }
);

export const AI_RULE_CREATION_PROMPT_PLACEHOLDER = i18n.translate(
  'xpack.securitySolution.detectionEngine.aiRuleCreation.promptPlaceholder',
  {
    defaultMessage:
      'What do you want to detect or check, and in which service, system, or technology...',
  }
);

export const AI_RULE_CREATION_MANAGE_CONNECTORS = i18n.translate(
  'xpack.securitySolution.detectionEngine.aiRuleCreation.manageConnectors',
  {
    defaultMessage: 'Manage connectors',
  }
);

export const AI_RULE_CREATION_CONNECTORS_LOAD_ERROR = i18n.translate(
  'xpack.securitySolution.detectionEngine.aiRuleCreation.connectorsLoadError',
  {
    defaultMessage: 'Failed to load AI connectors',
  }
);
