/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';

import { getCaseConnectors } from '../../../../common/lib/utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');

  describe('get_connectors', () => {
    /**
     * A ServiceNow preconfigured connector is registered here
     * x-pack/test/cases_api_integration/common/config.ts
     *
     * The license for this test is set to basic. ServiceNow connectors
     * needs license >= platinum. The test below ensures
     * that connectors without valid license are being filtered correctly
     */
    it('should return an empty list of connectors', async () => {
      const connectors = await getCaseConnectors({ supertest });

      expect(connectors).to.eql([]);
    });
  });
};
