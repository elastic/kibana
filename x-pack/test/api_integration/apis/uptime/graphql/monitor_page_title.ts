/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { monitorPageTitleQueryString } from '../../../../../legacy/plugins/uptime/public/queries/monitor_page_title_query';
import monitorPageTitle from './fixtures/monitor_page_title.json';
import { FtrProviderContext } from '../../../ftr_provider_context';

export default function({ getService }: FtrProviderContext) {
  describe('monitorPageTitle', () => {
    const supertest = getService('supertest');

    it('will fetch a title for a given monitorId', async () => {
      const getMonitorTitleQuery = {
        operationName: 'MonitorPageTitle',
        query: monitorPageTitleQueryString,
        variables: {
          monitorId: 'auto-http-0X131221E73F825974',
        },
      };

      const {
        body: { data },
      } = await supertest
        .post('/api/uptime/graphql')
        .set('kbn-xsrf', 'foo')
        .send({ ...getMonitorTitleQuery });

      expect(data).to.eql(monitorPageTitle);
    });
  });
}
