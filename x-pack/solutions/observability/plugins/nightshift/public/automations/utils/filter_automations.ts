/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { Automation } from '../hooks/use_automations';
import { getTriggerDisplay } from './trigger_display';

export const statusLabels = {
  enabled: i18n.translate('xpack.nightshift.automations.enabledStatus', {
    defaultMessage: 'Enabled',
  }),
  paused: i18n.translate('xpack.nightshift.automations.pausedStatus', {
    defaultMessage: 'Paused',
  }),
  rateLimited: i18n.translate('xpack.nightshift.automations.rateLimitedStatus', {
    defaultMessage: 'Rate limited',
  }),
};

export const STATUS_ORDER = [statusLabels.enabled, statusLabels.paused, statusLabels.rateLimited];

const youLabel = i18n.translate('xpack.nightshift.automations.youAuthor', {
  defaultMessage: 'You',
});

export interface AutomationFacets {
  statuses: string[];
  tags: string[];
  author: string;
  triggers: string[];
}

export interface AutomationFilters {
  search: string;
  statuses: string[];
  tags: string[];
  authors: string[];
  triggers: string[];
}

export const EMPTY_FILTERS: AutomationFilters = {
  search: '',
  statuses: [],
  tags: [],
  authors: [],
  triggers: [],
};

export interface FilterOption {
  label: string;
  count: number;
}

export const isAutomationRateLimited = (
  { isEnabled, runtime }: Automation,
  usedToday: number
): boolean =>
  isEnabled && runtime.dailyDispatchLimit !== undefined && usedToday >= runtime.dailyDispatchLimit;

export const getAutomationFacets = (
  automation: Automation,
  { isRateLimited, currentUsername }: { isRateLimited: boolean; currentUsername?: string }
): AutomationFacets => ({
  statuses: [
    automation.isEnabled ? statusLabels.enabled : statusLabels.paused,
    ...(isRateLimited ? [statusLabels.rateLimited] : []),
  ],
  tags: automation.tags ?? [],
  author: automation.author === currentUsername ? youLabel : automation.author,
  triggers: automation.trigger.rows.map((row) => getTriggerDisplay(row).label),
});

export const countFilterValues = (
  valuesPerAutomation: string[][],
  order?: string[]
): FilterOption[] => {
  const counts = new Map<string, number>();
  valuesPerAutomation.forEach((values) =>
    new Set(values).forEach((value) => counts.set(value, (counts.get(value) ?? 0) + 1))
  );
  return [...counts]
    .map(([label, count]) => ({ label, count }))
    .sort((a, b) =>
      order ? order.indexOf(a.label) - order.indexOf(b.label) : a.label.localeCompare(b.label)
    );
};

const matchesAny = (selected: string[], values: string[]) =>
  selected.length === 0 || values.some((value) => selected.includes(value));

export const hasFilterSelections = ({ statuses, tags, authors, triggers }: AutomationFilters) =>
  Boolean(statuses.length || tags.length || authors.length || triggers.length);

export const hasActiveFilters = (filters: AutomationFilters) =>
  Boolean(filters.search || hasFilterSelections(filters));

export const isOnlyRateLimitedFilter = ({ statuses, tags, authors, triggers }: AutomationFilters) =>
  statuses.length === 1 &&
  statuses[0] === statusLabels.rateLimited &&
  !tags.length &&
  !authors.length &&
  !triggers.length;

export const matchesFilters = (
  automation: Automation,
  facets: AutomationFacets,
  filters: AutomationFilters
): boolean => {
  const query = filters.search.trim().toLowerCase();
  const matchesSearch =
    !query ||
    [automation.name, automation.description ?? '', ...facets.tags].some((value) =>
      value.toLowerCase().includes(query)
    );
  return (
    matchesSearch &&
    matchesAny(filters.statuses, facets.statuses) &&
    matchesAny(filters.tags, facets.tags) &&
    matchesAny(filters.authors, [facets.author]) &&
    matchesAny(filters.triggers, facets.triggers)
  );
};
