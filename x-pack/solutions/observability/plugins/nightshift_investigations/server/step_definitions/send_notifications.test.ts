/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MockUrlService } from '@kbn/share-plugin/common/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { isomerPluginMock } from '@kbn/isomer-plugin/server/mocks';
import { httpServerMock } from '@kbn/core-http-server-mocks';
import { brandSpaceId } from '@kbn/core-spaces-common';
import { decompressFromBase64 } from 'lz-string';
import { InvestigationLocatorDefinition } from '../../common/locators';
import { createRoutingTestContext } from '../lib/notifications/notification_routing.mock';
import type { NotificationExecution } from '../lib/notifications/notification_delivery';
import { handleInvestigationFailureStepDefinition } from './handle_investigation_failure';
import { sendNotificationsStepDefinition } from './send_notifications';

jest.mock('@kbn/workflows-extensions/server', () => ({
  createServerStepDefinition: jest.fn((definition) => definition),
}));

const setup = (
  spaceId = 'default',
  connectorId = 'saved-slack',
  params: Record<string, string> = { channel: '#alerts' }
) => {
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
    notificationDestinations: [{ type: 'slack', connector_id: connectorId, params }],
  }));
  const recordSlackThreadStatusMessage = jest.fn(async () => {});
  const urlService = new MockUrlService();
  const investigationLocator = urlService.locators.create(new InvestigationLocatorDefinition());
  const ensureForFailure = jest.fn(async () => 'conv-1');
  const getLifecycleSubject = jest.fn(async () => ({
    subject: { type: 'manual', id: 'question' },
    triggerType: 'manual',
    startedAt: '2026-10-07T00:00:00Z',
  }));
  const emitter = jest.fn();
  const getInvestigationsClient = jest.fn(() => ({
    getInvestigationExecutionContext,
    ensureForFailure,
    getLifecycleSubject,
    recordSlackThreadStatusMessage,
  })) as never;
  const getRoutingClient = jest.fn(async () => routing.client);
  const definition = sendNotificationsStepDefinition({
    investigationLocator,
    getInvestigationsClient,
    getActions: () => ({ getActionsClientWithRequestInSpace } as never),
    getRuntime: isomerPluginMock.createStartContract().getRuntime,
    getRoutingClient,
  });
  const failureDefinition = handleInvestigationFailureStepDefinition({
    investigationLocator,
    getInvestigationsClient,
    getActions: () => ({ getActionsClientWithRequestInSpace } as never),
    getRuntime: isomerPluginMock.createStartContract().getRuntime,
    getRoutingClient,
    getTriggerEmitter: () => emitter,
  });
  const controller = new AbortController();
  const context = (phase = 'started', reason = 'Model unavailable') =>
    ({
      input: { investigation_id: 'inv-1', phase, reason },
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
    failureDefinition,
    ensureForFailure,
    getLifecycleSubject,
    emitter,
    controller,
    request,
    execute,
    getActionsClientWithRequestInSpace,
    getInvestigationExecutionContext,
    recordSlackThreadStatusMessage,
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
      const params = execute.mock.calls[0][0].params.subActionParams as {
        text: string;
        blocks: Array<{ type: string; elements?: Array<{ url?: string }> }>;
      };
      const prefix = spaceId === 'default' ? '' : `/s/${spaceId}`;
      expect(params.text).toContain(`https://kibana.example${prefix}/app/r?`);
      const locatorUrl = params.blocks.find(({ type }) => type === 'actions')?.elements?.[0]?.url;
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

  describe('Slack thread status message', () => {
    const threadParams = { channel: 'C123', thread_ts: '1.1' };

    it('records the started reply under the caller-named message as the thread status message', async () => {
      const { definition, context, recordSlackThreadStatusMessage } = setup(
        'default',
        'elastic-apps-slack',
        threadParams
      );
      await definition.handler(context('started'));
      expect(recordSlackThreadStatusMessage).toHaveBeenCalledWith({
        investigationId: 'inv-1',
        channel: 'C123',
        threadTs: '1.1',
        messageTs: '1.2',
      });
    });

    it('records nothing for a destination that starts its own thread', async () => {
      const { definition, context, recordSlackThreadStatusMessage } = setup();
      await definition.handler(context('started'));
      expect(recordSlackThreadStatusMessage).not.toHaveBeenCalled();
    });

    it('records nothing for a custom Slack connector', async () => {
      const { definition, context, recordSlackThreadStatusMessage } = setup(
        'default',
        'saved-slack',
        threadParams
      );
      await definition.handler(context('started'));
      expect(recordSlackThreadStatusMessage).not.toHaveBeenCalled();
    });

    it('records nothing when the started reply was not confirmed', async () => {
      const { definition, context, execute, recordSlackThreadStatusMessage } = setup(
        'default',
        'elastic-apps-slack',
        threadParams
      );
      execute.mockResolvedValueOnce({ status: 'error', message: 'not_in_channel' } as never);
      await definition.handler(context('started'));
      expect(recordSlackThreadStatusMessage).not.toHaveBeenCalled();
    });

    it('records the result reply when the started reply was not confirmed', async () => {
      const { definition, context, execute, recordSlackThreadStatusMessage } = setup(
        'default',
        'elastic-apps-slack',
        threadParams
      );
      execute
        .mockResolvedValueOnce({ status: 'error', message: 'rate_limited' } as never)
        .mockResolvedValueOnce({ status: 'ok', data: { ts: '1.3', channel: 'C123' } });
      await definition.handler(context('started'));
      await definition.handler(context('completed'));
      expect(execute.mock.calls[1][0].params.subAction).toBe('sendMessage');
      expect(recordSlackThreadStatusMessage).toHaveBeenCalledTimes(1);
      expect(recordSlackThreadStatusMessage).toHaveBeenCalledWith({
        investigationId: 'inv-1',
        channel: 'C123',
        threadTs: '1.1',
        messageTs: '1.3',
      });
    });

    it('records the started reply only once when the result edits it', async () => {
      const { definition, context, execute, recordSlackThreadStatusMessage } = setup(
        'default',
        'elastic-apps-slack',
        threadParams
      );
      await definition.handler(context('started'));
      await definition.handler(context('completed'));
      expect(execute.mock.calls[1][0].params).toMatchObject({
        subAction: 'updateMessage',
        subActionParams: {
          channel: 'C123',
          messageTs: '1.2',
          text: expect.any(String),
          blocks: expect.any(Array),
        },
      });
      expect(recordSlackThreadStatusMessage).toHaveBeenCalledTimes(1);
      expect(recordSlackThreadStatusMessage).toHaveBeenCalledWith(
        expect.objectContaining({ messageTs: '1.2' })
      );
    });

    it('keeps the delivery result when recording fails', async () => {
      const { definition, context, recordSlackThreadStatusMessage } = setup(
        'default',
        'elastic-apps-slack',
        threadParams
      );
      recordSlackThreadStatusMessage.mockRejectedValueOnce(new Error('boom'));
      expect(await definition.handler(context('started'))).toEqual({
        output: { sent: 1, failed: 0, unconfirmed: 0 },
      });
    });
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

describe('nightshift.handleInvestigationFailure step', () => {
  it.each(['default', 'ops'])('reports an early failure in the %s space', async (spaceId) => {
    const {
      failureDefinition,
      context,
      ensureForFailure,
      emitter,
      execute,
      routing,
      getActionsClientWithRequestInSpace,
      request,
    } = setup(spaceId);
    expect(await failureDefinition.handler(context())).toEqual({
      output: { sent: 1, failed: 0, unconfirmed: 0 },
    });
    expect(ensureForFailure).toHaveBeenCalledWith('inv-1', 'exec-follow-up');
    expect(getActionsClientWithRequestInSpace).toHaveBeenCalledWith(request, spaceId);
    expect(emitter).toHaveBeenCalledWith(
      'nightshift-investigations.failed',
      expect.objectContaining({
        investigation_id: 'inv-1',
        status: 'failed',
        subject: { type: 'manual', id: 'question' },
      })
    );
    expect(execute.mock.calls[0][0].params.subActionParams).toMatchObject({
      text: expect.stringMatching(
        /⚠️ Investigation failed\n\nWhat went wrong\n\nModel unavailable/
      ),
    });
    expect((await routing.client.get())?.destinations[0].thread?.thread_ts).toBe('1.2');
  });

  it('does not send again on replay or contradict a completed execution', async () => {
    const { failureDefinition, context, execute, emitter } = setup();
    await failureDefinition.handler(context());
    await failureDefinition.handler(context());
    expect(execute).toHaveBeenCalledTimes(1);
    const completed = setup();
    await completed.definition.handler(completed.context());
    await completed.definition.handler(completed.context('completed'));
    await completed.failureDefinition.handler(completed.context());
    expect(completed.execute).toHaveBeenCalledTimes(2);
    expect(completed.emitter).not.toHaveBeenCalled();
    expect(emitter).toHaveBeenCalled();
  });

  it('still delivers if lifecycle subject lookup fails', async () => {
    const { failureDefinition, context, getLifecycleSubject, execute } = setup();
    getLifecycleSubject.mockRejectedValue(new Error('Subject lookup failed'));
    await failureDefinition.handler(context());
    expect(execute).toHaveBeenCalledTimes(1);
  });

  it('rejects an invalid binding before routing or Actions', async () => {
    const { failureDefinition, context, ensureForFailure, getRoutingClient, execute } = setup();
    ensureForFailure.mockRejectedValue(new Error('Invalid execution'));
    await expect(failureDefinition.handler(context())).rejects.toThrow('Invalid execution');
    expect(getRoutingClient).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
  });

  it('does not materialize or notify an aborted run', async () => {
    const { failureDefinition, context, controller, ensureForFailure, execute } = setup();
    controller.abort();
    await failureDefinition.handler(context());
    expect(ensureForFailure).not.toHaveBeenCalled();
    expect(execute).not.toHaveBeenCalled();
  });

  it('bounds the investigation id and failure reason', () => {
    const { failureDefinition } = setup();
    expect(
      failureDefinition.inputSchema.safeParse({ investigation_id: '', reason: 'failed' }).success
    ).toBe(false);
    expect(
      failureDefinition.inputSchema.safeParse({
        investigation_id: 'inv-1',
        reason: 'x'.repeat(10000),
      }).success
    ).toBe(true);
    expect(
      failureDefinition.inputSchema.safeParse({
        investigation_id: 'inv-1',
        reason: 'x'.repeat(10001),
      }).success
    ).toBe(false);
  });
});
