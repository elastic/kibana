/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ALERT_SUMMARIZATION_TITLE = i18n.translate(
  'xpack.securitySolution.assistant.quickPrompts.alertSummarizationTitle',
  {
    defaultMessage: 'Alert summarization',
  }
);

export const ALERT_SUMMARIZATION_PROMPT = i18n.translate(
  'xpack.securitySolution.assistant.quickPrompts.alertSummarizationPrompt',
  {
    defaultMessage:
      'As an expert in security operations and incident response, provide a breakdown of the attached alert and summarize what it might mean for my organization.',
  }
);

export const RULE_CREATION_TITLE = i18n.translate(
  'xpack.securitySolution.assistant.quickPrompts.ruleCreationTitle',
  {
    defaultMessage: 'Query generation',
  }
);

export const RULE_CREATION_PROMPT = i18n.translate(
  'xpack.securitySolution.assistant.quickPrompts.ruleCreationPrompt',
  {
    defaultMessage:
      'As an expert user of Elastic Security, please generate an accurate and valid EQL query to detect the use case below. Your response should be formatted to be able to use immediately in an Elastic Security timeline or detection rule. If Elastic Security already has a prebuilt rule for the use case, or a similar one, please provide a link to it and describe it.',
  }
);

export const WORKFLOW_ANALYSIS_TITLE = i18n.translate(
  'xpack.securitySolution.assistant.quickPrompts.workflowAnalysisTitle',
  {
    defaultMessage: 'Workflow suggestions',
  }
);

export const WORKFLOW_ANALYSIS_PROMPT = i18n.translate(
  'xpack.securitySolution.assistant.quickPrompts.workflowAnalysisPrompt',
  {
    defaultMessage:
      'As an expert user of Elastic Security, please suggest a workflow, with step by step instructions on how to:',
  }
);

export const THREAT_INVESTIGATION_GUIDES_TITLE = i18n.translate(
  'xpack.securitySolution.assistant.quickPrompts.threatInvestigationGuidesTitle',
  {
    defaultMessage: 'Custom data ingestion helper',
  }
);

export const THREAT_INVESTIGATION_GUIDES_PROMPT = i18n.translate(
  'xpack.securitySolution.assistant.quickPrompts.threatInvestigationGuidesPrompt',
  {
    defaultMessage:
      'As an expert user of Elastic Security, Elastic Agent, and Ingest pipelines, please list accurate and formatted, step by step instructions on how to ingest the following data using Elastic Agent and Fleet in Kibana and convert it to the Elastic Common Schema:',
  }
);

export const SPL_QUERY_CONVERSION_TITLE = i18n.translate(
  'xpack.securitySolution.assistant.quickPrompts.splQueryConversionTitle',
  {
    defaultMessage: 'Query conversion',
  }
);

export const SPL_QUERY_CONVERSION_PROMPT = i18n.translate(
  'xpack.securitySolution.assistant.quickPrompts.splQueryConversionPrompt',
  {
    defaultMessage:
      'I have the following query from a previous SIEM platform. As an expert user of Elastic Security, please suggest an Elastic EQL equivalent. I should be able to copy it immediately into an Elastic security timeline.',
  }
);

export const AUTOMATION_TITLE = i18n.translate(
  'xpack.securitySolution.assistant.quickPrompts.AutomationTitle',
  {
    defaultMessage: 'Agent integration advice',
  }
);

export const AUTOMATION_PROMPT = i18n.translate(
  'xpack.securitySolution.assistant.quickPrompts.AutomationPrompt',
  {
    defaultMessage:
      'Which Fleet enabled Elastic Agent integration should I use to collect logs and events from:',
  }
);
