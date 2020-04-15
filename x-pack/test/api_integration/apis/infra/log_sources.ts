/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';
import { FtrProviderContext } from '../../ftr_provider_context';
import {
  getLogSourceConfigurationSuccessResponsePayloadRT,
  getLogSourceConfigurationPath,
} from '../../../../plugins/infra/common/http_api/log_sources';
import { decodeOrThrow } from '../../../../plugins/infra/common/runtime_types';

export default function({ getService }: FtrProviderContext) {
  const esArchiver = getService('esArchiver');
  const supertest = getService('supertest');

  const getLogSourceConfiguration = (sourceId: string) => {
    return supertest
      .get(getLogSourceConfigurationPath(sourceId))
      .set({
        'kbn-xsrf': 'some-xsrf-token',
      })
      .send();
  };

  describe('log sources api', () => {
    before(() => esArchiver.load('infra/metrics_and_logs'));
    after(() => esArchiver.unload('infra/metrics_and_logs'));
    beforeEach(() => esArchiver.load('empty_kibana'));
    afterEach(() => esArchiver.unload('empty_kibana'));

    describe('get source configuration', () => {
      it('returns the default source configuration when none has been saved', async () => {
        const response = await getLogSourceConfiguration('default').send();

        const {
          data: { configuration, origin },
        } = decodeOrThrow(getLogSourceConfigurationSuccessResponsePayloadRT)(response.body);

        expect(origin).to.be('fallback');
        expect(configuration.logAlias).to.be('filebeat-*,kibana_sample_data_logs*');
        expect(configuration.fields.timestamp).to.be('@timestamp');
        expect(configuration.fields.tiebreaker).to.be('_doc');
        expect(configuration.logColumns[0]).to.have.key('timestampColumn');
        expect(configuration.logColumns[1]).to.have.key('fieldColumn');
        expect(configuration.logColumns[2]).to.have.key('messageColumn');
      });
    });
  });
}
