/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

export default function({ getService }) {
  const supertest = getService('supertest');
  const esArchiver = getService('esArchiver');

  describe('/api/settings', () => {
    describe('with trial license clusters', () => {
      const archive = 'monitoring/multicluster';

      before('load clusters archive', () => {
        return esArchiver.load(archive);
      });

      after('unload clusters archive', () => {
        return esArchiver.unload(archive);
      });

      it('should load multiple clusters', async () => {
        const { body } = await supertest
          .get('/api/settings')
          .set('kbn-xsrf', 'xxx')
          .expect(200);
        expect(body.cluster_uuid.length > 1).to.eql(true);
        expect(body.settings.kibana.uuid.length > 0).to.eql(true);
        expect(body.settings.kibana.name.length > 0).to.eql(true);
        expect(body.settings.kibana.index.length > 0).to.eql(true);
        expect(body.settings.kibana.host.length > 0).to.eql(true);
        expect(body.settings.kibana.transport_address.length > 0).to.eql(true);
        expect(body.settings.kibana.version.length > 0).to.eql(true);
        expect(body.settings.kibana.status.length > 0).to.eql(true);
        expect(body.settings.xpack.default_admin_email).to.eql(null);
      });
    });
  });
}
