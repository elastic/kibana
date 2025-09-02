/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import type { ListPrivMonUsersResponse } from '@kbn/security-solution-plugin/common/api/entity_analytics';
import type { FtrProviderContext } from '../../../../../ftr_provider_context';
import { PrivMonUtils } from './utils';
import { enablePrivmonSetting, disablePrivmonSetting } from '../../../utils';

export default ({ getService }: FtrProviderContext) => {
  const api = getService('securitySolutionApi');
  const es = getService('es');
  const log = getService('log');

  const privMonUtils = PrivMonUtils(getService);

  describe('@ess @serverless @skipInServerlessMKI Entity Monitoring Privileged Users APIs', () => {
    const kibanaServer = getService('kibanaServer');

    beforeEach(async () => {
      await enablePrivmonSetting(kibanaServer);
      await api.deleteMonitoringEngine({ query: { data: true } });
      await privMonUtils.initPrivMonEngine();
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

      it('should not create a user if the maximum user limit is reached', async () => {
        log.info(`creating a user when the maximum limit is reached`);
        const userCreationPromises = Array.from({ length: 100 }, (_, i) =>
          api.createPrivMonUser({
            body: { user: { name: `privmon_testuser_${i + 1}` } },
          })
        );
        await Promise.all(userCreationPromises);
        const res = await api.createPrivMonUser({
          body: { user: { name: 'privmon_testuser_maxPlusOne' } },
        });

        if (res.status !== 500) {
          log.error(`Creating privmon user when the maximum limit is reached should fail`);
          log.error(JSON.stringify(res.body));
        }

        expect(res.status).eql(500);
        expect(res.body.message).to.match(/Maximum user limit of \d+ reached/);
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
        expect(res.body).to.eql({ acknowledged: true });
      });
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

        const listed = listRes.body as ListPrivMonUsersResponse;
        listed.forEach(({ user, labels }) => {
          expect(user?.is_privileged).to.be(true);
          expect(labels?.sources).to.contain('csv');
        });
      });

      it('should add "csv" source even if the user already has other sources', async () => {
        log.info(`Creating a user via CRUD API`);
        await api.createPrivMonUser({
          body: { user: { name: 'api_user_1' } },
        });

        log.info(`Uploading multiple users via CSV`);
        const csv = ['api_user_1', 'csv_user_1', 'csv_user_2'].join('\n');
        const res = await privMonUtils.bulkUploadUsersCsv(csv);
        if (res.status !== 200) {
          log.error(`Failed to upload users via CSV`);
          log.error(JSON.stringify(res.body));
        }

        log.info('Verifying uploaded users');
        const listRes = await api.listPrivMonUsers({
          query: { kql: `user.name: api_user_* or user.name: csv_user_*` },
        });
        if (listRes.status !== 200) {
          log.error(`Listing privmon users failed`);
          log.error(JSON.stringify(listRes.body));
        }

        const listed = listRes.body as ListPrivMonUsersResponse;
        const apiuser = listed.find((u) => u.user?.name === 'api_user_1');
        expect(apiuser).to.not.be(undefined);
        expect(apiuser?.user?.is_privileged).to.be(true);
        expect(apiuser?.labels?.sources).to.contain('api');
        expect(apiuser?.labels?.sources).to.contain('csv');
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
        await api.createPrivMonUser({
          body: { user: { name: 'test_user_3' } },
        });

        log.info(`Uploading first CSV to create users`);
        const csv = ['test_user_1', 'test_user_2', 'test_user_3'].join('\n');
        const res = await privMonUtils.bulkUploadUsersCsv(csv);
        if (res.status !== 200) {
          log.error(`Failed to upload users via CSV`);
          log.error(JSON.stringify(res.body));
        }

        log.info(`Uploading second CSV to soft delete users`);
        const csv2 = ['test_user_1', 'test_user_2'].join('\n');
        const res2 = await privMonUtils.bulkUploadUsersCsv(csv2);
        if (res2.status !== 200) {
          log.error(`Failed to upload users via CSV`);
          log.error(JSON.stringify(res2.body));
        }

        log.info('Verifying soft deleted users');
        const listRes = await api.listPrivMonUsers({
          query: { kql: `user.name: test_user_*` },
        });

        if (listRes.status !== 200) {
          log.error(`Listing privmon users failed`);
          log.error(JSON.stringify(listRes.body));
        }

        const listed = listRes.body as ListPrivMonUsersResponse;
        listed.forEach(({ user, labels }) => {
          expect(user?.is_privileged).to.be(true);
          if (user?.name === 'test_user_3') {
            expect(labels?.sources?.length).to.be(1);
            expect(labels?.sources).to.contain('api');
          } else {
            expect(labels?.sources).to.contain('csv');
          }
        });
      });

      it('should only upload unique users from the CSV', async () => {
        log.info(`Uploading multiple users via CSV with duplicates`);
        const csv = Array(150).fill('non_unique_user').join('\n');
        const res = await privMonUtils.bulkUploadUsersCsv(csv);
        if (res.status !== 200) {
          log.error(`Failed to upload users via CSV`);
          log.error(JSON.stringify(res.body));
        }

        expect(res.status).eql(200);

        const listRes = await api.listPrivMonUsers({
          query: { kql: `user.name: non_unique_user` },
        });
        if (listRes.status !== 200) {
          log.error(`Listing privmon users failed`);
          log.error(JSON.stringify(listRes.body));
        }
        expect(listRes.status).eql(200);
        expect(listRes.body.length).to.be(1);
      });

      describe('CSV with labels', () => {
        it('should add labels to the uploaded users', async () => {
          const csv = ['csv_user_1,label1'].join('\n');
          await privMonUtils.bulkUploadUsersCsv(csv);

          const listRes = await api.listPrivMonUsers({
            query: {},
          });

          const listed = listRes.body as ListPrivMonUsersResponse;
          expect(getEaLabelValues(listed[0])).to.eql(['label1']);
        });

        it('should update labels to the uploaded users', async () => {
          const csv = ['csv_user_1,label1'].join('\n');
          await privMonUtils.bulkUploadUsersCsv(csv);

          const updateCsv = ['csv_user_1,label3'].join('\n');
          await privMonUtils.bulkUploadUsersCsv(updateCsv);

          const listRes = await api.listPrivMonUsers({
            query: {},
          });

          const listed = listRes.body as ListPrivMonUsersResponse;
          expect(getEaLabelValues(listed[0])).to.eql(['label1', 'label3']);
        });

        it('should keep the current labels when the updated user has no labels', async () => {
          const csv = ['csv_user_1,label1'].join('\n');
          await privMonUtils.bulkUploadUsersCsv(csv);

          const updateCsv = ['csv_user_1'].join('\n');
          await privMonUtils.bulkUploadUsersCsv(updateCsv);

          const listRes = await api.listPrivMonUsers({
            query: {},
          });

          const listed = listRes.body as ListPrivMonUsersResponse;

          expect(getEaLabelValues(listed[0])).to.eql(['label1']);
        });

        it('should remove the label when soft deleting a user', async () => {
          const csv = ['csv_user_1,label1'].join('\n');
          await privMonUtils.bulkUploadUsersCsv(csv);

          const updateCsv = ['csv_user_2,label2'].join('\n');
          await privMonUtils.bulkUploadUsersCsv(updateCsv);

          const listRes = await api.listPrivMonUsers({
            query: { kql: `user.name: csv_user_1` },
          });

          const listed = listRes.body as ListPrivMonUsersResponse;
          expect(listed[0].user?.is_privileged).to.eql(false);
          expect(getEaLabelValues(listed[0])).to.eql([]);
        });
      });
    });
  });
};

const getEaLabelValues = (user: ListPrivMonUsersResponse[number]) => {
  return user.entity_analytics_monitoring?.labels?.map((l) => l.value) || [];
};
