/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const ESCALATIONS_PAGE_INFO = Object.freeze({
  pageTitle: i18n.translate('xpack.alertzero.escalationsPage.pageTitle', {
    defaultMessage: 'Escalations',
  }),
  loading: i18n.translate('xpack.alertzero.escalationsPage.loading', {
    defaultMessage: 'Loading escalations',
  }),
  loadError: i18n.translate('xpack.alertzero.escalationsPage.loadError', {
    defaultMessage: 'Could not load escalations',
  }),
  emptyOpen: i18n.translate('xpack.alertzero.escalationsPage.emptyOpen', {
    defaultMessage: 'No open escalations',
  }),
  assignError: i18n.translate('xpack.alertzero.escalationsPage.assignError', {
    defaultMessage: 'Could not update assignees',
  }),
  assignSuccess: i18n.translate('xpack.alertzero.escalationsPage.assignSuccess', {
    defaultMessage: 'Assignees updated',
  }),
});
