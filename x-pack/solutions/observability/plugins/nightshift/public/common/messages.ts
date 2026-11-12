/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

/** Shown by the landing list when every investigation section is empty. */
export const NO_INVESTIGATIONS_EMPTY_TITLE = i18n.translate(
  'xpack.nightshift.investigations.emptyTitle',
  { defaultMessage: 'No open investigations' }
);

export const NO_INVESTIGATIONS_EMPTY_BODY = i18n.translate(
  'xpack.nightshift.investigations.emptyBody',
  {
    defaultMessage:
      "Ask Elastic nightshift to look into a problem, or set up an automation so it starts investigations for you — and you don't repeat the same work.",
  }
);

export const INVESTIGATE_BUTTON_LABEL = i18n.translate(
  'xpack.nightshift.investigations.investigateButtonText',
  { defaultMessage: 'Investigate' }
);

export const CREATE_AUTOMATION_BUTTON_LABEL = i18n.translate(
  'xpack.nightshift.investigations.createAutomationButtonText',
  { defaultMessage: 'Create automation' }
);

export const RETRY_BUTTON_LABEL = i18n.translate('xpack.nightshift.retryButtonText', {
  defaultMessage: 'Retry',
});
