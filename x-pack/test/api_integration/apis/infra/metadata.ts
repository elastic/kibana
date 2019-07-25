/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { metadataQuery } from '../../../../legacy/plugins/infra/public/containers/metadata/metadata.gql_query';
import { MetadataQuery } from '../../../../legacy/plugins/infra/public/graphql/types';
import { KbnTestProvider } from './types';

const metadataTests: KbnTestProvider = ({ getService }) => {
  const esArchiver = getService('esArchiver');
  const client = getService('infraOpsGraphQLClient');

  describe('metadata', () => {
    describe('7.0.0', () => {
      before(() => esArchiver.load('infra/7.0.0/hosts'));
      after(() => esArchiver.unload('infra/7.0.0/hosts'));

      it('hosts', () => {
        return client
          .query<MetadataQuery.Query>({
            query: metadataQuery,
            variables: {
              sourceId: 'default',
              nodeId: 'demo-stack-mysql-01',
              nodeType: 'host',
            },
          })
          .then(resp => {
            const metadata = resp.data.source.metadataByNode;
            if (metadata) {
              expect(metadata.features.length).to.be(12);
              expect(metadata.name).to.equal('demo-stack-mysql-01');
            } else {
              throw new Error('Metadata should never be empty');
            }
          });
      });
    });

    describe('6.6.0', () => {
      before(() => esArchiver.load('infra/6.6.0/docker'));
      after(() => esArchiver.unload('infra/6.6.0/docker'));

      it('docker', () => {
        return client
          .query<MetadataQuery.Query>({
            query: metadataQuery,
            variables: {
              sourceId: 'default',
              nodeId: '631f36a845514442b93c3fdd2dc91bcd8feb680b8ac5832c7fb8fdc167bb938e',
              nodeType: 'container',
            },
          })
          .then(resp => {
            const metadata = resp.data.source.metadataByNode;
            if (metadata) {
              expect(metadata.features.length).to.be(10);
              expect(metadata.name).to.equal('docker-autodiscovery_elasticsearch_1');
            } else {
              throw new Error('Metadata should never be empty');
            }
          });
      });
    });

    describe('8.0.0', () => {
      const archiveName = 'infra/8.0.0/logs_and_metrics';
      before(() => esArchiver.load(archiveName));
      after(() => esArchiver.unload(archiveName));

      it('host', () => {
        return client
          .query<MetadataQuery.Query>({
            query: metadataQuery,
            variables: {
              sourceId: 'default',
              nodeId: 'gke-observability-8--observability-8--bc1afd95-f0zc',
              nodeType: 'host',
            },
          })
          .then(resp => {
            const metadata = resp.data.source.metadataByNode;
            if (metadata) {
              expect(metadata.features.length).to.be(60);
              expect(metadata.name).to.equal('gke-observability-8--observability-8--bc1afd95-f0zc');
              expect(metadata.info).to.eql({
                cloud: {
                  instance: {
                    id: '6200309808276807579',
                    name: 'gke-observability-8--observability-8--bc1afd95-f0zc',
                    __typename: 'InfraNodeCloudInstance',
                  },
                  provider: 'gcp',
                  availability_zone: 'europe-west1-c',
                  machine: {
                    __typename: 'InfraNodeCloudMachine',
                    type: 'n1-standard-4',
                  },
                  project: {
                    id: 'elastic-observability',
                    __typename: 'InfraNodeCloudProject',
                  },
                  __typename: 'InfraNodeCloud',
                },
                host: {
                  name: 'gke-observability-8--observability-8--bc1afd95-f0zc',
                  os: {
                    codename: 'Core',
                    family: 'redhat',
                    kernel: '4.14.127+',
                    name: 'CentOS Linux',
                    platform: 'centos',
                    version: '7 (Core)',
                    __typename: 'InfraNodeHostOS',
                  },
                  architecture: 'x86_64',
                  containerized: false,
                  __typename: 'InfraNodeHost',
                },
                __typename: 'InfraNodeInfo',
              });
            } else {
              throw new Error('Metadata should never be empty');
            }
          });
      });

      it('pod', () => {
        return client
          .query<MetadataQuery.Query>({
            query: metadataQuery,
            variables: {
              sourceId: 'default',
              nodeId: '14887487-99f8-11e9-9a96-42010a84004d',
              nodeType: 'pod',
            },
          })
          .then(resp => {
            const metadata = resp.data.source.metadataByNode;
            if (metadata) {
              expect(metadata.features.length).to.be(27);
              // With this data set the `kubernetes.pod.name` fields have been removed.
              expect(metadata.name).to.equal('14887487-99f8-11e9-9a96-42010a84004d');
              expect(metadata.info).to.eql({
                cloud: {
                  instance: {
                    id: '6613144177892233360',
                    name: 'gke-observability-8--observability-8--bc1afd95-ngmh',
                    __typename: 'InfraNodeCloudInstance',
                  },
                  provider: 'gcp',
                  availability_zone: 'europe-west1-c',
                  machine: {
                    __typename: 'InfraNodeCloudMachine',
                    type: 'n1-standard-4',
                  },
                  project: {
                    id: 'elastic-observability',
                    __typename: 'InfraNodeCloudProject',
                  },
                  __typename: 'InfraNodeCloud',
                },
                host: {
                  name: 'gke-observability-8--observability-8--bc1afd95-ngmh',
                  os: {
                    codename: 'Core',
                    family: 'redhat',
                    kernel: '4.14.127+',
                    name: 'CentOS Linux',
                    platform: 'centos',
                    version: '7 (Core)',
                    __typename: 'InfraNodeHostOS',
                  },
                  architecture: 'x86_64',
                  containerized: false,
                  __typename: 'InfraNodeHost',
                },
                __typename: 'InfraNodeInfo',
              });
            } else {
              throw new Error('Metadata should never be empty');
            }
          });
      });

      it('container', () => {
        return client
          .query<MetadataQuery.Query>({
            query: metadataQuery,
            variables: {
              sourceId: 'default',
              nodeId: 'c74b04834c6d7cc1800c3afbe31d0c8c0c267f06e9eb45c2b0c2df3e6cee40c5',
              nodeType: 'container',
            },
          })
          .then(resp => {
            const metadata = resp.data.source.metadataByNode;
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
                    __typename: 'InfraNodeCloudInstance',
                  },
                  provider: 'gcp',
                  availability_zone: 'europe-west1-c',
                  machine: {
                    __typename: 'InfraNodeCloudMachine',
                    type: 'n1-standard-4',
                  },
                  project: {
                    id: 'elastic-observability',
                    __typename: 'InfraNodeCloudProject',
                  },
                  __typename: 'InfraNodeCloud',
                },
                host: {
                  name: 'gke-observability-8--observability-8--bc1afd95-nhhw',
                  os: {
                    codename: 'Core',
                    family: 'redhat',
                    kernel: '4.14.127+',
                    name: 'CentOS Linux',
                    platform: 'centos',
                    version: '7 (Core)',
                    __typename: 'InfraNodeHostOS',
                  },
                  architecture: 'x86_64',
                  containerized: false,
                  __typename: 'InfraNodeHost',
                },
                __typename: 'InfraNodeInfo',
              });
            } else {
              throw new Error('Metadata should never be empty');
            }
          });
      });
    });
  });
};

// eslint-disable-next-line import/no-default-export
export default metadataTests;
