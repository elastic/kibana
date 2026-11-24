/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core-http-server-mocks';
import { NIGHTSHIFT_INVESTIGATION_WORKFLOW_ID } from '@kbn/workflows/managed';
import { InvestigationNotFoundError } from '../client/errors';
import { createRoutingTestContext } from '../lib/notifications/notification_routing.mock';
import { getSlackDeliveriesRoute } from './get_slack_deliveries';

const { handler, params } =
  getSlackDeliveriesRoute['GET /internal/nightshift/investigations/{id}/slack_deliveries'];

const setup = () => {
  const { client } = createRoutingTestContext();
  const getNotifiableInvestigation = jest.fn();
  const getNotificationRoutingClient = jest.fn().mockResolvedValue(client);
  const getChildWorkflowExecutions = jest
    .fn()
    .mockResolvedValue([
      { workflowId: NIGHTSHIFT_INVESTIGATION_WORKFLOW_ID, executionId: 'shared-child' },
    ]);
  const call = (executionId?: string) =>
    handler({
      request: httpServerMock.createKibanaRequest(),
      params: params.parse({ path: { id: 'inv-1' }, query: executionId ? { executionId } : {} }),
      getSpaceId: () => 'default',
      getInvestigationsClient: () => ({ getNotifiableInvestigation }),
      getNotificationRoutingClient,
      getWorkflowsManagement: () => ({ management: { getChildWorkflowExecutions } }),
    } as never);
  return { client, call, getNotifiableInvestigation, getNotificationRoutingClient };
};

it('shows failed findings for the selected run even after a follow-up delivered to the same channel', async () => {
  const { client, call } = setup();
  const routing = await client.initialize('shared-child', NIGHTSHIFT_INVESTIGATION_WORKFLOW_ID, [
    { type: 'slack', connector_id: 'slack', params: { channel: '#checkout' } },
    { type: 'slack', connector_id: 'slack', params: { channel: '#ops' } },
  ]);
  const [checkout, ops] = routing.destinations;
  await client.claim('shared-child', checkout.id, 'started', 'start', true);
  await client.record('start', { status: 'sent', channel: 'C1', message_ts: '1.2' });
  await client.selectTerminalPhase('shared-child', 'completed');
  await client.claim('shared-child', checkout.id, 'completed', 'result', false);
  await client.record('result', {
    status: 'failed',
    error: 'Channel C1 is not connected. Connect it in the Elastic Slack app settings.',
  });
  await client.claim('shared-child', ops.id, 'completed', 'ops-result', false);
  await client.record('ops-result', { status: 'sent', channel: 'C2', message_ts: '2.3' });

  await client.initialize('follow-up', NIGHTSHIFT_INVESTIGATION_WORKFLOW_ID, []);
  await client.selectTerminalPhase('follow-up', 'completed');
  await client.claim('follow-up', checkout.id, 'completed', 'follow-up-result', false);
  await client.record('follow-up-result', { status: 'sent', channel: 'C1', message_ts: '3.4' });

  expect(await call('bound-parent')).toEqual({
    deliveries: [
      {
        id: checkout.id,
        channel: '#checkout',
        attemptedAt: expect.any(String),
        phase: 'completed',
        status: 'failed',
        reason: 'channel_not_connected',
      },
      {
        id: ops.id,
        channel: '#ops',
        attemptedAt: expect.any(String),
        phase: 'completed',
        status: 'sent',
      },
    ],
  });
  expect((await call()).deliveries).toEqual(
    expect.arrayContaining([expect.objectContaining({ channel: '#checkout', status: 'sent' })])
  );
});

it('requires a scoped investigation read before loading the routing document', async () => {
  const { call, getNotifiableInvestigation, getNotificationRoutingClient } = setup();
  getNotifiableInvestigation.mockRejectedValue(new InvestigationNotFoundError('inv-1'));

  await expect(call()).rejects.toMatchObject({ output: { statusCode: 404 } });
  expect(getNotificationRoutingClient).not.toHaveBeenCalled();
});
