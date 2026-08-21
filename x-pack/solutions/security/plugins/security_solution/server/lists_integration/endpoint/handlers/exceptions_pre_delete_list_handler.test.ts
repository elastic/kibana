/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import { rulesClientMock } from '@kbn/alerting-plugin/server/rules_client.mock';
import { getExceptionListSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_schema.mock';
import type { ExceptionListClient } from '@kbn/lists-plugin/server';
import type { ExceptionListSchema } from '@kbn/securitysolution-io-ts-list-types';

import { createMockEndpointAppContextService } from '../../../endpoint/mocks';
import { getExceptionsPreDeleteListHandler } from './exceptions_pre_delete_list_handler';

describe('Exceptions pre delete list handler', () => {
  const getListMock = (overrides: Partial<ExceptionListSchema> = {}): ExceptionListSchema => ({
    ...getExceptionListSchemaMock(),
    namespace_type: 'single',
    type: 'detection',
    ...overrides,
  });

  const ruleFindResult = ({
    id,
    name,
    ruleId,
  }: {
    id: string;
    name: string;
    ruleId: string;
  }): unknown => ({
    id,
    name,
    params: { ruleId },
  });

  let endpointAppContextService: ReturnType<typeof createMockEndpointAppContextService>;
  let rulesClient: ReturnType<typeof rulesClientMock.create>;
  let handler: ReturnType<typeof getExceptionsPreDeleteListHandler>;
  let context: {
    request: ReturnType<typeof httpServerMock.createKibanaRequest>;
    exceptionListClient: ExceptionListClient;
  };

  beforeEach(() => {
    endpointAppContextService = createMockEndpointAppContextService();
    rulesClient = rulesClientMock.create();
    rulesClient.find.mockResolvedValue({ data: [], page: 1, perPage: 10000, total: 0 });
    (endpointAppContextService.getRulesClient as jest.Mock).mockResolvedValue(rulesClient);
    handler = getExceptionsPreDeleteListHandler(endpointAppContextService);
    context = {
      exceptionListClient: {} as unknown as ExceptionListClient,
      request: httpServerMock.createKibanaRequest(),
    };
  });

  it.each([
    // Real Trusted Apps containers are stored with type `endpoint`, not
    // `endpoint_trusted_apps` (the enum member aliases to `endpoint`).
    { list_id: 'endpoint_trusted_apps', type: 'endpoint' } as const,
    { list_id: 'endpoint_list', type: 'endpoint' } as const,
    { list_id: 'endpoint_trusted_devices', type: 'endpoint_trusted_devices' } as const,
    { list_id: 'endpoint_event_filters', type: 'endpoint_events' } as const,
    {
      list_id: 'endpoint_host_isolation_exceptions',
      type: 'endpoint_host_isolation_exceptions',
    } as const,
    { list_id: 'endpoint_blocklists', type: 'endpoint_blocklists' } as const,
    {
      list_id: 'endpoint_custom_yara_signatures',
      type: 'endpoint_custom_yara_signatures',
    } as const,
  ])(
    'runs the rule reference check for the $list_id list (type $type)',
    async ({ list_id: listId, type }) => {
      const data = {
        blockedBy: [],
        list: getListMock({ list_id: listId, namespace_type: 'agnostic', type }),
        namespaceType: 'agnostic' as const,
      };

      await expect(handler({ context, data })).resolves.toEqual(data);
      expect(endpointAppContextService.getRulesClient).toHaveBeenCalledWith(context.request);
      expect(rulesClient.find).toHaveBeenCalled();
    }
  );

  it('fails closed when no request is present in the callback context', async () => {
    const data = { blockedBy: [], list: getListMock(), namespaceType: 'single' as const };

    await expect(
      handler({ context: { ...context, request: undefined }, data })
    ).rejects.toThrowError(/Unable to verify detection rule references/);
    expect(endpointAppContextService.getRulesClient).not.toHaveBeenCalled();
  });

  it('propagates a rules client failure instead of treating it as "no references"', async () => {
    rulesClient.find.mockRejectedValue(new Error('Unauthorized to find rules'));
    const data = { blockedBy: [], list: getListMock(), namespaceType: 'single' as const };

    await expect(handler({ context, data })).rejects.toThrowError('Unauthorized to find rules');
  });

  it('returns data unchanged when no rule references the list', async () => {
    const data = { blockedBy: [], list: getListMock(), namespaceType: 'single' as const };

    await expect(handler({ context, data })).resolves.toEqual(data);
  });

  it('queries rules by reference to the list saved object', async () => {
    const list = getListMock({ id: 'list-so-id' });
    const data = { blockedBy: [], list, namespaceType: 'single' as const };

    await handler({ context, data });

    expect(rulesClient.find).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          hasReference: { id: 'list-so-id', type: 'exception-list' },
        }),
      })
    );
  });

  it('uses the agnostic saved object type for agnostic lists', async () => {
    const list = getListMock({ id: 'list-so-id', namespace_type: 'agnostic' });
    const data = { blockedBy: [], list, namespaceType: 'agnostic' as const };

    await handler({ context, data });

    expect(rulesClient.find).toHaveBeenCalledWith(
      expect.objectContaining({
        options: expect.objectContaining({
          hasReference: { id: 'list-so-id', type: 'exception-list-agnostic' },
        }),
      })
    );
  });

  it('populates blockedBy with every referencing rule', async () => {
    rulesClient.find.mockResolvedValue({
      data: [
        ruleFindResult({ id: 'rule-so-1', name: 'Rule A', ruleId: 'rule-1' }),
        ruleFindResult({ id: 'rule-so-2', name: 'Rule B', ruleId: 'rule-2' }),
      ],
      page: 1,
      perPage: 10000,
      total: 2,
    } as never);
    const data = { blockedBy: [], list: getListMock(), namespaceType: 'single' as const };

    await expect(handler({ context, data })).resolves.toEqual({
      ...data,
      blockedBy: [
        { id: 'rule-so-1', name: 'Rule A', rule_id: 'rule-1' },
        { id: 'rule-so-2', name: 'Rule B', rule_id: 'rule-2' },
      ],
    });
  });

  it('appends to blockers set by earlier extension points instead of replacing them', async () => {
    rulesClient.find.mockResolvedValue({
      data: [ruleFindResult({ id: 'rule-so-2', name: 'Rule B', ruleId: 'rule-2' })],
      page: 1,
      perPage: 10000,
      total: 1,
    } as never);
    const existingBlocker = { id: 'rule-so-1', name: 'Rule A', rule_id: 'rule-1' };
    const data = {
      blockedBy: [existingBlocker],
      list: getListMock(),
      namespaceType: 'single' as const,
    };

    const result = await handler({ context, data });

    expect(result.blockedBy).toEqual([
      existingBlocker,
      { id: 'rule-so-2', name: 'Rule B', rule_id: 'rule-2' },
    ]);
  });
});
