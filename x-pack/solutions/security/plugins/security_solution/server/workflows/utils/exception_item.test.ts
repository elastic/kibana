/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ExecutionError } from '@kbn/workflows/server';
import type { EntriesArray } from '@kbn/securitysolution-io-ts-list-types';
import type { ExceptionEntryInput } from '../../../common/workflows/step_types/common/exception_item_schemas';
import { toApiEntries, toCreateExceptionItemBody, toExceptionItemOutput } from './exception_item';

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

  it('throws a ValidationError when a required key is missing', () => {
    expect(() => toApiEntries([{ field: 'host.name', operator: 'is' }])).toThrow(ExecutionError);
  });
});

describe('toCreateExceptionItemBody', () => {
  it('builds a minimal item body with defaults', () => {
    expect(
      toCreateExceptionItemBody({
        name: 'My exception',
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

describe('toExceptionItemOutput', () => {
  const createdItem = {
    id: 'so-id',
    item_id: 'item-id',
    list_id: 'list-id',
    namespace_type: 'single',
    name: 'My exception',
    created_at: '2026-07-09T00:00:00.000Z',
    created_by: 'elastic',
    // fields the step output intentionally drops
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

  it('returns the output slice of a created item', () => {
    expect(toExceptionItemOutput(createdItem, 'create rule exception')).toEqual({
      output: {
        id: 'so-id',
        item_id: 'item-id',
        list_id: 'list-id',
        namespace_type: 'single',
        name: 'My exception',
        created_at: '2026-07-09T00:00:00.000Z',
        created_by: 'elastic',
      },
    });
  });

  it('includes expire_time when present', () => {
    const { output } = toExceptionItemOutput(
      { ...createdItem, expire_time: '2026-08-01T00:00:00.000Z' },
      'create rule exception'
    );

    expect(output.expire_time).toBe('2026-08-01T00:00:00.000Z');
  });

  it('throws an ExecutionError carrying the parse issues on an unexpected response shape', () => {
    let thrown: unknown;
    try {
      toExceptionItemOutput({ ...createdItem, created_at: 'not-a-date' }, 'create rule exception');
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
      toExceptionItemOutput(undefined, 'create rule exception');
    } catch (error) {
      thrown = error;
    }

    expect((thrown as ExecutionError).details).toEqual({
      issues: expect.any(String),
    });
  });
});
