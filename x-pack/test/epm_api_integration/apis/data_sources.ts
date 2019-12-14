/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

/* eslint-disable no-console */
/* tslint:disable */

import expect from '@kbn/expect';
import { readFileSync } from 'fs';
import ServerMock from 'mock-http-server';
import path from 'path';
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
    // disable while ingest API has bug finding datasource created with a specified id
    // it('works with a package containing only yml format ingest pipelines', async () => {
    //   const createDataSource = async () => {
    //     const response = await supertest
    //       .post('/api/epm/datasource/install/yamlpipeline-1.0.0')
    //       .send({
    //         datasourceName: 'my pipeline',
    //         pkgkey: 'yamlpipeline-1.0.0',
    //         datasetsToInstall: [
    //           {
    //             ingest_pipeline: '',
    //             name: 'log',
    //             release: '',
    //             title: 'Log Yaml pipeline',
    //             type: 'logs',
    //           },
    //         ],
    //       })
    //       .set('kbn-xsrf', 'xxx')
    //       .expect(200);
    //     return response.body;
    //   };

    //   const readDataSourceSavedObject = async () => {
    //     const response = await supertest
    //       // I tried changing this to
    //       // /api/saved_objects/datasources/yamlpipeline-1.0.0
    //       // b/c `datasources` is the name ingest uses but it 404'd
    //       // /api/saved_objects/_find?type=datasources
    //       // and
    //       // /api/ingest/datasources
    //       // both show the saved object
    //       // I tried adding
    //       // datasources: { isNamespaceAgnostic: true, }
    //       // to https://github.com/elastic/kibana/blob/ef9bc478cba32eb8722c17d7911cb201941f2adc/x-pack/legacy/plugins/ingest/index.ts#L37
    //       // thinking that's what registered it as a type but it didn't work
    //       // I didn't do a full restart though, so maybe it does still work
    //       .get('/api/saved_objects/epm-datasource/yamlpipeline-1.0.0')
    //       .expect(200);
    //     return response.body;
    //   };

    //   // comment for debugging
    //   await createDataSource();

    //   // uncomment for debugging
    //   // const createDataSourceResponse = await createDataSource();
    //   // console.log('createDataSourceResponse is ', createDataSourceResponse);

    //   const readDataSourceSavedObjectResponse = await readDataSourceSavedObject();
    //   expect(readDataSourceSavedObjectResponse.id).to.be('yamlpipeline-1.0.0');
    // });
  });
}
