/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';

import { FtrProviderContext } from '../../../ftr_provider_context';
import { USER } from '../../../../functional/services/ml/security_common';
import { getCommonRequestHeader } from '../../../../functional/services/ml/common_api';

export default ({ getService }: FtrProviderContext) => {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertestWithoutAuth');
  const ml = getService('ml');

  const idSpace1 = 'space1';
  const sourceDataArchive = 'x-pack/test/functional/es_archives/ml/module_sample_logs';
  const moduleInfo = {
    moduleId: 'sample_data_weblogs',
    jobIds: ['low_request_rate', 'response_code_rates', 'url_scanning'],
    dataView: { name: 'ft_module_sample_logs', timeField: '@timestamp' },
  };

  async function runRequest(moduleId: string, expectedStatusCode: number, user: USER) {
    const { body, status } = await supertest
      .get(`/internal/ml/modules/jobs_exist/${moduleId}`)
      .auth(user, ml.securityCommon.getPasswordForUser(user))
      .set(getCommonRequestHeader('1'));

    ml.api.assertResponseStatusCode(expectedStatusCode, status, body);
    return body;
  }

  describe('GET ml/modules/jobs_exist/{moduleId}', function () {
    before(async () => {
      await ml.testResources.setKibanaTimeZoneToUTC();
      await esArchiver.loadIfNeeded(sourceDataArchive);
      // create data view in default space
      await ml.testResources.createDataViewIfNeeded(
        moduleInfo.dataView.name,
        moduleInfo.dataView.timeField
      );
      // create data view in idSpace1
      await ml.testResources.createDataViewIfNeeded(
        moduleInfo.dataView.name,
        moduleInfo.dataView.timeField,
        idSpace1
      );
    });

    afterEach(async () => {
      await ml.api.cleanMlIndices();
    });

    after(async () => {
      // delete all data views in all spaces
      await ml.testResources.deleteDataViewByTitle(moduleInfo.dataView.name);
      await ml.testResources.deleteDataViewByTitle(moduleInfo.dataView.name, idSpace1);
    });

    it('should find jobs installed by module without prefix', async () => {
      const prefix = '';
      await ml.api.setupModule(moduleInfo.moduleId, {
        prefix,
        indexPatternName: moduleInfo.dataView.name,
        startDatafeed: false,
        estimateModelMemory: false,
      });
      const { jobsExist, jobs } = await runRequest(moduleInfo.moduleId, 200, USER.ML_POWERUSER);

      const expectedJobIds = moduleInfo.jobIds.map((j) => ({ id: `${prefix}${j}` }));
      expect(jobsExist).to.eql(true, 'Expected jobsExist to be true');
      expect(jobs).to.eql(expectedJobIds, `Expected jobs to be ${expectedJobIds}`);
    });

    it('should find jobs installed by module with prefix', async () => {
      const prefix = 'pf1_';
      await ml.api.setupModule(moduleInfo.moduleId, {
        prefix,
        indexPatternName: moduleInfo.dataView.name,
        startDatafeed: false,
        estimateModelMemory: false,
      });
      const { jobsExist, jobs } = await runRequest(moduleInfo.moduleId, 200, USER.ML_POWERUSER);

      const expectedJobIds = moduleInfo.jobIds.map((j) => ({ id: `${prefix}${j}` }));
      expect(jobsExist).to.eql(true, 'Expected jobsExist to be true');
      expect(jobs).to.eql(expectedJobIds, `Expected jobs to be ${expectedJobIds}`);
    });

    it('should not find jobs installed into a different space', async () => {
      const prefix = 'pf1_';
      await ml.api.setupModule(
        moduleInfo.moduleId,
        {
          prefix,
          indexPatternName: moduleInfo.dataView.name,
          startDatafeed: false,
          estimateModelMemory: false,
        },
        idSpace1
      );
      const { jobsExist, jobs } = await runRequest(moduleInfo.moduleId, 200, USER.ML_POWERUSER);

      expect(jobsExist).to.eql(false, 'Expected jobsExist to be false');
      expect(jobs).to.eql(undefined, `Expected jobs to be undefined`);
    });

    it("should not find jobs for module which hasn't been installed", async () => {
      const { jobsExist, jobs } = await runRequest('apache_ecs', 200, USER.ML_POWERUSER);

      expect(jobsExist).to.eql(false, 'Expected jobsExist to be false');
      expect(jobs).to.eql(undefined, `Expected jobs to be undefined`);
    });
  });
};
