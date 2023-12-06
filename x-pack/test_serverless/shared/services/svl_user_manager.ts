/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SAMLSessionManager } from '@kbn/test';
import { FtrProviderContext } from '../../functional/ftr_provider_context';

export function SvlUserManagerProvider({ getService }: FtrProviderContext) {
  const config = getService('config');
  const log = getService('log');
  const isCloud = !!process.env.TEST_CLOUD;
  // Sharing the instance within FTR config run means cookies are persistent for each role between tests.
  const sessionManager = new SAMLSessionManager(config, log, isCloud);

  return sessionManager;
}
