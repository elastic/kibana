/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../ftr_provider_context';
import { API_BASE_PATH } from '../../../../plugins/upgrade_assistant/common/constants';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const es = getService('es');
  const log = getService('log');

  describe('Node disk spave', () => {
    describe('GET /api/upgrade_assistant/node_disk_space', () => {
      before(async () => {
        try {
          // Configure a low disk watermark setting
          await es.cluster.putSettings({
            body: {
              persistent: {
                'cluster.routing.allocation.disk.watermark.low': '60%',
              },
            },
          });
        } catch (e) {
          log.debug('Error updating cluster settings');
          throw e;
        }
      });

      after(async () => {
        try {
          // Reset low disk watermark setting
          await es.cluster.putSettings({
            body: {
              persistent: {
                'cluster.routing.allocation.disk.watermark.low': null,
              },
            },
          });
        } catch (e) {
          log.debug('Error resetting cluster settings');
          throw e;
        }
      });

      it('returns an array of nodes', async () => {
        const { body: apiRequestResponse } = await supertest
          .get(`${API_BASE_PATH}/node_disk_space`)
          .set('kbn-xsrf', 'xxx')
          .expect(200);

        // It's tricky to assert the correct node values on CI
        // For now, this serves as a smoke test and verifies an array is returned
        // There are jest unit tests that test additional logic
        expect(Array.isArray(apiRequestResponse)).be(true);
      });
    });
  });
}
