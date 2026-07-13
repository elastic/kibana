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

type Context = StepHandlerContext<typeof createRuleExceptionInputSchema>;

const createdItem = {
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
    expect(result.output).toEqual(createdItem);
  });

  /**
   * End-to-end input mapping: the raw `with:` block a user writes in the
   * workflow YAML is parsed through the step's inputSchema (as the workflow
   * engine does before invoking the handler) and must produce exactly this
   * request against the rule exceptions creation endpoint.
   */
  describe('workflow input to API request mapping', () => {
    beforeEach(() => {
      mockContextManager.callKibanaApi.mockResolvedValue({
        status: 200,
        headers: {},
        body: [createdItem],
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
          { field: 'source.ip', operator: 'is_in_list', list: { id: 'scanner_ips', type: 'ip' } },
          {
            field: 'destination.ip',
            operator: 'is_not_in_list',
            list: { id: 'blocked_ips', type: 'ip' },
          },
        ],
      });

      expect(mockContextManager.callKibanaApi).toHaveBeenCalledTimes(1);
      expect(mockContextManager.callKibanaApi).toHaveBeenCalledWith({
        method: 'POST',
        path: '/api/detection_engine/rules/a962a9be-0be1-4b1e-8bc7-4570d18a2202/exceptions',
        body: {
          items: [
            {
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
