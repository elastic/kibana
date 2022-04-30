/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function optInTest({ getService }: FtrProviderContext) {
  const client = getService('es');
  const supertest = getService('supertest');

  describe('/api/telemetry/v2/userHasSeenNotice API Telemetry User has seen OptIn Notice', () => {
    it('should update telemetry setting field via PUT', async () => {
      await client.delete(
        {
          index: '.kibana',
          id: 'telemetry:telemetry',
        },
        { ignore: [404] }
      );

      await supertest.put('/api/telemetry/v2/userHasSeenNotice').set('kbn-xsrf', 'xxx').expect(200);

      const { _source } = await client.get<{ telemetry: { userHasSeenNotice: boolean } }>({
        index: '.kibana',
        id: 'telemetry:telemetry',
      });

      expect(_source?.telemetry.userHasSeenNotice).to.be(true);
    });
  });
}
