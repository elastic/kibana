/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MockUrlService } from '@kbn/share-plugin/common/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { brandSpaceId } from '@kbn/core-spaces-common';
import { decompressFromBase64 } from 'lz-string';
import { InvestigationLocatorDefinition } from '../../common/locators';
import { createRoutingTestContext } from '../lib/notifications/notification_routing.mock';
import type { NotificationExecution } from '../lib/notifications/notification_delivery';
import { sendNotificationsStepDefinition } from './send_notifications';

jest.mock('@kbn/workflows-extensions/server', () => ({
  createServerStepDefinition: jest.fn((definition) => definition),
}));

const setup = (spaceId = 'default', connectorId = 'saved-slack') => {
  const request = httpServerMock.createKibanaRequest({ spaceId: brandSpaceId(spaceId) });
  const routing = createRoutingTestContext(spaceId);
  const execute = jest.fn(async (_execution: NotificationExecution) => ({
    status: 'ok',
    data: { ts: '1.2', channel: 'C123' },
  }));
  const getActionsClientWithRequestInSpace = jest.fn(async () => ({ execute }));
  const getInvestigationExecutionContext = jest.fn(async () => ({
    investigation: {
      investigation_id: 'inv-1',
      title: 'Latency',
      status: 'running',
      subject: { type: 'manual', id: 'manual' },
      created_at: '2026-10-07T00:00:00Z',
    },
    conversationId: 'conv-1',
    workflowId: 'system-nightshift-investigation',
    notificationDestinations: [
      { type: 'slack', connector_id: connectorId, params: { channel: '#alerts' } },
    ],
  }));
  const urlService = new MockUrlService();
  const investigationLocator = urlService.locators.create(new InvestigationLocatorDefinition());
  const getInvestigationsClient = jest.fn(() => ({ getInvestigationExecutionContext })) as never;
  const getRoutingClient = jest.fn(async () => routing.client);
  const definition = sendNotificationsStepDefinition({
    investigationLocator,
    getInvestigationsClient,
    getActions: () => ({ getActionsClientWithRequestInSpace } as never),
    getRoutingClient,
  });
  const controller = new AbortController();
  const context = (phase = 'started') =>
    ({
      input: { investigation_id: 'inv-1', phase },
      rawInput: { investigation_id: 'inv-1', phase },
      contextManager: {
        getFakeRequest: () => request,
        getContext: () => ({
          kibanaUrl: 'https://kibana.example',
          execution: { id: 'exec-follow-up' },
          workflow: { spaceId },
        }),
      },
      logger: loggerMock.create(),
      abortSignal: controller.signal,
    } as never);
  return {
    definition,
    request,
    execute,
    getActionsClientWithRequestInSpace,
    getInvestigationExecutionContext,
    getRoutingClient,
    context,
    routing,
  };
};

describe('nightshift.sendNotifications step', () => {
  it.each(['default', 'ops'])(
    'executes a saved connector in the %s space using workflow authentication',
    async (spaceId) => {
      const {
        definition,
        request,
        execute,
        getActionsClientWithRequestInSpace,
        getInvestigationExecutionContext,
        context,
      } = setup(spaceId);
      expect(await definition.handler(context())).toEqual({
        output: { sent: 1, failed: 0, unconfirmed: 0 },
      });
      expect(getInvestigationExecutionContext).toHaveBeenCalledWith('inv-1', 'exec-follow-up');
      expect(getActionsClientWithRequestInSpace).toHaveBeenCalledWith(request, spaceId);
      expect(execute).toHaveBeenCalledWith(expect.objectContaining({ actionId: 'saved-slack' }));
      const params = execute.mock.calls[0][0].params.subActionParams as { text: string };
      const prefix = spaceId === 'default' ? '' : `/s/${spaceId}`;
      expect(params.text).toContain(`https://kibana.example${prefix}/app/r?`);
      const locatorUrl = params.text.match(/<(https:\/\/[^|]+)\|/)?.[1];
      if (!locatorUrl) {
        throw new Error('Missing locator URL');
      }
      const redirect = new URL(locatorUrl);
      const state = JSON.parse(
        redirect.searchParams.get('p') ??
          decompressFromBase64(redirect.searchParams.get('lz') ?? '') ??
          '{}'
      );
      expect(state).toEqual({ investigationId: 'inv-1' });
    }
  );

  it('uses the same delivery path for the Relay connector', async () => {
    const { definition, execute, context } = setup('default', 'elastic-apps-slack');
    await definition.handler(context());
    expect(execute).toHaveBeenCalledWith(
      expect.objectContaining({ actionId: 'elastic-apps-slack' })
    );
  });

  it('validates phase and bounded failure reasons', () => {
    const { definition } = setup();
    expect(definition.inputSchema.safeParse({ investigation_id: 'inv-1' }).success).toBe(false);
    expect(
      definition.inputSchema.safeParse({ investigation_id: 'inv-1', phase: 'progress' }).success
    ).toBe(false);
    expect(
      definition.inputSchema.safeParse({
        investigation_id: 'inv-1',
        phase: 'failed',
        reason: 'x'.repeat(10000),
      }).success
    ).toBe(true);
    expect(
      definition.inputSchema.safeParse({
        investigation_id: 'inv-1',
        phase: 'failed',
        reason: 'x'.repeat(10001),
      }).success
    ).toBe(false);
  });

  it('rejects an invalid persisted execution binding before Actions or routing access', async () => {
    const {
      definition,
      getInvestigationExecutionContext,
      getRoutingClient,
      getActionsClientWithRequestInSpace,
      context,
    } = setup();
    getInvestigationExecutionContext.mockRejectedValue(new Error('Invalid execution'));
    await expect(definition.handler(context())).rejects.toThrow('Invalid execution');
    expect(getRoutingClient).not.toHaveBeenCalled();
    expect(getActionsClientWithRequestInSpace).not.toHaveBeenCalled();
  });
});
