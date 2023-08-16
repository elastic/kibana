/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

const DATA_ANALYST_PASSWORD = 'data_analyst-password';
const DATA_ANALYST_ROLE = 'data_analyst_role';
const DATA_ANALYST_USERNAME = 'data_analyst';
const REPORTING_ROLE = 'reporting_user_role';
const REPORTING_USER_PASSWORD = 'reporting_user-password';
const REPORTING_USER_USERNAME = 'reporting_user';

/**
 * Services to create roles and users for security testing
 */
export function SvlReportingServiceProvider({ getService }: FtrProviderContext) {
  const security = getService('security');

  return {
    DATA_ANALYST_PASSWORD,
    DATA_ANALYST_USERNAME,
    REPORTING_USER_PASSWORD,
    REPORTING_USER_USERNAME,

    /**
     * Define a role that DOES NOT grant privileges to create any type of report.
     */
    async createDataAnalystRole() {
      await security.role.create(DATA_ANALYST_ROLE, {
        metadata: {},
        elasticsearch: {
          cluster: [],
          indices: [
            {
              names: ['ecommerce'],
              privileges: ['read', 'view_index_metadata'],
              allow_restricted_indices: false,
            },
          ],
          run_as: [],
        },
        kibana: [
          {
            base: ['read'],
            feature: {},
            spaces: ['*'],
          },
        ],
      });
    },

    async createDataAnalystUser() {
      await security.user.create(DATA_ANALYST_USERNAME, {
        password: DATA_ANALYST_PASSWORD,
        roles: [DATA_ANALYST_ROLE],
        full_name: 'Data Analyst User',
      });
    },

    /**
     * Define a role that DOES grant privileges to create certain types of reports.
     */
    async createReportingRole() {
      await security.role.create(REPORTING_ROLE, {
        metadata: {},
        elasticsearch: {
          cluster: [],
          indices: [
            {
              names: ['ecommerce'],
              privileges: ['read', 'view_index_metadata'],
              allow_restricted_indices: false,
            },
          ],
          run_as: [],
        },
        kibana: [
          {
            base: [],
            feature: { discover: ['minimal_read', 'generate_report'] },
            spaces: ['*'],
          },
        ],
      });
    },

    async createReportingUser(
      username = REPORTING_USER_USERNAME,
      password = REPORTING_USER_PASSWORD
    ) {
      await security.user.create(username, {
        password,
        roles: [REPORTING_ROLE],
        full_name: 'Reporting User',
      });
    },
  };
}
