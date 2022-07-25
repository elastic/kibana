/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { API_BASE_PATH } from '@kbn/upgrade-assistant-plugin/common/constants';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');

  describe('Node disk space', function () {
    this.onlyEsVersion('<=7');

    describe('GET /api/upgrade_assistant/node_disk_space', () => {
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
