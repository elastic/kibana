/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const THEN_SUMMARIZE_SUGGESTED_KQL_AND_EQL_QUERIES = i18n.translate(
  'xpack.securitySolution.assistant.content.prompts.user.thenSummarizeSuggestedKqlAndEqlQueries',
  {
    defaultMessage:
      'Evaluate the event from the context above and format your output neatly in markdown syntax for my Elastic Security case.',
  }
);

export const FINALLY_SUGGEST_INVESTIGATION_GUIDE_AND_FORMAT_AS_MARKDOWN = i18n.translate(
  'xpack.securitySolution.assistant.content.prompts.user.finallySuggestInvestigationGuideAndFormatAsMarkdown',
  {
    defaultMessage: `Add your description, recommended actions and bulleted triage steps. Use the MITRE ATT&CK data provided to add more context and recommendations from MITRE, and hyperlink to the relevant pages on MITRE\'s website. Be sure to include the user and host risk score data from the context. Your response should include steps that point to Elastic Security specific features, including endpoint response actions, the Elastic Agent OSQuery manager integration (with example osquery queries), timelines and entity analytics and link to all the relevant Elastic Security documentation.`,
  }
);

export const EXPLAIN_THEN_SUMMARIZE_SUGGEST_INVESTIGATION_GUIDE_NON_I18N = `${THEN_SUMMARIZE_SUGGESTED_KQL_AND_EQL_QUERIES}
${FINALLY_SUGGEST_INVESTIGATION_GUIDE_AND_FORMAT_AS_MARKDOWN}`;
