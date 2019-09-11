/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { monitorPageTitleQueryString } from '../../../../../legacy/plugins/uptime/public/queries/monitor_page_title_query';
import { FtrProviderContext } from '../../../ftr_provider_context';
import { expectFixtureEql } from './expect_fixture_eql';

export default function({ getService }: FtrProviderContext) {
  describe('monitor_page_title', () => {
    const supertest = getService('supertest');

    it('will fetch a title for a given monitorId', async () => {
      const getMonitorTitleQuery = {
        operationName: 'MonitorPageTitle',
        query: monitorPageTitleQueryString,
        variables: {
          monitorId: '0002-up',
        },
      };

      const {
        body: { data },
      } = await supertest
        .post('/api/uptime/graphql')
        .set('kbn-xsrf', 'foo')
        .send({ ...getMonitorTitleQuery });

      expectFixtureEql(data, 'monitor_page_title');
    });
  });
}
