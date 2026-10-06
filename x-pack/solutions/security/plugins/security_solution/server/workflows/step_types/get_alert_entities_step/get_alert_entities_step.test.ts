/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { getAlertEntitiesInputSchema } from '../../../../common/workflows/step_types/get_alert_entities_step/get_alert_entities_step_common';
import { getAlertEntitiesStepDefinition } from './get_alert_entities_step';

const createMockContext = (
  input: Record<string, unknown>,
  search = jest.fn(),
  {
    abortSignal = new AbortController().signal,
    workflowSpaceId = 'custom-space',
  }: { abortSignal?: AbortSignal; workflowSpaceId?: string } = {}
) => ({
  abortSignal,
  config: {},
  contextManager: {
    callKibanaApi: jest
      .fn()
      .mockResolvedValue({ body: { id: 'custom-space' }, headers: {}, status: 200 }),
    getContext: jest.fn().mockReturnValue({ workflow: { spaceId: workflowSpaceId } }),
    getFakeRequest: jest.fn(),
    getScopedEsClient: jest.fn().mockReturnValue({ search }),
    renderInputTemplate: jest.fn(),
  },
  input,
  logger: { debug: jest.fn(), error: jest.fn(), info: jest.fn(), warn: jest.fn() },
  rawInput: input,
  stepId: 'test-step',
  stepType: 'security.getAlertEntities',
});

describe('getAlertEntitiesStepDefinition', () => {
  it('has the step id', () => {
    expect(getAlertEntitiesStepDefinition.id).toBe('security.getAlertEntities');
  });

  it('returns the entities of the alerts', async () => {
    const search = jest.fn().mockResolvedValue({
      aggregations: {
        host_count: { value: 1 },
        host_entities: {
          buckets: [
            {
              doc_count: 3,
              key: 'host:a',
              latest: { hits: { hits: [{ fields: { 'host.name': ['A'] } }] } },
            },
          ],
        },
        user_count: { value: 0 },
        user_entities: { buckets: [] },
      },
    });
    const context = createMockContext(
      getAlertEntitiesInputSchema.parse({ alert_ids: ['x'] }),
      search
    );

    expect(await getAlertEntitiesStepDefinition.handler(context as never)).toEqual({
      output: {
        entities: [{ id: 'host:a', name: 'A', type: 'host' }],
        total: 1,
        truncated: false,
      },
    });
  });

  it('reads the alerts of the space Kibana resolves for the execution', async () => {
    const search = jest.fn().mockResolvedValue({});
    const context = createMockContext({ alert_ids: ['x'] }, search);

    await getAlertEntitiesStepDefinition.handler(context as never);

    expect(search).toHaveBeenCalledWith(
      expect.objectContaining({ index: '.alerts-security.alerts-custom-space' }),
      expect.anything()
    );
  });

  // The engine renders templates but does not validate the input. `${{ }}` delivers a number;
  // a `{{ }}` template or a quoted literal delivers a string.
  it('applies the defaults and coerces a quoted cap itself', async () => {
    const search = jest.fn().mockResolvedValue({});
    const context = createMockContext({ alert_ids: ['x'], max_entities: '7' }, search);

    await getAlertEntitiesStepDefinition.handler(context as never);

    const request = search.mock.calls[0][0];

    expect(Object.keys(request.runtime_mappings)).toEqual(['entity_host', 'entity_user']);
    expect(request.aggs.host_entities.terms.size).toBe(7);
  });

  it.each([
    ['no alert ids', {}],
    ['an empty list', { alert_ids: [] }],
    ['an unknown entity type', { alert_ids: ['x'], entity_types: ['generic'] }],
  ])('returns an error for %s without searching', async (_label, input) => {
    const search = jest.fn();
    const context = createMockContext(input, search);

    const result = await getAlertEntitiesStepDefinition.handler(context as never);

    expect(result).toEqual({ error: expect.objectContaining({ message: expect.any(String) }) });
    expect(search).not.toHaveBeenCalled();
  });

  // A step test can override `workflow.spaceId` through `contextOverride`.
  it('returns an error without searching when workflow.spaceId is not the execution space', async () => {
    const search = jest.fn();
    const context = createMockContext({ alert_ids: ['x'] }, search, {
      workflowSpaceId: 'default',
    });

    const result = await getAlertEntitiesStepDefinition.handler(context as never);

    expect(result).toEqual({
      error: expect.objectContaining({
        message: expect.stringContaining('workflow.spaceId does not match the execution space'),
      }),
    });
    expect(search).not.toHaveBeenCalled();
  });

  it('returns an error when the search fails', async () => {
    const search = jest.fn().mockRejectedValue(new Error('search failed'));
    const context = createMockContext({ alert_ids: ['x'] }, search);

    const result = await getAlertEntitiesStepDefinition.handler(context as never);

    expect(result).toEqual({ error: expect.objectContaining({ message: 'search failed' }) });
    expect(context.logger.error).toHaveBeenCalled();
  });

  // The engine reports an error's name as its type.
  it('returns the error itself, so its type survives', async () => {
    class ResponseError extends Error {
      public override name = 'ResponseError';
    }
    const failure = new ResponseError('security_exception');
    const search = jest.fn().mockRejectedValue(failure);
    const context = createMockContext({ alert_ids: ['x'] }, search);

    const result = await getAlertEntitiesStepDefinition.handler(context as never);

    expect(result?.error).toBe(failure);
  });

  it('does not log a failure that the abort caused', async () => {
    const controller = new AbortController();
    const search = jest.fn().mockImplementation(async () => {
      controller.abort();
      throw new Error('Request aborted');
    });
    const context = createMockContext({ alert_ids: ['x'] }, search, {
      abortSignal: controller.signal,
    });

    await getAlertEntitiesStepDefinition.handler(context as never);

    expect(context.logger.error).not.toHaveBeenCalled();
  });
});
