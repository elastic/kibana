/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { UsersTableType } from '../../../explore/users/store/model';
import type { EntityIdentifiers } from '../../containers/anomalies/anomalies_query_tab_body/types';
import { appendSearch } from './helpers';

const encodeEntityIdentifiersForUrl = (entityIdentifiers: EntityIdentifiers): string =>
  encodeURIComponent(
    JSON.stringify(
      Object.fromEntries(Object.entries(entityIdentifiers).sort(([a], [b]) => a.localeCompare(b)))
    )
  );

const DEFAULT_USERS_TAB = UsersTableType.events;

export const getUsersDetailsUrl = (
  detailName: string,
  search?: string,
  entityIdentifiers?: EntityIdentifiers
) => {
  return getTabsOnUsersDetailsUrl(detailName, DEFAULT_USERS_TAB, search, entityIdentifiers);
};

export const getTabsOnUsersUrl = (tabName: UsersTableType, search?: string) =>
  `/${tabName}${appendSearch(search)}`;

export const getTabsOnUsersDetailsUrl = (
  detailName: string,
  tabName: UsersTableType,
  search?: string,
  entityIdentifiers?: EntityIdentifiers
) => {
  const base = `/name/${encodeURIComponent(detailName)}/${tabName}`;
  const segment =
    entityIdentifiers !== undefined ? `/${encodeEntityIdentifiersForUrl(entityIdentifiers)}` : '';
  return `${base}${segment}${appendSearch(search)}`;
};
