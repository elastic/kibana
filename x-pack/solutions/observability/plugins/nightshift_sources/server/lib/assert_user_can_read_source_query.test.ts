/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock } from '@kbn/core/server/mocks';
import { assertUserCanReadSourceQuery } from './assert_user_can_read_source_query';

const setup = (index: Record<string, { read: boolean }>) => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  esClient.security.hasPrivileges.mockResolvedValue({
    username: 'marco',
    has_all_requested: Object.values(index).every(({ read }) => read),
    cluster: {},
    index,
    application: {},
  });
  return esClient;
};

describe('assertUserCanReadSourceQuery', () => {
  it('asks for read on the patterns the query targets and accepts when granted', async () => {
    const esClient = setup({ 'logs-nginx-*': { read: true } });

    await expect(
      assertUserCanReadSourceQuery({ esClient, esql: 'FROM logs-nginx-* | WHERE status >= 500' })
    ).resolves.toBeUndefined();

    expect(esClient.security.hasPrivileges).toHaveBeenCalledWith({
      index: [{ names: ['logs-nginx-*'], privileges: ['read'] }],
    });
  });

  it('refuses a wildcard the user cannot read in full and names it', async () => {
    const esClient = setup({ 'logs-*': { read: false }, 'metrics-system-*': { read: true } });

    await expect(
      assertUserCanReadSourceQuery({ esClient, esql: 'FROM logs-*, metrics-system-*' })
    ).rejects.toMatchObject({
      output: { statusCode: 403 },
      message: expect.stringContaining('logs-*'),
    });
  });

  it('refuses a remote target without asking Elasticsearch', async () => {
    const esClient = setup({});

    await expect(
      assertUserCanReadSourceQuery({ esClient, esql: 'FROM other:logs-nginx-*' })
    ).rejects.toMatchObject({ output: { statusCode: 403 } });

    expect(esClient.security.hasPrivileges).not.toHaveBeenCalled();
  });

  it('refuses a query it cannot analyze without asking Elasticsearch', async () => {
    const esClient = setup({});

    await expect(
      assertUserCanReadSourceQuery({ esClient, esql: 'FROM logs-* |' })
    ).rejects.toMatchObject({ output: { statusCode: 403 } });

    expect(esClient.security.hasPrivileges).not.toHaveBeenCalled();
  });

  it('answers 503 when the privilege check itself fails', async () => {
    const esClient = setup({});
    esClient.security.hasPrivileges.mockRejectedValue(new Error('security unavailable'));

    await expect(
      assertUserCanReadSourceQuery({ esClient, esql: 'FROM logs-nginx-*' })
    ).rejects.toMatchObject({ output: { statusCode: 503 } });
  });
});
