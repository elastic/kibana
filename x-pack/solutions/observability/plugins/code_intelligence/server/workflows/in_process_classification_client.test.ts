/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import type { WorkflowsManagementApi } from '@kbn/workflows-management-plugin/server';
import { ExecutionStatus } from '@kbn/workflows';
import type { PluginScopedManagedWorkflowsApi } from '@kbn/workflows/server/types';

import { InProcessClassificationWorkflowClient } from './in_process_classification_client';

const clientReturning = (content: unknown) =>
  new InProcessClassificationWorkflowClient(
    { execute: jest.fn(async () => 'execution-1') } as unknown as PluginScopedManagedWorkflowsApi,
    {
      getWorkflowExecution: jest.fn(async () => ({
        status: ExecutionStatus.COMPLETED,
        stepExecutions: [{ output: { content }, stepId: 'classify' }],
      })),
    } as unknown as WorkflowsManagementApi,
    {} as KibanaRequest,
    'default'
  );

const loggingCandidate = (id: string, excerpt: string) => ({
  evidence: [{ excerpt, line: 1, path: 'nova/console/serial.py' }],
  excerpt,
  id,
});

const otelCandidate = (id: string) => ({
  evidence: [{ excerpt: 'tracer.startSpan("checkout")', line: 1, path: 'src/checkout.ts' }],
  id,
  signal: { kind: 'span_name' as const, value: 'checkout' },
});

describe('InProcessClassificationWorkflowClient', () => {
  it('drops a blank static message and trims one with padding', async () => {
    const client = clientReturning({
      results: [
        { id: 'c1', keep: true, level: 'warn', staticMessage: ' ' },
        { id: 'c2', keep: true, level: 'info', staticMessage: '  started ' },
        { id: 'c3', keep: false, staticMessage: null },
      ],
    });

    const result = await client.classifyLogging({
      candidates: [
        loggingCandidate('c1', 'LOG.warning(e.format_message())'),
        loggingCandidate('c2', 'LOG.info("started")'),
        loggingCandidate('c3', 'print(value)'),
      ],
    });

    expect(result).toEqual({
      status: 'success',
      value: [
        { id: 'c1', keep: true, level: 'warn' },
        { id: 'c2', keep: true, level: 'info', staticMessage: 'started' },
        { id: 'c3', keep: false },
      ],
    });
  });

  it('keeps valid results when another result breaks its contract', async () => {
    const client = clientReturning({
      results: [
        { id: 'c1', keep: true, level: 'warning' },
        { id: 'c2', keep: 'yes' },
        { id: 'c3', keep: true, level: 'error' },
      ],
    });

    const result = await client.classifyLogging({
      candidates: [
        loggingCandidate('c1', 'LOG.warning("a")'),
        loggingCandidate('c2', 'LOG.info("b")'),
        loggingCandidate('c3', 'LOG.error("c")'),
      ],
    });

    expect(result).toEqual({
      status: 'success',
      value: [{ id: 'c3', keep: true, level: 'error' }],
    });
  });

  it('drops blank OTel text fields without rejecting the result', async () => {
    const client = clientReturning([
      { description: '', id: 'c1', keep: true, severityScore: 40, title: ' checkout ' },
    ]);

    const result = await client.classifyOtel({ candidates: [otelCandidate('c1')] });

    expect(result).toEqual({
      status: 'success',
      value: [{ id: 'c1', keep: true, severityScore: 40, title: 'checkout' }],
    });
  });

  it('forwards a complete finding on logging results, trimmed, whether or not the candidate is kept', async () => {
    const client = clientReturning({
      results: [
        {
          id: 'c1',
          keep: true,
          level: 'warn',
          findingType: 'sensitive-data',
          findingTitle: ' Admin password logged ',
          findingSummary: 'Writes the generated admin password to the log at warn level. ',
        },
        {
          id: 'c2',
          keep: false,
          findingType: 'sensitive-data',
          findingTitle: 'Session token printed',
          findingSummary: 'A bare print statement writes the session token to stdout.',
        },
      ],
    });

    const result = await client.classifyLogging({
      candidates: [
        loggingCandidate('c1', 'log.warn "Generated admin credentials: admin / $password"'),
        loggingCandidate('c2', 'print(session.token)'),
      ],
    });

    expect(result).toEqual({
      status: 'success',
      value: [
        {
          id: 'c1',
          keep: true,
          level: 'warn',
          findingType: 'sensitive-data',
          findingTitle: 'Admin password logged',
          findingSummary: 'Writes the generated admin password to the log at warn level.',
        },
        {
          id: 'c2',
          keep: false,
          findingType: 'sensitive-data',
          findingTitle: 'Session token printed',
          findingSummary: 'A bare print statement writes the session token to stdout.',
        },
      ],
    });
  });

  it('forwards a complete finding on OTel results even when its text is not a source quote', async () => {
    const client = clientReturning([
      {
        id: 'c1',
        keep: false,
        findingType: 'sensitive-data',
        findingTitle: 'Card security code recorded as a span attribute',
        findingSummary: 'The payment span attaches the card verification value as an integer.',
      },
    ]);

    const result = await client.classifyOtel({ candidates: [otelCandidate('c1')] });

    expect(result).toEqual({
      status: 'success',
      value: [
        {
          id: 'c1',
          keep: false,
          findingType: 'sensitive-data',
          findingTitle: 'Card security code recorded as a span attribute',
          findingSummary: 'The payment span attaches the card verification value as an integer.',
        },
      ],
    });
  });

  it('treats findingType none as no finding, even when stray finding text is present', async () => {
    const client = clientReturning({
      results: [
        { id: 'c1', keep: true, level: 'info', findingType: 'none' },
        {
          id: 'c2',
          keep: false,
          findingType: 'none',
          findingTitle: 'No issue identified',
          findingSummary: 'Nothing to review.',
        },
      ],
    });

    const result = await client.classifyLogging({
      candidates: [loggingCandidate('c1', 'LOG.info("a")'), loggingCandidate('c2', 'print(b)')],
    });

    expect(result).toEqual({
      status: 'success',
      value: [
        { id: 'c1', keep: true, level: 'info' },
        { id: 'c2', keep: false },
      ],
    });
  });

  it('drops a result whose finding is left incomplete after blank text is removed', async () => {
    const client = clientReturning({
      results: [
        {
          id: 'c1',
          keep: true,
          findingType: 'sensitive-data',
          findingTitle: ' ',
          findingSummary: 'x',
        },
        { id: 'c2', keep: true },
      ],
    });

    const result = await client.classifyLogging({
      candidates: [
        loggingCandidate('c1', 'LOG.info("a")'),
        loggingCandidate('c2', 'LOG.info("b")'),
      ],
    });

    expect(result).toEqual({ status: 'success', value: [{ id: 'c2', keep: true }] });
  });

  it('reports a response without a result list as a retryable failure', async () => {
    const client = clientReturning({ text: 'I could not classify these.' });

    const result = await client.classifyLogging({
      candidates: [loggingCandidate('c1', 'LOG.info("a")')],
    });

    expect(result).toMatchObject({
      error: { code: 'malformed_workflow_response', retryable: true },
      status: 'failure',
    });
  });
});
