/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { RumFacetBucket } from '../../../../common/rum_app';
import { splitFilterValues } from '../../../../common/rum_filters';

export const PINNED_FILTER_IDS = ['location', 'browser', 'os', 'pageUrl'] as const;
// Pinned alongside the defaults on wide screens; collapsed into "More filters" otherwise.
export const EXPANDABLE_FILTER_IDS = ['breakpoint', 'connection', 'device', 'frustration'] as const;
export const MENU_ONLY_FILTER_IDS = ['includeBots'] as const;
export const FACET_FILTER_IDS = [...PINNED_FILTER_IDS, ...EXPANDABLE_FILTER_IDS] as const;
export const FILTER_IDS = [...FACET_FILTER_IDS, ...MENU_ONLY_FILTER_IDS] as const;

export type RumOtelFilterId = (typeof FILTER_IDS)[number];
export type RumFacetFilterId = (typeof FACET_FILTER_IDS)[number];

export interface RumFilterOption {
  key: string;
  label?: string;
  count?: number;
}

export const countryLabel = (isoCode: string): string => {
  try {
    return (
      new Intl.DisplayNames(undefined, { type: 'region' }).of(isoCode.toUpperCase()) ?? isoCode
    );
  } catch {
    return isoCode;
  }
};

export const excludedValueLabel = (value: string): string =>
  i18n.translate('xpack.ux.filters.excludedValueLabel', {
    defaultMessage: 'not {value}',
    values: { value },
  });

export const truncateValue = (value: string, max = 48): string => {
  if (value.length <= max) {
    return value;
  }
  return `\u2026${value.slice(-(max - 1))}`;
};

export const FRUSTRATION_OPTIONS: RumFilterOption[] = [
  {
    key: 'rage',
    label: i18n.translate('xpack.ux.filters.frustration.rage', { defaultMessage: 'Rage clicks' }),
  },
  {
    key: 'error',
    label: i18n.translate('xpack.ux.filters.frustration.errors', { defaultMessage: 'Errors' }),
  },
  {
    key: 'dead',
    label: i18n.translate('xpack.ux.filters.frustration.dead', { defaultMessage: 'Dead clicks' }),
  },
];

export const filterName = (id: RumOtelFilterId): string => {
  switch (id) {
    case 'location':
      return i18n.translate('xpack.ux.filters.location', { defaultMessage: 'Location' });
    case 'browser':
      return i18n.translate('xpack.ux.filters.browser', { defaultMessage: 'Browser' });
    case 'os':
      return i18n.translate('xpack.ux.filters.os', { defaultMessage: 'OS' });
    case 'pageUrl':
      return i18n.translate('xpack.ux.filters.page', { defaultMessage: 'Page' });
    case 'breakpoint':
      return i18n.translate('xpack.ux.filters.breakpoint', { defaultMessage: 'Breakpoint' });
    case 'connection':
      return i18n.translate('xpack.ux.filters.connection', { defaultMessage: 'Connection' });
    case 'device':
      return i18n.translate('xpack.ux.filters.device', { defaultMessage: 'Device memory' });
    case 'frustration':
      return i18n.translate('xpack.ux.filters.frustration', { defaultMessage: 'Frustration' });
    case 'includeBots':
      return i18n.translate('xpack.ux.filters.includeBots', { defaultMessage: 'Include bots' });
  }
};

export const bucketsToOptions = (buckets: RumFacetBucket[]): RumFilterOption[] =>
  buckets.map((bucket) => ({ key: bucket.key, count: bucket.count }));

export const withSelectedOptions = (
  options: RumFilterOption[],
  values: readonly string[],
  labelFor?: (key: string) => string
): RumFilterOption[] => {
  const extras = values.filter((value) => !options.some((option) => option.key === value));
  if (extras.length === 0) {
    return options;
  }
  return [
    ...extras.map((value) => ({ key: value, label: labelFor?.(value) ?? value, count: 0 })),
    ...options,
  ];
};

export const withSelectedOption = (
  options: RumFilterOption[],
  value?: string,
  labelFor?: (key: string) => string
): RumFilterOption[] => withSelectedOptions(options, value ? [value] : [], labelFor);

export const selectedFilterValues = (value?: string): string[] => splitFilterValues(value);

export const firstSelectedLabel = (
  options: RumFilterOption[],
  values: readonly string[]
): string | undefined => {
  if (values.length === 0) {
    return undefined;
  }
  const match = options.find((option) => option.key === values[0]);
  return match?.label ?? match?.key ?? values[0];
};

export const pagePathPlaceholder = i18n.translate('xpack.ux.filters.page.customPlaceholder', {
  defaultMessage: 'Type a path, e.g. /checkout',
});

export const customPlaceholderFor = (id: RumOtelFilterId): string | undefined =>
  id === 'pageUrl' ? pagePathPlaceholder : undefined;

export const FACET_PREVIEW_SIZE = 8;

const OS_LABELS: Record<string, string> = {
  macos: 'macOS',
  ios: 'iOS',
  ipados: 'iPadOS',
};

const BROWSER_LABELS: Record<string, string> = {
  chrome: 'Chrome',
  chrome_headless: 'Chrome Headless',
  safari: 'Safari',
  firefox: 'Firefox',
  edge: 'Edge',
};

const CONNECTION_LABELS: Record<string, string> = {
  wifi: 'Wi-Fi',
  '4g': '4G',
  '3g': '3G',
  '2g': '2G',
  'slow-2g': 'Slow 2G',
};

const titleCaseToken = (raw: string): string =>
  raw
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(' ');

/** Display label for a facet value. Keeps page paths as-is. */
export const facetValueLabel = (id: RumOtelFilterId, key: string): string => {
  switch (id) {
    case 'location':
      return countryLabel(key);
    case 'device':
      return key ? `${key} GB` : key;
    case 'os':
      return OS_LABELS[key.toLowerCase()] ?? titleCaseToken(key);
    case 'browser':
      return BROWSER_LABELS[key.toLowerCase()] ?? titleCaseToken(key);
    case 'connection':
      return CONNECTION_LABELS[key.toLowerCase()] ?? key.toUpperCase();
    case 'breakpoint':
      return titleCaseToken(key);
    case 'frustration':
      return FRUSTRATION_OPTIONS.find((option) => option.key === key)?.label ?? key;
    default:
      return key;
  }
};

export const labelFacetOptions = (
  id: RumFacetFilterId,
  options: RumFilterOption[]
): RumFilterOption[] =>
  options.map((option) => ({
    ...option,
    label: option.label ?? facetValueLabel(id, option.key),
  }));
