/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import qs from 'query-string';
import type { TimeRange } from '@kbn/es-query';
import type { LocatorDefinition } from '@kbn/share-plugin/common';
import type { SerializableRecord } from '@kbn/utility-types';
import { DIGITAL_EXPERIENCE_FEATURE_ID } from './feature';
import { APPLICATION_TAB_IDS, type ApplicationTabId } from './types/applications';

export const DIGITAL_EXPERIENCE_LOCATOR_ID = 'DIGITAL_EXPERIENCE_LOCATOR';

/**
 * The params of the app's pages that a link keeps, as the URL holds them: the time range,
 * environment and source, the Overview's filters, KQL query and percentile, and the Sessions
 * list's own state. Any other param is left out of the location, so a stored link can only set
 * these. The routes check their values, and replace an invalid one by its default.
 *
 * The params of a locator end up in short URLs and in whatever else stores a link, so they live as
 * long as those do: a key that is renamed or removed here needs a migration of the locator's
 * params, or the links already made lose its value.
 */
export const DIGITAL_EXPERIENCE_LOCATOR_QUERY_KEYS = [
  'rangeFrom',
  'rangeTo',
  'environment',
  'source',
  'sourceFilter',
  'filters',
  'kuery',
  'percentile',
  'search',
  'browser',
  'os',
  'country',
  'entryPage',
  'hasErrors',
  'duration',
  'sortField',
  'sortDirection',
  'page',
  'perPage',
] as const;

export type DigitalExperienceLocatorQueryKey =
  (typeof DIGITAL_EXPERIENCE_LOCATOR_QUERY_KEYS)[number];

type QueryValue = string | number | boolean;

/**
 * Where to go in the app: an application's tab, or the list of applications without
 * `serviceName`, with the state of the page as its URL holds it.
 */
export interface DigitalExperienceLocatorParams
  extends SerializableRecord,
    Partial<Record<DigitalExperienceLocatorQueryKey, QueryValue>> {
  serviceName?: string;
  /** The tab of the application; the Overview when unset or unknown. */
  tab?: ApplicationTabId;
}

const isTab = (tab: unknown): tab is ApplicationTabId =>
  APPLICATION_TAB_IDS.some((known) => known === tab);

const isQueryValue = (value: unknown): value is QueryValue =>
  (typeof value === 'string' && value !== '') ||
  typeof value === 'number' ||
  typeof value === 'boolean';

/**
 * What of a page's params the locator keeps: the ones it lists, with a value a link can hold. A
 * param it does not list, an empty one, and a repeated one are left out, whether the params come
 * from a URL or from a stored link.
 */
export const pickLocatorQuery = (params: Record<string, unknown>): Record<string, QueryValue> =>
  Object.fromEntries(
    DIGITAL_EXPERIENCE_LOCATOR_QUERY_KEYS.flatMap((key) => {
      const value = params[key];
      return isQueryValue(value) ? [[key, value]] : [];
    })
  );

const pathOf = ({ serviceName, tab }: DigitalExperienceLocatorParams): string => {
  if (!serviceName) {
    return '/';
  }
  const application = `/${encodeURIComponent(serviceName)}`;
  return isTab(tab) && tab !== 'overview' ? `${application}/${tab}` : application;
};

export class DigitalExperienceLocatorDefinition
  implements LocatorDefinition<DigitalExperienceLocatorParams>
{
  public readonly id = DIGITAL_EXPERIENCE_LOCATOR_ID;

  public readonly getLocation = async (params: DigitalExperienceLocatorParams) => {
    // Sorted like the typed router's links, so a link matches the URL the app writes.
    const search = qs.stringify(pickLocatorQuery(params));
    return {
      app: DIGITAL_EXPERIENCE_FEATURE_ID,
      path: search ? `${pathOf(params)}?${search}` : pathOf(params),
      state: {},
    };
  };

  /** Lets the Share modal offer a time range that stays as it is, not a relative one. */
  public readonly getTimeRange = ({
    rangeFrom,
    rangeTo,
  }: DigitalExperienceLocatorParams): TimeRange | undefined =>
    typeof rangeFrom === 'string' && typeof rangeTo === 'string'
      ? { from: rangeFrom, to: rangeTo }
      : undefined;

  public readonly setTimeRange = (
    { rangeFrom, rangeTo, ...params }: DigitalExperienceLocatorParams,
    timeRange?: TimeRange
  ): DigitalExperienceLocatorParams =>
    timeRange ? { ...params, rangeFrom: timeRange.from, rangeTo: timeRange.to } : params;
}
