/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { omit } from 'lodash/fp';
import * as i18n from './translations';
import { UsersTableType } from '../store/model';
import type { UsersNavTab } from './navigation/types';
import { USERS_PATH } from '../../../../common/constants';
import { getTabsOnUsersUrl } from '../../../common/components/link_to/redirect_to_users';

const getUsersTabHref = (tabName: UsersTableType, encodedEntityIdentifiers?: string) =>
  `${USERS_PATH}${getTabsOnUsersUrl(tabName, undefined, encodedEntityIdentifiers)}`;

export const navTabsUsers = (
  hasMlUserPermissions: boolean,
  encodedEntityIdentifiers?: string
): UsersNavTab => {
  const hiddenTabs = [];

  const userNavTabs = {
    [UsersTableType.events]: {
      id: UsersTableType.events,
      name: i18n.NAVIGATION_EVENTS_TITLE,
      href: getUsersTabHref(UsersTableType.events, encodedEntityIdentifiers),
      disabled: false,
    },
    [UsersTableType.allUsers]: {
      id: UsersTableType.allUsers,
      name: i18n.NAVIGATION_ALL_USERS_TITLE,
      href: getUsersTabHref(UsersTableType.allUsers, encodedEntityIdentifiers),
      disabled: false,
    },
    [UsersTableType.authentications]: {
      id: UsersTableType.authentications,
      name: i18n.NAVIGATION_AUTHENTICATIONS_TITLE,
      href: getUsersTabHref(UsersTableType.authentications, encodedEntityIdentifiers),
      disabled: false,
    },
    [UsersTableType.anomalies]: {
      id: UsersTableType.anomalies,
      name: i18n.NAVIGATION_ANOMALIES_TITLE,
      href: getUsersTabHref(UsersTableType.anomalies, encodedEntityIdentifiers),
      disabled: false,
    },
    [UsersTableType.risk]: {
      id: UsersTableType.risk,
      name: i18n.NAVIGATION_RISK_TITLE,
      href: getUsersTabHref(UsersTableType.risk, encodedEntityIdentifiers),
      disabled: false,
    },
  };

  if (!hasMlUserPermissions) {
    hiddenTabs.push(UsersTableType.anomalies);
  }

  return omit(hiddenTabs, userNavTabs);
};
