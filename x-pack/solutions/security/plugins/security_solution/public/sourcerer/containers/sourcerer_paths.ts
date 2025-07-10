/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { matchPath } from 'react-router-dom';

import {
  CASES_PATH,
  ALERTS_PATH,
  ATTACK_DISCOVERY_PATH,
  HOSTS_PATH,
  USERS_PATH,
  NETWORK_PATH,
  OVERVIEW_PATH,
  RULES_PATH,
  DATA_QUALITY_PATH,
} from '../../../common/constants';
import { SourcererScopeName } from '../store/model';

export const sourcererPaths = [
  ALERTS_PATH,
  DATA_QUALITY_PATH,
  `${RULES_PATH}/id/:id`,
  HOSTS_PATH,
  USERS_PATH,
  NETWORK_PATH,
  OVERVIEW_PATH,
];

const detectionsPaths = [
  ALERTS_PATH,
  `${RULES_PATH}/id/:id`,
  `${CASES_PATH}/:detailName`,
  ATTACK_DISCOVERY_PATH,
];

const explorePaths = [HOSTS_PATH, USERS_PATH, NETWORK_PATH, OVERVIEW_PATH];

export const getScopeFromPath = (
  pathname: string,
  newDataViewPickerEnabled?: boolean
): SourcererScopeName.default | SourcererScopeName.detections | SourcererScopeName.explore => {
  if (
    matchPath(pathname, {
      path: detectionsPaths,
      strict: false,
    })
  ) {
    return SourcererScopeName.detections;
  }

  if (
    newDataViewPickerEnabled &&
    matchPath(pathname, {
      path: explorePaths,
      strict: false,
    })
  ) {
    return SourcererScopeName.explore;
  }

  return SourcererScopeName.default;
};

export const showSourcererByPath = (pathname: string): boolean =>
  matchPath(pathname, {
    path: sourcererPaths,
    strict: false,
  }) != null;
