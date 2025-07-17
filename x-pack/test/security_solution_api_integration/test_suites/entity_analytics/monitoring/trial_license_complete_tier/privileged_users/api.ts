/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { ListPrivMonUsersResponse } from '@kbn/security-solution-plugin/common/api/entity_analytics/privilege_monitoring/users/list.gen';
import { FtrProviderContext } from '../../../../../ftr_provider_context';
import { dataViewRouteHelpersFactory } from '../../../utils/data_view';
import { PrivMonUtils } from './utils';

export default ({ getService }: FtrProviderContext) => {
  const api = getService('securitySolutionApi');
  const supertest = getService('supertest');
  const es = getService('es');
  const log = getService('log');
  const privMonUtils = PrivMonUtils(getService);

  describe('@ess @serverless @skipInServerlessMKI Entity Monitoring Privileged Users CRUD APIs', () => {
    const dataView = dataViewRouteHelpersFactory(supertest);
    before(async () => {
      await dataView.create('security-solution');
      await privMonUtils.initPrivMonEngine();
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

      describe('CSV API', () => {
        it('should upload multiple users via a csv file', async () => {
          log.info(`Uploading multiple users via CSV`);
          const csv = ['csv_user_1', 'csv_user_2', 'csv_user_3'].join('\n');
          const res = await privMonUtils.bulkUploadUsersCsv(csv);
          if (res.status !== 200) {
            log.error(`Failed to upload users via CSV`);
            log.error(JSON.stringify(res.body));
          }
          expect(res.status).eql(200);
          expect(res.body.stats.successful).to.be(3);
          expect(res.body.stats.total).to.be(3);
        });

        it('should add source labels and `is_privileged` field to the uploaded users', async () => {
          log.info(`Uploading multiple users via CSV`);
          const csv = ['csv_user_1', 'csv_user_2', 'csv_user_3'].join('\n');
          const res = await privMonUtils.bulkUploadUsersCsv(csv);
          if (res.status !== 200) {
            log.error(`Failed to upload users via CSV`);
            log.error(JSON.stringify(res.body));
          }

          expect(res.status).eql(200);
          expect(res.body.stats.successful).to.be(3);
          expect(res.body.stats.total).to.be(3);

          log.info('Verifying uploaded users');

          const listRes = await api.listPrivMonUsers({
            query: { kql: `user.name: csv_user_*` },
          });
          if (listRes.status !== 200) {
            log.error(`Listing privmon users failed`);
            log.error(JSON.stringify(listRes.body));
          }

          expect(listRes.status).eql(200);
          expect(listRes.body.length).to.be(3);

          const listed = listRes.body as ListPrivMonUsersResponse;
          listed.forEach(({ user, labels }) => {
            expect(user?.is_privileged).to.be(true);
            expect(labels?.sources).to.contain('csv');
          });
        });

        it('should add "csv" source even if the user already has other sources', async () => {
          log.info(`Creating a user via CRUD API`);

          const { body } = await api.createPrivMonUser({
            body: { user: { name: 'api_user_1' } },
          });
          if (body.status !== 200) {
            log.error(`Creating privmon user via CRUD API failed`);
            log.error(JSON.stringify(body));
          }

          log.info(`Uploading multiple users via CSV`);
          const csv = ['api_user_1', 'csv_user_1', 'csv_user_2'].join('\n');
          const res = await privMonUtils.bulkUploadUsersCsv(csv);
          if (res.status !== 200) {
            log.error(`Failed to upload users via CSV`);
            log.error(JSON.stringify(res.body));
          }

          expect(res.status).eql(200);
          expect(res.body.stats.successful).to.be(3);
          expect(res.body.stats.total).to.be(3);

          log.info('Verifying uploaded users');
          const listRes = await api.listPrivMonUsers({
            query: { kql: `user.name: api_user_* or user.name: csv_user_*` },
          });
          if (listRes.status !== 200) {
            log.error(`Listing privmon users failed`);
            log.error(JSON.stringify(listRes.body));
          }

          expect(listRes.status).eql(200);
          expect(listRes.body.length).to.be(3);
          const listed = listRes.body as ListPrivMonUsersResponse;
          listed.forEach(({ user, labels }) => {
            if (user?.name === 'api_user_1') {
              expect(labels?.sources).to.contain('api');
            }
            expect(user?.is_privileged).to.be(true);
            expect(labels?.sources).to.contain('csv');
          });
        });

        it('should soft delete users when uploading a second csv which omits some users', async () => {
          log.info(`Uploading first CSV to create users`);
          const csv = ['csv_user_1', 'csv_user_2', 'csv_user_3'].join('\n');
          const res = await privMonUtils.bulkUploadUsersCsv(csv);
          if (res.status !== 200) {
            log.error(`Failed to upload users via CSV`);
            log.error(JSON.stringify(res.body));
          }

          log.info(`Uploading second CSV to soft delete users`);
          const csv2 = ['csv_user_1', 'csv_user_2'].join('\n');
          const res2 = await privMonUtils.bulkUploadUsersCsv(csv2);
          if (res2.status !== 200) {
            log.error(`Failed to upload users via CSV`);
            log.error(JSON.stringify(res2.body));
          }

          expect(res2.status).eql(200);
          expect(res2.body.stats.successful).to.be(3);
          expect(res.body.stats.total).to.be(3);

          log.info('Verifying soft deleted users');
          const listRes = await api.listPrivMonUsers({
            query: { kql: `user.name: csv_user_*` },
          });

          if (listRes.status !== 200) {
            log.error(`Listing privmon users failed`);
            log.error(JSON.stringify(listRes.body));
          }

          expect(listRes.status).eql(200);
          expect(listRes.body.length).to.be(3);
          const listed = listRes.body as ListPrivMonUsersResponse;
          listed.forEach(({ user, labels }) => {
            if (user?.name === 'csv_user_3') {
              expect(user?.is_privileged).to.be(false);
              expect(labels?.sources).to.be.empty();
            } else {
              expect(user?.is_privileged).to.be(true);
              expect(labels?.sources).to.contain('csv');
            }
          });
        });

        it('should not soft delete users which have other sources', async () => {
          log.info(`Creating a user via CRUD API`);
          const { body } = await api.createPrivMonUser({
            body: { user: { name: 'csv_user_3' } },
          });
          if (body.status !== 200) {
            log.error(`Creating privmon user via CRUD API failed`);
            log.error(JSON.stringify(body));
          }

          log.info(`Uploading first CSV to create users`);
          const csv = ['csv_user_1', 'csv_user_2', 'csv_user_3'].join('\n');
          const res = await privMonUtils.bulkUploadUsersCsv(csv);
          if (res.status !== 200) {
            log.error(`Failed to upload users via CSV`);
            log.error(JSON.stringify(res.body));
          }

          log.info(`Uploading second CSV to soft delete users`);
          const csv2 = ['csv_user_1', 'csv_user_2'].join('\n');
          const res2 = await privMonUtils.bulkUploadUsersCsv(csv2);
          if (res2.status !== 200) {
            log.error(`Failed to upload users via CSV`);
            log.error(JSON.stringify(res2.body));
          }

          expect(res2.status).eql(200);
          expect(res2.body.stats.successful).to.be(3);
          expect(res.body.stats.total).to.be(3);

          log.info('Verifying soft deleted users');
          const listRes = await api.listPrivMonUsers({
            query: { kql: `user.name: csv_user_*` },
          });

          if (listRes.status !== 200) {
            log.error(`Listing privmon users failed`);
            log.error(JSON.stringify(listRes.body));
          }

          expect(listRes.status).eql(200);
          expect(listRes.body.length).to.be(3);
          const listed = listRes.body as ListPrivMonUsersResponse;
          listed.forEach(({ user, labels }) => {
            expect(user?.is_privileged).to.be(true);
            if (user?.name === 'csv_user_3') {
              expect(labels?.sources?.length).to.be(1);
              expect(labels?.sources).to.contain('api');
            } else {
              expect(labels?.sources).to.contain('csv');
            }
          });
        });
      });
    });
  });
};
