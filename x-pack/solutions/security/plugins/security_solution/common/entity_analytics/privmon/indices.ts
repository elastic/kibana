/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PRIVMON_INDEX_PREFIX } from './constants';

export const getPrivmonLoginsIndex = (namespace: string) =>
  `${PRIVMON_INDEX_PREFIX}.logins-${namespace}`;

export const getPrivmonPrivilegesIndex = (namespace: string) =>
  `${PRIVMON_INDEX_PREFIX}.privileges-${namespace}`;

export const getPrivmonUsersIndex = (namespace: string) =>
  `${PRIVMON_INDEX_PREFIX}.users-${namespace}`;

export const getLoginAnomaliesIndex = (namespace: string) =>
  `${PRIVMON_INDEX_PREFIX}.login-anomalies-${namespace}`;
