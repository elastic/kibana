/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ALERT_PREVIEW_BANNER = {
  title: i18n.translate('xpack.securitySolution.flyout.preview.alertPreviewTitle', {
    defaultMessage: 'Preview alert details',
  }),
  backgroundColor: 'warning',
  textColor: 'warning',
};

export const EVENT_PREVIEW_BANNER = {
  title: i18n.translate('xpack.securitySolution.flyout.preview.eventPreviewTitle', {
    defaultMessage: 'Preview event details',
  }),
  backgroundColor: 'warning',
  textColor: 'warning',
};
