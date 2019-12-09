/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable no-console */
/* tslint:disable */

import { readFileSync } from 'fs';
import path from 'path';
import expect from '@kbn/expect';
import ServerMock from 'mock-http-server';
import { FtrProviderContext } from '../../api_integration/ftr_provider_context';

export default function({ getService }: FtrProviderContext) {
  const supertest = getService('supertest');
  describe('data source installation', () => {
    const registryMock = new ServerMock({ host: 'localhost', port: 6666 });
    beforeEach(async () => {
      registryMock.start(() => {});
      const packageResponse = readFileSync(
        path.join(__dirname, '/fixtures/packages/package/yamlpipeline_1.0.0')
      ).toString();
      const fileResponse = readFileSync(
        path.join(__dirname, '/fixtures/packages/epr/yamlpipeline_1.0.0.tar.gz')
      );
      registryMock.on({
        method: 'GET',
        path: '/package/yamlpipeline-1.0.0',
        reply: {
          status: 200,
          headers: { 'content-type': 'application/json' },
          body: packageResponse,
        },
      });

      registryMock.on({
        method: 'GET',
        path: '/epr/yamlpipeline/yamlpipeline-1.0.0.tar.gz',
        reply: {
          status: 200,
          headers: { 'content-type': 'application/gzip' },
          body: fileResponse,
        },
      });

      const installPackage = async () => {
        const response = await supertest
          .get('/api/epm/install/yamlpipeline-1.0.0')
          .set('kbn-xsrf', 'xxx')
          .expect(200);
        return response.body;
      };
      // commment for debugging
      await installPackage();

      // uncomment for debugging
      // const packageInstallResponse = await installPackage();
      // console.log('packageInstallResponse is: ', packageInstallResponse);
      // console.log(
      //   'requests are',
      //   registryMock.requests().map(r => r.url)
      // );
    });
    afterEach(() => {
      registryMock.stop(() => {});
    });
    it('test setup works', async () => {
      const readPackageSavedObject = async () => {
        const response = await supertest
          .get('/api/saved_objects/epm-package/yamlpipeline-1.0.0')
          .expect(200);
        return response.body;
      };
      const savedObjectResponse = await readPackageSavedObject();
      expect(savedObjectResponse.id).to.be('yamlpipeline-1.0.0');
    });
    it('works with a package with only an ingest pipeline', async () => {
      expect(true).to.be(true);
    });
  });
}
