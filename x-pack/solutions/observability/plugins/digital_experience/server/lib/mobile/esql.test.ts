/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ElasticsearchClient } from '@kbn/core/server';
import { MOBILE_FIELDS } from '../../../common/mobile_panel';
import { getMappedMobileFields, hasMobileData, runEsql } from './esql';

const verificationError = (reason: string) =>
  Object.assign(new Error('verification_exception'), {
    meta: { body: { error: { type: 'verification_exception', reason } } },
  });

describe('getMappedMobileFields', () => {
  it('asks the readable OTel indices which mobile fields they map', async () => {
    const fieldCaps = jest.fn().mockResolvedValue({
      fields: { [MOBILE_FIELDS.sdkName]: {}, [MOBILE_FIELDS.serviceName]: {} },
    });
    const esClient = { fieldCaps } as unknown as ElasticsearchClient;

    const mapped = await getMappedMobileFields(esClient);

    expect(fieldCaps).toHaveBeenCalledWith(
      expect.objectContaining({
        index: 'traces-*.otel-*,logs-*.otel-*',
        fields: Object.values(MOBILE_FIELDS),
        ignore_unavailable: true,
        allow_no_indices: true,
      }),
      expect.anything()
    );
    expect([...mapped]).toEqual([MOBILE_FIELDS.sdkName, MOBILE_FIELDS.serviceName]);
    expect(hasMobileData(mapped)).toBe(true);
  });

  it('has no mobile data without the SDK name', () => {
    expect(hasMobileData(new Set([MOBILE_FIELDS.serviceName]))).toBe(false);
  });
});

describe('runEsql', () => {
  const filter = { match_all: {} };

  it('has no rows when the indices are gone', async () => {
    const esClient = {
      esql: { query: jest.fn().mockRejectedValue(verificationError('Unknown index [logs-*]')) },
    } as unknown as ElasticsearchClient;

    await expect(runEsql(esClient, 'FROM x', filter)).resolves.toEqual([]);
  });

  it('fails on an unknown column, which the mapped fields should have left out', async () => {
    const esClient = {
      esql: {
        query: jest
          .fn()
          .mockRejectedValue(verificationError('Unknown column [attributes.exception.type]')),
      },
    } as unknown as ElasticsearchClient;

    await expect(runEsql(esClient, 'FROM x', filter)).rejects.toThrow('verification_exception');
  });
});
