/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const QUEUE_PAGE_INFO = Object.freeze({
  pageTitle: i18n.translate('xpack.alertzero.queue.pageTitle', {
    defaultMessage: 'AlertZero - Proposals queue',
  }),
  assignSuccess: i18n.translate('xpack.alertzero.queue.assignSuccess', {
    defaultMessage: 'Assignees updated',
  }),
  assignError: i18n.translate('xpack.alertzero.queue.assignError', {
    defaultMessage: 'Could not update assignees',
  }),
  reopenSuccess: i18n.translate('xpack.alertzero.queue.reopenSuccess', {
    defaultMessage: 'Investigation reopened',
  }),
  reopenError: i18n.translate('xpack.alertzero.queue.reopenError', {
    defaultMessage: 'Could not reopen the investigation',
  }),
});

export const COPY_LINK_TOASTS = Object.freeze({
  copied: i18n.translate('xpack.alertzero.queue.copyLinkCopied', {
    defaultMessage: 'Link copied',
  }),
  failed: i18n.translate('xpack.alertzero.queue.copyLinkFailed', {
    defaultMessage: 'Could not copy the link',
  }),
});

export const AGENT_BUILDER_PRIVILEGE_REQUIRED = Object.freeze({
  toast: i18n.translate('xpack.alertzero.queue.proposalsAgentBuilderPrivilegeRequired.toast', {
    defaultMessage:
      'You need the Agent Builder Kibana privilege to view this investigation. Ask an administrator to update your role.',
  }),
});

export const IDLE_HEADER = {
  greeting: i18n.translate('xpack.alertzero.queue.idleHeader.greeting', {
    defaultMessage: 'Your Watches are running.',
  }),
  title: i18n.translate('xpack.alertzero.queue.idleHeader.title', {
    defaultMessage: 'No actions need you',
  }),
  subtitle: ({
    watchCount,
    enabledWorkerCount,
    workerCount,
  }: {
    watchCount: number;
    enabledWorkerCount: number;
    workerCount: number;
  }) =>
    i18n.translate('xpack.alertzero.queue.idleHeader.subtitle', {
      defaultMessage:
        '{watchCount, plural, one {# Watch is} other {# Watches are}} running right now · {enabledWorkerCount} of {workerCount} {workerCount, plural, one {Worker is} other {Workers are}} enabled',
      values: { watchCount, enabledWorkerCount, workerCount },
    }),
};
