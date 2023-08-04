/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

interface IntegrationPackage {
  name: string;
  version: string;
}

const packages: IntegrationPackage[] = [
  {
    name: 'apache',
    version: '1.14.0',
  },
  {
    name: 'aws',
    version: '1.51.0',
  },
  {
    name: 'system',
    version: '1.38.1',
  },
  {
    name: '1password',
    version: '1.18.0',
  },
  {
    name: 'activemq',
    version: '0.13.0',
  },
  {
    name: 'airflow',
    version: '0.2.0',
  },
  {
    name: 'akamai',
    version: '2.14.0',
  },
  {
    name: 'apache_spark',
    version: '0.6.0',
  },
  {
    name: 'apache_tomcat',
    version: '0.12.1',
  },
  {
    name: 'apm',
    version: '8.10.0-preview-1689351101',
  },
  {
    name: 'arista_ngfw',
    version: '0.2.0',
  },
  {
    name: 'atlassian_bitbucket',
    version: '1.14.0',
  },
  {
    name: 'atlassian_confluence',
    version: '1.15.0',
  },
  {
    name: 'atlassian_jira',
    version: '1.15.0',
  },
  {
    name: 'auditd',
    version: '3.12.0',
  },
  {
    name: 'auditd_manager',
    version: '1.12.0',
  },
  {
    name: 'auth0',
    version: '1.10.0',
  },
  {
    name: 'aws_logs',
    version: '0.5.0',
  },
  {
    name: 'awsfargate',
    version: '0.3.0',
  },
  {
    name: 'azure',
    version: '1.5.28',
  },
  {
    name: 'azure_app_service',
    version: '0.0.1',
  },
  {
    name: 'azure_application_insights',
    version: '1.0.6',
  },
  {
    name: 'azure_billing',
    version: '1.1.3',
  },
  {
    name: 'azure_blob_storage',
    version: '0.5.0',
  },
  {
    name: 'azure_frontdoor',
    version: '1.1.0',
  },
  {
    name: 'azure_functions',
    version: '0.0.1',
  },
  {
    name: 'azure_metrics',
    version: '1.0.17',
  },
  {
    name: 'barracuda',
    version: '1.5.0',
  },
  {
    name: 'barracuda_cloudgen_firewall',
    version: '1.5.0',
  },
  {
    name: 'beat',
    version: '0.1.3',
  },
  {
    name: 'bitdefender',
    version: '1.2.0',
  },
  {
    name: 'bitwarden',
    version: '1.2.0',
  },
  {
    name: 'bluecoat',
    version: '0.17.0',
  },
  {
    name: 'box_events',
    version: '1.7.0',
  },
  {
    name: 'carbon_black_cloud',
    version: '1.13.0',
  },
];

const initialPackages = packages.slice(0, 3);
const additionalPackages = packages.slice(3);

export default function (providerContext: FtrProviderContext) {
  const { getService, getPageObjects } = providerContext;
  const esArchiver = getService('esArchiver');
  const kibanaServer = getService('kibanaServer');
  const logger = getService('log');

  const supertest = getService('supertest');

  const uninstallPackage = ({ name, version }: IntegrationPackage) => {
    return supertest.delete(`/api/fleet/epm/packages/${name}/${version}`).set('kbn-xsrf', 'xxxx');
  };

  const installPackage = ({ name, version }: IntegrationPackage) => {
    return supertest
      .post(`/api/fleet/epm/packages/${name}/${version}`)
      .set('kbn-xsrf', 'xxxx')
      .send({ force: true });
  };

  describe('Dataset Selector', () => {
    before('initialize tests', async () => {
      await kibanaServer.importExport.load('test/functional/fixtures/kbn_archiver/discover');
      await esArchiver.load(
        'x-pack/test/functional/es_archives/discover_log_explorer/data_streams'
      );
      logger.info(`Installing ${initialPackages.length} integration packages.`);
      await Promise.all(initialPackages.map(installPackage));
    });

    after('clean up archives', async () => {
      await kibanaServer.importExport.unload('test/functional/fixtures/kbn_archiver/discover');
      await esArchiver.unload(
        'x-pack/test/functional/es_archives/discover_log_explorer/data_streams'
      );

      logger.info(`Uninstalling ${initialPackages.length} integration packages.`);
      await Promise.all(initialPackages.map(uninstallPackage));
    });
  });
}
