/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { KibanaRequest } from '@kbn/core/server';
import { MAX_ARRAY_LENGTH, MAX_ID_LENGTH, MAX_TEXT_LENGTH } from '@kbn/significant-events-schema';
import { InvestigationQuotaDeniedError } from '../client/errors';
import type { GetInvestigationsClient } from '../routes/types';
import { triggerInvestigationStepDefinition } from './trigger_investigation';

jest.mock('@kbn/workflows-extensions/server', () => ({
  createServerStepDefinition: jest.fn((definition) => definition),
}));

const request = {} as KibanaRequest;
const createContext = (input: Record<string, unknown>) =>
  ({
    input,
    contextManager: {
      getFakeRequest: jest.fn().mockReturnValue(request),
      getContext: jest.fn().mockReturnValue({ workflow: { spaceId: 'test-space' } }),
    },
  } as never);

const createDefinition = (start: jest.Mock) => {
  const getInvestigationsClient = jest
    .fn()
    .mockReturnValue({ start }) as unknown as GetInvestigationsClient;
  return {
    definition: triggerInvestigationStepDefinition(getInvestigationsClient),
    getInvestigationsClient,
  };
};

describe('triggerInvestigationStepDefinition', () => {
  it('defaults an omitted trigger type to automatic', async () => {
    const start = jest.fn().mockResolvedValue({ investigation_id: 'investigation-1' });
    const { definition } = createDefinition(start);

    await definition.handler(
      createContext({
        subject_type: 'significant_event',
        subject_id: 'event-1',
        title: 'Checkout latency breach',
      })
    );

    expect(start).toHaveBeenCalledWith(
      expect.objectContaining({
        trigger_type: 'automatic',
      })
    );
  });

  it('preserves an explicit manual trigger type', async () => {
    const start = jest.fn().mockResolvedValue({ investigation_id: 'investigation-1' });
    const { definition } = createDefinition(start);

    await definition.handler(
      createContext({
        subject_type: 'significant_event',
        subject_id: 'event-1',
        title: 'Checkout latency breach',
        trigger_type: 'manual',
      })
    );

    expect(start).toHaveBeenCalledWith(
      expect.objectContaining({
        trigger_type: 'manual',
      })
    );
  });

  it('forwards an explicit prompt and stream names unchanged', async () => {
    const start = jest.fn().mockResolvedValue({ investigation_id: 'investigation-1' });
    const { definition } = createDefinition(start);

    await definition.handler(
      createContext({
        subject_type: 'significant_event',
        subject_id: 'event-1',
        title: 'Checkout latency breach',
        message: 'Checkout latency breach\n\nThe probable cause is Redis saturation.',
        stream_names: ['logs.checkout', 'metrics.checkout'],
      })
    );

    expect(start).toHaveBeenCalledWith(
      expect.objectContaining({
        message: 'Checkout latency breach\n\nThe probable cause is Redis saturation.',
        stream_names: ['logs.checkout', 'metrics.checkout'],
      })
    );
  });

  it('rejects invalid prompt and stream inputs before starting', async () => {
    const start = jest.fn();
    const { definition } = createDefinition(start);

    await expect(
      definition.handler(
        createContext({
          subject_type: 'significant_event',
          subject_id: 'event-1',
          title: 'Checkout latency breach',
          message: '',
        })
      )
    ).rejects.toThrow();
    await expect(
      definition.handler(
        createContext({
          subject_type: 'significant_event',
          subject_id: 'event-1',
          title: 'Checkout latency breach',
          stream_names: Array.from({ length: MAX_ARRAY_LENGTH + 1 }, () => 'logs.checkout'),
        })
      )
    ).rejects.toThrow();
    await expect(
      definition.handler(
        createContext({
          subject_type: 'significant_event',
          subject_id: 'event-1',
          title: 'Checkout latency breach',
          message: 'x'.repeat(MAX_TEXT_LENGTH + 1),
          stream_names: ['x'.repeat(MAX_ID_LENGTH + 1)],
        })
      )
    ).rejects.toThrow();

    expect(start).not.toHaveBeenCalled();
  });

  it('propagates a denied start without retrying', async () => {
    const error = new InvestigationQuotaDeniedError();
    const start = jest.fn().mockRejectedValue(error);
    const { definition } = createDefinition(start);

    await expect(
      definition.handler(
        createContext({
          subject_type: 'significant_event',
          subject_id: 'event-1',
          title: 'Checkout latency breach',
        })
      )
    ).rejects.toBe(error);
    expect(start).toHaveBeenCalledTimes(1);
  });
});
