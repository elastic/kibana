/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

// START SUMMARY

export const NO_SUMMARY_AVAILABLE = i18n.translate(
  'xpack.securitySolution.alertSummary.noSummaryAvailable',
  {
    defaultMessage: 'No summary available',
  }
);

export const RECOMMENDED_ACTIONS = i18n.translate(
  'xpack.securitySolution.alertSummary.recommendedActions',
  {
    defaultMessage: 'Recommended actions',
  }
);

export const GENERATING = i18n.translate('xpack.securitySolution.alertSummary.generating', {
  defaultMessage: 'Generating AI description and recommended actions.',
});

export const GENERATE = i18n.translate('xpack.securitySolution.alertSummary.generate', {
  defaultMessage: 'Generate insights',
});

export const REGENERATE = i18n.translate('xpack.securitySolution.alertSummary.regenerate', {
  defaultMessage: 'Regenerate insights',
});

export const MISSING_CONNECTOR = i18n.translate(
  'xpack.securitySolution.alertSummary.missingConnector',
  {
    defaultMessage: 'Missing connector',
  }
);

export const CONNECTOR_MISSING_MESSAGE = i18n.translate(
  'xpack.securitySolution.alertSummary.noConnectorMessage',
  {
    defaultMessage: 'Your default AI connector is invalid and may have been deleted.',
  }
);

export const CONNECTOR_MISSING_MESSAGE_ADMIN = i18n.translate(
  'xpack.securitySolution.alertSummary.noConnectorMessageForAdmin',
  {
    defaultMessage:
      'Your default AI connector is invalid and may have been deleted. You may update the default AI connector via',
  }
);

export const ADVANCED_SETTINGS_LINK_TITLE = i18n.translate(
  'xpack.securitySolution.alertSummary.advancedSettingsLinkTitle',
  {
    defaultMessage: 'Security Solution advanced settings',
  }
);

// END SUMMARY

// START SUGGESTED PROMPTS

export const ALERT_FROM_FLYOUT = i18n.translate(
  'xpack.securitySolution.alertSummary.alertFromFlyout',
  {
    defaultMessage: 'Alert (from flyout)',
  }
);

export const PROMPT_1_TITLE = i18n.translate('xpack.securitySolution.alertSummary.prompt1Title', {
  defaultMessage: 'Detailed Alert Analysis',
});

export const PROMPT_1_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.alertSummary.prompt1Description',
  {
    defaultMessage: 'Dive deeper into what happened with this alert.',
  }
);

export const PROMPT_1_PROMPT = i18n.translate('xpack.securitySolution.alertSummary.prompt1Prompt', {
  defaultMessage:
    "Provide a thorough breakdown of this alert, including the attack technique, potential impact, and risk assessment. Explain the technical details in a way that's immediately actionable",
});

export const PROMPT_2_TITLE = i18n.translate('xpack.securitySolution.alertSummary.prompt2Title', {
  defaultMessage: 'Best practices for noisy alerts',
});

export const PROMPT_2_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.alertSummary.prompt2Description',
  {
    defaultMessage: 'Find Related Threat Intelligence Articles from Elastic Security Labs.',
  }
);

export const PROMPT_2_PROMPT = i18n.translate('xpack.securitySolution.alertSummary.prompt2Prompt', {
  defaultMessage:
    'Can you provide relevant Elastic Security Labs intelligence about the threat indicators or techniques in this alert? Include any known threat actors, campaigns, or similar attack patterns documented in ESL research.',
});

export const PROMPT_3_TITLE = i18n.translate('xpack.securitySolution.alertSummary.prompt3Title', {
  defaultMessage: 'Alert Remediation Strategy',
});

export const PROMPT_3_DESCRIPTION = i18n.translate(
  'xpack.securitySolution.alertSummary.prompt3Description',
  {
    defaultMessage: 'Generate Step-by-Step Remediation Plan.',
  }
);

export const PROMPT_3_PROMPT = i18n.translate('xpack.securitySolution.alertSummary.prompt3Prompt', {
  defaultMessage:
    'Based on this alert, please outline a comprehensive remediation plan including immediate containment steps, investigation actions, and long-term mitigation strategies to prevent similar incidents.',
});

export const SUGGESTED_PROMPTS_CONTEXT_TOOLTIP = i18n.translate(
  'xpack.securitySolution.alertSummary.suggestedPromptsContextTooltip',
  {
    defaultMessage: 'Add this alert as context.',
  }
);

// END SUGGESTED PROMPTS

// START AI ASSISTANT

export const YOUR_CONVERSATIONS = i18n.translate(
  'xpack.securitySolution.aiAssistant.yourConversations',
  {
    defaultMessage: 'Your conversations',
  }
);

export const VIEW = i18n.translate('xpack.securitySolution.aiAssistant.view', {
  defaultMessage: 'View',
});

// END AI ASSISTANT
