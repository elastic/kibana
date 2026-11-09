/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const QUEUE_PAGE_INFO = Object.freeze({
  pageTitle: i18n.translate('xpack.alertzero.queue.pageTitle', {
    defaultMessage: 'Proposed actions',
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

export const QUEUE_GROUP_BY = Object.freeze({
  label: i18n.translate('xpack.alertzero.queue.groupBy.label', {
    defaultMessage: 'Group by',
  }),
  type: i18n.translate('xpack.alertzero.queue.groupBy.type', {
    defaultMessage: 'Proposal type',
  }),
  case: i18n.translate('xpack.alertzero.queue.groupBy.case', {
    defaultMessage: 'Case',
  }),
  none: i18n.translate('xpack.alertzero.queue.groupBy.none', {
    defaultMessage: 'None',
  }),
  caseTitle: (caseNumber: string, title: string) =>
    i18n.translate('xpack.alertzero.queue.group.case', {
      defaultMessage: 'Case {caseNumber} · {title}',
      values: { caseNumber, title },
    }),
  caseUnnumbered: (title: string) =>
    i18n.translate('xpack.alertzero.queue.group.caseUnnumbered', {
      defaultMessage: 'Case · {title}',
      values: { title },
    }),
  caseLoading: i18n.translate('xpack.alertzero.queue.group.caseLoading', {
    defaultMessage: 'Loading the case',
  }),
  noCase: i18n.translate('xpack.alertzero.queue.group.noCase', {
    defaultMessage: 'No case',
  }),
  caseUnavailable: i18n.translate('xpack.alertzero.queue.group.caseUnavailable', {
    defaultMessage: 'Case unavailable',
  }),
  caseUnavailableTooltip: i18n.translate('xpack.alertzero.queue.group.caseUnavailableTooltip', {
    defaultMessage: "The case was deleted or you don't have access to it.",
  }),
  restricted: i18n.translate('xpack.alertzero.queue.group.restricted', {
    defaultMessage: 'Restricted',
  }),
  counts: (investigations: number, proposals: number) =>
    i18n.translate('xpack.alertzero.queue.group.counts', {
      defaultMessage:
        '{investigations, plural, one {# investigation} other {# investigations}} · {proposals, plural, one {# pending proposal} other {# pending proposals}}',
      values: { investigations, proposals },
    }),
  flatCount: (investigations: number, proposals: number) =>
    i18n.translate('xpack.alertzero.queue.groupBy.flatCount', {
      defaultMessage:
        '{investigations, plural, one {# investigation} other {# investigations}} · {proposals, plural, one {# pending proposal} other {# pending proposals}} · newest first',
      values: { investigations, proposals },
    }),
  empty: i18n.translate('xpack.alertzero.queue.groupBy.empty', {
    defaultMessage: 'No events in this category.',
  }),
  statusOpen: i18n.translate('xpack.alertzero.queue.group.status.open', {
    defaultMessage: 'Open',
  }),
  statusInProgress: i18n.translate('xpack.alertzero.queue.group.status.inProgress', {
    defaultMessage: 'In progress',
  }),
  statusClosed: i18n.translate('xpack.alertzero.queue.group.status.closed', {
    defaultMessage: 'Closed',
  }),
  loadedNote: i18n.translate('xpack.alertzero.queue.groupBy.loadedNote', {
    defaultMessage: 'Grouping the open proposals loaded in the queue.',
  }),
});
