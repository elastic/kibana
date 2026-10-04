/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ToolingLog } from '@kbn/tooling-log';
import { createKbnClient } from '../../lib/clients';
import type { WorkflowExecutionSummary, WorkflowStepExecutionSummary } from './kibana_api';
import {
  EXECUTIONS_PAGE_SIZE,
  listExecutionsByIds,
  listExecutionsStartedAfter,
  listStepExecutions,
} from './kibana_api';

const buildExecution = (id: string): WorkflowExecutionSummary => ({
  id,
  status: 'completed',
  startedAt: '2026-09-30T12:00:00.000Z',
});

const buildStep = (id: string): WorkflowStepExecutionSummary => ({
  id,
  stepId: 'post_comment_alert_updates',
  workflowRunId: `run-${id}`,
  status: 'completed',
  startedAt: '2026-09-30T12:00:00.000Z',
});

const executions = (prefix: string, count: number): WorkflowExecutionSummary[] =>
  Array.from({ length: count }, (_, index) => buildExecution(`${prefix}-${index}`));

describe('paginated listings', () => {
  const log = new ToolingLog();
  const kbnClient = createKbnClient({
    kibanaUrl: 'http://localhost:5601',
    elasticsearchUrl: 'http://localhost:9200',
    auth: { type: 'basic', username: 'elastic', password: 'changeme' },
    log,
  });

  let requestedPages: number[];
  let requestedQueries: URLSearchParams[];

  /** Answers every request with the page it asks for, out of `pages`, and records what was asked. */
  const serve = <T>(pages: T[][], total = pages.flat().length): void => {
    jest.spyOn(kbnClient, 'request').mockImplementation(async ({ path }) => {
      const query = new URL(path, 'http://localhost').searchParams;
      const page = Number(query.get('page'));
      requestedPages.push(page);
      requestedQueries.push(query);
      return {
        data: { results: pages[page - 1] ?? [], total },
        status: 200,
        statusText: 'OK',
        headers: new Headers(),
      };
    });
  };

  beforeEach(() => {
    requestedPages = [];
    requestedQueries = [];
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  describe('listExecutionsByIds', () => {
    it('finds a wanted execution that is only on the second page', async () => {
      const firstPage = executions('other', EXECUTIONS_PAGE_SIZE);
      const wanted = buildExecution('wanted');
      serve([firstPage, [wanted]]);

      const result = await listExecutionsByIds({
        kbnClient,
        workflowId: 'worker',
        wantedIds: new Set(['wanted']),
      });

      expect(requestedPages).toEqual([1, 2]);
      expect(result).toEqual([wanted]);
    });

    it('stops paging once every wanted execution has been seen', async () => {
      const firstPage = [
        ...executions('other', EXECUTIONS_PAGE_SIZE - 1),
        buildExecution('wanted'),
      ];
      serve([firstPage, executions('older', EXECUTIONS_PAGE_SIZE)], 2 * EXECUTIONS_PAGE_SIZE);

      await listExecutionsByIds({
        kbnClient,
        workflowId: 'worker',
        wantedIds: new Set(['wanted']),
      });

      expect(requestedPages).toEqual([1]);
    });

    it('reads every page when a wanted execution does not exist, and returns the ones that do', async () => {
      const wanted = buildExecution('wanted');
      serve([executions('other', EXECUTIONS_PAGE_SIZE), [wanted, buildExecution('other-last')]]);

      const result = await listExecutionsByIds({
        kbnClient,
        workflowId: 'worker',
        wantedIds: new Set(['wanted', 'missing']),
      });

      expect(requestedPages).toEqual([1, 2]);
      expect(result).toEqual([wanted]);
    });

    it('leaves out executions it was not asked for', async () => {
      serve([[buildExecution('a'), buildExecution('b'), buildExecution('c')]]);

      const result = await listExecutionsByIds({
        kbnClient,
        workflowId: 'worker',
        wantedIds: new Set(['a', 'c']),
      });

      expect(result.map(({ id }) => id)).toEqual(['a', 'c']);
    });

    it('stops on an empty page even if the reported total is larger', async () => {
      serve([[buildExecution('a')]], 500);

      const result = await listExecutionsByIds({
        kbnClient,
        workflowId: 'worker',
        wantedIds: new Set(['a', 'missing']),
      });

      expect(requestedPages).toEqual([1, 2]);
      expect(result.map(({ id }) => id)).toEqual(['a']);
    });

    it('asks for the newest executions first, in pages of the largest size', async () => {
      serve([[buildExecution('a')]]);

      await listExecutionsByIds({ kbnClient, workflowId: 'worker', wantedIds: new Set(['a']) });

      expect(requestedQueries[0].get('sortOrder')).toBe('desc');
      expect(requestedQueries[0].get('size')).toBe(String(EXECUTIONS_PAGE_SIZE));
      expect(requestedQueries[0].get('omitStepRuns')).toBe('true');
    });
  });

  describe('listExecutionsStartedAfter', () => {
    it('collects every page until the total is reached', async () => {
      serve([
        executions('first', EXECUTIONS_PAGE_SIZE),
        executions('second', EXECUTIONS_PAGE_SIZE),
        executions('third', 7),
      ]);

      const result = await listExecutionsStartedAfter({
        kbnClient,
        workflowId: 'analysis',
        startedAfter: '2026-09-30T12:00:00.000Z',
      });

      expect(requestedPages).toEqual([1, 2, 3]);
      expect(result).toHaveLength(2 * EXECUTIONS_PAGE_SIZE + 7);
      expect(requestedQueries[0].get('startedAfter')).toBe('2026-09-30T12:00:00.000Z');
    });

    it('makes one request when everything fits on the first page', async () => {
      serve([executions('only', 3)]);

      await listExecutionsStartedAfter({
        kbnClient,
        workflowId: 'analysis',
        startedAfter: '2026-09-30T12:00:00.000Z',
      });

      expect(requestedPages).toEqual([1]);
    });
  });

  describe('listStepExecutions', () => {
    it('collects the step executions of every page for the requested step', async () => {
      const first = Array.from({ length: EXECUTIONS_PAGE_SIZE }, (_, index) =>
        buildStep(`a${index}`)
      );
      serve([first, [buildStep('b0')]]);

      const result = await listStepExecutions({
        kbnClient,
        workflowId: 'worker',
        stepId: 'post_comment_alert_updates',
        startedAfter: '2026-09-30T12:00:00.000Z',
      });

      expect(requestedPages).toEqual([1, 2]);
      expect(result).toHaveLength(EXECUTIONS_PAGE_SIZE + 1);
      expect(requestedQueries[0].get('stepId')).toBe('post_comment_alert_updates');
    });
  });
});
