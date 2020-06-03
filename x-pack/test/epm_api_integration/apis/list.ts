/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../api_integration/ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  describe('list', () => {
    it('lists all packages from the registry', async () => {
      const supertest = getService('supertest');
      const fetchPackageList = async () => {
        const response = await supertest
          .get('/api/ingest_manager/epm/packages')
          .set('kbn-xsrf', 'xxx')
          .expect(200);
        return response.body;
      };

      const listResponse = await fetchPackageList();
      expect(listResponse.response.length).to.be(4);
      expect(listResponse).to.eql(registryListResponse);
    });
  });
}

// This corresponds to the packages in fixtures/registry/public/package
// and illustrates how tests with registry packages are set up.
// Once we have more test cases this might be too cumbersome and not
// relevant enough to keep up-to-date.
const registryListResponse = {
  response: [
    {
      description: 'MySQL Integration',
      download: '/epr/mysql/mysql-0.1.1.tar.gz',
      icons: [
        {
          src: '/package/mysql/0.1.1/img/logo_mysql.svg',
          title: 'logo mysql',
          size: '32x32',
          type: 'image/svg+xml',
        },
      ],
      name: 'mysql',
      path: '/package/mysql/0.1.1',
      title: 'MySQL',
      type: 'integration',
      version: '0.1.1',
      status: 'not_installed',
    },
    {
      description: 'Nginx Integration',
      download: '/epr/nginx/nginx-0.1.1.tar.gz',
      icons: [
        {
          src: '/package/nginx/0.1.1/img/logo_nginx.svg',
          title: 'logo nginx',
          size: '32x32',
          type: 'image/svg+xml',
        },
      ],
      name: 'nginx',
      path: '/package/nginx/0.1.1',
      title: 'Nginx',
      type: 'integration',
      version: '0.1.1',
      status: 'not_installed',
    },
    {
      description: 'System Integration',
      download: '/epr/system/system-0.1.0.tar.gz',
      icons: [
        {
          src: '/package/system/0.1.0/img/system.svg',
          title: 'system',
          size: '1000x1000',
          type: 'image/svg+xml',
        },
      ],
      name: 'system',
      path: '/package/system/0.1.0',
      title: 'System',
      type: 'integration',
      version: '0.1.0',
      status: 'not_installed',
    },
    {
      description: 'This package contains a yaml pipeline.\n',
      download: '/epr/yamlpipeline/yamlpipeline-1.0.0.tar.gz',
      name: 'yamlpipeline',
      path: '/package/yamlpipeline/1.0.0',
      title: 'Yaml Pipeline package',
      type: 'integration',
      version: '1.0.0',
      status: 'not_installed',
    },
  ],
  success: true,
};
