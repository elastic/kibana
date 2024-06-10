/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../../common/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext): void => {
  const supertest = getService('supertest');

  /**
   * Attachment types are being registered in
   * x-pack/test/cases_api_integration/common/plugins/cases/server/plugin.ts
   */
  describe('Persistable state attachments', () => {
    // This test is intended to fail when new persistable state attachment types are registered.
    // To resolve, add the new persistable state attachment types ID to this list. This will trigger
    // a CODEOWNERS review by Response Ops.
    describe('check registered persistable state attachment types', () => {
      const getRegisteredTypes = () => {
        return supertest
          .get('/api/cases_fixture/registered_persistable_state_attachments')
          .expect(200)
          .then((response) => response.body);
      };

      it('should check changes on all registered persistable state attachment types', async () => {
        const types = await getRegisteredTypes();

        expect(types).to.eql({
          '.lens': '78559fd806809ac3a1008942ead2a079864054f5',
          '.test': 'ab2204830c67f5cf992c9aa2f7e3ead752cc60a1',
          aiopsChangePointChart: 'a1212d71947ec34487b374cecc47ab9941b5d91c',
          ml_anomaly_charts: '23e92e824af9db6e8b8bb1d63c222e04f57d2147',
          ml_anomaly_swimlane: 'a3517f3e53fb041e9cbb150477fb6ef0f731bd5f',
          ml_single_metric_viewer: '8b9532b0a40dfdfa282e262949b82cc1a643147c',
        });
      });
    });
  });
};
