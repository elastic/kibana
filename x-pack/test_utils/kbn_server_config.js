/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { resolve } from 'path';

export const xpackKbnServerConfig = {
  kbn: {
    plugins: { paths: [resolve(__dirname, '../../node_modules/x-pack')] },
  },
  es: {
    license: 'trial',
  },
  users: [
    {
      username: 'kibana_user',
      password: 'x-pack-test-password',
      roles: ['kibana_user'],
    },
  ],
};
