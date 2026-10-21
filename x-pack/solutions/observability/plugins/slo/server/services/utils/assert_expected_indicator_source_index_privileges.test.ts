/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { SecurityException } from '../../errors';
import { createAPMTransactionErrorRateIndicator, createSLO } from '../fixtures/slo';
import { assertExpectedIndicatorSourceIndexPrivileges } from './assert_expected_indicator_source_index_privileges';

describe('assertExpectedIndicatorSourceIndexPrivileges', () => {
  const slo = createSLO({ indicator: createAPMTransactionErrorRateIndicator() });

  it('resolves when the user has all the requested privileges', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.security.hasPrivileges.mockResponse({
      has_all_requested: true,
      username: 'irrelevant',
      cluster: {},
      index: {},
      application: {},
    });

    await expect(assertExpectedIndicatorSourceIndexPrivileges(slo, esClient)).resolves.toBe(
      undefined
    );
  });

  it('throws a SecurityException when privileges are missing', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.security.hasPrivileges.mockResponse({
      has_all_requested: false,
      username: 'irrelevant',
      cluster: {},
      index: {},
      application: {},
    });

    await expect(assertExpectedIndicatorSourceIndexPrivileges(slo, esClient)).rejects.toThrow(
      SecurityException
    );
  });

  it('forwards the signal to Elasticsearch', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.security.hasPrivileges.mockResponse({
      has_all_requested: true,
      username: 'irrelevant',
      cluster: {},
      index: {},
      application: {},
    });
    const { signal } = new AbortController();

    await assertExpectedIndicatorSourceIndexPrivileges(slo, esClient, { signal });

    expect(esClient.security.hasPrivileges).toHaveBeenCalledWith(expect.anything(), { signal });
  });
});
