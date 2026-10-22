/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { httpServerMock } from '@kbn/core/server/mocks';
import type { RulesClient } from '@kbn/alerting-plugin/server';
import { rulesClientMock } from '@kbn/alerting-plugin/server/rules_client.mock';
import { alertingAuthorizationMock } from '@kbn/alerting-plugin/server/authorization/alerting_authorization.mock';
import { SECURITY_SOLUTION_RULE_TYPE_IDS } from '@kbn/securitysolution-rules';
import { getExceptionListSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_schema.mock';
import type {
  ExceptionListClient,
  ExceptionListPreDeleteListBlocker,
} from '@kbn/lists-plugin/server';
import type { ExceptionListSchema, NamespaceType } from '@kbn/securitysolution-io-ts-list-types';

import { createMockEndpointAppContextService } from '../../../endpoint/mocks';
import { getExceptionsPreDeleteListHandler } from './exceptions_pre_delete_list_handler';

describe('Exceptions pre delete list handler', () => {
  const getListMock = (overrides: Partial<ExceptionListSchema> = {}): ExceptionListSchema => ({
    ...getExceptionListSchemaMock(),
    namespace_type: 'single',
    type: 'detection',
    ...overrides,
  });

  const getData = ({
    lists = [getListMock({ id: 'list-so-1' })],
    namespaceType = 'single',
    blockedLists = [],
  }: {
    lists?: ExceptionListSchema[];
    namespaceType?: NamespaceType;
    blockedLists?: ExceptionListPreDeleteListBlocker[];
  } = {}) => ({ blockedLists, lists, namespaceType });

  const findResultWithCounts = (counts: Record<string, number>) => ({
    aggregations: {
      referencesByList: {
        buckets: Object.fromEntries(
          Object.entries(counts).map(([listId, docCount]) => [listId, { doc_count: docCount }])
        ),
      },
    },
    data: [],
    page: 1,
    perPage: 0,
    total: Object.values(counts).reduce((sum, count) => sum + count, 0),
  });

  const getAggregatedListIds = (findParams: Parameters<RulesClient['find']>[0]): string[] =>
    Object.keys(
      (findParams?.options?.aggs?.referencesByList as { filters: { filters: object } }).filters
        .filters
    );

  let endpointAppContextService: ReturnType<typeof createMockEndpointAppContextService>;
  let rulesClient: ReturnType<typeof rulesClientMock.create>;
  let alertingAuthorization: ReturnType<typeof alertingAuthorizationMock.create>;
  let handler: ReturnType<typeof getExceptionsPreDeleteListHandler>;
  let context: {
    request: ReturnType<typeof httpServerMock.createKibanaRequest>;
    exceptionListClient: ExceptionListClient;
  };

  beforeEach(() => {
    endpointAppContextService = createMockEndpointAppContextService();
    rulesClient = rulesClientMock.create();
    rulesClient.find.mockImplementation(async (findParams) =>
      findResultWithCounts(
        Object.fromEntries(getAggregatedListIds(findParams).map((listId) => [listId, 0]))
      )
    );
    (endpointAppContextService.getRulesClient as jest.Mock).mockResolvedValue(rulesClient);
    alertingAuthorization = alertingAuthorizationMock.create();
    alertingAuthorization.getAllAuthorizedRuleTypesFindOperation.mockResolvedValue(
      new Map([['siem.queryRule', { authorizedConsumers: {} }]])
    );
    (endpointAppContextService.getAlertingAuthorization as jest.Mock).mockResolvedValue(
      alertingAuthorization
    );
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
      const data = getData({
        lists: [getListMock({ list_id: listId, namespace_type: 'agnostic', type })],
        namespaceType: 'agnostic',
      });

      await expect(handler({ context, data })).resolves.toEqual(data);
      expect(endpointAppContextService.getRulesClient).toHaveBeenCalledWith(context.request);
      expect(rulesClient.find).toHaveBeenCalled();
    }
  );

  it('fails closed when no request is present in the callback context', async () => {
    const data = getData();

    await expect(
      handler({ context: { ...context, request: undefined }, data })
    ).rejects.toThrowError(/Unable to verify detection rule references/);
    await expect(
      handler({ context: { ...context, request: undefined }, data })
    ).rejects.toMatchObject({ statusCode: 403 });
    expect(endpointAppContextService.getRulesClient).not.toHaveBeenCalled();
  });

  it('fails closed when the caller cannot read any detection rule type', async () => {
    // For such a caller the rule search silently filters detection rules out and
    // returns zero counts, so they must not be trusted as "no references".
    alertingAuthorization.getAllAuthorizedRuleTypesFindOperation.mockResolvedValue(new Map());
    const data = getData();

    await expect(handler({ context, data })).rejects.toThrowError(
      /not authorized to read detection rules/
    );
    await expect(handler({ context, data })).rejects.toMatchObject({ statusCode: 403 });
    expect(rulesClient.find).not.toHaveBeenCalled();
  });

  it('checks authorization against the detection rule types only', async () => {
    await handler({ context, data: getData() });

    expect(alertingAuthorization.getAllAuthorizedRuleTypesFindOperation).toHaveBeenCalledWith(
      expect.objectContaining({ ruleTypeIds: SECURITY_SOLUTION_RULE_TYPE_IDS })
    );
  });

  it('does not search when there are no lists to check', async () => {
    const data = getData({ lists: [] });

    await expect(handler({ context, data })).resolves.toEqual(data);
    expect(rulesClient.find).not.toHaveBeenCalled();
  });

  it('propagates a rules client failure instead of treating it as "no references"', async () => {
    rulesClient.find.mockRejectedValue(new Error('Unauthorized to find rules'));

    await expect(handler({ context, data: getData() })).rejects.toThrowError(
      'Unauthorized to find rules'
    );
  });

  it('returns data unchanged when no rule references any list', async () => {
    const data = getData({
      lists: [getListMock({ id: 'list-so-1' }), getListMock({ id: 'list-so-2' })],
    });

    await expect(handler({ context, data })).resolves.toEqual(data);
  });

  it('counts references for every list in a single rule search without returning rules', async () => {
    const lists = Array.from({ length: 100 }, (_, index) =>
      getListMock({ id: `list-so-${index}` })
    );

    await handler({ context, data: getData({ lists }) });

    expect(rulesClient.find).toHaveBeenCalledTimes(1);
    const [findParams] = rulesClient.find.mock.calls[0];
    expect(findParams?.options).toEqual(expect.objectContaining({ perPage: 0 }));
    expect(findParams?.options?.hasReference).toBeUndefined();
    expect(getAggregatedListIds(findParams)).toEqual(lists.map(({ id }) => id));
  });

  it.each([
    ['single', 'exception-list'],
    ['agnostic', 'exception-list-agnostic'],
  ] as const)(
    'matches nested references by list id and the %s saved object type',
    async (namespaceType, referenceType) => {
      await handler({
        context,
        data: getData({ lists: [getListMock({ id: 'list-so-id' })], namespaceType }),
      });

      expect(rulesClient.find.mock.calls[0][0]?.options?.aggs).toEqual({
        referencesByList: {
          filters: {
            filters: {
              'list-so-id': {
                bool: {
                  filter: [
                    {
                      nested: {
                        path: 'alert.references',
                        query: {
                          bool: {
                            filter: [
                              { term: { 'alert.references.id': { value: 'list-so-id' } } },
                              { term: { 'alert.references.type': { value: referenceType } } },
                            ],
                          },
                        },
                      },
                    },
                  ],
                },
              },
            },
          },
        },
      });
    }
  );

  it('blocks only the lists with a positive reference count', async () => {
    rulesClient.find.mockResolvedValue(
      findResultWithCounts({ 'list-so-1': 12_000, 'list-so-2': 0, 'list-so-3': 1 })
    );
    const data = getData({
      lists: ['list-so-1', 'list-so-2', 'list-so-3'].map((id) => getListMock({ id })),
    });

    await expect(handler({ context, data })).resolves.toEqual({
      ...data,
      blockedLists: [{ id: 'list-so-1' }, { id: 'list-so-3' }],
    });
  });

  it('merges with blocks set by earlier extension points instead of replacing them', async () => {
    rulesClient.find.mockResolvedValue(
      findResultWithCounts({ 'list-so-1': 2, 'list-so-2': 0, 'list-so-3': 5 })
    );
    const data = getData({
      blockedLists: [{ id: 'list-so-2' }, { id: 'list-so-3' }],
      lists: ['list-so-1', 'list-so-2', 'list-so-3'].map((id) => getListMock({ id })),
    });

    const result = await handler({ context, data });

    expect(result.blockedLists).toEqual([
      { id: 'list-so-2' },
      { id: 'list-so-3' },
      { id: 'list-so-1' },
    ]);
  });

  it.each([
    ['no aggregations', { data: [], page: 1, perPage: 0, total: 0 }],
    [
      'array buckets',
      {
        aggregations: { referencesByList: { buckets: [] } },
        data: [],
        page: 1,
        perPage: 0,
        total: 0,
      },
    ],
    ['a missing bucket', findResultWithCounts({ 'list-so-1': 0 })],
    [
      'a non-numeric doc_count',
      {
        aggregations: {
          referencesByList: {
            buckets: { 'list-so-1': { doc_count: 0 }, 'list-so-2': { doc_count: '1' } },
          },
        },
        data: [],
        page: 1,
        perPage: 0,
        total: 1,
      },
    ],
    ['a negative doc_count', findResultWithCounts({ 'list-so-1': 0, 'list-so-2': -1 })],
  ])('fails closed when the rule search returns %s', async (_, findResult) => {
    rulesClient.find.mockResolvedValue(findResult as never);
    const data = getData({
      lists: [getListMock({ id: 'list-so-1' }), getListMock({ id: 'list-so-2' })],
    });

    await expect(handler({ context, data })).rejects.toMatchObject({
      message: expect.stringMatching(/unexpected rule search response/),
      statusCode: 500,
    });
  });
});
