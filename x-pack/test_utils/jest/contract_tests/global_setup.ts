/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { _createSharedServer } from './servers';

// eslint-disable-next-line import/no-default-export
export default async function globalSetup() {
  if (process.env.CONTRACT_ONLINE === 'true') {
    await _createSharedServer();
  }
}
