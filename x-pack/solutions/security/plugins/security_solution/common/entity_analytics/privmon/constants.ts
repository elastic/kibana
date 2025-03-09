/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
export const PRIVMON_URL = `/api/privmon` as const;
export const PRIVMON_INIT_URL = `${PRIVMON_URL}/init` as const;
export const PRIVMON_SIMILAR_USERS_URL = `${PRIVMON_URL}/similar_users` as const;

export const PRIVMON_INDEX_PREFIX = 'risk-score.risk-monitoring';
export const PRIVMON_INDEX_PATTERN = `${PRIVMON_INDEX_PREFIX}.*`;
export const PRIVMON_ALL_DATA_VIEW_ID = 'privmon-all';

export const PRIVMON_LOGINS_INDEX_PATTERN = `${PRIVMON_INDEX_PREFIX}.logins-*`;
export const PRIVMON_LOGINS_INDEX_TEMPLATE_NAME = `${PRIVMON_INDEX_PREFIX}.logins`;
export const PRIVMON_LOGINS_DATA_VIEW_ID = 'privmon-logins';

export const PRIVMON_PRIVILEGES_INDEX_PATTERN = `${PRIVMON_INDEX_PREFIX}.privileges-*`;
export const PRIVMON_PRIVILEGES_INDEX_TEMPLATE_NAME = `${PRIVMON_INDEX_PREFIX}.privileges`;
export const PRIVMON_PRIVILEGES_DATA_VIEW_ID = 'privmon-privileges';

export const PRIVMON_USERS_INDEX_PATTERN = `${PRIVMON_INDEX_PREFIX}.users-*`;
export const PRIVMON_USERS_INDEX_TEMPLATE_NAME = `${PRIVMON_INDEX_PREFIX}.users`;
export const PRIVMON_USERS_DATA_VIEW_ID = 'privmon-users';

export const OBSERVATION_TYPES = {
  LOGIN: {
    CRITICAL_HOST: 'critical_host_login',
  },
  PRIVILEGE: {
    ADDED_TO_PRIVILEGED_GROUP: 'added_to_privileged_group',
    CONTROLS_PRIVILEGED_GROUP: 'controls_privileged_group',
  },
} as const;

export const ACTIONS = {
  LOGIN: 'login',
  GROUP_ADD: 'group-add',
};
