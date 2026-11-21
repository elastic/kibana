/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolHandlerContext } from '@kbn/agent-builder-server/tools';
import { httpServerMock } from '@kbn/core-http-server-mocks';

import type { EndpointAppContextService } from '../../../../../endpoint/endpoint_app_context_services';
import { prepareDispatch } from './dispatch_action';
import type { DispatchActionName } from './resolve_target';

describe('prepareDispatch without a confirmation card', () => {
  const getEndpointAuthz = jest.fn();
  const endpointAppContextService = {
    getEndpointAuthz,
  } as unknown as EndpointAppContextService;
  const context = {
    callContext: { callSource: 'agent', toolCallId: 'call-test-1' },
    request: httpServerMock.createKibanaRequest(),
  } as unknown as ToolHandlerContext;

  beforeEach(() => {
    getEndpointAuthz.mockReset();
  });

  it.each<DispatchActionName>(['isolate', 'unisolate', 'scan'])(
    'refuses the %s write action instead of dispatching unconfirmed',
    async (action) => {
      const prepared = await prepareDispatch({
        action,
        params: { agentId: 'agent-1' },
        context,
        endpointAppContextService,
        requiredPrivilege: 'canIsolateHost',
      });

      expect(prepared.kind).toBe('result');
      expect(JSON.stringify(prepared)).toContain('no analyst confirmation configured');
      expect(getEndpointAuthz).not.toHaveBeenCalled();
    }
  );

  it('lets the read-only running-processes action proceed past the confirmation gate', async () => {
    getEndpointAuthz.mockResolvedValue({ canReadSecuritySolution: false });

    const prepared = await prepareDispatch({
      action: 'running-processes',
      params: { agentId: 'agent-1' },
      context,
      endpointAppContextService,
      requiredPrivilege: 'canGetRunningProcesses',
    });

    expect(getEndpointAuthz).toHaveBeenCalled();
    expect(JSON.stringify(prepared)).not.toContain('no analyst confirmation configured');
  });
});
