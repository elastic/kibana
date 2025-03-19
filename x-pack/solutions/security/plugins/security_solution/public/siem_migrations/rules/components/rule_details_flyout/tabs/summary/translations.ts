/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ASSISTANT_USERNAME = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.translationDetails.summaryTab.assistantUsername',
  {
    defaultMessage: 'Assistant',
  }
);

export const ASSISTANT_COMMENTS = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.translationDetails.summaryTab.commentsLabel',
  {
    defaultMessage: 'Assistant comments',
  }
);

export const COMMENT_EVENT_TRANSLATED = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.translationDetails.summaryTab.commentEvent.translatedLabel',
  {
    defaultMessage: 'created a final translation',
  }
);

export const COMMENT_EVENT_UNTRANSLATABLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.rules.translationDetails.summaryTab.commentEvent.untranslatableLabel',
  {
    defaultMessage: 'failed to translate',
  }
);
