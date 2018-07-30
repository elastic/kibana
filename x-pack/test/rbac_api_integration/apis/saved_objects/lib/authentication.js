/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

export const AUTHENTICATION = {
  NOT_A_KIBANA_USER: {
    USERNAME: 'not_a_kibana_user',
    PASSWORD: 'password'
  },
  SUPERUSER: {
    USERNAME: 'elastic',
    PASSWORD: 'changeme'
  },
  KIBANA_LEGACY_USER: {
    USERNAME: 'a_kibana_legacy_user',
    PASSWORD: 'password'
  },
  KIBANA_LEGACY_DASHBOARD_ONLY_USER: {
    USERNAME: 'a_kibana_legacy_dashboard_only_user',
    PASSWORD: 'password'
  },
  KIBANA_DUAL_PRIVILEGES_USER: {
    USERNAME: 'a_kibana_dual_privileges_user',
    PASSWORD: 'password'
  },
  KIBANA_DUAL_PRIVILEGES_DASHBOARD_ONLY_USER: {
    USERNAME: 'a_kibana_dual_privileges_dashboard_only_user',
    PASSWORD: 'password'
  },
  KIBANA_RBAC_USER: {
    USERNAME: 'a_kibana_rbac_user',
    PASSWORD: 'password'
  },
  KIBANA_RBAC_DASHBOARD_ONLY_USER: {
    USERNAME: 'a_kibana_rbac_dashboard_only_user',
    PASSWORD: 'password'
  }
};
