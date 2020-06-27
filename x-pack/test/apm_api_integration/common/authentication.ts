/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { PromiseReturnType } from '../../../plugins/apm/typings/common';
import { SecurityServiceProvider } from '../../../../test/common/services/security';

type SecurityService = PromiseReturnType<typeof SecurityServiceProvider>;

export enum ApmUser {
  APM_READ_USER = 'apm_read_user',
  APM_WRITE_USER = 'apm_write_user',
}

export async function createApmUser(security: SecurityService, apmUser: ApmUser) {
  switch (apmUser) {
    case ApmUser.APM_READ_USER:
      await security.role.create(ApmUser.APM_READ_USER, {
        kibana: [
          {
            base: [],
            feature: {
              apm: ['read'],
            },
            spaces: ['*'],
          },
        ],
      });
      await security.user.create(ApmUser.APM_READ_USER, {
        full_name: ApmUser.APM_READ_USER,
        password: APM_TEST_PASSWORD,
        roles: ['apm_user', ApmUser.APM_READ_USER],
      });
      break;

    case ApmUser.APM_WRITE_USER:
      await security.role.create(ApmUser.APM_WRITE_USER, {
        kibana: [
          {
            base: [],
            feature: {
              apm: ['all'],
            },
            spaces: ['*'],
          },
        ],
      });

      await security.user.create(ApmUser.APM_WRITE_USER, {
        full_name: ApmUser.APM_WRITE_USER,
        password: APM_TEST_PASSWORD,
        roles: ['apm_user', ApmUser.APM_WRITE_USER],
      });

      break;
  }
}

export const APM_TEST_PASSWORD = 'changeme';
