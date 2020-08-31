/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { Client, DeleteDocumentParams, GetParams, GetResponse } from 'elasticsearch';
import { TelemetrySavedObjectAttributes } from '../../../../../src/plugins/telemetry/server/telemetry_repository';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function optInTest({ getService }: FtrProviderContext) {
  const client: Client = getService('legacyEs');
  const supertest = getService('supertest');

  describe('/api/telemetry/v2/userHasSeenNotice API Telemetry User has seen OptIn Notice', () => {
    it('should update telemetry setting field via PUT', async () => {
      try {
        await client.delete({
          index: '.kibana',
          id: 'telemetry:telemetry',
        } as DeleteDocumentParams);
      } catch (err) {
        if (err.statusCode !== 404) {
          throw err;
        }
      }

      await supertest.put('/api/telemetry/v2/userHasSeenNotice').set('kbn-xsrf', 'xxx').expect(200);

      const {
        _source: { telemetry },
      }: GetResponse<{
        telemetry: TelemetrySavedObjectAttributes;
      }> = await client.get({
        index: '.kibana',
        id: 'telemetry:telemetry',
      } as GetParams);

      expect(telemetry.userHasSeenNotice).to.be(true);
    });
  });
}
