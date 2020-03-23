/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';

import {
  LOG_ENTRIES_ITEM_PATH,
  logEntriesItemRequestRT,
} from '../../../../plugins/infra/common/http_api';

const COMMON_HEADERS = {
  'kbn-xsrf': 'some-xsrf-token',
};

export default function({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');

  describe('Log Item Endpoint', () => {
    before(() => esArchiver.load('infra/metrics_and_logs'));
    after(() => esArchiver.unload('infra/metrics_and_logs'));

    it('should basically work', async () => {
      const { body } = await supertest
        .post(LOG_ENTRIES_ITEM_PATH)
        .set(COMMON_HEADERS)
        .send(
          logEntriesItemRequestRT.encode({
            sourceId: 'default',
            id: 'yT2Mg2YBh-opCxJv8Vqj',
          })
        )
        .expect(200);

      const logItem = body.data;

      expect(logItem).to.have.property('id', 'yT2Mg2YBh-opCxJv8Vqj');
      expect(logItem).to.have.property('index', 'filebeat-7.0.0-alpha1-2018.10.17');
      expect(logItem).to.have.property('fields');
      expect(logItem.fields).to.eql([
        {
          field: '@timestamp',
          value: '2018-10-17T19:42:22.000Z',
        },
        {
          field: '_id',
          value: 'yT2Mg2YBh-opCxJv8Vqj',
        },
        {
          field: '_index',
          value: 'filebeat-7.0.0-alpha1-2018.10.17',
        },
        {
          field: 'apache2.access.body_sent.bytes',
          value: '1336',
        },
        {
          field: 'apache2.access.http_version',
          value: '1.1',
        },
        {
          field: 'apache2.access.method',
          value: 'GET',
        },
        {
          field: 'apache2.access.referrer',
          value: '-',
        },
        {
          field: 'apache2.access.remote_ip',
          value: '10.128.0.11',
        },
        {
          field: 'apache2.access.response_code',
          value: '200',
        },
        {
          field: 'apache2.access.url',
          value: '/a-fresh-start-will-put-you-on-your-way',
        },
        {
          field: 'apache2.access.user_agent.device',
          value: 'Other',
        },
        {
          field: 'apache2.access.user_agent.name',
          value: 'Other',
        },
        {
          field: 'apache2.access.user_agent.os',
          value: 'Other',
        },
        {
          field: 'apache2.access.user_agent.os_name',
          value: 'Other',
        },
        {
          field: 'apache2.access.user_name',
          value: '-',
        },
        {
          field: 'beat.hostname',
          value: 'demo-stack-apache-01',
        },
        {
          field: 'beat.name',
          value: 'demo-stack-apache-01',
        },
        {
          field: 'beat.version',
          value: '7.0.0-alpha1',
        },
        {
          field: 'fileset.module',
          value: 'apache2',
        },
        {
          field: 'fileset.name',
          value: 'access',
        },
        {
          field: 'host.name',
          value: 'demo-stack-apache-01',
        },
        {
          field: 'input.type',
          value: 'log',
        },
        {
          field: 'offset',
          value: '5497614',
        },
        {
          field: 'prospector.type',
          value: 'log',
        },
        {
          field: 'read_timestamp',
          value: '2018-10-17T19:42:23.160Z',
        },
        {
          field: 'source',
          value: '/var/log/apache2/access.log',
        },
      ]);
    });
  });
}
