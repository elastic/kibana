/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HostsTableType } from '../../../explore/hosts/store/model';
import { HOSTS_PATH } from '../../../../common/constants';
import { appendSearch } from './helpers';
import { encodeEntityIdentifiersForUrl } from './redirect_to_users';

export const getHostsUrl = (search?: string) => `${HOSTS_PATH}${appendSearch(search)}`;

export const getTabsOnHostsUrl = (tabName: HostsTableType, search?: string) =>
  `/${tabName}${appendSearch(search)}`;

const DEFAULT_HOST_TAB = HostsTableType.events;

export const getHostDetailsUrl = (
  detailName: string,
  search?: string,
  identityFields?: Record<string, string>,
  entityId?: string
) => {
  return getTabsOnHostDetailsUrl(detailName, DEFAULT_HOST_TAB, search, identityFields, entityId);
};

export const getTabsOnHostDetailsUrl = (
  detailName: string,
  tabName: HostsTableType,
  search?: string,
  identityFields?: Record<string, string>,
  entityId?: string
) => {
  const base = `/name/${encodeURIComponent(detailName)}/${tabName}`;
  const segment =
    identityFields !== undefined ? `/${encodeEntityIdentifiersForUrl(identityFields)}` : '';
  const entityIdSegment = entityId !== undefined ? `/${entityId}` : '';
  return `${base}${segment}${entityIdSegment}${appendSearch(search)}`;
};
