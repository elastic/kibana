/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionError } from '@kbn/workflows/server';
import type { StepHandlerContext } from '@kbn/workflows-extensions/server';
import { KibanaApiCallError } from '@kbn/workflows-extensions/server';
import { EXCEPTION_LIST_ITEM_URL } from '@kbn/securitysolution-list-constants';
import { ALL_OPERATORS } from '@kbn/securitysolution-list-utils';
import type { EntriesArray } from '@kbn/securitysolution-io-ts-list-types';
import type { ExceptionListItem } from '@kbn/securitysolution-exceptions-common/api';
import type { ExceptionEntryInput } from '../../../common/workflows/step_types/exceptions/common/exception_item_schemas';
import { exceptionEntryOperatorSchema } from '../../../common/workflows/step_types/exceptions/common/exception_item_schemas';
import {
  createExceptionItemForRule,
  createExceptionItemInList,
  ExceptionItemStepAction,
  findExceptionItemByItemId,
  toApiEntries,
  toCreateExceptionItemBody,
  toExceptionItemOutput,
  updateExceptionItemByItemId,
  validateExceptionItemResponse,
} from './exception_item';

describe('toApiEntries', () => {
  it.each<[ExceptionEntryInput, EntriesArray[number]]>([
    [
      { field: 'host.name', operator: 'is', value: 'my-host' },
      { type: 'match', field: 'host.name', operator: 'included', value: 'my-host' },
    ],
    [
      { field: 'user.name', operator: 'is_not', value: 'root' },
      { type: 'match', field: 'user.name', operator: 'excluded', value: 'root' },
    ],
    [
      { field: 'file.path', operator: 'matches', value: 'C:\\temp\\*' },
      { type: 'wildcard', field: 'file.path', operator: 'included', value: 'C:\\temp\\*' },
    ],
    [
      { field: 'file.path', operator: 'does_not_match', value: '*.tmp' },
      { type: 'wildcard', field: 'file.path', operator: 'excluded', value: '*.tmp' },
    ],
    [
      { field: 'user.name', operator: 'is_one_of', values: ['a', 'b'] },
      { type: 'match_any', field: 'user.name', operator: 'included', value: ['a', 'b'] },
    ],
    [
      { field: 'user.name', operator: 'is_not_one_of', values: ['a'] },
      { type: 'match_any', field: 'user.name', operator: 'excluded', value: ['a'] },
    ],
    [
      { field: 'agent.id', operator: 'exists' },
      { type: 'exists', field: 'agent.id', operator: 'included' },
    ],
    [
      { field: 'agent.id', operator: 'does_not_exist' },
      { type: 'exists', field: 'agent.id', operator: 'excluded' },
    ],
    [
      { field: 'source.ip', operator: 'is_in_list', list: { id: 'ips', type: 'ip' } },
      { type: 'list', field: 'source.ip', operator: 'included', list: { id: 'ips', type: 'ip' } },
    ],
    [
      { field: 'source.ip', operator: 'is_not_in_list', list: { id: 'ips', type: 'ip' } },
      { type: 'list', field: 'source.ip', operator: 'excluded', list: { id: 'ips', type: 'ip' } },
    ],
  ])('maps %j onto the exceptions API union', (input, expected) => {
    expect(toApiEntries([input])).toEqual([expected]);
  });

  // Drift guard: the step's operator vocabulary and its (type, operator)
  // mapping intentionally mirror the exceptions UI operator catalog
  // (kbn-securitysolution-list-utils `ALL_OPERATORS`). The mapping is kept
  // explicit in `toApiEntries` so the step contract only changes by
  // deliberate edit; these assertions surface any divergence between the two.
  describe('consistency with the UI operator catalog', () => {
    it('covers exactly the operators the UI offers', () => {
      expect([...ALL_OPERATORS.map(({ value }) => value)].sort()).toEqual(
        [...exceptionEntryOperatorSchema.options].sort()
      );
    });

    it.each(ALL_OPERATORS.map((uiOperator) => [uiOperator.value, uiOperator] as const))(
      'maps `%s` to the same entry type and operator as the UI',
      (_, uiOperator) => {
        const operand =
          uiOperator.type === 'match_any'
            ? { values: ['a'] }
            : uiOperator.type === 'list'
            ? { list: { id: 'ips', type: 'ip' as const } }
            : uiOperator.type === 'exists'
            ? {}
            : { value: 'a' };

        const [apiEntry] = toApiEntries([
          {
            field: 'host.name',
            operator: uiOperator.value as ExceptionEntryInput['operator'],
            ...operand,
          },
        ]);

        // Narrows away the `nested` variant of the entries union, which has
        // no `operator`; the steps never produce nested entries.
        if (apiEntry.type === 'nested') {
          throw new Error('toApiEntries unexpectedly produced a nested entry');
        }
        expect(apiEntry.type).toBe(uiOperator.type);
        expect(apiEntry.operator).toBe(uiOperator.operator);
      }
    );
  });

  it.each<[ExceptionEntryInput['operator'], string]>([
    ['is', 'value'],
    ['is_not', 'value'],
    ['matches', 'value'],
    ['does_not_match', 'value'],
    ['is_one_of', 'values'],
    ['is_not_one_of', 'values'],
    ['is_in_list', 'list'],
    ['is_not_in_list', 'list'],
  ])('throws a ValidationError when the `%s` operand `%s` is missing', (operator, operandKey) => {
    expect(() => toApiEntries([{ field: 'host.name', operator }])).toThrow(ExecutionError);
    expect(() => toApiEntries([{ field: 'host.name', operator }])).toThrow(
      `Exception entry on field "host.name" is missing \`${operandKey}\`, required for \`${operator}\` entries`
    );
  });
});

describe('toCreateExceptionItemBody', () => {
  it('builds a minimal item body', () => {
    expect(
      toCreateExceptionItemBody({
        name: 'My exception',
        description: '',
        entries: [{ field: 'host.name', operator: 'is', value: 'my-host' }],
      })
    ).toEqual({
      name: 'My exception',
      description: '',
      type: 'simple',
      entries: [{ type: 'match', field: 'host.name', operator: 'included', value: 'my-host' }],
    });
  });

  it('forwards the optional item fields and wraps comments', () => {
    expect(
      toCreateExceptionItemBody({
        name: 'My exception',
        description: 'A description',
        entries: [{ field: 'agent.id', operator: 'exists' }],
        os_types: ['windows', 'linux'],
        tags: ['workflow'],
        expire_time: '2026-08-01T00:00:00.000Z',
        comments: ['created by workflow'],
      })
    ).toEqual({
      name: 'My exception',
      description: 'A description',
      type: 'simple',
      entries: [{ type: 'exists', field: 'agent.id', operator: 'included' }],
      os_types: ['windows', 'linux'],
      tags: ['workflow'],
      expire_time: '2026-08-01T00:00:00.000Z',
      comments: [{ comment: 'created by workflow' }],
    });
  });
});

const itemSummary = {
  id: 'so-id',
  item_id: 'item-id',
  list_id: 'list-id',
  namespace_type: 'single',
  name: 'My exception',
  created_at: '2026-07-09T00:00:00.000Z',
  created_by: 'elastic',
} as const;

/** A full API response item: the summary plus fields the steps do not promise. */
const apiItem: ExceptionListItem = {
  ...itemSummary,
  description: '',
  type: 'simple',
  entries: [],
  comments: [],
  os_types: [],
  tags: [],
  tie_breaker_id: 'tie-breaker',
  updated_at: '2026-07-09T00:00:00.000Z',
  updated_by: 'elastic',
};

describe('validateExceptionItemResponse', () => {
  it('returns the validated item', () => {
    expect(
      validateExceptionItemResponse(apiItem, ExceptionItemStepAction.CreateRuleException)
    ).toEqual(apiItem);
  });

  it('includes expire_time when present', () => {
    const validated = validateExceptionItemResponse(
      { ...apiItem, expire_time: '2026-08-01T00:00:00.000Z' },
      ExceptionItemStepAction.CreateRuleException
    );

    expect(validated.expire_time).toBe('2026-08-01T00:00:00.000Z');
  });

  it('throws an ExecutionError carrying the parse issues on an unexpected response shape', () => {
    let thrown: unknown;
    try {
      validateExceptionItemResponse(
        { ...apiItem, created_at: 'not-a-date' },
        ExceptionItemStepAction.CreateRuleException
      );
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(ExecutionError);
    const executionError = thrown as ExecutionError;
    expect(executionError.type).toBe('ApiError');
    expect(executionError.message).toBe(
      'Failed to create rule exception: unexpected exception item response shape'
    );
    expect(executionError.details).toEqual({
      issues: expect.stringMatching(/^created_at: /),
    });
  });

  it('reports the issue when the body is not an object', () => {
    let thrown: unknown;
    try {
      validateExceptionItemResponse(undefined, ExceptionItemStepAction.CreateRuleException);
    } catch (error) {
      thrown = error;
    }

    expect((thrown as ExecutionError).details).toEqual({
      issues: expect.any(String),
    });
  });
});

describe('toExceptionItemOutput', () => {
  it('projects the item summary and adds the outcome', () => {
    expect(toExceptionItemOutput(apiItem, 'created')).toEqual({
      output: { ...itemSummary, outcome: 'created' },
    });
    expect(toExceptionItemOutput(apiItem, 'skipped').output.outcome).toBe('skipped');
  });
});

describe('findExceptionItemByItemId', () => {
  let mockContextManager: jest.Mocked<StepHandlerContext['contextManager']>;

  beforeEach(() => {
    mockContextManager = {
      callKibanaApi: jest.fn(),
    } as unknown as jest.Mocked<StepHandlerContext['contextManager']>;
  });

  it('returns the validated item summary when the item exists', async () => {
    mockContextManager.callKibanaApi.mockResolvedValue({
      status: 200,
      headers: {},
      body: apiItem,
    });

    await expect(
      findExceptionItemByItemId(
        mockContextManager,
        ExceptionItemStepAction.CreateRuleException,
        'my item id',
        'single'
      )
    ).resolves.toEqual(apiItem);
    expect(mockContextManager.callKibanaApi).toHaveBeenCalledWith({
      method: 'GET',
      path: `${EXCEPTION_LIST_ITEM_URL}?item_id=my%20item%20id&namespace_type=single`,
    });
  });

  it('returns undefined on 404', async () => {
    mockContextManager.callKibanaApi.mockRejectedValue(
      new KibanaApiCallError({ status: 404, headers: {}, body: {}, message: 'HTTP 404' })
    );

    await expect(
      findExceptionItemByItemId(
        mockContextManager,
        ExceptionItemStepAction.CreateRuleException,
        'missing',
        'single'
      )
    ).resolves.toBeUndefined();
  });

  it('rethrows non-404 errors', async () => {
    mockContextManager.callKibanaApi.mockRejectedValue(
      new KibanaApiCallError({ status: 403, headers: {}, body: {}, message: 'HTTP 403' })
    );

    await expect(
      findExceptionItemByItemId(
        mockContextManager,
        ExceptionItemStepAction.CreateRuleException,
        'x',
        'single'
      )
    ).rejects.toThrow(KibanaApiCallError);
  });
});

describe('createExceptionItemForRule', () => {
  const mockManager = () =>
    ({
      callKibanaApi: jest.fn().mockResolvedValue({ status: 200, headers: {}, body: [apiItem] }),
    } as unknown as jest.Mocked<StepHandlerContext['contextManager']>);

  it('sends a POST to the rule exceptions endpoint and returns the validated item', async () => {
    const mockContextManager = mockManager();

    const created = await createExceptionItemForRule(
      mockContextManager,
      ExceptionItemStepAction.CreateRuleException,
      'rule-uuid',
      'my-item',
      {
        name: 'My exception',
        description: '',
        entries: [{ field: 'host.name', operator: 'is', value: 'my-host' }],
      }
    );

    expect(mockContextManager.callKibanaApi).toHaveBeenCalledWith({
      method: 'POST',
      path: '/api/detection_engine/rules/rule-uuid/exceptions',
      body: {
        items: [
          {
            item_id: 'my-item',
            name: 'My exception',
            description: '',
            type: 'simple',
            entries: [
              { type: 'match', field: 'host.name', operator: 'included', value: 'my-host' },
            ],
          },
        ],
      },
    });
    expect(created).toEqual(apiItem);
  });

  it('omits item_id when not provided and throws on a non-array response', async () => {
    const mockContextManager = mockManager();
    mockContextManager.callKibanaApi.mockResolvedValueOnce({
      status: 200,
      headers: {},
      body: { message: 'unexpected' },
    });

    await expect(
      createExceptionItemForRule(
        mockContextManager,
        ExceptionItemStepAction.CreateRuleException,
        'rule-uuid',
        undefined,
        {
          name: 'My exception',
          description: '',
          entries: [{ field: 'host.name', operator: 'is', value: 'my-host' }],
        }
      )
    ).rejects.toThrow(ExecutionError);
  });
});

describe('createExceptionItemInList', () => {
  it('sends a POST with the list targeting and item fields, returning the validated summary', async () => {
    const mockContextManager = {
      callKibanaApi: jest.fn().mockResolvedValue({ status: 200, headers: {}, body: apiItem }),
    } as unknown as jest.Mocked<StepHandlerContext['contextManager']>;

    const created = await createExceptionItemInList(
      mockContextManager,
      ExceptionItemStepAction.CreateExceptionListItem,
      'my-list',
      'single',
      'my-item',
      {
        name: 'My exception',
        description: 'A description',
        entries: [{ field: 'host.name', operator: 'is', value: 'my-host' }],
        comments: ['a comment'],
      }
    );

    expect(mockContextManager.callKibanaApi).toHaveBeenCalledWith({
      method: 'POST',
      path: EXCEPTION_LIST_ITEM_URL,
      body: {
        list_id: 'my-list',
        namespace_type: 'single',
        item_id: 'my-item',
        name: 'My exception',
        description: 'A description',
        type: 'simple',
        entries: [{ type: 'match', field: 'host.name', operator: 'included', value: 'my-host' }],
        comments: [{ comment: 'a comment' }],
      },
    });
    expect(created).toEqual(apiItem);
  });

  it('omits item_id when not provided', async () => {
    const mockContextManager = {
      callKibanaApi: jest.fn().mockResolvedValue({ status: 200, headers: {}, body: apiItem }),
    } as unknown as jest.Mocked<StepHandlerContext['contextManager']>;

    await createExceptionItemInList(
      mockContextManager,
      ExceptionItemStepAction.CreateExceptionListItem,
      'my-list',
      'single',
      undefined,
      {
        name: 'My exception',
        description: '',
        entries: [{ field: 'host.name', operator: 'is', value: 'my-host' }],
      }
    );

    const [{ body }] = mockContextManager.callKibanaApi.mock.calls[0];
    expect(body).not.toHaveProperty('item_id');
  });
});

describe('updateExceptionItemByItemId', () => {
  it('sends a PUT with the item fields, without comments', async () => {
    const mockContextManager = {
      callKibanaApi: jest.fn().mockResolvedValue({ status: 200, headers: {}, body: apiItem }),
    } as unknown as jest.Mocked<StepHandlerContext['contextManager']>;

    const updated = await updateExceptionItemByItemId(
      mockContextManager,
      ExceptionItemStepAction.CreateExceptionListItem,
      'my-item',
      'agnostic',
      {
        name: 'My exception',
        description: 'A description',
        entries: [{ field: 'host.name', operator: 'is', value: 'my-host' }],
        comments: ['ignored on update'],
      }
    );
    expect(updated).toEqual(apiItem);

    expect(mockContextManager.callKibanaApi).toHaveBeenCalledWith({
      method: 'PUT',
      path: EXCEPTION_LIST_ITEM_URL,
      body: {
        item_id: 'my-item',
        namespace_type: 'agnostic',
        name: 'My exception',
        description: 'A description',
        type: 'simple',
        entries: [{ type: 'match', field: 'host.name', operator: 'included', value: 'my-host' }],
      },
    });
  });
});
