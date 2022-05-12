/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import {
  LOG_ANALYSIS_VALIDATE_DATASETS_PATH,
  validateLogEntryDatasetsRequestPayloadRT,
  validateLogEntryDatasetsResponsePayloadRT,
} from '@kbn/infra-plugin/common/http_api/log_analysis/validation/datasets';
import { decodeOrThrow } from '@kbn/infra-plugin/common/runtime_types';
import { FtrProviderContext } from '../../ftr_provider_context';

export default function ({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');

  describe('API /infra/log_analysis/validation/log_entry_datasets', () => {
    before(() =>
      esArchiver.load('x-pack/test/functional/es_archives/infra/8.0.0/logs_and_metrics')
    );
    after(() =>
      esArchiver.unload('x-pack/test/functional/es_archives/infra/8.0.0/logs_and_metrics')
    );

    it('works', async () => {
      const response = await supertest
        .post(LOG_ANALYSIS_VALIDATE_DATASETS_PATH)
        .set({
          'kbn-xsrf': 'some-xsrf-token',
        })
        .send(
          validateLogEntryDatasetsRequestPayloadRT.encode({
            data: {
              endTime: Date.now().valueOf(),
              indices: ['filebeat-*'],
              startTime: 1562766600672,
              timestampField: '@timestamp',
              runtimeMappings: {},
            },
          })
        )
        .expect(200);

      const {
        data: { datasets },
      } = decodeOrThrow(validateLogEntryDatasetsResponsePayloadRT)(response.body);

      expect(datasets.length).to.be(1);
      expect(datasets[0].indexName).to.be('filebeat-*');
      expect(datasets[0].datasets).to.eql([
        'elasticsearch.gc',
        'elasticsearch.server',
        'kibana.log',
        'nginx.access',
      ]);
    });
  });
}
