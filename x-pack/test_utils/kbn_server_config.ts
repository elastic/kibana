/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';

type Licenses = 'oss' | 'basic' | 'gold' | 'trial';

export const TestKbnServerConfig = {
  kbn: {
    plugins: { paths: [resolve(__dirname, '../../x-pack')] },
    xpack: {
      monitoring: {
        tests: {
          cloud_detector: {
            enabled: false,
          },
        },
      },
    },
  },
  es: {
    license: 'trial' as Licenses,
  },
  users: [
    {
      username: 'kibana_user',
      password: 'x-pack-test-password',
      roles: ['kibana_user'],
    },
  ],
};
