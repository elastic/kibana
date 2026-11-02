/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { licensingMock } from '@kbn/licensing-plugin/server/mocks';
import { createPersistenceExecutorOptionsMock } from '@kbn/rule-registry-plugin/server/utils/create_persistence_rule_type_wrapper.mock';

import { createThreatSignals } from './create_threat_signals';
import { getEventCount, getEventList } from './get_event_count';
import { getThreatListCount } from './get_threat_list';
import { createEventSignal } from './create_event_signal';
import { getAllowedFieldsForTermQuery } from './get_allowed_fields_for_terms_query';
import { getMaxClauseCountErrorValue } from './utils';
import { getDataTierFilter } from '../../utils/get_data_tier_filter';
import { getDataStreamNamespaceFilter } from '../../utils/get_data_stream_namespace_filter';
import { getQueryFields } from '../../utils/get_query_fields';
import { getSharedParamsMock } from '../../__mocks__/shared_params';
import { getThreatRuleParams } from '../../../rule_schema/mocks';
import type { SearchAfterAndBulkCreateReturnType } from '../../types';

jest.mock('./get_threat_list', () => ({
  getThreatList: jest.fn(),
  getThreatListCount: jest.fn(),
}));
jest.mock('./get_event_count', () => ({
  ...jest.requireActual('./get_event_count'),
  getEventCount: jest.fn(),
  getEventList: jest.fn(),
}));
jest.mock('./create_event_signal', () => ({ createEventSignal: jest.fn() }));
jest.mock('./create_threat_signal', () => ({ createThreatSignal: jest.fn() }));
jest.mock('./get_allowed_fields_for_terms_query', () => ({
  getAllowedFieldsForTermQuery: jest.fn(),
}));
jest.mock('./utils', () => ({
  ...jest.requireActual('./utils'),
  getMaxClauseCountErrorValue: jest.fn(),
}));
jest.mock('../../utils/get_data_tier_filter', () => ({ getDataTierFilter: jest.fn() }));
jest.mock('../../utils/get_data_stream_namespace_filter', () => ({
  getDataStreamNamespaceFilter: jest.fn(),
}));
jest.mock('../../utils/get_query_fields', () => ({ getQueryFields: jest.fn() }));

const getEventCountMock = getEventCount as jest.Mock;
const getEventListMock = getEventList as jest.Mock;
const getThreatListCountMock = getThreatListCount as jest.Mock;
const createEventSignalMock = createEventSignal as jest.Mock;
const getAllowedFieldsForTermQueryMock = getAllowedFieldsForTermQuery as jest.Mock;
const getMaxClauseCountErrorValueMock = getMaxClauseCountErrorValue as jest.Mock;
const getDataTierFilterMock = getDataTierFilter as jest.Mock;
const getDataStreamNamespaceFilterMock = getDataStreamNamespaceFilter as jest.Mock;
const getQueryFieldsMock = getQueryFields as jest.Mock;

const PER_PAGE = 2;

const emptySignalResult = (): SearchAfterAndBulkCreateReturnType => ({
  success: true,
  warning: false,
  enrichmentTimes: [],
  bulkCreateTimes: [],
  searchAfterTimes: [],
  createdSignalsCount: 0,
  suppressedAlertsCount: 0,
  createdSignals: [],
  errors: [],
  warningMessages: [],
});

const eventPage = (sortId: string, hitCount: number = PER_PAGE) => ({
  hits: {
    hits: Array.from({ length: hitCount }, (_, index) => ({
      _id: `${sortId}-${index}`,
      _index: 'events-index',
      sort: [sortId],
    })),
  },
});

const noClauseCountError = { maxClauseCountValue: Number.NEGATIVE_INFINITY, errorType: '' };
const clauseCountError = { maxClauseCountValue: 1, errorType: 'maxClauseCount' };

describe('createThreatSignals', () => {
  let services: ReturnType<typeof createPersistenceExecutorOptionsMock>;

  const run = () => {
    const sharedParams = getSharedParamsMock({
      ruleParams: getThreatRuleParams({
        itemsPerSearch: PER_PAGE,
        concurrentSearches: 1,
        maxSignals: 100,
      }),
      rewrites: { dateNanosTimestampFields: ['@timestamp'] },
    });

    return createThreatSignals({
      sharedParams,
      services,
      eventsTelemetry: undefined,
      wrapSuppressedHits: jest.fn(),
      licensing: licensingMock.createSetup(),
      scheduleNotificationResponseActionsService: jest.fn(),
    });
  };

  const searchAfterCursors = () =>
    getEventListMock.mock.calls.map(([{ searchAfter }]) => searchAfter);

  beforeEach(() => {
    // reset rather than clear: queued `mockResolvedValueOnce` pages would otherwise leak
    // into the next test and shift every cursor assertion
    jest.resetAllMocks();
    services = createPersistenceExecutorOptionsMock();
    services.scopedClusterClient.asCurrentUser.openPointInTime.mockResolvedValue({
      id: 'pit-id',
      _shards: { failed: 0, successful: 1, total: 1, skipped: 0 },
    });

    getDataTierFilterMock.mockResolvedValue([]);
    getDataStreamNamespaceFilterMock.mockResolvedValue([]);
    getQueryFieldsMock.mockResolvedValue([]);
    getAllowedFieldsForTermQueryMock.mockResolvedValue({ source: {}, threat: {} });
    // events are the smaller side, so the rule pages through the event list
    getEventCountMock.mockResolvedValue(6);
    getThreatListCountMock.mockResolvedValue(1000);
    createEventSignalMock.mockResolvedValue(emptySignalResult());
    getMaxClauseCountErrorValueMock.mockReturnValue(noClauseCountError);
  });

  it('keeps paging after a maxClauseCount restart instead of reporting a stuck cursor', async () => {
    getEventListMock
      .mockResolvedValueOnce(eventPage('cursor-a'))
      .mockResolvedValueOnce(eventPage('cursor-b'))
      // restart re-fetches the first page
      .mockResolvedValueOnce(eventPage('cursor-a'))
      .mockResolvedValueOnce(eventPage('cursor-b'))
      .mockResolvedValueOnce(eventPage('cursor-c', 1));
    getMaxClauseCountErrorValueMock
      .mockReturnValueOnce(noClauseCountError)
      .mockReturnValueOnce(clauseCountError)
      .mockReturnValue(noClauseCountError);

    const result = await run();

    expect(searchAfterCursors()).toEqual([
      undefined,
      ['cursor-a'],
      undefined,
      ['cursor-a'],
      ['cursor-b'],
    ]);
    expect(result.warningMessages.some((message) => message.includes('Pagination stopped'))).toBe(
      false
    );
  });

  it('stops paging with a warning when the cursor does not advance', async () => {
    getEventListMock
      .mockResolvedValueOnce(eventPage('cursor-a'))
      .mockResolvedValueOnce(eventPage('cursor-a'));

    const result = await run();

    expect(searchAfterCursors()).toEqual([undefined, ['cursor-a']]);
    expect(result.warningMessages).toEqual([expect.stringContaining('Pagination stopped')]);
  });

  it('stops paging without a warning once a page comes back partially filled', async () => {
    getEventListMock
      .mockResolvedValueOnce(eventPage('cursor-a'))
      .mockResolvedValueOnce(eventPage('cursor-b', 1));

    const result = await run();

    expect(searchAfterCursors()).toEqual([undefined, ['cursor-a']]);
    expect(result.warningMessages).toEqual([]);
  });
});
