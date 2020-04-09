/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { InfraNodeType } from '../../../../plugins/infra/server/graphql/types';
import {
  InfraMetadata,
  InfraMetadataRequest,
} from '../../../../plugins/infra/common/http_api/metadata_api';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');
  const fetchMetadata = async (body: InfraMetadataRequest): Promise<InfraMetadata | undefined> => {
    const response = await supertest
      .post('/api/infra/metadata')
      .set('kbn-xsrf', 'xxx')
      .send(body)
      .expect(200);
    return response.body;
  };

  describe('metadata', () => {
    describe('7.0.0', () => {
      before(() => esArchiver.load('infra/7.0.0/hosts'));
      after(() => esArchiver.unload('infra/7.0.0/hosts'));

      it('hosts', async () => {
        const metadata = await fetchMetadata({
          sourceId: 'default',
          nodeId: 'demo-stack-mysql-01',
          nodeType: InfraNodeType.host,
        });
        if (metadata) {
          expect(metadata.features.length).to.be(12);
          expect(metadata.name).to.equal('demo-stack-mysql-01');
        } else {
          throw new Error('Metadata should never be empty');
        }
      });
    });

    describe('6.6.0', () => {
      before(() => esArchiver.load('infra/6.6.0/docker'));
      after(() => esArchiver.unload('infra/6.6.0/docker'));

      it('docker', async () => {
        const metadata = await fetchMetadata({
          sourceId: 'default',
          nodeId: '631f36a845514442b93c3fdd2dc91bcd8feb680b8ac5832c7fb8fdc167bb938e',
          nodeType: InfraNodeType.container,
        });
        if (metadata) {
          expect(metadata.features.length).to.be(10);
          expect(metadata.name).to.equal('docker-autodiscovery_elasticsearch_1');
        } else {
          throw new Error('Metadata should never be empty');
        }
      });
    });

    describe('8.0.0', () => {
      describe('cloud and host information', () => {
        const archiveName = 'infra/8.0.0/logs_and_metrics_with_aws';
        before(() => esArchiver.load(archiveName));
        after(() => esArchiver.unload(archiveName));

        it('host', async () => {
          const metadata = await fetchMetadata({
            sourceId: 'default',
            nodeId: 'gke-observability-8--observability-8--bc1afd95-f0zc',
            nodeType: InfraNodeType.host,
          });
          if (metadata) {
            expect(metadata.features.length).to.be(58);
            expect(metadata.name).to.equal('gke-observability-8--observability-8--bc1afd95-f0zc');
            expect(metadata.info).to.eql({
              cloud: {
                availability_zone: 'europe-west1-c',
                instance: {
                  name: 'gke-observability-8--observability-8--bc1afd95-f0zc',
                  id: '6200309808276807579',
                },
                provider: 'gcp',
                machine: { type: 'n1-standard-4' },
                project: { id: 'elastic-observability' },
              },
              host: {
                hostname: 'gke-observability-8--observability-8--bc1afd95-f0zc',
                os: {
                  kernel: '4.14.127+',
                  codename: 'Core',
                  name: 'CentOS Linux',
                  family: 'redhat',
                  version: '7 (Core)',
                  platform: 'centos',
                },
                containerized: false,
                name: 'gke-observability-8--observability-8--bc1afd95-f0zc',
                architecture: 'x86_64',
              },
            });
          } else {
            throw new Error('Metadata should never be empty');
          }
        });

        it('host with aws', async () => {
          const metadata = await fetchMetadata({
            sourceId: 'default',
            nodeId: 'ip-172-31-47-9.us-east-2.compute.internal',
            nodeType: InfraNodeType.host,
          });
          if (metadata) {
            expect(metadata.features.length).to.be(19);
            expect(metadata.features.some(f => f.name === 'aws.ec2')).to.be(true);
            expect(metadata.name).to.equal('ip-172-31-47-9.us-east-2.compute.internal');
            expect(metadata.info).to.eql({
              cloud: {
                availability_zone: 'us-east-2c',
                image: { id: 'ami-0d8f6eb4f641ef691' },
                instance: { id: 'i-011454f72559c510b' },
                provider: 'aws',
                machine: { type: 't2.micro' },
                region: 'us-east-2',
                account: { id: '015351775590' },
              },
              host: {
                hostname: 'ip-172-31-47-9.us-east-2.compute.internal',
                os: {
                  kernel: '4.14.123-111.109.amzn2.x86_64',
                  codename: 'Karoo',
                  name: 'Amazon Linux',
                  family: 'redhat',
                  version: '2',
                  platform: 'amzn',
                },
                containerized: false,
                name: 'ip-172-31-47-9.us-east-2.compute.internal',
                id: 'ded64cbff86f478990a3dfbb63a8d238',
                architecture: 'x86_64',
              },
            });
          } else {
            throw new Error('Metadata should never be empty');
          }
        });

        it('pod', async () => {
          const metadata = await fetchMetadata({
            sourceId: 'default',
            nodeId: '14887487-99f8-11e9-9a96-42010a84004d',
            nodeType: InfraNodeType.pod,
          });
          if (metadata) {
            expect(metadata.features.length).to.be(29);
            // With this data set the `kubernetes.pod.name` fields have been removed.
            expect(metadata.name).to.equal('fluentd-gcp-v3.2.0-np7vw');
            expect(metadata.info).to.eql({
              cloud: {
                instance: {
                  id: '6613144177892233360',
                  name: 'gke-observability-8--observability-8--bc1afd95-ngmh',
                },
                provider: 'gcp',
                availability_zone: 'europe-west1-c',
                machine: {
                  type: 'n1-standard-4',
                },
                project: {
                  id: 'elastic-observability',
                },
              },
              host: {
                hostname: 'gke-observability-8--observability-8--bc1afd95-ngmh',
                name: 'gke-observability-8--observability-8--bc1afd95-ngmh',
                os: {
                  codename: 'Core',
                  family: 'redhat',
                  kernel: '4.14.127+',
                  name: 'CentOS Linux',
                  platform: 'centos',
                  version: '7 (Core)',
                },
                architecture: 'x86_64',
                containerized: false,
              },
            });
          } else {
            throw new Error('Metadata should never be empty');
          }
        });

        it('container', async () => {
          const metadata = await fetchMetadata({
            sourceId: 'default',
            nodeId: 'c74b04834c6d7cc1800c3afbe31d0c8c0c267f06e9eb45c2b0c2df3e6cee40c5',
            nodeType: InfraNodeType.container,
          });
          if (metadata) {
            expect(metadata.features.length).to.be(26);
            expect(metadata.name).to.equal(
              'k8s_prometheus-to-sd-exporter_fluentd-gcp-v3.2.0-w68r5_kube-system_26950cde-9aed-11e9-9a96-42010a84004d_0'
            );
            expect(metadata.info).to.eql({
              cloud: {
                instance: {
                  id: '4039094952262994102',
                  name: 'gke-observability-8--observability-8--bc1afd95-nhhw',
                },
                provider: 'gcp',
                availability_zone: 'europe-west1-c',
                machine: {
                  type: 'n1-standard-4',
                },
                project: {
                  id: 'elastic-observability',
                },
              },
              host: {
                hostname: 'gke-observability-8--observability-8--bc1afd95-nhhw',
                name: 'gke-observability-8--observability-8--bc1afd95-nhhw',
                os: {
                  codename: 'Core',
                  family: 'redhat',
                  kernel: '4.14.127+',
                  name: 'CentOS Linux',
                  platform: 'centos',
                  version: '7 (Core)',
                },
                architecture: 'x86_64',
                containerized: false,
              },
            });
          } else {
            throw new Error('Metadata should never be empty');
          }
        });
      });
      describe('APM metrics', () => {
        const archiveName = 'infra/8.0.0/metrics_and_apm';
        before(() => esArchiver.load(archiveName));
        after(() => esArchiver.unload(archiveName));

        it('host without APM data', async () => {
          const metadata = await fetchMetadata({
            sourceId: 'default',
            nodeId: 'gke-observability-8--observability-8--bc1afd95-f0zc',
            nodeType: 'host',
          });
          if (metadata) {
            expect(
              metadata.features.some(f => f.name === 'apm.transaction' && f.source === 'apm')
            ).to.be(false);
          } else {
            throw new Error('Metadata should never be empty');
          }
        });
        it('pod with APM data', async () => {
          const metadata = await fetchMetadata({
            sourceId: 'default',
            nodeId: 'c1031331-9ae0-11e9-9a96-42010a84004d',
            nodeType: 'pod',
          });
          if (metadata) {
            expect(
              metadata.features.some(f => f.name === 'apm.transaction' && f.source === 'apm')
            ).to.be(true);
          } else {
            throw new Error('Metadata should never be empty');
          }
        });
      });
    });
  });
}
