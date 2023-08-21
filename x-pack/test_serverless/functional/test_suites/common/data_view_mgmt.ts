/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from 'expect';
import { DATA_VIEW_PATH } from '@kbn/data-views-plugin/server';
import { FtrProviderContext } from '../../ftr_provider_context';

const archivePath = 'test/api_integration/fixtures/es_archiver/index_patterns/basic_index';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['settings', 'common', 'header']);
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  const testSubjects = getService('testSubjects');

  describe('Data View Management', function () {
    let dataViewId = '';

    before(async () => {
      await esArchiver.load(archivePath);

      const response = await supertest
        .post(DATA_VIEW_PATH)
        .set('kbn-xsrf', 'some-xsrf-token')
        .send({
          data_view: {
            title: 'basic_index',
          },
          override: true,
        });

      expect(response.status).toBe(200);
      dataViewId = response.body.data_view.id;
    });

    after(async () => {
      await esArchiver.unload(archivePath);
      await supertest.delete(`${DATA_VIEW_PATH}/${dataViewId}`).set('kbn-xsrf', 'some-xsrf-token');
    });

    it('Scripted fields tab is missing', async () => {
      await PageObjects.common.navigateToUrl('management', 'kibana/dataViews', {
        shouldUseHashForSubUrl: false,
      });
      await testSubjects.click('detail-link-basic_index');
      await testSubjects.exists('tab-indexedFields');
      await testSubjects.missingOrFail('tab-scriptedFields');
    });
  });
}
