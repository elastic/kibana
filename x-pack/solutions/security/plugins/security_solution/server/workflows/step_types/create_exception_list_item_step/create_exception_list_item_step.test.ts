/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EXCEPTION_LIST_ITEM_URL } from '@kbn/securitysolution-list-constants';
import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import { KibanaApiCallError } from '@kbn/workflows-extensions/server';
import { ExecutionError } from '@kbn/workflows/server';
import { createExceptionListItemStepDefinition } from './create_exception_list_item_step';
import { createExceptionListItemInputSchema } from '../../../../common/workflows/step_types/create_exception_list_item_step/create_exception_list_item_step_common';

type Context = StepHandlerContext<typeof createExceptionListItemInputSchema>;

const createdItem = {
  id: 'so-id',
  item_id: 'item-id',
  list_id: 'corporate-allowlist',
  namespace_type: 'agnostic',
  name: 'Allow scanner IP',
  created_at: '2026-07-09T00:00:00.000Z',
  created_by: 'elastic',
};

describe('createExceptionListItemStepDefinition', () => {
  let mockContextManager: jest.Mocked<Context['contextManager']>;
  let mockContext: Context;

  beforeEach(() => {
    mockContextManager = {
      callKibanaApi: jest.fn(),
      getFakeRequest: jest.fn(),
    } as unknown as jest.Mocked<Context['contextManager']>;

    mockContext = {
      input: {
        list_id: 'corporate-allowlist',
        namespace_type: 'agnostic',
        item_id: 'scanner-ip',
        name: 'Allow scanner IP',
        entries: [{ field: 'source.ip', operator: 'is', value: '192.168.1.1' }],
      },
      contextManager: mockContextManager,
    } as unknown as Context;
  });

  it('creates the item in the target list and returns the created item summary', async () => {
    mockContextManager.callKibanaApi.mockResolvedValue({
      status: 200,
      headers: {},
      body: createdItem,
    });

    const result = await createExceptionListItemStepDefinition.handler(mockContext);

    expect(mockContextManager.callKibanaApi).toHaveBeenCalledWith({
      method: 'POST',
      path: EXCEPTION_LIST_ITEM_URL,
      body: {
        list_id: 'corporate-allowlist',
        namespace_type: 'agnostic',
        item_id: 'scanner-ip',
        name: 'Allow scanner IP',
        description: '',
        type: 'simple',
        entries: [
          { type: 'match', field: 'source.ip', operator: 'included', value: '192.168.1.1' },
        ],
      },
    });
    expect(result.output).toEqual(createdItem);
  });

  /**
   * End-to-end input mapping: the raw `with:` block a user writes in the
   * workflow YAML is parsed through the step's inputSchema (as the workflow
   * engine does before invoking the handler) and must produce exactly this
   * request against the exception list items creation endpoint.
   */
  describe('workflow input to API request mapping', () => {
    beforeEach(() => {
      mockContextManager.callKibanaApi.mockResolvedValue({
        status: 200,
        headers: {},
        body: createdItem,
      });
    });

    const handleParsedInput = async (userInput: unknown) => {
      const context = {
        input: createExceptionListItemInputSchema.parse(userInput),
        contextManager: mockContextManager,
      } as unknown as Context;
      await createExceptionListItemStepDefinition.handler(context);
    };

    it('maps a fully configured step input targeting a space-agnostic list', async () => {
      await handleParsedInput({
        list_id: 'corporate-allowlist',
        namespace_type: 'agnostic',
        item_id: 'scanner-exception',
        name: 'Allow approved scanners',
        description: 'Scanner traffic reviewed by SOC',
        os_types: ['linux'],
        tags: ['workflow-created'],
        expire_time: '2026-08-01T00:00:00.000Z',
        comments: ['created by workflow'],
        entries: [
          { field: 'source.ip', operator: 'is_in_list', list: { id: 'scanner_ips', type: 'ip' } },
          { field: 'user.name', operator: 'is_not', value: 'root' },
        ],
      });

      expect(mockContextManager.callKibanaApi).toHaveBeenCalledTimes(1);
      expect(mockContextManager.callKibanaApi).toHaveBeenCalledWith({
        method: 'POST',
        path: EXCEPTION_LIST_ITEM_URL,
        body: {
          list_id: 'corporate-allowlist',
          namespace_type: 'agnostic',
          item_id: 'scanner-exception',
          name: 'Allow approved scanners',
          description: 'Scanner traffic reviewed by SOC',
          type: 'simple',
          os_types: ['linux'],
          tags: ['workflow-created'],
          expire_time: '2026-08-01T00:00:00.000Z',
          comments: [{ comment: 'created by workflow' }],
          entries: [
            {
              type: 'list',
              field: 'source.ip',
              operator: 'included',
              list: { id: 'scanner_ips', type: 'ip' },
            },
            { type: 'match', field: 'user.name', operator: 'excluded', value: 'root' },
          ],
        },
      });
    });

    it('defaults namespace_type to single and omits unset optional fields', async () => {
      await handleParsedInput({
        list_id: 'corporate-allowlist',
        name: 'Allow scanner IP',
        entries: [{ field: 'source.ip', operator: 'is', value: '192.168.1.1' }],
      });

      expect(mockContextManager.callKibanaApi).toHaveBeenCalledWith({
        method: 'POST',
        path: EXCEPTION_LIST_ITEM_URL,
        body: {
          list_id: 'corporate-allowlist',
          namespace_type: 'single',
          name: 'Allow scanner IP',
          description: '',
          type: 'simple',
          entries: [
            { type: 'match', field: 'source.ip', operator: 'included', value: '192.168.1.1' },
          ],
        },
      });
    });
  });

  it('omits item_id from the request body when not provided', async () => {
    mockContext = {
      ...mockContext,
      input: { ...mockContext.input, item_id: undefined },
    } as Context;
    mockContextManager.callKibanaApi.mockResolvedValue({
      status: 200,
      headers: {},
      body: createdItem,
    });

    await createExceptionListItemStepDefinition.handler(mockContext);

    const [{ body }] = mockContextManager.callKibanaApi.mock.calls[0];
    expect(body).not.toHaveProperty('item_id');
  });

  it('throws a normalized ExecutionError when the API call fails (e.g. list not found)', async () => {
    mockContextManager.callKibanaApi.mockRejectedValue(
      new KibanaApiCallError({
        status: 404,
        headers: {},
        body: { message: 'exception list corporate-allowlist does not exist' },
        message: 'HTTP 404: exception list corporate-allowlist does not exist',
      })
    );

    await expect(createExceptionListItemStepDefinition.handler(mockContext)).rejects.toThrow(
      ExecutionError
    );
  });
});
