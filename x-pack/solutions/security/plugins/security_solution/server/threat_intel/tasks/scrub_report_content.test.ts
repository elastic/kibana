/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { coreMock, loggingSystemMock } from '@kbn/core/server/mocks';
import type { RunContext, TaskManagerSetupContract } from '@kbn/task-manager-plugin/server';

// The task-manager server entry pulls in the whole plugin graph, which this
// package's jest config cannot resolve (`TaskCost` comes back undefined).
jest.mock('@kbn/task-manager-plugin/server', () => ({
  TaskCost: { Normal: 2 },
  throwRetryableError: (err: Error) => {
    throw err;
  },
  throwUnrecoverableError: (err: Error) => {
    throw err;
  },
}));

import {
  CONTENT_RETENTION_DAYS,
  registerScrubReportContentTask,
  SCRUB_REPORT_CONTENT_TASK_TYPE,
} from './scrub_report_content';

interface UpdateByQueryArg {
  index: string;
  max_docs: number;
  expand_wildcards: readonly string[];
  query: { bool: { filter: unknown[]; must_not: unknown[] } };
  script: { source: string; params: { now: string } };
}

const setupRunner = (updateByQueryResult: unknown) => {
  const coreStart = coreMock.createStart();
  const esClient = coreStart.elasticsearch.client.asInternalUser;
  (esClient.updateByQuery as jest.Mock).mockImplementation(async () => {
    if (updateByQueryResult instanceof Error) throw updateByQueryResult;
    return updateByQueryResult;
  });

  const coreSetup = coreMock.createSetup();
  (coreSetup.getStartServices as jest.Mock).mockResolvedValue([coreStart, {}, {}]);

  const definitions: Record<string, { createTaskRunner: Function }> = {};
  const taskManager = {
    registerTaskDefinitions: jest.fn((defs) => Object.assign(definitions, defs)),
  } as unknown as TaskManagerSetupContract;

  const logger = loggingSystemMock.createLogger();
  registerScrubReportContentTask({ taskManager, coreSetup, logger });

  const runner = definitions[SCRUB_REPORT_CONTENT_TASK_TYPE].createTaskRunner({
    taskInstance: { state: {}, params: {} },
    signal: new AbortController().signal,
    executionUuid: 'test',
    setCustomTaskRunEventFields: jest.fn(),
  } as unknown as RunContext);

  return { runner, esClient, logger };
};

const lastQuery = (esClient: { updateByQuery: unknown }): UpdateByQueryArg =>
  (esClient.updateByQuery as jest.Mock).mock.calls[0][0] as UpdateByQueryArg;

describe('scrub_report_content task', () => {
  it('only targets reports past the retention window that are not already scrubbed', async () => {
    const { runner, esClient } = setupRunner({ updated: 3 });

    await runner.run();

    const query = lastQuery(esClient);
    expect(query.query.bool.filter).toEqual([
      { range: { '@timestamp': { lt: `now-${CONTENT_RETENTION_DAYS}d` } } },
      { exists: { field: 'content.body_text' } },
    ]);
    // Without this the task would rewrite the same documents on every run.
    expect(query.query.bool.must_not).toEqual([
      { exists: { field: 'lineage.content_scrubbed_at' } },
      { terms: { 'lineage.extraction_method': ['pending'] } },
    ]);
  });

  // Retention outrunning enrichment is unrecoverable: the enrichment routes all
  // require a non-empty text, so a report whose body was scrubbed before it was
  // ever enriched stays pending forever and yields no IOCs.
  it('never scrubs a report that is still pending enrichment', async () => {
    const { runner, esClient } = setupRunner({ updated: 0 });

    await runner.run();

    expect(lastQuery(esClient).query.bool.must_not).toContainEqual({
      terms: { 'lineage.extraction_method': ['pending'] },
    });
  });

  it('reads the hidden reports index and caps the documents per run', async () => {
    const { runner, esClient } = setupRunner({ updated: 0 });

    await runner.run();

    const query = lastQuery(esClient);
    expect(query.expand_wildcards).toEqual(['open', 'hidden']);
    expect(query.max_docs).toBeGreaterThan(0);
  });

  it('removes the fetched body but keeps enrichment and feedback fields', async () => {
    const { runner, esClient } = setupRunner({ updated: 1 });

    await runner.run();

    const { source } = lastQuery(esClient).script;
    expect(source).toContain("remove('body_text')");
    expect(source).not.toContain("remove('body_html')");
    expect(source).toContain('lineage.content_scrubbed_at');
    // Ranking and hunt cooldown depend on these surviving past retention.
    expect(source).not.toContain('extracted');
    expect(source).not.toContain('feedback');
    expect(source).not.toContain('attribution');
  });

  it('accumulates the scrubbed count across runs', async () => {
    const { runner } = setupRunner({ updated: 7 });

    const result = await runner.run();

    expect(result.state).toEqual(
      expect.objectContaining({ totalReportsScrubbed: 7, lastRunAt: expect.any(String) })
    );
  });

  it('treats a missing reports index as a no-op', async () => {
    const notFound = Object.assign(new Error('index_not_found_exception'), { statusCode: 404 });
    const { runner } = setupRunner(notFound);

    await expect(runner.run()).resolves.toEqual({ state: {} });
  });

  it('surfaces unexpected Elasticsearch failures', async () => {
    const boom = Object.assign(new Error('mapping is broken'), { statusCode: 400 });
    const { runner } = setupRunner(boom);

    await expect(runner.run()).rejects.toThrow(/mapping is broken/);
  });
});
