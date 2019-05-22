/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { flyoutItemQuery } from '../../../../plugins/infra/public/containers/logs/flyout_item.gql_query';
import { FlyoutItemQuery } from '../../../../plugins/infra/public/graphql/types';
import { KbnTestProvider } from './types';

const logItemTests: KbnTestProvider = ({ getService }) => {
  const esArchiver = getService('esArchiver');
  const client = getService('infraOpsGraphQLClient');
  describe('Log Item GraphQL Endpoint', () => {
    before(() => esArchiver.load('infra/metrics_and_logs'));
    after(() => esArchiver.unload('infra/metrics_and_logs'));

    it('should basically work', () => {
      return client
        .query<FlyoutItemQuery.Query>({
          query: flyoutItemQuery,
          variables: {
            sourceId: 'default',
            itemId: 'yT2Mg2YBh-opCxJv8Vqj',
          },
        })
        .then(resp => {
          expect(resp.data.source).to.have.property('logItem');
          const { logItem } = resp.data.source;
          if (!logItem) {
            throw new Error('Log item should not be falsey');
          }
          expect(logItem).to.have.property('id', 'yT2Mg2YBh-opCxJv8Vqj');
          expect(logItem).to.have.property('index', 'filebeat-7.0.0-alpha1-2018.10.17');
          expect(logItem).to.have.property('fields');
          expect(logItem.fields).to.eql([
            {
              field: '@timestamp',
              value: '2018-10-17T19:42:22.000Z',
              __typename: 'InfraLogItemField',
            },
            {
              field: '_id',
              value: 'yT2Mg2YBh-opCxJv8Vqj',
              __typename: 'InfraLogItemField',
            },
            {
              field: '_index',
              value: 'filebeat-7.0.0-alpha1-2018.10.17',
              __typename: 'InfraLogItemField',
            },
            {
              field: 'apache2.access.body_sent.bytes',
              value: '1336',
              __typename: 'InfraLogItemField',
            },
            {
              field: 'apache2.access.http_version',
              value: '1.1',
              __typename: 'InfraLogItemField',
            },
            {
              field: 'apache2.access.method',
              value: 'GET',
              __typename: 'InfraLogItemField',
            },
            {
              field: 'apache2.access.referrer',
              value: '-',
              __typename: 'InfraLogItemField',
            },
            {
              field: 'apache2.access.remote_ip',
              value: '10.128.0.11',
              __typename: 'InfraLogItemField',
            },
            {
              field: 'apache2.access.response_code',
              value: '200',
              __typename: 'InfraLogItemField',
            },
            {
              field: 'apache2.access.url',
              value: '/a-fresh-start-will-put-you-on-your-way',
              __typename: 'InfraLogItemField',
            },
            {
              field: 'apache2.access.user_agent.device',
              value: 'Other',
              __typename: 'InfraLogItemField',
            },
            {
              field: 'apache2.access.user_agent.name',
              value: 'Other',
              __typename: 'InfraLogItemField',
            },
            {
              field: 'apache2.access.user_agent.os',
              value: 'Other',
              __typename: 'InfraLogItemField',
            },
            {
              field: 'apache2.access.user_agent.os_name',
              value: 'Other',
              __typename: 'InfraLogItemField',
            },
            {
              field: 'apache2.access.user_name',
              value: '-',
              __typename: 'InfraLogItemField',
            },
            {
              field: 'beat.hostname',
              value: 'demo-stack-apache-01',
              __typename: 'InfraLogItemField',
            },
            {
              field: 'beat.name',
              value: 'demo-stack-apache-01',
              __typename: 'InfraLogItemField',
            },
            {
              field: 'beat.version',
              value: '7.0.0-alpha1',
              __typename: 'InfraLogItemField',
            },
            {
              field: 'fileset.module',
              value: 'apache2',
              __typename: 'InfraLogItemField',
            },
            {
              field: 'fileset.name',
              value: 'access',
              __typename: 'InfraLogItemField',
            },
            {
              field: 'host.name',
              value: 'demo-stack-apache-01',
              __typename: 'InfraLogItemField',
            },
            {
              field: 'input.type',
              value: 'log',
              __typename: 'InfraLogItemField',
            },
            {
              field: 'offset',
              value: '5497614',
              __typename: 'InfraLogItemField',
            },
            {
              field: 'prospector.type',
              value: 'log',
              __typename: 'InfraLogItemField',
            },
            {
              field: 'read_timestamp',
              value: '2018-10-17T19:42:23.160Z',
              __typename: 'InfraLogItemField',
            },
            {
              field: 'source',
              value: '/var/log/apache2/access.log',
              __typename: 'InfraLogItemField',
            },
          ]);
        });
    });
  });
};

// eslint-disable-next-line import/no-default-export
export default logItemTests;
