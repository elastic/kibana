/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';
import { getAttackDiscoveryMissingPrivilegesApis } from '../utils/apis';

const getScheduleMissingLicenseError = () => {
  return {
    statusCode: 403,
    error: 'Forbidden',
    message: 'Your license does not support AI Assistant. Please upgrade your license.',
  };
};

export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');

  describe('@ess Basic checks', () => {
    it('returns 403 forbidden error when accessing `get` route', async () => {
      const apis = getAttackDiscoveryMissingPrivilegesApis({ supertest });

      const results = await apis.get({ expectedHttpCode: 403 });

      expect(results).toEqual(getScheduleMissingLicenseError());
    });
  });
};
