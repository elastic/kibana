/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Location } from 'history';
import { toQuery } from '@kbn/observability-plugin/public';
import { uxLocalUIFilterNames } from '../../../common/ux_ui_filter';
import { pickKeys } from '../../../common/utils/pick_keys';
import { serviceNameFromPath } from '../../utils/ux_app_path';
import { getDateRange, removeUndefinedProps, toBoolean, toNumber, toString } from './helpers';
import type { UrlParams, UxUrlParams } from './types';
import { ENVIRONMENT_ALL } from '../../../common/environment_filter_values';

type TimeUrlParams = Pick<
  UrlParams,
  'start' | 'end' | 'rangeFrom' | 'rangeTo' | 'exactStart' | 'exactEnd'
>;

export function resolveUrlParams(location: Location, state: TimeUrlParams) {
  const query = toQuery(location.search) as UxUrlParams;

  const {
    page,
    pageSize,
    sortDirection,
    sortField,
    refreshPaused,
    refreshInterval,
    rangeFrom,
    rangeTo,
    environment,
    platform,
    searchTerm,
    percentile,
    frustration,
    pageUrl,
    errorGroup,
    sessionIds,
    user,
    click,
    account,
    sessionQuery,
    includeBots,
    botUa,
    kuery,
    breakpoint,
    connection,
    device,
    compare,
    includePii,
    goalId,
    includeRaw,
    analyticsMode,
    hasReplay,
    hasBounced,
  } = query;

  const localUIFilters = pickKeys(query, ...uxLocalUIFilterNames);
  const pathServiceName = serviceNameFromPath(location.pathname);

  return removeUndefinedProps({
    // date params
    ...getDateRange({ state, rangeFrom, rangeTo }),
    rangeFrom,
    rangeTo,
    refreshPaused: refreshPaused ? toBoolean(refreshPaused) : undefined,
    refreshInterval: refreshInterval ? toNumber(refreshInterval) : undefined,

    // query params
    environment: toString(environment) || ENVIRONMENT_ALL.value,
    platform: toString(platform),
    sortDirection,
    sortField,
    page: toNumber(page) || 0,
    pageSize: pageSize ? toNumber(pageSize) : undefined,
    searchTerm: toString(searchTerm),
    percentile: toNumber(percentile),
    frustration: toString(frustration),
    pageUrl: toString(pageUrl),
    errorGroup: toString(errorGroup),
    sessionIds: toString(sessionIds),
    user: toString(user),
    click: toString(click),
    account: toString(account),
    sessionQuery: toString(sessionQuery),
    includeBots: toString(includeBots),
    botUa: toString(botUa),
    kuery: toString(kuery),
    breakpoint: toString(breakpoint),
    connection: toString(connection),
    device: toString(device),
    compare: toString(compare),
    includePii: toString(includePii),
    goalId: toString(goalId),
    includeRaw: toString(includeRaw),
    analyticsMode: toString(analyticsMode),
    hasReplay: toString(hasReplay),
    hasBounced: toString(hasBounced),

    ...localUIFilters,
    ...(pathServiceName ? { serviceName: pathServiceName } : {}),
  });
}
