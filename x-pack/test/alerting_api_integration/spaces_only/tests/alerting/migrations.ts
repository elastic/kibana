/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { getUrlPrefix } from '../../../common/lib';
import { FtrProviderContext } from '../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function createGetTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('migrations', () => {
    before(async () => {
      await esArchiver.load('alerts');
    });

    after(async () => {
      await esArchiver.unload('alerts');
    });

    it('7.9.0 migrates the `alerting` consumer to be the `alerts`', async () => {
      const response = await supertest.get(
        `${getUrlPrefix(``)}/api/alerts/alert/74f3e6d7-b7bb-477d-ac28-92ee22728e6e`
      );

      expect(response.status).to.eql(200);
      expect(response.body.consumer).to.equal('alerts');
    });
  });
}
