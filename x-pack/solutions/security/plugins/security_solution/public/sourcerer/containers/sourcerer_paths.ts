/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { matchPath } from 'react-router-dom';

import { PageScope } from '../../data_view_manager/constants';
import {
  ALERTS_PATH,
  ATTACK_DISCOVERY_PATH,
  ATTACKS_PATH,
  CASES_PATH,
  DATA_QUALITY_PATH,
  ENTITY_ANALYTICS_MANAGEMENT_PATH,
  ENTITY_ANALYTICS_PRIVILEGED_USER_MONITORING_PATH,
  HOSTS_PATH,
  NETWORK_PATH,
  OVERVIEW_PATH,
  RULES_PATH,
  USERS_PATH,
} from '../../../common/constants';

export const sourcererPaths = [
  ALERTS_PATH,
  DATA_QUALITY_PATH,
  `${RULES_PATH}/id/:id`,
  HOSTS_PATH,
  USERS_PATH,
  NETWORK_PATH,
  OVERVIEW_PATH,
  ENTITY_ANALYTICS_PRIVILEGED_USER_MONITORING_PATH,
];

const detectionsPaths = [
  ALERTS_PATH,
  `${RULES_PATH}/id/:id`,
  `${CASES_PATH}/:detailName`,
  ATTACK_DISCOVERY_PATH,
];

const attacksPaths = [ATTACKS_PATH];

const explorePaths = [
  HOSTS_PATH,
  USERS_PATH,
  NETWORK_PATH,
  ENTITY_ANALYTICS_PRIVILEGED_USER_MONITORING_PATH,
  ENTITY_ANALYTICS_MANAGEMENT_PATH,
];

export const getScopeFromPath = (
  pathname: string
): PageScope.default | PageScope.alerts | PageScope.attacks | PageScope.explore => {
  if (
    matchPath(pathname, {
      path: detectionsPaths,
      strict: false,
    })
  ) {
    return PageScope.alerts;
  }

  if (
    matchPath(pathname, {
      path: attacksPaths,
      strict: false,
    })
  ) {
    return PageScope.attacks;
  }

  if (
    matchPath(pathname, {
      path: explorePaths,
      strict: false,
    })
  ) {
    return PageScope.explore;
  }

  return PageScope.default;
};

export const showSourcererByPath = (pathname: string): boolean =>
  matchPath(pathname, {
    path: sourcererPaths,
    strict: false,
  }) != null;
