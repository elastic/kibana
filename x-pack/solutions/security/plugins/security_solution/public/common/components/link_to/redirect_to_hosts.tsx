/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { HostsTableType } from '../../../explore/hosts/store/model';
import { HOSTS_PATH } from '../../../../common/constants';
import { appendSearch } from './helpers';
import type { EntityIdentifiers } from '../../../flyout/document_details/shared/utils';

const encodeEntityIdentifiersForUrl = (entityIdentifiers: EntityIdentifiers): string =>
  encodeURIComponent(
    JSON.stringify(
      Object.fromEntries(Object.entries(entityIdentifiers).sort(([a], [b]) => a.localeCompare(b)))
    )
  );

export const getHostsUrl = (search?: string) => `${HOSTS_PATH}${appendSearch(search)}`;

export const getTabsOnHostsUrl = (tabName: HostsTableType, search?: string) =>
  `/${tabName}${appendSearch(search)}`;

const DEFAULT_HOST_TAB = HostsTableType.events;

export const getHostDetailsUrl = (
  detailName: string,
  search?: string,
  entityIdentifiers?: EntityIdentifiers
) => {
  return getTabsOnHostDetailsUrl(detailName, DEFAULT_HOST_TAB, search, entityIdentifiers);
};

export const getTabsOnHostDetailsUrl = (
  detailName: string,
  tabName: HostsTableType,
  search?: string,
  entityIdentifiers?: EntityIdentifiers
) => {
  const base = `/name/${encodeURIComponent(detailName)}/${tabName}`;
  const segment =
    entityIdentifiers !== undefined ? `/${encodeEntityIdentifiersForUrl(entityIdentifiers)}` : '';
  return `${base}${segment}${appendSearch(search)}`;
};
