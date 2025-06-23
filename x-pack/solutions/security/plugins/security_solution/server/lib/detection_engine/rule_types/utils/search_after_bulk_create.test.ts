/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  sampleEmptyDocSearchResults,
  repeatedSearchResultsWithSortId,
  repeatedSearchResultsWithNoSortId,
  sampleDocSearchResultsNoSortIdNoHits,
} from '../__mocks__/es_results';
import { searchAfterAndBulkCreate } from './search_after_bulk_create';
import { v4 as uuidv4 } from 'uuid';
import { listMock } from '@kbn/lists-plugin/server/mocks';
import { getExceptionListItemSchemaMock } from '@kbn/lists-plugin/common/schemas/response/exception_list_item_schema.mock';
import type { SearchListItemArraySchema } from '@kbn/securitysolution-io-ts-list-types';
import { getSearchListItemResponseMock } from '@kbn/lists-plugin/common/schemas/response/search_list_item_schema.mock';

import type { CommonAlertFieldsLatest } from '@kbn/rule-registry-plugin/common/schemas';
import {
  ALERT_RULE_CATEGORY,
  ALERT_RULE_CONSUMER,
  ALERT_RULE_EXECUTION_UUID,
  ALERT_RULE_NAME,
  ALERT_RULE_PARAMETERS,
  ALERT_RULE_PRODUCER,
  ALERT_RULE_REVISION,
  ALERT_RULE_TAGS,
  ALERT_RULE_TYPE_ID,
  ALERT_RULE_UUID,
  SPACE_IDS,
  TIMESTAMP,
} from '@kbn/rule-data-utils';
import type { BulkResponse } from '@elastic/elasticsearch/lib/api/types';
import { getQueryRuleParams } from '../../rule_schema/mocks';
import type { BuildReasonMessage } from './reason_formatters';
import { SERVER_APP_ID } from '../../../../../common/constants';
import { getSharedParamsMock } from '../__mocks__/shared_params';
import type { PersistenceExecutorOptionsMock } from '@kbn/rule-registry-plugin/server/utils/create_persistence_rule_type_wrapper.mock';
import { createPersistenceExecutorOptionsMock } from '@kbn/rule-registry-plugin/server/utils/create_persistence_rule_type_wrapper.mock';

describe('searchAfterAndBulkCreate', () => {
  const ruleServices: PersistenceExecutorOptionsMock = createPersistenceExecutorOptionsMock();
  let buildReasonMessage: BuildReasonMessage = jest
    .fn()
    .mockResolvedValue('some alert reason message');
  const listClient = listMock.getListClient();
  listClient.searchListItemByValues = jest.fn().mockResolvedValue([]);
  const someGuids = Array.from({ length: 13 }).map(() => uuidv4());
  const sampleParams = getQueryRuleParams();
  const inputIndex = ['auditbeat-*'];
  const defaultFilter = {
    match_all: {},
  };
  const mockCommonFields: CommonAlertFieldsLatest = {
    [ALERT_RULE_PARAMETERS]: {},
    [ALERT_RULE_CATEGORY]: 'Custom Query Rule',
    [ALERT_RULE_CONSUMER]: SERVER_APP_ID,
    [ALERT_RULE_EXECUTION_UUID]: '97e8f53a-4971-4935-bb54-9b8f86930cc7',
    [ALERT_RULE_NAME]: 'rule-name',
    [ALERT_RULE_PRODUCER]: 'siem',
    [ALERT_RULE_REVISION]: 0,
    [ALERT_RULE_TYPE_ID]: 'siem.queryRule',
    [ALERT_RULE_UUID]: '2e051244-b3c6-4779-a241-e1b4f0beceb9',
    [SPACE_IDS]: ['default'],
    [ALERT_RULE_TAGS]: [],
    [TIMESTAMP]: '2020-04-20T21:27:45+0000',
  };
  sampleParams.maxSignals = 30;
  const sharedParams = getSharedParamsMock({
    ruleParams: sampleParams,
    rewrites: {
      inputIndex,
      searchAfterSize: 1,
      listClient,
    },
  });

  beforeEach(async () => {
    jest.clearAllMocks();
    listClient.searchListItemByValues = jest.fn().mockResolvedValue([]);
    buildReasonMessage = jest.fn().mockResolvedValue('some alert reason message');
  });

  test('should return success with number of searches less than max signals', async () => {
    ruleServices.scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce(
      repeatedSearchResultsWithSortId(4, 1, someGuids.slice(0, 3))
    );

    ruleServices.alertWithPersistence.mockResolvedValueOnce({
      createdAlerts: [
        {
          _id: '1',
          _index: '.internal.alerts-security.alerts-default-000001',
          ...mockCommonFields,
        },
      ],
      errors: {},
      alertsWereTruncated: false,
    });

    ruleServices.scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce(
      repeatedSearchResultsWithSortId(4, 1, someGuids.slice(3, 6))
    );

    ruleServices.alertWithPersistence.mockResolvedValueOnce({
      createdAlerts: [
        {
          _id: '2',
          _index: '.internal.alerts-security.alerts-default-000001',
          ...mockCommonFields,
        },
      ],
      errors: {},
      alertsWereTruncated: false,
    });

    ruleServices.scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce(
      repeatedSearchResultsWithSortId(4, 1, someGuids.slice(6, 9))
    );

    ruleServices.alertWithPersistence.mockResolvedValueOnce({
      createdAlerts: [
        {
          _id: '3',
          _index: '.internal.alerts-security.alerts-default-000001',
          ...mockCommonFields,
        },
      ],
      errors: {},
      alertsWereTruncated: false,
    });

    ruleServices.scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce(
      repeatedSearchResultsWithSortId(4, 1, someGuids.slice(9, 12))
    );

    ruleServices.alertWithPersistence.mockResolvedValueOnce({
      createdAlerts: [
        {
          _id: '4',
          _index: '.internal.alerts-security.alerts-default-000001',
          ...mockCommonFields,
        },
      ],
      errors: {},
      alertsWereTruncated: false,
    });

    ruleServices.scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce(
      sampleDocSearchResultsNoSortIdNoHits()
    );

    const exceptionItem = getExceptionListItemSchemaMock();
    exceptionItem.entries = [
      {
        field: 'source.ip',
        operator: 'included',
        type: 'list',
        list: {
          id: 'ci-badguys.txt',
          type: 'ip',
        },
      },
    ];

    const { success, createdSignalsCount } = await searchAfterAndBulkCreate({
      sharedParams: {
        ...sharedParams,
        unprocessedExceptions: [exceptionItem],
      },
      services: ruleServices,
      eventsTelemetry: undefined,
      filter: defaultFilter,
      buildReasonMessage,
    });
    expect(success).toEqual(true);
    expect(ruleServices.scopedClusterClient.asCurrentUser.search).toHaveBeenCalledTimes(5);
    expect(createdSignalsCount).toEqual(4);
  });

  test('should return success with number of searches less than max signals with gap', async () => {
    ruleServices.scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce(
      repeatedSearchResultsWithSortId(4, 1, someGuids.slice(0, 3))
    );
    ruleServices.alertWithPersistence.mockResolvedValueOnce({
      createdAlerts: [
        {
          _id: '1',
          _index: '.internal.alerts-security.alerts-default-000001',
          ...mockCommonFields,
        },
      ],
      errors: {},
      alertsWereTruncated: false,
    });

    ruleServices.scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce(
      repeatedSearchResultsWithSortId(4, 1, someGuids.slice(3, 6))
    );

    ruleServices.alertWithPersistence.mockResolvedValueOnce({
      createdAlerts: [
        {
          _id: '2',
          _index: '.internal.alerts-security.alerts-default-000001',
          ...mockCommonFields,
        },
      ],
      errors: {},
      alertsWereTruncated: false,
    });

    ruleServices.scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce(
      repeatedSearchResultsWithSortId(4, 1, someGuids.slice(6, 9))
    );

    ruleServices.alertWithPersistence.mockResolvedValueOnce({
      createdAlerts: [
        {
          _id: '3',
          _index: '.internal.alerts-security.alerts-default-000001',
          ...mockCommonFields,
        },
      ],
      errors: {},
      alertsWereTruncated: false,
    });

    ruleServices.scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce(
      sampleDocSearchResultsNoSortIdNoHits()
    );

    const exceptionItem = getExceptionListItemSchemaMock();
    exceptionItem.entries = [
      {
        field: 'source.ip',
        operator: 'included',
        type: 'list',
        list: {
          id: 'ci-badguys.txt',
          type: 'ip',
        },
      },
    ];
    const { success, createdSignalsCount } = await searchAfterAndBulkCreate({
      sharedParams: {
        ...sharedParams,
        unprocessedExceptions: [exceptionItem],
        listClient,
      },
      services: ruleServices,
      eventsTelemetry: undefined,
      filter: defaultFilter,
      buildReasonMessage,
    });
    expect(success).toEqual(true);
    expect(ruleServices.scopedClusterClient.asCurrentUser.search).toHaveBeenCalledTimes(4);
    expect(createdSignalsCount).toEqual(3);
  });

  test('should return success when no search results are in the allowlist', async () => {
    ruleServices.scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce(
      repeatedSearchResultsWithSortId(4, 4, someGuids.slice(0, 3))
    );

    ruleServices.alertWithPersistence.mockResolvedValueOnce({
      createdAlerts: [
        {
          _id: '1',
          _index: '.internal.alerts-security.alerts-default-000001',
          ...mockCommonFields,
        },
        {
          _id: '2',
          _index: '.internal.alerts-security.alerts-default-000001',
          ...mockCommonFields,
        },
        {
          _id: '3',
          _index: '.internal.alerts-security.alerts-default-000001',
          ...mockCommonFields,
        },
        {
          _id: '4',
          _index: '.internal.alerts-security.alerts-default-000001',
          ...mockCommonFields,
        },
      ],
      errors: {},
      alertsWereTruncated: false,
    });

    ruleServices.scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce(
      sampleDocSearchResultsNoSortIdNoHits()
    );

    const exceptionItem = getExceptionListItemSchemaMock();
    exceptionItem.entries = [
      {
        field: 'source.ip',
        operator: 'included',
        type: 'list',
        list: {
          id: 'ci-badguys.txt',
          type: 'ip',
        },
      },
    ];
    const { success, createdSignalsCount } = await searchAfterAndBulkCreate({
      sharedParams: {
        ...sharedParams,
        unprocessedExceptions: [exceptionItem],
      },
      services: ruleServices,
      eventsTelemetry: undefined,
      filter: defaultFilter,
      buildReasonMessage,
    });
    expect(success).toEqual(true);
    expect(ruleServices.scopedClusterClient.asCurrentUser.search).toHaveBeenCalledTimes(2);
    expect(createdSignalsCount).toEqual(4);
  });

  test('should return success when all search results are in the allowlist and with sortId present', async () => {
    const searchListItems: SearchListItemArraySchema = [
      { ...getSearchListItemResponseMock(), value: ['1.1.1.1'] },
      { ...getSearchListItemResponseMock(), value: ['2.2.2.2'] },
      { ...getSearchListItemResponseMock(), value: ['3.3.3.3'] },
    ];
    listClient.searchListItemByValues = jest.fn().mockResolvedValue(searchListItems);
    ruleServices.scopedClusterClient.asCurrentUser.search
      .mockResolvedValueOnce(
        repeatedSearchResultsWithSortId(4, 4, someGuids.slice(0, 3), [
          '1.1.1.1',
          '2.2.2.2',
          '2.2.2.2',
          '2.2.2.2',
        ])
      )
      .mockResolvedValueOnce(sampleDocSearchResultsNoSortIdNoHits());

    const exceptionItem = getExceptionListItemSchemaMock();
    exceptionItem.entries = [
      {
        field: 'source.ip',
        operator: 'included',
        type: 'list',
        list: {
          id: 'ci-badguys.txt',
          type: 'ip',
        },
      },
    ];
    const { success, createdSignalsCount } = await searchAfterAndBulkCreate({
      sharedParams: {
        ...sharedParams,
        unprocessedExceptions: [exceptionItem],
      },
      services: ruleServices,
      eventsTelemetry: undefined,
      filter: defaultFilter,
      buildReasonMessage,
    });
    expect(success).toEqual(true);
    expect(ruleServices.scopedClusterClient.asCurrentUser.search).toHaveBeenCalledTimes(2);
    expect(createdSignalsCount).toEqual(0); // should not create any signals because all events were in the allowlist
  });

  test('should return success when empty string sortId present', async () => {
    ruleServices.alertWithPersistence.mockResolvedValueOnce({
      createdAlerts: [
        {
          _id: '1',
          _index: '.internal.alerts-security.alerts-default-000001',
          ...mockCommonFields,
        },
        {
          _id: '2',
          _index: '.internal.alerts-security.alerts-default-000001',
          ...mockCommonFields,
        },
        {
          _id: '3',
          _index: '.internal.alerts-security.alerts-default-000001',
          ...mockCommonFields,
        },
        {
          _id: '4',
          _index: '.internal.alerts-security.alerts-default-000001',
          ...mockCommonFields,
        },
      ],
      errors: {},
      alertsWereTruncated: false,
    });
    ruleServices.scopedClusterClient.asCurrentUser.search
      .mockResolvedValueOnce(
        repeatedSearchResultsWithSortId(
          4,
          4,
          someGuids.slice(0, 3),
          ['1.1.1.1', '2.2.2.2', '2.2.2.2', '2.2.2.2'],
          // this is the case we are testing, if we receive an empty string for one of the sort ids.
          ['', '2222222222222']
        )
      )
      .mockResolvedValueOnce(sampleDocSearchResultsNoSortIdNoHits());

    const { success, createdSignalsCount } = await searchAfterAndBulkCreate({
      sharedParams,
      services: ruleServices,
      eventsTelemetry: undefined,
      filter: defaultFilter,
      buildReasonMessage,
    });
    expect(success).toEqual(true);
    expect(ruleServices.scopedClusterClient.asCurrentUser.search).toHaveBeenCalledTimes(2);
    expect(createdSignalsCount).toEqual(4);
  });

  test('should return success when all search results are in the allowlist and no sortId present', async () => {
    const searchListItems: SearchListItemArraySchema = [
      { ...getSearchListItemResponseMock(), value: ['1.1.1.1'] },
      { ...getSearchListItemResponseMock(), value: ['2.2.2.2'] },
      { ...getSearchListItemResponseMock(), value: ['2.2.2.2'] },
      { ...getSearchListItemResponseMock(), value: ['2.2.2.2'] },
    ];

    listClient.searchListItemByValues = jest.fn().mockResolvedValue(searchListItems);
    ruleServices.scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce(
      repeatedSearchResultsWithNoSortId(4, 4, someGuids.slice(0, 3), [
        '1.1.1.1',
        '2.2.2.2',
        '2.2.2.2',
        '2.2.2.2',
      ])
    );

    const exceptionItem = getExceptionListItemSchemaMock();
    exceptionItem.entries = [
      {
        field: 'source.ip',
        operator: 'included',
        type: 'list',
        list: {
          id: 'ci-badguys.txt',
          type: 'ip',
        },
      },
    ];
    const { success, createdSignalsCount } = await searchAfterAndBulkCreate({
      sharedParams: {
        ...sharedParams,
        unprocessedExceptions: [exceptionItem],
      },
      services: ruleServices,
      eventsTelemetry: undefined,
      filter: defaultFilter,
      buildReasonMessage,
    });
    expect(success).toEqual(true);
    expect(ruleServices.scopedClusterClient.asCurrentUser.search).toHaveBeenCalledTimes(1);
    expect(createdSignalsCount).toEqual(0); // should not create any signals because all events were in the allowlist
  });

  test('should return success when no sortId present but search results are in the allowlist', async () => {
    ruleServices.scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce(
      repeatedSearchResultsWithNoSortId(4, 4, someGuids.slice(0, 3))
    );

    ruleServices.alertWithPersistence.mockResolvedValueOnce({
      createdAlerts: [
        {
          _id: '1',
          _index: '.internal.alerts-security.alerts-default-000001',
          ...mockCommonFields,
        },
        {
          _id: '2',
          _index: '.internal.alerts-security.alerts-default-000001',
          ...mockCommonFields,
        },
        {
          _id: '3',
          _index: '.internal.alerts-security.alerts-default-000001',
          ...mockCommonFields,
        },
        {
          _id: '4',
          _index: '.internal.alerts-security.alerts-default-000001',
          ...mockCommonFields,
        },
      ],
      errors: {},
      alertsWereTruncated: false,
    });

    const exceptionItem = getExceptionListItemSchemaMock();
    exceptionItem.entries = [
      {
        field: 'source.ip',
        operator: 'included',
        type: 'list',
        list: {
          id: 'ci-badguys.txt',
          type: 'ip',
        },
      },
    ];
    const { success, createdSignalsCount } = await searchAfterAndBulkCreate({
      sharedParams: {
        ...sharedParams,
        unprocessedExceptions: [exceptionItem],
      },
      services: ruleServices,
      eventsTelemetry: undefined,
      filter: defaultFilter,
      buildReasonMessage,
    });
    expect(success).toEqual(true);
    expect(ruleServices.scopedClusterClient.asCurrentUser.search).toHaveBeenCalledTimes(1);
    expect(createdSignalsCount).toEqual(4);
  });

  test('should return success when no exceptions list provided', async () => {
    ruleServices.scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce(
      repeatedSearchResultsWithSortId(4, 4, someGuids.slice(0, 3))
    );

    ruleServices.alertWithPersistence.mockResolvedValueOnce({
      createdAlerts: [
        {
          _id: '1',
          _index: '.internal.alerts-security.alerts-default-000001',
          ...mockCommonFields,
        },
        {
          _id: '2',
          _index: '.internal.alerts-security.alerts-default-000001',
          ...mockCommonFields,
        },
        {
          _id: '3',
          _index: '.internal.alerts-security.alerts-default-000001',
          ...mockCommonFields,
        },
        {
          _id: '4',
          _index: '.internal.alerts-security.alerts-default-000001',
          ...mockCommonFields,
        },
      ],
      errors: {},
      alertsWereTruncated: false,
    });

    ruleServices.scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce(
      sampleDocSearchResultsNoSortIdNoHits()
    );

    listClient.searchListItemByValues = jest.fn(({ value }) =>
      Promise.resolve(
        value.slice(0, 2).map((item) => ({
          ...getSearchListItemResponseMock(),
          value: item,
        }))
      )
    );
    const { success, createdSignalsCount } = await searchAfterAndBulkCreate({
      sharedParams,
      services: ruleServices,
      eventsTelemetry: undefined,
      filter: defaultFilter,
      buildReasonMessage,
    });
    expect(success).toEqual(true);
    expect(ruleServices.scopedClusterClient.asCurrentUser.search).toHaveBeenCalledTimes(2);
    expect(createdSignalsCount).toEqual(4);
  });

  test('should return success with 0 total hits', async () => {
    const exceptionItem = getExceptionListItemSchemaMock();
    exceptionItem.entries = [
      {
        field: 'source.ip',
        operator: 'included',
        type: 'list',
        list: {
          id: 'ci-badguys.txt',
          type: 'ip',
        },
      },
    ];
    ruleServices.scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce(
      sampleEmptyDocSearchResults()
    );
    listClient.searchListItemByValues = jest.fn(({ value }) =>
      Promise.resolve(
        value.slice(0, 2).map((item) => ({
          ...getSearchListItemResponseMock(),
          value: item,
        }))
      )
    );
    const { success, createdSignalsCount } = await searchAfterAndBulkCreate({
      sharedParams: {
        ...sharedParams,
        unprocessedExceptions: [exceptionItem],
      },
      services: ruleServices,
      eventsTelemetry: undefined,
      filter: defaultFilter,
      buildReasonMessage,
    });
    expect(success).toEqual(true);
    expect(createdSignalsCount).toEqual(0);
  });

  test('if returns false when singleSearchAfter throws an exception', async () => {
    ruleServices.scopedClusterClient.asCurrentUser.search.mockImplementation(() => {
      throw Error('Fake Error'); // throws the exception we are testing
    });
    listClient.searchListItemByValues = jest.fn(({ value }) =>
      Promise.resolve(
        value.slice(0, 2).map((item) => ({
          ...getSearchListItemResponseMock(),
          value: item,
        }))
      )
    );
    const exceptionItem = getExceptionListItemSchemaMock();
    exceptionItem.entries = [
      {
        field: 'source.ip',
        operator: 'included',
        type: 'list',
        list: {
          id: 'ci-badguys.txt',
          type: 'ip',
        },
      },
    ];
    const { success, createdSignalsCount } = await searchAfterAndBulkCreate({
      sharedParams: {
        ...sharedParams,
        unprocessedExceptions: [exceptionItem],
      },
      services: ruleServices,
      eventsTelemetry: undefined,
      filter: defaultFilter,
      buildReasonMessage,
    });
    expect(success).toEqual(false);
    expect(createdSignalsCount).toEqual(0); // should not create signals if search threw error
  });

  test('it returns error array when singleSearchAfter returns errors', async () => {
    const bulkItem: BulkResponse = {
      took: 100,
      errors: true,
      items: [
        {
          create: {
            _version: 1,
            _index: 'index-123',
            _id: 'id-123',
            status: 201,
            error: {
              type: 'network',
              reason: 'error on creation',
              shard: 'shard-123',
              index: 'index-123',
            },
          },
        },
      ],
    };
    ruleServices.scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce(
      repeatedSearchResultsWithSortId(4, 1, someGuids.slice(0, 3))
    );

    ruleServices.alertWithPersistence.mockResolvedValueOnce({
      createdAlerts: [
        {
          _id: '1',
          _index: '.internal.alerts-security.alerts-default-000001',
          ...mockCommonFields,
        },
      ],
      errors: {
        'error on creation': {
          count: 1,
          statusCode: 500,
        },
      },
      alertsWereTruncated: false,
    });

    ruleServices.scopedClusterClient.asCurrentUser.bulk.mockResponseOnce(bulkItem); // adds the response with errors we are testing

    ruleServices.scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce(
      repeatedSearchResultsWithSortId(4, 1, someGuids.slice(3, 6))
    );

    ruleServices.alertWithPersistence.mockResolvedValueOnce({
      createdAlerts: [
        {
          _id: '2',
          _index: '.internal.alerts-security.alerts-default-000001',
          ...mockCommonFields,
        },
      ],
      errors: {},
      alertsWereTruncated: false,
    });

    ruleServices.scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce(
      repeatedSearchResultsWithSortId(4, 1, someGuids.slice(6, 9))
    );

    ruleServices.alertWithPersistence.mockResolvedValueOnce({
      createdAlerts: [
        {
          _id: '3',
          _index: '.internal.alerts-security.alerts-default-000001',
          ...mockCommonFields,
        },
      ],
      errors: {},
      alertsWereTruncated: false,
    });

    ruleServices.scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce(
      repeatedSearchResultsWithSortId(4, 1, someGuids.slice(9, 12))
    );

    ruleServices.alertWithPersistence.mockResolvedValueOnce({
      createdAlerts: [
        {
          _id: '4',
          _index: '.internal.alerts-security.alerts-default-000001',
          ...mockCommonFields,
        },
      ],
      errors: {},
      alertsWereTruncated: false,
    });

    ruleServices.scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce(
      sampleDocSearchResultsNoSortIdNoHits()
    );
    const { success, createdSignalsCount, errors } = await searchAfterAndBulkCreate({
      sharedParams,
      services: ruleServices,
      eventsTelemetry: undefined,
      filter: defaultFilter,
      buildReasonMessage,
    });
    expect(success).toEqual(false);
    expect(errors).toEqual(['error on creation']);
    expect(ruleServices.scopedClusterClient.asCurrentUser.search).toHaveBeenCalledTimes(5);
    expect(createdSignalsCount).toEqual(4);
  });

  it('invokes the enrichment callback with signal search results', async () => {
    ruleServices.scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce(
      repeatedSearchResultsWithSortId(4, 1, someGuids.slice(0, 3))
    );

    ruleServices.alertWithPersistence.mockResolvedValueOnce({
      createdAlerts: [
        {
          _id: '1',
          _index: '.internal.alerts-security.alerts-default-000001',
          ...mockCommonFields,
        },
      ],
      errors: {},
      alertsWereTruncated: false,
    });

    ruleServices.scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce(
      repeatedSearchResultsWithSortId(4, 1, someGuids.slice(3, 6))
    );

    ruleServices.alertWithPersistence.mockResolvedValueOnce({
      createdAlerts: [
        {
          _id: '2',
          _index: '.internal.alerts-security.alerts-default-000001',
          ...mockCommonFields,
        },
      ],
      errors: {},
      alertsWereTruncated: false,
    });

    ruleServices.scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce(
      repeatedSearchResultsWithSortId(4, 1, someGuids.slice(6, 9))
    );

    ruleServices.alertWithPersistence.mockResolvedValueOnce({
      createdAlerts: [
        {
          _id: '3',
          _index: '.internal.alerts-security.alerts-default-000001',
          ...mockCommonFields,
        },
      ],
      errors: {},
      alertsWereTruncated: false,
    });

    ruleServices.scopedClusterClient.asCurrentUser.search.mockResolvedValueOnce(
      sampleDocSearchResultsNoSortIdNoHits()
    );

    const mockEnrichment = jest.fn((a) => a);
    const { success, createdSignalsCount } = await searchAfterAndBulkCreate({
      sharedParams,
      enrichment: mockEnrichment,
      services: ruleServices,
      eventsTelemetry: undefined,
      filter: defaultFilter,
      buildReasonMessage,
    });

    expect(mockEnrichment).toHaveBeenCalledWith(
      expect.objectContaining([
        expect.objectContaining({
          _id: expect.any(String),
          _index: 'myFakeSignalIndex',
          _score: 100,
          _source: expect.objectContaining({
            destination: { ip: '127.0.0.1' },
            someKey: 'someValue',
            source: { ip: '127.0.0.1' },
          }),
          _version: 1,
          fields: {
            '@timestamp': ['2020-04-20T21:27:45+0000'],
            'destination.ip': ['127.0.0.1'],
            someKey: ['someValue'],
            'source.ip': ['127.0.0.1'],
          },
          sort: ['1234567891111', '2233447556677'],
        }),
      ])
    );
    expect(success).toEqual(true);
    expect(ruleServices.scopedClusterClient.asCurrentUser.search).toHaveBeenCalledTimes(4);
    expect(createdSignalsCount).toEqual(3);
  });
});
