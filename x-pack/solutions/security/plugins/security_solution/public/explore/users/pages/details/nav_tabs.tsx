/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash/fp';
import * as i18n from '../translations';
import type { UsersDetailsNavTab } from './types';
import { UsersTableType } from '../../store/model';
import { USERS_PATH } from '../../../../../common/constants';
import { getTabsOnUsersDetailsUrl as getTabsOnUsersDetailsUrlFromLinkTo } from '../../../../common/components/link_to/redirect_to_users';

export const navTabsUsersDetails = (
  userName: string,
  hasMlUserPermissions: boolean,
  entityIdentifiers?: Record<string, string>
): UsersDetailsNavTab => {
  const getTabsOnUsersDetailsUrl = (tabName: UsersTableType) =>
    `${USERS_PATH}${getTabsOnUsersDetailsUrlFromLinkTo(userName, tabName, undefined, entityIdentifiers)}`;
  const hiddenTabs = [];

  const userDetailsNavTabs = {
    [UsersTableType.events]: {
      id: UsersTableType.events,
      name: i18n.NAVIGATION_EVENTS_TITLE,
      href: getTabsOnUsersDetailsUrl(UsersTableType.events),
      disabled: false,
    },
    [UsersTableType.authentications]: {
      id: UsersTableType.authentications,
      name: i18n.NAVIGATION_AUTHENTICATIONS_TITLE,
      href: getTabsOnUsersDetailsUrl(UsersTableType.authentications),
      disabled: false,
    },
    [UsersTableType.anomalies]: {
      id: UsersTableType.anomalies,
      name: i18n.NAVIGATION_ANOMALIES_TITLE,
      href: getTabsOnUsersDetailsUrl(UsersTableType.anomalies),
      disabled: false,
    },
    [UsersTableType.risk]: {
      id: UsersTableType.risk,
      name: i18n.NAVIGATION_RISK_TITLE,
      href: getTabsOnUsersDetailsUrl(UsersTableType.risk),
      disabled: false,
    },
  };

  if (!hasMlUserPermissions) {
    hiddenTabs.push(UsersTableType.anomalies);
  }

  return omit(hiddenTabs, userDetailsNavTabs);
};
