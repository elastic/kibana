/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createEventToolHandler } from './handler';
import { eventsWriteHandler } from '../event_write/handler';

jest.mock('../event_write/handler', () => ({
  eventsWriteHandler: jest.fn(),
}));

const baseInput = {
  stream_names: ['logs.checkout'],
  title: 'Checkout latency',
  symptom_hypothesis: 'Checkout requests are delayed because the payment dependency is timing out.',
  summary: 'P99 latency breached SLO',
  confidence: 0.8,
};

describe('createEventToolHandler', () => {
  beforeEach(() => {
    (eventsWriteHandler as jest.Mock).mockResolvedValue({
      event_id: 'agent-event-abcd1234',
      status: 'active',
      written: true,
    });
  });

  it('defaults status to "active" when omitted', async () => {
    await createEventToolHandler({
      eventSearchClient: {} as never,
      eventInput: baseInput,
      alertEventsClient: {} as never,
    });

    expect(eventsWriteHandler).toHaveBeenCalledWith(
      expect.objectContaining({ input: expect.objectContaining({ status: 'active' }) })
    );
  });

  it('passes explicit status through', async () => {
    await createEventToolHandler({
      eventSearchClient: {} as never,
      eventInput: { ...baseInput, status: 'inactive' },
      alertEventsClient: {} as never,
    });

    expect(eventsWriteHandler).toHaveBeenCalledWith(
      expect.objectContaining({ input: expect.objectContaining({ status: 'inactive' }) })
    );
  });

  it('returns event_id from the write result and acknowledged: true', async () => {
    const result = await createEventToolHandler({
      eventSearchClient: {} as never,
      eventInput: baseInput,
      alertEventsClient: {} as never,
    });

    expect(result).toEqual({ event_id: 'agent-event-abcd1234', acknowledged: true });
  });

  it('passes a generated event_id so chat create is always-write snapshot', async () => {
    await createEventToolHandler({
      eventSearchClient: {} as never,
      eventInput: baseInput,
      alertEventsClient: {} as never,
    });

    const delegatedInput = (eventsWriteHandler as jest.Mock).mock.calls[0][0].input;
    expect(delegatedInput.event_id).toEqual(expect.any(String));
    expect(delegatedInput).not.toHaveProperty('assessment_note');
    expect(delegatedInput).not.toHaveProperty('signals');
    expect(delegatedInput).not.toHaveProperty('workflow_execution_id');
  });

  it('passes alertEventsClient and logger through to eventsWriteHandler', async () => {
    const alertEventsClient = { createAlertEvent: jest.fn() } as never;
    const logger = { error: jest.fn() } as never;

    await createEventToolHandler({
      eventSearchClient: {} as never,
      eventInput: baseInput,
      alertEventsClient,
      logger,
    });

    expect(eventsWriteHandler).toHaveBeenCalledWith(
      expect.objectContaining({ alertEventsClient, logger })
    );
  });
});
