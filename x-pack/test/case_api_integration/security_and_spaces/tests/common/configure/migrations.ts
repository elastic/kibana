/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../../common/ftr_provider_context';
import { CASE_CONFIGURE_URL } from '../../../../../../plugins/cases/common/constants';

// eslint-disable-next-line import/no-default-export
export default function createGetTests({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('migrations', () => {
    before(async () => {
      await esArchiver.load('x-pack/test/functional/es_archives/cases/migrations/7.10.0');
    });

    after(async () => {
      await esArchiver.unload('x-pack/test/functional/es_archives/cases/migrations/7.10.0');
    });

    it('7.10.0 migrates configure cases connector', async () => {
      const { body } = await supertest
        .get(`${CASE_CONFIGURE_URL}`)
        .set('kbn-xsrf', 'true')
        .send()
        .expect(200);

      expect(body.length).to.be(1);
      expect(body[0]).key('connector');
      expect(body[0]).not.key('connector_id');
      expect(body[0].connector).to.eql({
        id: 'connector-1',
        name: 'Connector 1',
        type: '.none',
        fields: null,
      });
    });
  });
}
