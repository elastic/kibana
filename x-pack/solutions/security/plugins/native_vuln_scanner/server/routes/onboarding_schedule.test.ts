/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { WorkflowNotFoundError } from '@kbn/workflows/common/errors';
import { NATIVE_VULN_SCANNER_SCAN_WORKFLOW_ID } from '@kbn/workflows/managed';
import { createContext, createRequest, createResponse, setupRoute } from './route_harness.mock';
import { registerOnboardingScheduleRoute } from './onboarding_schedule';

const setup = (licenseType: 'enterprise' | 'basic' = 'enterprise') => {
  const workflows = { updateWorkflow: jest.fn().mockResolvedValue({}) };
  const route = setupRoute(registerOnboardingScheduleRoute, 'post', {
    licenseType,
    services: { workflows } as never,
  });
  return { ...route, workflows };
};

describe('POST onboarding schedule', () => {
  it('is an internal route that needs fleet-agent-policies-all', () => {
    const { routeOptions } = setup();
    expect(routeOptions.access).toBe('internal');
    expect(routeOptions.path).toBe('/internal/native_vuln_scanner/onboarding/schedule');
    expect(routeOptions.security.authz.requiredPrivileges).toEqual(['fleet-agent-policies-all']);
  });

  it('answers 403 LICENSE_REQUIRED below Enterprise', async () => {
    const { handler, workflows } = setup('basic');
    const response = createResponse();
    await handler(createContext(), createRequest({ body: { enabled: true } }), response);
    expect(response.forbidden).toHaveBeenCalledWith({
      body: expect.objectContaining({ attributes: { code: 'LICENSE_REQUIRED' } }),
    });
    expect(workflows.updateWorkflow).not.toHaveBeenCalled();
  });

  it.each([
    ['a non-boolean enabled', { enabled: 'yes' }],
    ['a missing enabled', {}],
  ])('rejects %s', (_, body) => {
    const { versionConfig } = setup();
    expect(
      () => versionConfig.validate && versionConfig.validate.request.body.validate(body)
    ).toThrow();
  });

  it.each([[true], [false]])(
    'sets enabled=%s on the scan workflow as the caller',
    async (enabled) => {
      const { handler, workflows } = setup();
      const request = createRequest({ body: { enabled } });
      const response = createResponse();

      await handler(createContext(), request, response);

      expect(workflows.updateWorkflow).toHaveBeenCalledWith(
        NATIVE_VULN_SCANNER_SCAN_WORKFLOW_ID,
        { enabled },
        'default',
        request
      );
      expect(response.ok).toHaveBeenCalledWith({ body: { enabled } });
    }
  );

  it('answers 404 WORKFLOW_NOT_INSTALLED when the workflow is missing', async () => {
    const { handler, workflows } = setup();
    workflows.updateWorkflow.mockRejectedValue(
      new WorkflowNotFoundError(NATIVE_VULN_SCANNER_SCAN_WORKFLOW_ID)
    );
    const response = createResponse();
    await handler(createContext(), createRequest({ body: { enabled: true } }), response);
    expect(response.notFound).toHaveBeenCalledWith({
      body: expect.objectContaining({ attributes: { code: 'WORKFLOW_NOT_INSTALLED' } }),
    });
  });

  it('answers 403 when the workflow access check denies the caller', async () => {
    const { handler, workflows } = setup();
    workflows.updateWorkflow.mockRejectedValue(
      Object.assign(new Error('denied'), { statusCode: 403 })
    );
    const response = createResponse();
    await handler(createContext(), createRequest({ body: { enabled: true } }), response);
    expect(response.forbidden).toHaveBeenCalledWith({ body: { message: 'denied' } });
  });

  it('answers 500 on an unexpected error', async () => {
    const { handler, workflows } = setup();
    workflows.updateWorkflow.mockRejectedValue(new Error('boom'));
    const response = createResponse();
    await handler(createContext(), createRequest({ body: { enabled: true } }), response);
    expect(response.customError).toHaveBeenCalledWith({
      statusCode: 500,
      body: { message: 'boom' },
    });
  });
});
