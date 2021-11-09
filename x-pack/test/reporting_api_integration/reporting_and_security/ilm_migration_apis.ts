/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../ftr_provider_context';

import { ILM_POLICY_NAME } from '../../../plugins/reporting/common/constants';

// eslint-disable-next-line import/no-default-export
export default function ({ getService }: FtrProviderContext) {
  const es = getService('es');
  const supertest = getService('supertest');
  const supertestWithoutAuth = getService('supertestWithoutAuth');
  const reportingAPI = getService('reportingAPI');
  const security = getService('security');

  const JOB_PARAMS_RISON_CSV =
    `(columns:!(order_date,category,customer_full_name,taxful_total_price,currency)` +
    `,objectType:search,searchSource:(fields:!((field:'*',include_unmapped:true))` +
    `,filter:!((meta:(field:order_date,index:aac3e500-f2c7-11ea-8250-fb138aa491e7` +
    `,params:()),query:(range:(order_date:(format:strict_date_optional_time` +
    `,gte:'2019-06-02T12:28:40.866Z',lte:'2019-07-18T20:59:57.136Z')))))` +
    `,index:aac3e500-f2c7-11ea-8250-fb138aa491e7,parent:(filter:!(),highlightAll:!t` +
    `,index:aac3e500-f2c7-11ea-8250-fb138aa491e7,query:(language:kuery,query:'')` +
    `,version:!t),sort:!((order_date:desc)),trackTotalHits:!t),title:'EC SEARCH from DEFAULT')`;

  describe('ILM policy migration APIs', () => {
    before(async () => {
      await reportingAPI.initLogs();
      await reportingAPI.migrateReportingIndices(); // ensure that the ILM policy exists for the first test
    });

    after(async () => {
      await reportingAPI.teardownLogs();
    });

    afterEach(async () => {
      await reportingAPI.deleteAllReports();
      await reportingAPI.migrateReportingIndices(); // ensure that the ILM policy exists
    });

    it('detects when no migration is needed', async () => {
      expect(await reportingAPI.checkIlmMigrationStatus()).to.eql('ok');

      // try creating a report
      await supertest
        .post(`/api/reporting/generate/csv_searchsource`)
        .set('kbn-xsrf', 'xxx')
        .send({ jobParams: JOB_PARAMS_RISON_CSV });

      expect(await reportingAPI.checkIlmMigrationStatus()).to.eql('ok');
    });

    it('detects when reporting indices should be migrated due to missing ILM policy', async () => {
      await reportingAPI.makeAllReportingIndicesUnmanaged();
      await es.ilm.deleteLifecycle({ name: ILM_POLICY_NAME });

      await supertest
        .post(`/api/reporting/generate/csv_searchsource`)
        .set('kbn-xsrf', 'xxx')
        .send({ jobParams: JOB_PARAMS_RISON_CSV });

      expect(await reportingAPI.checkIlmMigrationStatus()).to.eql('policy-not-found');
      // assert that migration fixes this
      await reportingAPI.migrateReportingIndices();
      expect(await reportingAPI.checkIlmMigrationStatus()).to.eql('ok');
    });

    it('detects when reporting indices should be migrated due to unmanaged indices', async () => {
      await reportingAPI.makeAllReportingIndicesUnmanaged();
      await supertest
        .post(`/api/reporting/generate/csv_searchsource`)
        .set('kbn-xsrf', 'xxx')
        .send({ jobParams: JOB_PARAMS_RISON_CSV });

      expect(await reportingAPI.checkIlmMigrationStatus()).to.eql('indices-not-managed-by-policy');
      // assert that migration fixes this
      await reportingAPI.migrateReportingIndices();
      expect(await reportingAPI.checkIlmMigrationStatus()).to.eql('ok');
    });

    it('does not override an existing ILM policy', async () => {
      const customLifecycle = {
        policy: {
          phases: {
            hot: {
              min_age: '0ms',
              actions: {},
            },
            delete: {
              min_age: '0ms',
              actions: {
                delete: {
                  delete_searchable_snapshot: true,
                },
              },
            },
          },
        },
      };

      // customize the lifecycle policy
      await es.ilm.putLifecycle({
        name: ILM_POLICY_NAME,
        body: customLifecycle,
      });

      await reportingAPI.migrateReportingIndices();

      const {
        [ILM_POLICY_NAME]: { policy },
      } = await es.ilm.getLifecycle({ name: ILM_POLICY_NAME });

      expect(policy).to.eql(customLifecycle.policy);
    });

    it('is not available to unauthorized users', async () => {
      const UNAUTHZD_TEST_USERNAME = 'UNAUTHZD_TEST_USERNAME';
      const UNAUTHZD_TEST_USER_PASSWORD = 'UNAUTHZD_TEST_USER_PASSWORD';

      await security.user.create(UNAUTHZD_TEST_USERNAME, {
        password: UNAUTHZD_TEST_USER_PASSWORD,
        roles: [],
        full_name: 'an unauthzd user',
      });

      try {
        await supertestWithoutAuth
          .put(reportingAPI.routes.API_MIGRATE_ILM_POLICY_URL)
          .auth(UNAUTHZD_TEST_USERNAME, UNAUTHZD_TEST_USER_PASSWORD)
          .set('kbn-xsrf', 'xxx')
          .expect(404);

        await supertestWithoutAuth
          .get(reportingAPI.routes.API_GET_ILM_POLICY_STATUS)
          .auth(UNAUTHZD_TEST_USERNAME, UNAUTHZD_TEST_USER_PASSWORD)
          .set('kbn-xsrf', 'xxx')
          .expect(404);
      } finally {
        await security.user.delete(UNAUTHZD_TEST_USERNAME);
      }
    });
  });
}
