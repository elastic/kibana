/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import expect from '@kbn/expect';
import { DatasetQualityApiClientKey } from '../common/config';
import { DatasetQualityApiError } from '../common/dataset_quality_api_supertest';
import { FtrProviderContext } from '../common/ftr_provider_context';
import { expectToReject } from '../utils';

export default function ApiTest({ getService }: FtrProviderContext) {
  const registry = getService('registry');
  const datasetQualityApiClient = getService('datasetQualityApiClient');

  async function callApiAs(user: DatasetQualityApiClientKey) {
    return await datasetQualityApiClient[user]({
      endpoint: 'GET /internal/dataset_quality/data_streams/stats',
      params: {
        query: {
          type: 'logs',
          sortOrder: 'asc',
        },
      },
    });
  }

  registry.when('Api Key privileges check', { config: 'basic' }, () => {
    describe('when missing required privileges', () => {
      it('fails with a 500 error', async () => {
        const err = await expectToReject<DatasetQualityApiError>(
          async () => await callApiAs('readUser')
        );

        expect(err.res.status).to.be(500);
        expect(err.res.body.message).to.contain('unauthorized');
      });
    });

    describe('when required privileges are set', () => {
      it('returns true when user has logMonitoring privileges', async () => {
        const privileges = await callApiAs('datasetQualityLogsUser');

        expect(privileges.body.items.length).to.be(0);
      });
    });
  });
}
