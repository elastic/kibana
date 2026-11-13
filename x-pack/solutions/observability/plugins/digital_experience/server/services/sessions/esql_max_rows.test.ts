/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { errors } from '@elastic/elasticsearch';
import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { ESQL_DEFAULT_MAX_ROWS, esqlMaxRows } from './esql_max_rows';

type Client = ReturnType<typeof elasticsearchServiceMock.createElasticsearchClient>;

const SETTING = 'esql.query.result_truncation_max_size';

describe('esqlMaxRows', () => {
  let client: Client;

  const respondWith = (settings: Record<string, unknown>) => {
    client.cluster.getSettings.mockResponse(settings as never);
  };

  beforeEach(() => {
    client = elasticsearchServiceMock.createElasticsearchClient();
  });

  it('reads the default the cluster runs with', async () => {
    respondWith({ transient: {}, persistent: {}, defaults: { [SETTING]: '10000' } });

    await expect(esqlMaxRows(client)).resolves.toBe(10_000);
    expect(client.cluster.getSettings).toHaveBeenCalledWith(
      { flat_settings: true, include_defaults: true },
      { signal: undefined }
    );
  });

  it('takes a lowered setting, so a truncated response is split rather than missed', async () => {
    respondWith({ persistent: { [SETTING]: '2500' }, defaults: { [SETTING]: '10000' } });

    await expect(esqlMaxRows(client)).resolves.toBe(2_500);
  });

  it('prefers a transient setting over the persistent one and the default', async () => {
    respondWith({
      transient: { [SETTING]: '1000' },
      persistent: { [SETTING]: '2500' },
      defaults: { [SETTING]: '10000' },
    });

    await expect(esqlMaxRows(client)).resolves.toBe(1_000);
  });

  it('never goes above the default, as larger responses buy nothing', async () => {
    respondWith({ persistent: { [SETTING]: '250000' } });

    await expect(esqlMaxRows(client)).resolves.toBe(ESQL_DEFAULT_MAX_ROWS);
  });

  it.each([
    ['a value that is not a number', { persistent: { [SETTING]: 'all' } }],
    ['no value at all', { transient: {}, persistent: {}, defaults: {} }],
    ['zero', { persistent: { [SETTING]: '0' } }],
  ])('falls back to the default on %s', async (_name, settings) => {
    respondWith(settings);

    await expect(esqlMaxRows(client)).resolves.toBe(ESQL_DEFAULT_MAX_ROWS);
  });

  it('falls back to the default when the cluster refuses the read, as serverless does', async () => {
    client.cluster.getSettings.mockRejectedValue(
      new errors.ResponseError({
        statusCode: 403,
        body: { error: { type: 'security_exception' } },
      } as never)
    );

    await expect(esqlMaxRows(client)).resolves.toBe(ESQL_DEFAULT_MAX_ROWS);
  });
});
