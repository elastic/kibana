/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createSupertestErrorLogger } from '../../../../../common/lib/log_supertest_errors';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function createMicrosoftDefenderEndpointTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const securityService = getService('security');
  const log = getService('log');
  const logErrorDetails = createSupertestErrorLogger(log);

  describe('Microsoft Defender for Endpoint Connector', () => {
    // FIXME:PT implement
  });
}
