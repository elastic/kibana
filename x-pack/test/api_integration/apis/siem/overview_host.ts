/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { overviewHostQuery } from '../../../../legacy/plugins/siem/public/containers/overview/overview_host/index.gql_query';
import { GetOverviewHostQuery } from '../../../../legacy/plugins/siem/public/graphql/types';
import { FtrProviderContext } from '../../ftr_provider_context';
import { defaultIndexPattern } from '../../../../legacy/plugins/siem/default_index_pattern';

export default function({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const client = getService('siemGraphQLClient');
  describe('Overview Host', () => {
    describe('With auditbeat', () => {
      before(() => esArchiver.load('auditbeat/overview'));
      after(() => esArchiver.unload('auditbeat/overview'));

      const FROM = new Date('2000-01-01T00:00:00.000Z').valueOf();
      const TO = new Date('3000-01-01T00:00:00.000Z').valueOf();
      const expectedResult = {
        auditbeatAuditd: 2194,
        auditbeatFIM: 4,
        auditbeatLogin: 2810,
        auditbeatPackage: 3,
        auditbeatProcess: 7,
        auditbeatUser: 6,
        endgameDns: 1,
        endgameFile: 2,
        endgameImageLoad: 1,
        endgameNetwork: 4,
        endgameProcess: 2,
        endgameRegistry: 1,
        endgameSecurity: 4,
        filebeatSystemModule: 0,
        winlogbeatSecurity: 0,
        winlogbeatMWSysmonOperational: 0,
        __typename: 'OverviewHostData',
      };

      it('Make sure that we get OverviewHost data', () => {
        return client
          .query<GetOverviewHostQuery.Query>({
            query: overviewHostQuery,
            variables: {
              sourceId: 'default',
              timerange: {
                interval: '12h',
                to: TO,
                from: FROM,
              },
              defaultIndex: defaultIndexPattern,
              inspect: false,
            },
          })
          .then(resp => {
            const overviewHost = resp.data.source.OverviewHost;
            expect(overviewHost).to.eql(expectedResult);
          });
      });
    });
  });
}
