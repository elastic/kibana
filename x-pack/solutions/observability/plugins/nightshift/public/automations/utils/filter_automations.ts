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
  disabled: i18n.translate('xpack.nightshift.automations.disabledStatus', {
    defaultMessage: 'Disabled',
  }),
  rateLimited: i18n.translate('xpack.nightshift.automations.rateLimitedStatus', {
    defaultMessage: 'Rate limited',
  }),
};

export const STATUS_ORDER = [statusLabels.enabled, statusLabels.disabled, statusLabels.rateLimited];

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

export const isAutomationRateLimited = ({ runtime }: Automation, usedToday: number): boolean =>
  runtime.dailyDispatchLimit !== undefined && usedToday >= runtime.dailyDispatchLimit;

export const getAutomationFacets = (
  automation: Automation,
  { isRateLimited, currentUsername }: { isRateLimited: boolean; currentUsername?: string }
): AutomationFacets => ({
  statuses: [
    automation.isEnabled ? statusLabels.enabled : statusLabels.disabled,
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

export const hasActiveFilters = ({
  search,
  statuses,
  tags,
  authors,
  triggers,
}: AutomationFilters) =>
  Boolean(search || statuses.length || tags.length || authors.length || triggers.length);

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
