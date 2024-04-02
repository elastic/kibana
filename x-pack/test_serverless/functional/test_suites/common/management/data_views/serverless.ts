/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { DATA_VIEW_PATH } from '@kbn/data-views-plugin/server';
import { ELASTIC_HTTP_VERSION_HEADER } from '@kbn/core-http-common';
import { INITIAL_REST_VERSION } from '@kbn/data-views-plugin/server/constants';
import { DataViewType } from '@kbn/data-views-plugin/common';
import { FtrProviderContext } from '../../../../ftr_provider_context';

const archivePath = 'test/api_integration/fixtures/es_archiver/index_patterns/basic_index';

export default function ({ getService, getPageObjects }: FtrProviderContext) {
  const PageObjects = getPageObjects(['settings', 'common', 'header', 'svlCommonPage']);
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  const testSubjects = getService('testSubjects');
  const svlCommonApi = getService('svlCommonApi');

  describe('Serverless tests', function () {
    describe('disables scripted fields', function () {
      let dataViewId = '';

      before(async () => {
        await esArchiver.load(archivePath);

        const { body, status } = await supertest
          .post(DATA_VIEW_PATH)
          .set('kbn-xsrf', 'some-xsrf-token')
          .send({
            data_view: {
              title: 'basic_index',
            },
            override: true,
          });

        svlCommonApi.assertResponseStatusCode(200, status, body);
        dataViewId = body.data_view.id;
      });

      after(async () => {
        await esArchiver.unload(archivePath);
        await supertest
          .delete(`${DATA_VIEW_PATH}/${dataViewId}`)
          .set('kbn-xsrf', 'some-xsrf-token');
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

    describe('disables rollups', function () {
      let dataViewId = '';
      before(async () => {
        await esArchiver.load(
          'test/api_integration/fixtures/es_archiver/index_patterns/basic_index'
        );

        const { body, status } = await supertest
          .post(DATA_VIEW_PATH)
          .set('kbn-xsrf', 'some-xsrf-token')
          .send({
            data_view: {
              title: 'basic_index',
              type: DataViewType.ROLLUP,
            },
            override: true,
          });
        svlCommonApi.assertResponseStatusCode(200, status, body);
        dataViewId = body.data_view.id;
      });

      after(async () => {
        await esArchiver.unload(
          'test/api_integration/fixtures/es_archiver/index_patterns/basic_index'
        );
        await supertest
          .delete(`${DATA_VIEW_PATH}/${dataViewId}`)
          .set('kbn-xsrf', 'some-xsrf-token');
      });

      it('hides rollup UI tags', async () => {
        await PageObjects.common.navigateToUrl('management', 'kibana/dataViews', {
          shouldUseHashForSubUrl: false,
        });
        await testSubjects.exists('detail-link-basic_index');
        await testSubjects.missingOrFail('rollup-tag');
        await testSubjects.click('detail-link-basic_index');
        await testSubjects.missingOrFail('rollup-tag');
      });
    });

    describe('when in single space mode', function () {
      let dataViewId = '';
      before(async () => {
        await esArchiver.load(
          'test/api_integration/fixtures/es_archiver/index_patterns/basic_index'
        );

        const response = await supertest
          .post(DATA_VIEW_PATH)
          .set('kbn-xsrf', 'some-xsrf-token')
          .send({
            data_view: {
              title: 'basic_index',
            },
            override: true,
          })
          .set(ELASTIC_HTTP_VERSION_HEADER, INITIAL_REST_VERSION);
        dataViewId = response.body.data_view.id;
      });

      after(async () => {
        await esArchiver.unload(
          'test/api_integration/fixtures/es_archiver/index_patterns/basic_index'
        );
        await supertest
          .delete(`${DATA_VIEW_PATH}/${dataViewId}`)
          .set('kbn-xsrf', 'some-xsrf-token');
      });

      it('hides spaces UI', async () => {
        await PageObjects.common.navigateToUrl('management', 'kibana/dataViews', {
          shouldUseHashForSubUrl: false,
        });
        await testSubjects.exists('detail-link-basic_index');
        await testSubjects.missingOrFail('tableHeaderCell_namespaces_1');
      });
    });
  });
}
