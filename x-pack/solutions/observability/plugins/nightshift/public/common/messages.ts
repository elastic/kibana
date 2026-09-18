/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

/** Shown by a section with nothing in it, and by the page when every section is empty. */
export const NO_INVESTIGATIONS_FOUND_MESSAGE = i18n.translate(
  'xpack.nightshift.investigations.emptyDescription',
  { defaultMessage: 'No investigations found' }
);

export const RETRY_BUTTON_LABEL = i18n.translate('xpack.nightshift.retryButtonText', {
  defaultMessage: 'Retry',
});
