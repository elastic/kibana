/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import gql from 'graphql-tag';

import { sourceQuery } from '../../../../plugins/infra/public/containers/with_source/query_source.gql_query';
import { SourceQuery } from '../../../../plugins/infra/public/graphql/types';
import { KbnTestProvider } from './types';

const sourcesTests: KbnTestProvider = ({ getService }) => {
  const esArchiver = getService('esArchiver');
  const client = getService('infraOpsGraphQLClient');

  describe('sources', () => {
    before(() => esArchiver.load('infra/metrics_and_logs'));
    after(() => esArchiver.unload('infra/metrics_and_logs'));
    beforeEach(() => esArchiver.load('empty_kibana'));
    afterEach(() => esArchiver.unload('empty_kibana'));

    describe('query from container', () => {
      it('returns the default source configuration when none has been saved', async () => {
        const response = await client.query<SourceQuery.Query>({
          query: sourceQuery,
          variables: {
            sourceId: 'default',
          },
        });

        const sourceConfiguration = response.data.source.configuration;
        const sourceStatus = response.data.source.status;

        // shipped default values
        expect(sourceConfiguration.name).to.be('Default');
        expect(sourceConfiguration.metricAlias).to.be('metricbeat-*');
        expect(sourceConfiguration.logAlias).to.be('filebeat-*,kibana_sample_data_logs*');
        expect(sourceConfiguration.fields.container).to.be('docker.container.id');
        expect(sourceConfiguration.fields.host).to.be('host.name');
        expect(sourceConfiguration.fields.pod).to.be('kubernetes.pod.uid');

        // test data in x-pack/test/functional/es_archives/infra/data.json.gz
        expect(sourceStatus.indexFields.length).to.be(1765);
        expect(sourceStatus.logIndicesExist).to.be(true);
        expect(sourceStatus.metricIndicesExist).to.be(true);
      });
    });

    describe('createSource mutation', () => {
      it('saves and returns source configurations', async () => {
        const response = await client.mutate<any>({
          mutation: createSourceMutation,
          variables: {
            source: {
              name: 'NAME',
              description: 'DESCRIPTION',
              logAlias: 'filebeat-**',
              metricAlias: 'metricbeat-**',
              fields: {
                container: 'CONTAINER',
                host: 'HOST',
                pod: 'POD',
                tiebreaker: 'TIEBREAKER',
                timestamp: 'TIMESTAMP',
              },
            },
            sourceId: 'default',
          },
        });

        const { version, updatedAt, configuration, status } =
          response.data && response.data.createSource.source;

        expect(version).to.be.a('string');
        expect(updatedAt).to.be.greaterThan(0);
        expect(configuration.name).to.be('NAME');
        expect(configuration.description).to.be('DESCRIPTION');
        expect(configuration.metricAlias).to.be('metricbeat-**');
        expect(configuration.logAlias).to.be('filebeat-**');
        expect(configuration.fields.container).to.be('CONTAINER');
        expect(configuration.fields.host).to.be('HOST');
        expect(configuration.fields.pod).to.be('POD');
        expect(configuration.fields.tiebreaker).to.be('TIEBREAKER');
        expect(configuration.fields.timestamp).to.be('TIMESTAMP');
        expect(status.logIndicesExist).to.be(true);
        expect(status.metricIndicesExist).to.be(true);
      });

      it('saves partial source configuration and returns it amended with defaults', async () => {
        const response = await client.mutate<any>({
          mutation: createSourceMutation,
          variables: {
            source: {
              name: 'NAME',
            },
            sourceId: 'default',
          },
        });

        const { version, updatedAt, configuration, status } =
          response.data && response.data.createSource.source;

        expect(version).to.be.a('string');
        expect(updatedAt).to.be.greaterThan(0);
        expect(configuration.name).to.be('NAME');
        expect(configuration.description).to.be('');
        expect(configuration.metricAlias).to.be('metricbeat-*');
        expect(configuration.logAlias).to.be('filebeat-*,kibana_sample_data_logs*');
        expect(configuration.fields.container).to.be('docker.container.id');
        expect(configuration.fields.host).to.be('host.name');
        expect(configuration.fields.pod).to.be('kubernetes.pod.uid');
        expect(configuration.fields.tiebreaker).to.be('_doc');
        expect(configuration.fields.timestamp).to.be('@timestamp');
        expect(status.logIndicesExist).to.be(true);
        expect(status.metricIndicesExist).to.be(true);
      });

      it('refuses to overwrite an existing source', async () => {
        await client.mutate<any>({
          mutation: createSourceMutation,
          variables: {
            source: {
              name: 'NAME',
            },
            sourceId: 'default',
          },
        });

        await client
          .mutate<any>({
            mutation: createSourceMutation,
            variables: {
              source: {
                name: 'NAME',
              },
              sourceId: 'default',
            },
          })
          .then(
            () => {
              expect().fail('should have failed with a conflict');
            },
            err => {
              expect(err.message).to.contain('conflict');
            }
          );
      });
    });

    describe('deleteSource mutation', () => {
      it('deletes an existing source', async () => {
        const creationResponse = await client.mutate<any>({
          mutation: createSourceMutation,
          variables: {
            source: {
              name: 'NAME',
            },
            sourceId: 'default',
          },
        });

        const { version } = creationResponse.data && creationResponse.data.createSource.source;

        expect(version).to.be.a('string');

        const deletionResponse = await client.mutate<any>({
          mutation: deleteSourceMutation,
          variables: {
            sourceId: 'default',
          },
        });

        const { id } = deletionResponse.data && deletionResponse.data.deleteSource;

        expect(id).to.be('default');
      });
    });

    describe('updateSource mutation', () => {
      it('applies multiple updates to an existing source', async () => {
        const creationResponse = await client.mutate<any>({
          mutation: createSourceMutation,
          variables: {
            source: {
              name: 'NAME',
            },
            sourceId: 'default',
          },
        });

        const { version: initialVersion, updatedAt: createdAt } =
          creationResponse.data && creationResponse.data.createSource.source;

        expect(initialVersion).to.be.a('string');
        expect(createdAt).to.be.greaterThan(0);

        const updateResponse = await client.mutate<any>({
          mutation: updateSourceMutation,
          variables: {
            sourceId: 'default',
            changes: [
              {
                setName: {
                  name: 'UPDATED_NAME',
                },
              },
              {
                setDescription: {
                  description: 'UPDATED_DESCRIPTION',
                },
              },
              {
                setAliases: {
                  logAlias: 'filebeat-**',
                  metricAlias: 'metricbeat-**',
                },
              },
              {
                setFields: {
                  container: 'UPDATED_CONTAINER',
                  host: 'UPDATED_HOST',
                  pod: 'UPDATED_POD',
                  tiebreaker: 'UPDATED_TIEBREAKER',
                  timestamp: 'UPDATED_TIMESTAMP',
                },
              },
            ],
          },
        });

        const { version, updatedAt, configuration, status } =
          updateResponse.data && updateResponse.data.updateSource.source;

        expect(version).to.be.a('string');
        expect(version).to.not.be(initialVersion);
        expect(updatedAt).to.be.greaterThan(createdAt);
        expect(configuration.name).to.be('UPDATED_NAME');
        expect(configuration.description).to.be('UPDATED_DESCRIPTION');
        expect(configuration.metricAlias).to.be('metricbeat-**');
        expect(configuration.logAlias).to.be('filebeat-**');
        expect(configuration.fields.container).to.be('UPDATED_CONTAINER');
        expect(configuration.fields.host).to.be('UPDATED_HOST');
        expect(configuration.fields.pod).to.be('UPDATED_POD');
        expect(configuration.fields.tiebreaker).to.be('UPDATED_TIEBREAKER');
        expect(configuration.fields.timestamp).to.be('UPDATED_TIMESTAMP');
        expect(status.logIndicesExist).to.be(true);
        expect(status.metricIndicesExist).to.be(true);
      });

      it('updates a single alias', async () => {
        const creationResponse = await client.mutate<any>({
          mutation: createSourceMutation,
          variables: {
            source: {
              name: 'NAME',
            },
            sourceId: 'default',
          },
        });

        const { version: initialVersion, updatedAt: createdAt } =
          creationResponse.data && creationResponse.data.createSource.source;

        expect(initialVersion).to.be.a('string');
        expect(createdAt).to.be.greaterThan(0);

        const updateResponse = await client.mutate<any>({
          mutation: updateSourceMutation,
          variables: {
            sourceId: 'default',
            changes: [
              {
                setAliases: {
                  metricAlias: 'metricbeat-**',
                },
              },
            ],
          },
        });

        const { version, updatedAt, configuration, status } =
          updateResponse.data && updateResponse.data.updateSource.source;

        expect(version).to.be.a('string');
        expect(version).to.not.be(initialVersion);
        expect(updatedAt).to.be.greaterThan(createdAt);
        expect(configuration.metricAlias).to.be('metricbeat-**');
        expect(configuration.logAlias).to.be('filebeat-*,kibana_sample_data_logs*');
        expect(status.logIndicesExist).to.be(true);
        expect(status.metricIndicesExist).to.be(true);
      });

      it('updates a single field', async () => {
        const creationResponse = await client.mutate<any>({
          mutation: createSourceMutation,
          variables: {
            source: {
              name: 'NAME',
            },
            sourceId: 'default',
          },
        });

        const { version: initialVersion, updatedAt: createdAt } =
          creationResponse.data && creationResponse.data.createSource.source;

        expect(initialVersion).to.be.a('string');
        expect(createdAt).to.be.greaterThan(0);

        const updateResponse = await client.mutate<any>({
          mutation: updateSourceMutation,
          variables: {
            sourceId: 'default',
            changes: [
              {
                setFields: {
                  container: 'UPDATED_CONTAINER',
                },
              },
            ],
          },
        });

        const { version, updatedAt, configuration } =
          updateResponse.data && updateResponse.data.updateSource.source;

        expect(version).to.be.a('string');
        expect(version).to.not.be(initialVersion);
        expect(updatedAt).to.be.greaterThan(createdAt);
        expect(configuration.fields.container).to.be('UPDATED_CONTAINER');
        expect(configuration.fields.host).to.be('host.name');
        expect(configuration.fields.pod).to.be('kubernetes.pod.uid');
        expect(configuration.fields.tiebreaker).to.be('_doc');
        expect(configuration.fields.timestamp).to.be('@timestamp');
      });
    });
  });
};

// tslint:disable-next-line no-default-export
export default sourcesTests;

const createSourceMutation = gql`
  mutation createSource($sourceId: ID!, $source: CreateSourceInput!) {
    createSource(id: $sourceId, source: $source) {
      source {
        id
        version
        updatedAt
        configuration {
          name
          description
          metricAlias
          logAlias
          fields {
            container
            host
            pod
            tiebreaker
            timestamp
          }
        }
        status {
          logIndicesExist
          metricIndicesExist
        }
      }
    }
  }
`;

const deleteSourceMutation = gql`
  mutation deleteSource($sourceId: ID!) {
    deleteSource(id: $sourceId) {
      id
    }
  }
`;

const updateSourceMutation = gql`
  mutation updateSource($sourceId: ID!, $changes: [UpdateSourceInput!]!) {
    updateSource(id: $sourceId, changes: $changes) {
      source {
        id
        version
        updatedAt
        configuration {
          name
          description
          metricAlias
          logAlias
          fields {
            container
            host
            pod
            tiebreaker
            timestamp
          }
        }
        status {
          logIndicesExist
          metricIndicesExist
        }
      }
    }
  }
`;
