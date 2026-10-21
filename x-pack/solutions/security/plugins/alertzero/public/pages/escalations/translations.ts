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

export const ESCALATIONS_EMPTY_BANNER = Object.freeze({
  title: i18n.translate('xpack.alertzero.escalationsPage.emptyBanner.title', {
    defaultMessage: 'Escalations are part of Alert Zero',
  }),
  body: i18n.translate('xpack.alertzero.escalationsPage.emptyBanner.body', {
    defaultMessage:
      'When an investigation needs a human decision, you can escalate it from the investigation and it will show up here.',
  }),
  docsLink: i18n.translate('xpack.alertzero.escalationsPage.emptyBanner.docsLink', {
    defaultMessage: 'Read the documentation',
  }),
  exampleBadge: i18n.translate('xpack.alertzero.escalationsPage.emptyBanner.exampleBadge', {
    defaultMessage: 'Example',
  }),
});

export const ESCALATIONS_OPEN_NOTE = Object.freeze({
  emptyTitle: i18n.translate('xpack.alertzero.escalationsPage.openNote.emptyTitle', {
    defaultMessage: 'No open escalations',
  }),
});
