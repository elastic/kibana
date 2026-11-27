/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { toWorkflowExecutionEngineModel } from '@kbn/workflows';
import { NATIVE_VULN_SCANNER_SCAN_WORKFLOW_ID } from '@kbn/workflows/managed';
import { createContext, createRequest, createResponse, setupRoute } from './route_harness.mock';
import { registerScanRoute } from './scan';

jest.mock('@kbn/workflows', () => ({
  ...jest.requireActual('@kbn/workflows'),
  toWorkflowExecutionEngineModel: jest.fn((workflow: unknown) => ({ engine: workflow })),
}));

const installed = (overrides: Record<string, unknown> = {}) => ({
  id: NATIVE_VULN_SCANNER_SCAN_WORKFLOW_ID,
  enabled: true,
  valid: true,
  definition: { name: 'scan' },
  ...overrides,
});

const setup = (licenseType: 'enterprise' | 'basic' = 'enterprise') => {
  const workflows = {
    getWorkflow: jest.fn().mockResolvedValue(installed()),
    getWorkflowExecutions: jest.fn().mockResolvedValue({ total: 0 }),
    runWorkflow: jest.fn().mockResolvedValue('exec-1'),
  };
  const route = setupRoute(registerScanRoute, 'post', {
    licenseType,
    services: { workflows } as never,
  });
  return { ...route, workflows };
};

const run = async ({ handler }: ReturnType<typeof setup>) => {
  const request = createRequest();
  const response = createResponse();
  await handler(createContext(), request, response);
  return { request, response };
};

const conflictCode = (response: ReturnType<typeof createResponse>) =>
  (response.conflict.mock.calls[0][0]?.body as { attributes?: { code?: string } } | undefined)
    ?.attributes?.code;

describe('POST scan', () => {
  it('is an internal route that needs fleet-agent-policies-all', () => {
    const { routeOptions } = setup();
    expect(routeOptions.access).toBe('internal');
    expect(routeOptions.path).toBe('/internal/native_vuln_scanner/scan');
    expect(routeOptions.security.authz.requiredPrivileges).toEqual(['fleet-agent-policies-all']);
  });

  it('answers 403 LICENSE_REQUIRED below Enterprise and starts nothing', async () => {
    const ctx = setup('basic');
    const { response } = await run(ctx);
    expect(response.forbidden).toHaveBeenCalledWith({
      body: expect.objectContaining({ attributes: { code: 'LICENSE_REQUIRED' } }),
    });
    expect(ctx.workflows.runWorkflow).not.toHaveBeenCalled();
  });

  it('runs the workflow as the caller and returns the execution id', async () => {
    const ctx = setup();
    const { request, response } = await run(ctx);

    expect(ctx.workflows.getWorkflow).toHaveBeenCalledWith(
      NATIVE_VULN_SCANNER_SCAN_WORKFLOW_ID,
      'default',
      request
    );
    expect(toWorkflowExecutionEngineModel).toHaveBeenCalled();
    expect(ctx.workflows.runWorkflow).toHaveBeenCalledWith(
      { engine: installed() },
      'default',
      {},
      request
    );
    expect(response.ok).toHaveBeenCalledWith({ body: { executionId: 'exec-1' } });
  });

  it('answers 409 SCHEDULE_DISABLED when the workflow is disabled, without running it', async () => {
    const ctx = setup();
    ctx.workflows.getWorkflow.mockResolvedValue(installed({ enabled: false }));
    const { response } = await run(ctx);
    expect(conflictCode(response)).toBe('SCHEDULE_DISABLED');
    expect(ctx.workflows.runWorkflow).not.toHaveBeenCalled();
  });

  it('answers 409 SCAN_IN_PROGRESS when a scan is already running', async () => {
    const ctx = setup();
    ctx.workflows.getWorkflowExecutions.mockResolvedValue({ total: 1 });
    const { response } = await run(ctx);
    expect(conflictCode(response)).toBe('SCAN_IN_PROGRESS');
    expect(ctx.workflows.runWorkflow).not.toHaveBeenCalled();
  });

  it('answers 404 WORKFLOW_NOT_INSTALLED when the workflow is not installed', async () => {
    const ctx = setup();
    ctx.workflows.getWorkflow.mockResolvedValue(null);
    const { response } = await run(ctx);
    expect(response.notFound).toHaveBeenCalledWith({
      body: expect.objectContaining({ attributes: { code: 'WORKFLOW_NOT_INSTALLED' } }),
    });
    expect(ctx.workflows.runWorkflow).not.toHaveBeenCalled();
  });

  it('answers 500 WORKFLOW_INVALID when the workflow definition is invalid', async () => {
    const ctx = setup();
    ctx.workflows.getWorkflow.mockResolvedValue(installed({ valid: false, definition: null }));
    const { response } = await run(ctx);
    expect(response.customError).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        body: expect.objectContaining({ attributes: { code: 'WORKFLOW_INVALID' } }),
      })
    );
  });

  it('answers 500 when starting the run fails', async () => {
    const ctx = setup();
    ctx.workflows.runWorkflow.mockRejectedValue(new Error('boom'));
    const { response } = await run(ctx);
    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 500,
      body: { message: 'boom' },
    });
  });
});
