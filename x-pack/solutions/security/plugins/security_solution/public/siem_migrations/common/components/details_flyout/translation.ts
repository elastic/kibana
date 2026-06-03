/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { i18n } from '@kbn/i18n';

export const SUMMARY_TAB_LABEL = i18n.translate(
  'xpack.securitySolution.siemMigrations.common.translationDetails.summaryTabLabel',
  {
    defaultMessage: 'Summary',
  }
);

export const COMMENT_EVENT_TRANSLATED = i18n.translate(
  'xpack.securitySolution.siemMigrations.common.translationDetails.summaryTab.commentEvent.translatedLabel',
  {
    defaultMessage: 'created a final translation',
  }
);

export const COMMENT_EVENT_UNTRANSLATABLE = i18n.translate(
  'xpack.securitySolution.siemMigrations.common.translationDetails.summaryTab.commentEvent.untranslatableLabel',
  {
    defaultMessage: 'failed to translate',
  }
);

export const CLOSE_BUTTON_LABEL = i18n.translate(
  'xpack.securitySolution.siemMigrations.common.translationDetails.dismissButtonLabel',
  {
    defaultMessage: 'Close',
  }
);
