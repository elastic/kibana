/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';

export const listLabels = {
  title: i18n.translate('xpack.nightshift.automations.pageTitle', {
    defaultMessage: 'Automations',
  }),
  create: i18n.translate('xpack.nightshift.automations.createButton', {
    defaultMessage: 'Create automation',
  }),
  search: i18n.translate('xpack.nightshift.automations.search', {
    defaultMessage: 'Search automations',
  }),
  status: i18n.translate('xpack.nightshift.automations.statusFilter', { defaultMessage: 'Status' }),
  tag: i18n.translate('xpack.nightshift.automations.tagFilter', { defaultMessage: 'Tag' }),
  author: i18n.translate('xpack.nightshift.automations.authorFilter', { defaultMessage: 'Author' }),
  trigger: i18n.translate('xpack.nightshift.automations.triggerFilter', {
    defaultMessage: 'Trigger',
  }),
  automationColumn: i18n.translate('xpack.nightshift.automations.automationColumn', {
    defaultMessage: 'Automations',
  }),
  enabled: i18n.translate('xpack.nightshift.automations.enabledColumn', {
    defaultMessage: 'Enabled',
  }),
  rateLimitBody: i18n.translate('xpack.nightshift.automations.rateLimitBannerBody', {
    defaultMessage: 'Further triggers are skipped until the limit resets at midnight (UTC).',
  }),
  showRateLimited: i18n.translate('xpack.nightshift.automations.rateLimitBannerShowRateLimited', {
    defaultMessage: 'Show rate-limited automations',
  }),
  limitReached: i18n.translate('xpack.nightshift.automations.limitReached', {
    defaultMessage: 'Daily trigger limit reached for today',
  }),
  usage: i18n.translate('xpack.nightshift.automations.usageColumn', {
    defaultMessage: "Today's usage",
  }),
  usageTooltip: i18n.translate('xpack.nightshift.automations.usageColumnTooltip', {
    defaultMessage:
      'Triggers used today of out the Daily trigger limit set on the automation. Resets at midnight (UTC).',
  }),
  any: i18n.translate('xpack.nightshift.automations.anyFilter', { defaultMessage: 'Any' }),
  last48Hours: i18n.translate('xpack.nightshift.automations.last48Hours', {
    defaultMessage: 'Last 48 hours',
  }),
  clone: i18n.translate('xpack.nightshift.automations.cloneAction', { defaultMessage: 'Clone' }),
  delete: i18n.translate('xpack.nightshift.automations.deleteAction', { defaultMessage: 'Delete' }),
  cancel: i18n.translate('xpack.nightshift.automations.cancelButton', { defaultMessage: 'Cancel' }),
  deletedToast: i18n.translate('xpack.nightshift.automations.deletedToast', {
    defaultMessage: 'Automation deleted',
  }),
  deleteBody: i18n.translate('xpack.nightshift.automations.deleteConfirmBody', {
    defaultMessage:
      "This automation and its backing workflow will be deleted. You can't undo this action.",
  }),
  emptyTitle: i18n.translate('xpack.nightshift.automations.emptyTitle', {
    defaultMessage: 'Automations run on triggers you define',
  }),
  emptyBody: i18n.translate('xpack.nightshift.automations.emptyBody', {
    defaultMessage:
      'When something happens in Slack, PagerDuty, or your stack, Nightshift can investigate and respond automatically.',
  }),
  createCustom: i18n.translate('xpack.nightshift.automations.createCustomButton', {
    defaultMessage: 'Create custom automation',
  }),
  filteredEmptyTitle: i18n.translate('xpack.nightshift.automations.filteredEmptyTitle', {
    defaultMessage: 'No matching automations',
  }),
  filteredEmptyBody: i18n.translate('xpack.nightshift.automations.filteredEmptyBody', {
    defaultMessage: 'Try clearing search or filters.',
  }),
  clearSelection: i18n.translate('xpack.nightshift.automations.clearSelection', {
    defaultMessage: 'Clear selection',
  }),
  findTag: i18n.translate('xpack.nightshift.automations.findTag', {
    defaultMessage: 'Find tag...',
  }),
  findAuthor: i18n.translate('xpack.nightshift.automations.findAuthor', {
    defaultMessage: 'Find author...',
  }),
  clearFilters: i18n.translate('xpack.nightshift.automations.clearFilters', {
    defaultMessage: 'Clear filters',
  }),
  clearSearchAndFilters: i18n.translate('xpack.nightshift.automations.clearSearchAndFilters', {
    defaultMessage: 'Clear search and filters',
  }),
  noTagsYet: i18n.translate('xpack.nightshift.automations.noTagsYet', {
    defaultMessage: 'No tags yet',
  }),
  filterByStatus: i18n.translate('xpack.nightshift.automations.filterByStatus', {
    defaultMessage: 'Filter by status',
  }),
  filterByTags: i18n.translate('xpack.nightshift.automations.filterByTags', {
    defaultMessage: 'Filter by tags',
  }),
  filterByAuthor: i18n.translate('xpack.nightshift.automations.filterByAuthor', {
    defaultMessage: 'Filter by author',
  }),
  filterByTrigger: i18n.translate('xpack.nightshift.automations.filterByTrigger', {
    defaultMessage: 'Filter by trigger',
  }),
};

export const getDeleteConfirmTitle = (name: string) =>
  i18n.translate('xpack.nightshift.automations.deleteConfirmTitle', {
    defaultMessage: 'Delete "{name}"?',
    values: { name },
  });

export const getRateLimitTitle = (count: number) =>
  i18n.translate('xpack.nightshift.automations.rateLimitBannerTitle', {
    defaultMessage:
      '{count, plural, one {# automation reached its} other {# automations reached their}} daily trigger limit',
    values: { count },
  });

export const runCountColumns = [
  {
    status: 'succeeded',
    name: i18n.translate('xpack.nightshift.automations.successfulColumn', {
      defaultMessage: 'Successful',
    }),
    tooltip: i18n.translate('xpack.nightshift.automations.successfulColumnTooltip', {
      defaultMessage: 'Successful runs in the selected time range.',
    }),
    width: '108px',
    getViewLabel: (count: number) =>
      i18n.translate('xpack.nightshift.automations.viewSuccessfulRuns', {
        defaultMessage: 'View {count} successful in run history',
        values: { count },
      }),
  },
  {
    status: 'failed',
    name: i18n.translate('xpack.nightshift.automations.failedColumn', {
      defaultMessage: 'Failed',
    }),
    tooltip: i18n.translate('xpack.nightshift.automations.failedColumnTooltip', {
      defaultMessage: 'Failed runs in the selected time range.',
    }),
    width: '88px',
    getViewLabel: (count: number) =>
      i18n.translate('xpack.nightshift.automations.viewFailedRuns', {
        defaultMessage: 'View {count} failed in run history',
        values: { count },
      }),
  },
  {
    status: 'skipped',
    name: i18n.translate('xpack.nightshift.automations.skippedColumn', {
      defaultMessage: 'Skipped',
    }),
    tooltip: i18n.translate('xpack.nightshift.automations.skippedColumnTooltip', {
      defaultMessage: 'Triggers skipped by the Daily trigger limit in the selected time range.',
    }),
    width: '96px',
    getViewLabel: (count: number) =>
      i18n.translate('xpack.nightshift.automations.viewSkippedRuns', {
        defaultMessage: 'View {count} skipped in run history',
        values: { count },
      }),
  },
] as const;
