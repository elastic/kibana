/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { JOB_PARAMS_ECOM_MARKDOWN } from '../fixtures';
import { FtrProviderContext } from '../ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default ({ getPageObjects, getService }: FtrProviderContext) => {
  const PageObjects = getPageObjects(['common', 'reporting']);
  const log = getService('log');
  const supertest = getService('supertestWithoutAuth');

  const testSubjects = getService('testSubjects');
  const esArchiver = getService('esArchiver');
  const reportingApi = getService('reportingAPI');

  const postJobJSON = async (
    apiPath: string,
    jobJSON: object = {}
  ): Promise<{ path: string; status: number }> => {
    log.debug(`postJobJSON((${apiPath}): ${JSON.stringify(jobJSON)})`);
    const { body, status } = await supertest.post(apiPath).set('kbn-xsrf', 'xxx').send(jobJSON);
    return { status, path: body.path };
  };

  describe('Polling for jobs', () => {
    beforeEach(async () => {
      await esArchiver.load('empty_kibana');
      await esArchiver.load('reporting/ecommerce_kibana');
    });

    afterEach(async () => {
      await esArchiver.unload('empty_kibana');
      await esArchiver.unload('reporting/ecommerce_kibana');
      await reportingApi.deleteAllReports();
    });

    it('Displays new jobs', async () => {
      await PageObjects.common.navigateToApp('reporting');
      await testSubjects.existOrFail('reportJobListing', { timeout: 200000 });

      // post new job
      const { status } = await postJobJSON(`/api/reporting/generate/png`, {
        jobParams: JOB_PARAMS_ECOM_MARKDOWN,
      });
      expect(status).to.be(200);

      await PageObjects.common.sleep(3000); // Wait an amount of time for auto-polling to refresh the jobs

      const tableElem = await testSubjects.find('reportJobListing');
      const tableRow = await tableElem.findByCssSelector('tbody tr td+td'); // find the title cell of the first row
      const tableCellText = await tableRow.getVisibleText();
      expect(tableCellText).to.be(`Tiểu thuyết\nvisualization`);
    });
  });
};
