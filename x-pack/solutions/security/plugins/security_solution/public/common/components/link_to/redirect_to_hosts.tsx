/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HostsTableType } from '../../../explore/hosts/store/model';
import { HOSTS_PATH } from '../../../../common/constants';
import { appendSearch } from './helpers';
import { mergeEntityResolutionIntoUrlState } from './entity_resolution_query_params';

export const getHostsUrl = (urlStateQuery?: string) =>
  `${HOSTS_PATH}${appendSearch(urlStateQuery)}`;

export const getTabsOnHostsUrl = (tabName: HostsTableType, urlStateQuery?: string) =>
  `/${tabName}${appendSearch(urlStateQuery)}`;

const DEFAULT_HOST_TAB = HostsTableType.events;

export const getHostDetailsUrl = (
  detailName: string,
  urlStateQuery?: string,
  entityId?: string,
  identityFields?: Record<string, string>
) => getTabsOnHostDetailsUrl(detailName, DEFAULT_HOST_TAB, urlStateQuery, entityId, identityFields);

/** Parameter order matches getTabsOnUsersDetailsUrl (urlStateQuery, entityId, identityFields). */
export const getTabsOnHostDetailsUrl = (
  detailName: string,
  tabName: HostsTableType,
  urlStateQuery?: string,
  entityId?: string,
  identityFields?: Record<string, string>
) => {
  const base = `/name/${encodeURIComponent(detailName)}/${tabName}`;
  const query = mergeEntityResolutionIntoUrlState(urlStateQuery, {
    entityId,
    identityFields,
    displayName: detailName,
    entityType: 'host',
  });
  return query === '' ? base : `${base}${query}`;
};
