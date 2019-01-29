/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from 'expect.js';
import { uncommonProcessesQuery } from '../../../../plugins/secops/public/containers/uncommon_processes/index.gql_query';
import { GetUncommonProcessesQuery } from '../../../../plugins/secops/public/graphql/types';

import { KbnTestProvider } from './types';

const uncommonProcessesTests: KbnTestProvider = ({ getService }) => {
  const esArchiver = getService('esArchiver');
  const client = getService('secOpsGraphQLClient');

  describe('uncommon_processes', () => {
    before(() => esArchiver.load('auditbeat/hosts'));
    after(() => esArchiver.unload('auditbeat/hosts'));

    it('should return an edge of length 1 when given a pagination of length 1', async () => {
      const {
        data: {
          source: { UncommonProcesses },
        },
      } = await client.query<GetUncommonProcessesQuery.Query>({
        query: uncommonProcessesQuery,
        variables: {
          sourceId: 'default',
          timerange: {
            interval: '12h',
            to: 1546554465535,
            from: 1483306065535,
          },
          pagination: {
            limit: 1,
          },
        },
      });
      expect(UncommonProcesses.edges.length).to.be(1);
    });

    it('should return an edge of length 2 when given a pagination of length 2', async () => {
      const {
        data: {
          source: { UncommonProcesses },
        },
      } = await client.query<GetUncommonProcessesQuery.Query>({
        query: uncommonProcessesQuery,
        variables: {
          sourceId: 'default',
          timerange: {
            interval: '12h',
            to: 1546554465535,
            from: 1483306065535,
          },
          pagination: {
            limit: 2,
          },
        },
      });
      expect(UncommonProcesses.edges.length).to.be(2);
    });

    it('should return a total count of 6 elements', async () => {
      const {
        data: {
          source: { UncommonProcesses },
        },
      } = await client.query<GetUncommonProcessesQuery.Query>({
        query: uncommonProcessesQuery,
        variables: {
          sourceId: 'default',
          timerange: {
            interval: '12h',
            to: 1546554465535,
            from: 1483306065535,
          },
          pagination: {
            limit: 1,
          },
        },
      });
      expect(UncommonProcesses.totalCount).to.be(6);
    });

    it('should return a single data set with pagination of 1', async () => {
      const {
        data: {
          source: { UncommonProcesses },
        },
      } = await client.query<GetUncommonProcessesQuery.Query>({
        query: uncommonProcessesQuery,
        variables: {
          sourceId: 'default',
          timerange: {
            interval: '12h',
            to: 1546554465535,
            from: 1483306065535,
          },
          pagination: {
            limit: 1,
          },
        },
      });

      expect(UncommonProcesses.edges[0].node).to.eql({
        _id: 'QD1yEWgBiyhPd5Zoyisj',
        instances: 2,
        host: [
          {
            id: 'aa7ca589f1b8220002f2fc61c64cfbf1',
            name: 'siem-kibana',
            __typename: 'HostEcsFields',
          },
        ],
        __typename: 'UncommonProcessItem',
        process: {
          __typename: 'ProcessEcsFields',
          name: 'sshd',
          title: null,
        },
        user: null,
      });
    });
  });
};

// tslint:disable-next-line no-default-export
export default uncommonProcessesTests;
