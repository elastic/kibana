/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { SecurityException } from '../../errors';
import { createSLO } from '../fixtures/slo';
import { assertExpectedIndicatorSourceIndexPrivileges } from './assert_expected_indicator_source_index_privileges';

const privilegesResponse = (hasAllRequested: boolean) => ({
  application: {},
  cluster: {},
  has_all_requested: hasAllRequested,
  index: {},
  username: 'some-user',
});

describe('assertExpectedIndicatorSourceIndexPrivileges', () => {
  const slo = createSLO();

  it('resolves when the user has the required privileges', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.security.hasPrivileges.mockResolvedValue(privilegesResponse(true));

    await expect(assertExpectedIndicatorSourceIndexPrivileges(slo, esClient)).resolves.toBe(
      undefined
    );
  });

  it('throws a SecurityException when privileges are missing', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.security.hasPrivileges.mockResolvedValue(privilegesResponse(false));

    await expect(assertExpectedIndicatorSourceIndexPrivileges(slo, esClient)).rejects.toThrow(
      SecurityException
    );
  });

  it('forwards the signal to the privileges request', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    esClient.security.hasPrivileges.mockResolvedValue(privilegesResponse(true));
    const { signal } = new AbortController();

    await assertExpectedIndicatorSourceIndexPrivileges(slo, esClient, { signal });

    expect(esClient.security.hasPrivileges).toHaveBeenCalledWith(expect.any(Object), { signal });
  });
});
