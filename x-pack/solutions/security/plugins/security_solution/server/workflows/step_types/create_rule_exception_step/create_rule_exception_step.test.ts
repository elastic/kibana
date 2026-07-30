/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import { KibanaApiCallError } from '@kbn/workflows-extensions/server';
import { ExecutionError } from '@kbn/workflows/server';
import { createRuleExceptionStepDefinition } from './create_rule_exception_step';
import { createRuleExceptionInputSchema } from '../../../../common/workflows/step_types/create_rule_exception_step/create_rule_exception_step_common';
import { DETECTION_ENGINE_RULES_URL } from '../../../../common/constants';

type Context = StepHandlerContext<typeof createRuleExceptionInputSchema>;

const RULE_ID = 'a962a9be-0be1-4b1e-8bc7-4570d18a2202';
const RULE_LOOKUP_PATH = `${DETECTION_ENGINE_RULES_URL}?id=${RULE_ID}`;

/** A rule with no exception lists attached yet. */
const ruleWithNoExceptionsList = { id: RULE_ID, exceptions_list: [] };

/** A rule whose default list is `rule-default-list`, matching `createdItem`. */
const ruleWithDefaultList = {
  id: RULE_ID,
  exceptions_list: [
    {
      id: 'list-so-id',
      list_id: 'rule-default-list',
      type: 'rule_default',
      namespace_type: 'single',
    },
  ],
};

/** A full item as the exceptions APIs return it. */
const createdItem = {
  id: 'so-id',
  item_id: 'item-id',
  list_id: 'rule-default-list',
  namespace_type: 'single',
  type: 'simple',
  name: 'Exclude maintenance host',
  description: '',
  entries: [{ type: 'match', field: 'host.name', operator: 'included', value: 'my-host' }],
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
  list_id: 'rule-default-list',
  namespace_type: 'single',
  name: 'Exclude maintenance host',
  created_at: '2026-07-09T00:00:00.000Z',
  created_by: 'elastic',
};

describe('createRuleExceptionStepDefinition', () => {
  let mockContextManager: jest.Mocked<Context['contextManager']>;
  let mockContext: Context;

  beforeEach(() => {
    mockContextManager = {
      callKibanaApi: jest.fn(),
      getFakeRequest: jest.fn(),
    } as unknown as jest.Mocked<Context['contextManager']>;

    mockContext = {
      input: {
        rule_id: 'a962a9be-0be1-4b1e-8bc7-4570d18a2202',
        name: 'Exclude maintenance host',
        description: '',
        entries: [{ field: 'host.name', operator: 'is', value: 'my-host' }],
      },
      contextManager: mockContextManager,
    } as unknown as Context;
  });

  it('creates the exception on the rule and returns the created item summary', async () => {
    mockContextManager.callKibanaApi.mockResolvedValue({
      status: 200,
      headers: {},
      body: [createdItem],
    });

    const result = await createRuleExceptionStepDefinition.handler(mockContext);

    expect(mockContextManager.callKibanaApi).toHaveBeenCalledWith({
      method: 'POST',
      path: '/api/detection_engine/rules/a962a9be-0be1-4b1e-8bc7-4570d18a2202/exceptions',
      body: {
        items: [
          {
            name: 'Exclude maintenance host',
            description: '',
            type: 'simple',
            entries: [
              { type: 'match', field: 'host.name', operator: 'included', value: 'my-host' },
            ],
          },
        ],
      },
    });
    expect(result.output).toEqual({ ...createdItemOutput, outcome: 'created' });
  });

  /**
   * End-to-end input mapping: the raw `with:` block a user writes in the
   * workflow YAML is parsed through the step's inputSchema (as the workflow
   * engine does before invoking the handler) and must produce exactly this
   * request against the rule exceptions creation endpoint.
   */
  describe('workflow input to API request mapping', () => {
    beforeEach(() => {
      // GET (item_id lookup) misses; POST creates. The item_id has never
      // been used, so the rule's own default list is never even fetched.
      mockContextManager.callKibanaApi.mockImplementation(async ({ method }) => {
        if (method === 'GET') {
          throw new KibanaApiCallError({
            status: 404,
            headers: {},
            body: { message: 'not found' },
            message: 'HTTP 404: not found',
          });
        }
        return { status: 200, headers: {}, body: [createdItem] };
      });
    });

    const handleParsedInput = async (userInput: unknown) => {
      const context = {
        input: createRuleExceptionInputSchema.parse(userInput),
        contextManager: mockContextManager,
      } as unknown as Context;
      await createRuleExceptionStepDefinition.handler(context);
    };

    it('maps a fully configured step input, covering every entry operator', async () => {
      await handleParsedInput({
        rule_id: 'a962a9be-0be1-4b1e-8bc7-4570d18a2202',
        item_id: 'scan-2026-07-14-a962a9be',
        name: 'Exclude signed maintenance activity',
        description: 'Created by the patching workflow',
        os_types: ['windows', 'linux'],
        tags: ['workflow-created'],
        expire_time: '2026-08-01T00:00:00.000Z',
        comments: ['first comment', 'second comment'],
        entries: [
          { field: 'host.name', operator: 'is', value: 'build-agent-01' },
          { field: 'user.name', operator: 'is_not', value: 'root' },
          { field: 'process.name', operator: 'is_one_of', values: ['a.exe', 'b.exe'] },
          { field: 'user.domain', operator: 'is_not_one_of', values: ['CORP'] },
          { field: 'file.path', operator: 'matches', value: 'C:\\temp\\*' },
          { field: 'file.name', operator: 'does_not_match', value: '*.tmp' },
          { field: 'agent.id', operator: 'exists' },
          { field: 'user.email', operator: 'does_not_exist' },
        ],
      });

      // item_id is set, so the handler checks for an existing item first; it
      // misses, so the rule's own default list is never even fetched.
      expect(mockContextManager.callKibanaApi).toHaveBeenCalledTimes(2);
      expect(mockContextManager.callKibanaApi).toHaveBeenCalledWith({
        method: 'GET',
        path: '/api/exception_lists/items?item_id=scan-2026-07-14-a962a9be&namespace_type=single',
      });
      expect(mockContextManager.callKibanaApi).toHaveBeenCalledWith({
        method: 'POST',
        path: '/api/detection_engine/rules/a962a9be-0be1-4b1e-8bc7-4570d18a2202/exceptions',
        body: {
          items: [
            {
              item_id: 'scan-2026-07-14-a962a9be',
              name: 'Exclude signed maintenance activity',
              description: 'Created by the patching workflow',
              type: 'simple',
              os_types: ['windows', 'linux'],
              tags: ['workflow-created'],
              expire_time: '2026-08-01T00:00:00.000Z',
              comments: [{ comment: 'first comment' }, { comment: 'second comment' }],
              entries: [
                {
                  type: 'match',
                  field: 'host.name',
                  operator: 'included',
                  value: 'build-agent-01',
                },
                { type: 'match', field: 'user.name', operator: 'excluded', value: 'root' },
                {
                  type: 'match_any',
                  field: 'process.name',
                  operator: 'included',
                  value: ['a.exe', 'b.exe'],
                },
                { type: 'match_any', field: 'user.domain', operator: 'excluded', value: ['CORP'] },
                {
                  type: 'wildcard',
                  field: 'file.path',
                  operator: 'included',
                  value: 'C:\\temp\\*',
                },
                { type: 'wildcard', field: 'file.name', operator: 'excluded', value: '*.tmp' },
                { type: 'exists', field: 'agent.id', operator: 'included' },
                { type: 'exists', field: 'user.email', operator: 'excluded' },
              ],
            },
          ],
        },
      });
    });

    it('maps value-list entries, which must be the only conditions of an item', async () => {
      await handleParsedInput({
        rule_id: 'a962a9be-0be1-4b1e-8bc7-4570d18a2202',
        name: 'Exclude approved ips',
        description: '',
        entries: [
          { field: 'source.ip', operator: 'is_in_list', list: { id: 'scanner_ips', type: 'ip' } },
          {
            field: 'destination.ip',
            operator: 'is_not_in_list',
            list: { id: 'blocked_ips', type: 'ip' },
          },
        ],
      });

      expect(mockContextManager.callKibanaApi).toHaveBeenCalledWith({
        method: 'POST',
        path: '/api/detection_engine/rules/a962a9be-0be1-4b1e-8bc7-4570d18a2202/exceptions',
        body: {
          items: [
            {
              name: 'Exclude approved ips',
              description: '',
              type: 'simple',
              entries: [
                {
                  type: 'list',
                  field: 'source.ip',
                  operator: 'included',
                  list: { id: 'scanner_ips', type: 'ip' },
                },
                {
                  type: 'list',
                  field: 'destination.ip',
                  operator: 'excluded',
                  list: { id: 'blocked_ips', type: 'ip' },
                },
              ],
            },
          ],
        },
      });
    });

    it('maps a minimal step input without adding optional fields to the request', async () => {
      await handleParsedInput({
        rule_id: 'a962a9be-0be1-4b1e-8bc7-4570d18a2202',
        name: 'Exclude host',
        description: '',
        entries: [{ field: 'host.name', operator: 'is', value: 'build-agent-01' }],
      });

      expect(mockContextManager.callKibanaApi).toHaveBeenCalledWith({
        method: 'POST',
        path: '/api/detection_engine/rules/a962a9be-0be1-4b1e-8bc7-4570d18a2202/exceptions',
        body: {
          items: [
            {
              name: 'Exclude host',
              description: '',
              type: 'simple',
              entries: [
                {
                  type: 'match',
                  field: 'host.name',
                  operator: 'included',
                  value: 'build-agent-01',
                },
              ],
            },
          ],
        },
      });
      const [{ body }] = mockContextManager.callKibanaApi.mock.calls[0];
      expect((body as { items: object[] }).items[0]).not.toHaveProperty('item_id');
    });
  });

  describe('idempotency via item_id', () => {
    const inputWithItemId = {
      rule_id: 'a962a9be-0be1-4b1e-8bc7-4570d18a2202',
      item_id: 'scan-window-item',
      name: 'Exclude maintenance host',
      description: '',
      entries: [{ field: 'host.name', operator: 'is', value: 'my-host' }],
    };

    it("skips creation and returns the existing item when item_id exists on the rule's own list", async () => {
      mockContextManager.callKibanaApi.mockImplementation(async ({ method, path }) => ({
        status: 200,
        headers: {},
        body: method === 'GET' && path === RULE_LOOKUP_PATH ? ruleWithDefaultList : createdItem,
      }));
      mockContext = {
        input: createRuleExceptionInputSchema.parse(inputWithItemId),
        contextManager: mockContextManager,
      } as unknown as Context;

      const result = await createRuleExceptionStepDefinition.handler(mockContext);

      expect(mockContextManager.callKibanaApi).toHaveBeenCalledTimes(2);
      expect(mockContextManager.callKibanaApi).toHaveBeenCalledWith({
        method: 'GET',
        path: RULE_LOOKUP_PATH,
      });
      expect(mockContextManager.callKibanaApi).toHaveBeenCalledWith({
        method: 'GET',
        path: '/api/exception_lists/items?item_id=scan-window-item&namespace_type=single',
      });
      expect(result.output).toEqual({ ...createdItemOutput, outcome: 'skipped' });
    });

    it('updates the existing item when overwrite is true', async () => {
      // The lookup returns the item carrying the looked-up item_id, on the
      // rule's own default list; the PUT must target that id.
      mockContextManager.callKibanaApi.mockImplementation(async ({ method, path }) => {
        if (method === 'GET' && path === RULE_LOOKUP_PATH) {
          return { status: 200, headers: {}, body: ruleWithDefaultList };
        }
        return {
          status: 200,
          headers: {},
          body: method === 'GET' ? { ...createdItem, item_id: 'scan-window-item' } : createdItem,
        };
      });
      mockContext = {
        input: createRuleExceptionInputSchema.parse({ ...inputWithItemId, overwrite: true }),
        contextManager: mockContextManager,
      } as unknown as Context;

      const result = await createRuleExceptionStepDefinition.handler(mockContext);

      expect(mockContextManager.callKibanaApi).toHaveBeenCalledTimes(3);
      expect(mockContextManager.callKibanaApi).toHaveBeenCalledWith({
        method: 'PUT',
        path: '/api/exception_lists/items',
        body: {
          item_id: 'scan-window-item',
          namespace_type: 'single',
          name: 'Exclude maintenance host',
          description: '',
          type: 'simple',
          entries: [{ type: 'match', field: 'host.name', operator: 'included', value: 'my-host' }],
        },
      });
      expect(result.output).toEqual({ ...createdItemOutput, outcome: 'overwritten' });
    });

    it('fails without skipping, overwriting, or creating when item_id belongs to a different, shared list', async () => {
      // A different list already has an item with this item_id. The rule
      // does have its own default list, but that list has no item with this
      // item_id: the shared item must be neither skipped nor overwritten,
      // and a new item must not be created either (that would silently
      // duplicate the item_id, since the rule-exceptions creation endpoint
      // has no uniqueness check of its own).
      const foreignItem = { ...createdItem, id: 'shared-so-id', list_id: 'shared-list' };
      mockContextManager.callKibanaApi.mockImplementation(async ({ method, path }) => {
        if (method === 'GET' && path === RULE_LOOKUP_PATH) {
          return { status: 200, headers: {}, body: ruleWithDefaultList };
        }
        if (method === 'GET') {
          return { status: 200, headers: {}, body: foreignItem };
        }
        return { status: 200, headers: {}, body: [createdItem] };
      });
      mockContext = {
        input: createRuleExceptionInputSchema.parse({ ...inputWithItemId, overwrite: true }),
        contextManager: mockContextManager,
      } as unknown as Context;

      await expect(createRuleExceptionStepDefinition.handler(mockContext)).rejects.toMatchObject({
        type: 'ConflictError',
        message: expect.stringContaining('shared-list'),
      });

      expect(mockContextManager.callKibanaApi).toHaveBeenCalledTimes(2);
      expect(mockContextManager.callKibanaApi).toHaveBeenCalledWith({
        method: 'GET',
        path: '/api/exception_lists/items?item_id=scan-window-item&namespace_type=single',
      });
      expect(mockContextManager.callKibanaApi).toHaveBeenCalledWith({
        method: 'GET',
        path: RULE_LOOKUP_PATH,
      });
      expect(mockContextManager.callKibanaApi).not.toHaveBeenCalledWith(
        expect.objectContaining({ method: 'PUT' })
      );
      expect(mockContextManager.callKibanaApi).not.toHaveBeenCalledWith(
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('fails the same way when the rule has no default list of its own yet', async () => {
      // The rule has no rule_default list at all, but the item_id already
      // exists on an unrelated list. There is nothing to skip/overwrite
      // (the rule has no list), and creating would still duplicate the
      // item_id, so this must fail rather than silently create.
      const foreignItem = { ...createdItem, id: 'shared-so-id', list_id: 'shared-list' };
      mockContextManager.callKibanaApi.mockImplementation(async ({ method, path }) => {
        if (method === 'GET' && path === RULE_LOOKUP_PATH) {
          return { status: 200, headers: {}, body: ruleWithNoExceptionsList };
        }
        if (method === 'GET') {
          return { status: 200, headers: {}, body: foreignItem };
        }
        return { status: 200, headers: {}, body: [createdItem] };
      });
      mockContext = {
        input: createRuleExceptionInputSchema.parse(inputWithItemId),
        contextManager: mockContextManager,
      } as unknown as Context;

      await expect(createRuleExceptionStepDefinition.handler(mockContext)).rejects.toMatchObject({
        type: 'ConflictError',
      });
      expect(mockContextManager.callKibanaApi).not.toHaveBeenCalledWith(
        expect.objectContaining({ method: 'POST' })
      );
    });

    it("creates on the rule's own list without an extra lookup when item_id has never been used", async () => {
      // The common case: item_id is fresh, so the rule's own list is never
      // even fetched (no candidate to compare it against).
      mockContextManager.callKibanaApi.mockImplementation(async ({ method }) => {
        if (method === 'GET') {
          throw new KibanaApiCallError({
            status: 404,
            headers: {},
            body: { message: 'not found' },
            message: 'HTTP 404: not found',
          });
        }
        return { status: 200, headers: {}, body: [createdItem] };
      });
      mockContext = {
        input: createRuleExceptionInputSchema.parse(inputWithItemId),
        contextManager: mockContextManager,
      } as unknown as Context;

      const result = await createRuleExceptionStepDefinition.handler(mockContext);

      expect(mockContextManager.callKibanaApi).toHaveBeenCalledTimes(2);
      expect(mockContextManager.callKibanaApi).toHaveBeenCalledWith({
        method: 'GET',
        path: '/api/exception_lists/items?item_id=scan-window-item&namespace_type=single',
      });
      expect(mockContextManager.callKibanaApi).not.toHaveBeenCalledWith(
        expect.objectContaining({ path: RULE_LOOKUP_PATH })
      );
      expect(result.output).toEqual({ ...createdItemOutput, outcome: 'created' });
    });

    it('rejects overwrite without item_id at the schema level', () => {
      const result = createRuleExceptionInputSchema.safeParse({
        rule_id: 'a962a9be-0be1-4b1e-8bc7-4570d18a2202',
        overwrite: true,
        name: 'Exclude host',
        description: '',
        entries: [{ field: 'host.name', operator: 'is', value: 'my-host' }],
      });

      expect(result.success).toBe(false);
    });
  });

  it('throws a normalized ExecutionError when the API call fails', async () => {
    mockContextManager.callKibanaApi.mockRejectedValue(
      new KibanaApiCallError({
        status: 404,
        headers: {},
        body: { message: 'rule not found' },
        message: 'HTTP 404: rule not found',
      })
    );

    await expect(createRuleExceptionStepDefinition.handler(mockContext)).rejects.toThrow(
      ExecutionError
    );
  });

  it('throws an ExecutionError when the response is not an array of items', async () => {
    mockContextManager.callKibanaApi.mockResolvedValue({
      status: 200,
      headers: {},
      body: { message: 'unexpected' },
    });

    await expect(createRuleExceptionStepDefinition.handler(mockContext)).rejects.toThrow(
      ExecutionError
    );
  });
});
