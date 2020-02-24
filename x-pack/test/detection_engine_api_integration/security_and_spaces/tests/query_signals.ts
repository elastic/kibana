/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import expect from '@kbn/expect';

import { DETECTION_ENGINE_QUERY_SIGNALS_URL } from '../../../../legacy/plugins/siem/common/constants';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { getSignalStatus, createSignalsIndex, deleteSignalsIndex } from './utils';

// eslint-disable-next-line import/no-default-export
export default ({ getService }: FtrProviderContext) => {
  const supertest = getService('supertest');

  describe('query_signals_route', () => {
    describe('validation checks', () => {
      it('should not give errors when querying and the signals index does not exist yet', async () => {
        const { body } = await supertest
          .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
          .set('kbn-xsrf', 'true')
          .send(getSignalStatus())
          .expect(200);

        // remove any server generated items that are indeterministic
        delete body.took;

        expect(body).to.eql({
          timed_out: false,
          _shards: { total: 0, successful: 0, skipped: 0, failed: 0 },
          hits: { total: { value: 0, relation: 'eq' }, max_score: 0, hits: [] },
        });
      });

      it('should not give errors when querying and the signals index does exist and is empty', async () => {
        await createSignalsIndex(supertest);
        const { body } = await supertest
          .post(DETECTION_ENGINE_QUERY_SIGNALS_URL)
          .set('kbn-xsrf', 'true')
          .send(getSignalStatus())
          .expect(200);

        // remove any server generated items that are indeterministic
        delete body.took;

        expect(body).to.eql({
          timed_out: false,
          _shards: { total: 1, successful: 1, skipped: 0, failed: 0 },
          hits: { total: { value: 0, relation: 'eq' }, max_score: null, hits: [] },
          aggregations: {
            statuses: { doc_count_error_upper_bound: 0, sum_other_doc_count: 0, buckets: [] },
          },
        });

        await deleteSignalsIndex(supertest);
      });
    });
  });
};
