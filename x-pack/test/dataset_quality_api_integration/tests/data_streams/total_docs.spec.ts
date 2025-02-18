/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { DatasetQualityApiClientKey } from '../../common/config';
import { FtrProviderContext } from '../../common/ftr_provider_context';
import { expectToReject } from '../../utils';
import { DatasetQualityApiError } from '../../common/dataset_quality_api_supertest';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const datasetQualityApiClient = getService('datasetQualityApiClient');
  const start = '2023-12-11T18:00:00.000Z';
  const end = '2023-12-11T18:01:00.000Z';

  async function callApiAs(user: DatasetQualityApiClientKey) {
    return await datasetQualityApiClient[user]({
      endpoint: 'GET /internal/dataset_quality/data_streams/total_docs',
      params: {
        query: {
          type: 'logs',
          start,
          end,
        },
      },
    });
  }

  registry.when('Total docs', { config: 'basic' }, () => {
    describe('authorization', () => {
      it('should return a 403 when the user does not have sufficient privileges', async () => {
        const err = await expectToReject<DatasetQualityApiError>(() => callApiAs('noAccessUser'));
        expect(err.res.status).to.be(403);
      });
    });
  });
}
