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

/** A full item as the exceptions APIs return it. */
const createdItem = {
  id: 'so-id',
  item_id: 'item-id',
  list_id: 'corporate-allowlist',
  namespace_type: 'agnostic',
  type: 'simple',
  name: 'Allow scanner IP',
  description: '',
  entries: [{ type: 'match', field: 'source.ip', operator: 'included', value: '192.168.1.1' }],
  comments: [],
  os_types: [],
  tags: [],
  tie_breaker_id: 'tie-breaker',
  created_at: '2026-07-09T00:00:00.000Z',
  created_by: 'elastic',
  updated_at: '2026-07-09T00:00:00.000Z',
  updated_by: 'elastic',
};

/** The summary slice of `createdItem` that the step promises as output. */
const createdItemOutput = {
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
        description: '',
        entries: [{ field: 'source.ip', operator: 'is', value: '192.168.1.1' }],
      },
      contextManager: mockContextManager,
    } as unknown as Context;
  });

  /** GET (item_id lookup) misses; POST/PUT succeed with the created item. */
  const mockLookupMissThenSucceed = () => {
    mockContextManager.callKibanaApi.mockImplementation(async ({ method }) => {
      if (method === 'GET') {
        throw new KibanaApiCallError({
          status: 404,
          headers: {},
          body: { message: 'not found' },
          message: 'HTTP 404: not found',
        });
      }
      return { status: 200, headers: {}, body: createdItem };
    });
  };

  it('creates the item in the target list and returns the created item summary', async () => {
    mockLookupMissThenSucceed();

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
    expect(result.output).toEqual({ ...createdItemOutput, outcome: 'created' });
  });

  /**
   * End-to-end input mapping: the raw `with:` block a user writes in the
   * workflow YAML is parsed through the step's inputSchema (as the workflow
   * engine does before invoking the handler) and must produce exactly this
   * request against the exception list items creation endpoint.
   */
  describe('workflow input to API request mapping', () => {
    beforeEach(() => {
      mockLookupMissThenSucceed();
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
          { field: 'source.ip', operator: 'is_one_of', values: ['10.0.50.5'] },
          { field: 'user.name', operator: 'is_not', value: 'root' },
        ],
      });

      // item_id is set, so the handler checks for an existing item first.
      expect(mockContextManager.callKibanaApi).toHaveBeenCalledTimes(2);
      expect(mockContextManager.callKibanaApi).toHaveBeenCalledWith({
        method: 'GET',
        path: `${EXCEPTION_LIST_ITEM_URL}?item_id=scanner-exception&namespace_type=agnostic`,
      });
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
              type: 'match_any',
              field: 'source.ip',
              operator: 'included',
              value: ['10.0.50.5'],
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
        description: '',
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

  describe('idempotency via item_id', () => {
    it('skips creation and returns the existing item when item_id exists', async () => {
      mockContextManager.callKibanaApi.mockResolvedValue({
        status: 200,
        headers: {},
        body: createdItem,
      });

      const result = await createExceptionListItemStepDefinition.handler(mockContext);

      expect(mockContextManager.callKibanaApi).toHaveBeenCalledTimes(1);
      expect(mockContextManager.callKibanaApi).toHaveBeenCalledWith({
        method: 'GET',
        path: `${EXCEPTION_LIST_ITEM_URL}?item_id=scanner-ip&namespace_type=agnostic`,
      });
      expect(result.output).toEqual({ ...createdItemOutput, outcome: 'skipped' });
    });

    it('updates the existing item when overwrite is true', async () => {
      // The lookup returns the item carrying the looked-up item_id; the PUT
      // must target that id.
      mockContextManager.callKibanaApi.mockImplementation(async ({ method }) => ({
        status: 200,
        headers: {},
        body: method === 'GET' ? { ...createdItem, item_id: 'scanner-ip' } : createdItem,
      }));
      mockContext = {
        ...mockContext,
        input: { ...mockContext.input, overwrite: true },
      } as Context;

      const result = await createExceptionListItemStepDefinition.handler(mockContext);

      expect(mockContextManager.callKibanaApi).toHaveBeenCalledTimes(2);
      expect(mockContextManager.callKibanaApi).toHaveBeenCalledWith({
        method: 'PUT',
        path: EXCEPTION_LIST_ITEM_URL,
        body: {
          item_id: 'scanner-ip',
          namespace_type: 'agnostic',
          name: 'Allow scanner IP',
          description: '',
          type: 'simple',
          entries: [
            { type: 'match', field: 'source.ip', operator: 'included', value: '192.168.1.1' },
          ],
        },
      });
      expect(result.output).toEqual({ ...createdItemOutput, outcome: 'overwritten' });
    });

    it('fails without skipping, overwriting, or creating when item_id belongs to a different list', async () => {
      const foreignItem = { ...createdItem, id: 'other-so-id', list_id: 'other-list' };
      mockContextManager.callKibanaApi.mockImplementation(async ({ method }) => ({
        status: 200,
        headers: {},
        body: method === 'GET' ? foreignItem : createdItem,
      }));
      mockContext = {
        ...mockContext,
        input: { ...mockContext.input, overwrite: true },
      } as Context;

      await expect(
        createExceptionListItemStepDefinition.handler(mockContext)
      ).rejects.toMatchObject({
        type: 'ConflictError',
        message: expect.stringContaining('other-list'),
      });

      expect(mockContextManager.callKibanaApi).toHaveBeenCalledTimes(1);
      expect(mockContextManager.callKibanaApi).toHaveBeenCalledWith({
        method: 'GET',
        path: `${EXCEPTION_LIST_ITEM_URL}?item_id=scanner-ip&namespace_type=agnostic`,
      });
      expect(mockContextManager.callKibanaApi).not.toHaveBeenCalledWith(
        expect.objectContaining({ method: 'PUT' })
      );
      expect(mockContextManager.callKibanaApi).not.toHaveBeenCalledWith(
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('rejects overwrite without item_id at the schema level', () => {
      const result = createExceptionListItemInputSchema.safeParse({
        list_id: 'corporate-allowlist',
        overwrite: true,
        name: 'Allow scanner IP',
        description: '',
        entries: [{ field: 'source.ip', operator: 'is', value: '192.168.1.1' }],
      });

      expect(result.success).toBe(false);
    });
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
