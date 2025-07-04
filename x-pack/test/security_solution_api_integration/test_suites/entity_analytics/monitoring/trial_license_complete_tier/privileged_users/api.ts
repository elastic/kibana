/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../../../../ftr_provider_context';
import { dataViewRouteHelpersFactory } from '../../../utils/data_view';
import { PrivMonUtils } from './utils';
import { enablePrivmonSetting, disablePrivmonSetting } from '../../../utils';

export default ({ getService }: FtrProviderContext) => {
  const api = getService('securitySolutionApi');
  const supertest = getService('supertest');
  const es = getService('es');
  const log = getService('log');
  const privMonUtils = PrivMonUtils(getService);

  describe('@ess @serverless @skipInServerlessMKI Entity Monitoring Privileged Users CRUD APIs', () => {
    const dataView = dataViewRouteHelpersFactory(supertest);
    const kibanaServer = getService('kibanaServer');
    before(async () => {
      await enablePrivmonSetting(kibanaServer);
      await dataView.create('security-solution');
      await privMonUtils.initPrivMonEngine();
    });

    beforeEach(async () => {
      await enablePrivmonSetting(kibanaServer);
    });

    after(async () => {
      await dataView.delete('security-solution');
    });

    describe('CRUD API', () => {
      it('should create a user', async () => {
        log.info(`creating a user`);
        const res = await api.createPrivMonUser({
          body: { user: { name: 'test_user1' } },
        });

        if (res.status !== 200) {
          log.error(`Creating privmon user failed`);
          log.error(JSON.stringify(res.body));
        }

        expect(res.status).eql(200);
        expect(res.body);
      });

      it('should not create a user if the advanced setting is disabled', async () => {
        await disablePrivmonSetting(kibanaServer);
        log.info(`creating a user with advanced setting disabled`);
        const res = await api.createPrivMonUser({
          body: { user: { name: 'test_user2' } },
        });

        if (res.status !== 403) {
          log.error(`Creating privmon user with advanced setting disabled should fail`);
          log.error(JSON.stringify(res.body));
        }

        expect(res.status).eql(403);
      });

      it('should update a user', async () => {
        log.info(`updating a user`);
        const { body } = await api.createPrivMonUser({
          body: { user: { name: 'test_user3' } },
        });
        const res = await api.updatePrivMonUser({
          body: { user: { name: 'updated' } },
          params: { id: body.id },
        });

        if (res.status !== 200) {
          log.error(`Updating privmon user failed`);
          log.error(JSON.stringify(res.body));
        }

        expect(res.status).eql(200);
        expect(res.body.user.name).to.be('updated');
      });

      it('should list users', async () => {
        log.info(`listing users`);

        const { body } = await api.createPrivMonUser({
          body: { user: { name: 'test_user4' } },
        });

        // Ensure the data is indexed and available for searching, in case we ever remove `refresh: wait_for` when indexing
        await es.indices.refresh({ index: body._index });

        const res = await api.listPrivMonUsers({ query: { kql: `user.name: test*` } });

        if (res.status !== 200) {
          log.error(`Listing privmon users failed`);
          log.error(JSON.stringify(res.body));
        }

        expect(res.status).eql(200);
        expect(res.body.length).to.be.greaterThan(0);
      });
      it('should delete a user', async () => {
        log.info(`deleting a user`);
        const { body } = await api.createPrivMonUser({
          body: { user: { name: 'test_user5' } },
        });
        const res = await api.deletePrivMonUser({ params: { id: body.id } });

        if (res.status !== 200) {
          log.error(`Deleting privmon user failed`);
          log.error(JSON.stringify(res.body));
        }

        expect(res.status).eql(200);
        expect(res.body).to.eql({ aknowledged: true });
      });
    });
  });
};
