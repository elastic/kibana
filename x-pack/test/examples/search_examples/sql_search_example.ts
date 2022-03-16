/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../functional/ftr_provider_context';

// eslint-disable-next-line import/no-default-export
export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const testSubjects = getService('testSubjects');
  const PageObjects = getPageObjects(['common']);
  const toasts = getService('toasts');

  describe('SQL search example', () => {
    const appId = 'searchExamples';

    before(async function () {
      await PageObjects.common.navigateToApp(appId, { insertTimestamp: false });
      await testSubjects.click('/sql-search');
    });

    it('should search', async () => {
      const sqlQuery = `SELECT index, bytes FROM "logstash-*" ORDER BY "@timestamp" DESC`;
      await (await testSubjects.find('sqlQueryInput')).type(sqlQuery);

      await testSubjects.click(`querySubmitButton`);

      await testSubjects.stringExistsInCodeBlockOrFail(
        'requestCodeBlock',
        JSON.stringify(sqlQuery)
      );
      await testSubjects.stringExistsInCodeBlockOrFail(
        'responseCodeBlock',
        `"logstash-2015.09.22"`
      );
      expect(await toasts.getToastCount()).to.be(0);
    });
  });
}
