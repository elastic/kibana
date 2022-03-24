/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { FtrProviderContext } from '../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function (context: FtrProviderContext) {
  const security = context.getService('security');
  const createDataAnalystRole = async () => {
    await security.role.create('data_analyst', {
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
      kibana: [{ base: ['all'], feature: {}, spaces: ['*'] }],
    });
  };
  const createDataAnalyst = async () => {
    await security.user.create('data_analyst', {
      password: 'data_analyst-password',
      roles: ['data_analyst', 'kibana_user'],
      full_name: 'a kibana user called data_a',
    });
  };
  const createReportingUser = async () => {
    await security.user.create('reporting_user', {
      password: 'reporting_user-password',
      roles: ['reporting_user', 'data_analyst', 'kibana_user'], // Deprecated: using built-in `reporting_user` role grants all Reporting privileges
      full_name: 'a reporting user',
    });
  };

  describe('Reporting Functional Tests with Deprecated Security configuration enabled', function () {
    this.tags('ciGroup2');

    before(async () => {
      const reportingAPI = context.getService('reportingAPI');
      await reportingAPI.logTaskManagerHealth();
      await createDataAnalystRole();
      await createDataAnalyst();
      await createReportingUser();
    });

    const { loadTestFile } = context;
    loadTestFile(require.resolve('./security_roles_privileges'));
    loadTestFile(require.resolve('./management'));
  });
}
