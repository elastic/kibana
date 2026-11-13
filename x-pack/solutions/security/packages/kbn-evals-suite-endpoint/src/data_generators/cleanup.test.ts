/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { Client } from '@elastic/elasticsearch';
import { ToolingLog } from '@kbn/tooling-log';
import { cleanupDefendInsightsData } from './cleanup';

const createClient = (response: { deleted?: number; version_conflicts?: number }) => {
  const deleteByQuery = jest.fn(async () => response);
  return { client: { deleteByQuery } as unknown as Client, deleteByQuery };
};

describe('cleanupDefendInsightsData', () => {
  const log = new ToolingLog({ level: 'silent', writeTo: process.stdout });

  beforeEach(() => {
    jest.spyOn(log, 'info').mockImplementation(() => true);
    jest.spyOn(log, 'warning').mockImplementation(() => true);
  });
  afterEach(() => jest.restoreAllMocks());

  it('deletes with conflicts: proceed and logs counts at info when nothing conflicted', async () => {
    const { client, deleteByQuery } = createClient({ deleted: 3, version_conflicts: 0 });

    await cleanupDefendInsightsData({ esClient: client, internalEsClient: client, log });

    expect(deleteByQuery).toHaveBeenCalledWith(expect.objectContaining({ conflicts: 'proceed' }));
    expect(log.warning).not.toHaveBeenCalled();
    expect(log.info).toHaveBeenCalledWith(
      'cleanup .kibana-elastic-ai-assistant-defend-insights-*: deleted 3, 0 version conflicts skipped'
    );
  });

  it('warns with the skipped count when documents were skipped on a version conflict', async () => {
    const { client } = createClient({ deleted: 2, version_conflicts: 4 });

    await cleanupDefendInsightsData({ esClient: client, internalEsClient: client, log });

    expect(log.warning).toHaveBeenCalledWith(
      'cleanup .kibana-elastic-ai-assistant-defend-insights-*: deleted 2, 4 version conflicts skipped'
    );
  });

  it('treats a response without counts as nothing deleted and no conflicts', async () => {
    const { client } = createClient({});

    await cleanupDefendInsightsData({ esClient: client, internalEsClient: client, log });

    expect(log.warning).not.toHaveBeenCalled();
    expect(log.info).toHaveBeenCalledWith(
      'cleanup .edr-workflow-insights-default: deleted 0, 0 version conflicts skipped'
    );
  });
});
