/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { HttpHandler } from '@kbn/core/public';
import { EscalationWorldSetupError } from './escalation_world';
import { ensureWorkflowEnabled } from './summary_workflow';

const WORKFLOW_ID = 'system-alertzero-investigation-summary';
const PATH = `/api/workflows/workflow/${WORKFLOW_ID}`;

interface Call {
  method: string;
  path: string;
  body?: unknown;
}

const createFetch = ({
  enabled,
  getError,
  putError,
}: {
  enabled?: boolean;
  getError?: Error;
  putError?: Error;
}) => {
  const calls: Call[] = [];
  const fetch = (async (path: string, options: { method: string; body?: string }) => {
    calls.push({
      method: options.method,
      path,
      body: options.body ? JSON.parse(options.body) : undefined,
    });
    if (options.method === 'GET') {
      if (getError) throw getError;
      return { id: WORKFLOW_ID, enabled };
    }
    if (putError) throw putError;
    return {};
  }) as unknown as HttpHandler;
  return { fetch, calls };
};

describe('ensureWorkflowEnabled', () => {
  it('enables a disabled workflow and restores it to disabled afterwards', async () => {
    const { fetch, calls } = createFetch({ enabled: false });

    const restore = await ensureWorkflowEnabled(fetch, WORKFLOW_ID);

    expect(calls.filter((call) => call.method === 'PUT')).toEqual([
      { method: 'PUT', path: PATH, body: { enabled: true } },
    ]);

    await restore();

    expect(calls.filter((call) => call.method === 'PUT').map((call) => call.body)).toEqual([
      { enabled: true },
      { enabled: false },
    ]);
  });

  it('leaves an already-enabled workflow alone, including on restore', async () => {
    const { fetch, calls } = createFetch({ enabled: true });

    const restore = await ensureWorkflowEnabled(fetch, WORKFLOW_ID);
    await restore();

    expect(calls.filter((call) => call.method === 'PUT')).toEqual([]);
  });

  it('throws a setup error when the workflow cannot be read (no silent skip)', async () => {
    const { fetch } = createFetch({ getError: new Error('404 Not Found') });

    const error = await ensureWorkflowEnabled(fetch, WORKFLOW_ID).catch((e) => e);

    expect(error).toBeInstanceOf(EscalationWorldSetupError);
    expect(error.message).toMatch(/read managed workflow .*404 Not Found/);
  });

  it('throws a setup error when the workflow cannot be enabled', async () => {
    const { fetch } = createFetch({ enabled: false, putError: new Error('403 Forbidden') });

    const error = await ensureWorkflowEnabled(fetch, WORKFLOW_ID).catch((e) => e);

    expect(error).toBeInstanceOf(EscalationWorldSetupError);
    expect(error.message).toMatch(/enable managed workflow .*403 Forbidden/);
  });
});
