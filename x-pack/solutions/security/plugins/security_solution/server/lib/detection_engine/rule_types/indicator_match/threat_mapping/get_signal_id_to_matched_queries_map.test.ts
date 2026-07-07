/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ThreatMatchQueryType } from './types';

import { getSignalIdToMatchedQueriesMap } from './get_signal_id_to_matched_queries_map';
import { getThreatList } from './get_threat_list';
import { encodeThreatMatchNamedQuery } from './utils';
import { MAX_NUMBER_OF_SIGNAL_MATCHES } from './enrich_signal_threat_matches';

import { createPersistenceExecutorOptionsMock } from '@kbn/rule-registry-plugin/server/utils/create_persistence_rule_type_wrapper.mock';
import { getSharedParamsMock } from '../../__mocks__/shared_params';
import { getThreatRuleParams } from '../../../rule_schema/mocks';
import { DEFAULT_INDICATOR_SOURCE_PATH } from '../../../../../../common/constants';

jest.mock('./get_threat_list', () => ({ getThreatList: jest.fn() }));

const getThreatListMock = getThreatList as jest.Mock;

export const namedQuery = encodeThreatMatchNamedQuery({
  id: 'source-1',
  index: 'source-*',
  threatMappingIndex: 0,
  queryType: ThreatMatchQueryType.match,
});

const termsNamedQuery = encodeThreatMatchNamedQuery({
  threatMappingIndex: 0,
  queryType: ThreatMatchQueryType.term,
});

export const threatMock = {
  _id: 'threat-id-1',
  _index: 'threats-01',
  matched_queries: [namedQuery],
};

const termsThreatMock = {
  _id: 'threat-id-1',
  _index: 'threats-01',
  matched_queries: [termsNamedQuery],
};

const ruleServices = createPersistenceExecutorOptionsMock();
const sharedParamsMock = getSharedParamsMock({ ruleParams: getThreatRuleParams() });
const reassignPitIdMock = () => {};

getThreatListMock.mockReturnValue({ hits: { hits: [] } });

describe('getSignalIdToMatchedQueriesMap', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should call getThreatList to fetch threats from ES', async () => {
    getThreatListMock.mockReturnValue({ hits: { hits: [] } });

    await getSignalIdToMatchedQueriesMap({
      allowedFieldsForTermsQuery: { source: {}, threat: {} },
      pitId: 'pitId',
      reassignThreatPitId: reassignPitIdMock,
      services: ruleServices,
      sharedParams: sharedParamsMock,
      signals: [
        {
          _index: 'test-index',
          _source: { 'source.ip': ['127.0.0.1'] },
          fields: { 'source.ip': ['127.0.0.1'] },
        },
      ],
      threatFilters: [],
      threatIndexFields: [],
      threatIndicatorPath: DEFAULT_INDICATOR_SOURCE_PATH,
    });

    expect(getThreatListMock).toHaveBeenCalledTimes(1);
  });

  it('should not call getThreatList if no docs have fields to search for', async () => {
    // The signal doc only has user.name, which is not referenced by any threat mapping entries so
    // the constructed threat filter will be empty - we expect an early return from `getSignalIdToMatchedQueriesMap`
    // in this scenario
    const signalIdToMatchedQueriesMap = await getSignalIdToMatchedQueriesMap({
      allowedFieldsForTermsQuery: { source: {}, threat: {} },
      pitId: 'pitId',
      reassignThreatPitId: reassignPitIdMock,
      services: ruleServices,
      sharedParams: sharedParamsMock,
      signals: [
        {
          _index: 'test-index',
          _source: { 'user.name': ['test-user'] },
          fields: { 'user.name': ['test-user'] },
        },
      ],
      threatFilters: [],
      threatIndexFields: [],
      threatIndicatorPath: DEFAULT_INDICATOR_SOURCE_PATH,
    });

    expect(getThreatListMock).toHaveBeenCalledTimes(0);
    expect(signalIdToMatchedQueriesMap).toEqual(new Map());
  });

  it('should return empty signals map if getThreatList return empty results', async () => {
    getThreatListMock.mockReturnValue({ hits: { hits: [] } });

    const signalIdToMatchedQueriesMap = await getSignalIdToMatchedQueriesMap({
      allowedFieldsForTermsQuery: { source: {}, threat: {} },
      pitId: 'pitId',
      reassignThreatPitId: reassignPitIdMock,
      services: ruleServices,
      sharedParams: sharedParamsMock,
      signals: [
        {
          _index: 'test-index',
          _source: { 'source.ip': ['127.0.0.1'] },
          fields: { 'source.ip': ['127.0.0.1'] },
        },
      ],
      threatFilters: [],
      threatIndexFields: [],
      threatIndicatorPath: DEFAULT_INDICATOR_SOURCE_PATH,
    });

    expect(signalIdToMatchedQueriesMap).toEqual(new Map());
  });

  it('should return signalIdToMatchedQueriesMap for signals if threats search results exhausted', async () => {
    const namedQuery2 = encodeThreatMatchNamedQuery({
      id: 'source-2',
      index: 'source-*',
      threatMappingIndex: 0,
      queryType: ThreatMatchQueryType.match,
    });

    // the third request return empty results
    const threatHit1 = threatMock;
    const threatHit2 = {
      ...threatMock,
      _id: 'threat-id-2',
      matched_queries: [namedQuery, namedQuery2],
    };
    const threatHit3 = { ...threatMock, _id: 'threat-id-3' };
    getThreatListMock.mockReturnValueOnce({
      hits: {
        hits: [threatHit1],
      },
    });
    getThreatListMock.mockReturnValueOnce({
      hits: {
        hits: [threatHit2, threatHit3],
      },
    });
    getThreatListMock.mockReturnValueOnce({ hits: { hits: [] } });

    const signalIdToMatchedQueriesMap = await getSignalIdToMatchedQueriesMap({
      allowedFieldsForTermsQuery: { source: {}, threat: {} },
      pitId: 'pitId',
      reassignThreatPitId: reassignPitIdMock,
      services: ruleServices,
      sharedParams: sharedParamsMock,
      signals: [
        {
          _index: 'test-index',
          _source: { 'source.ip': ['127.0.0.1'] },
          fields: { 'source.ip': ['127.0.0.1'] },
        },
      ],
      threatFilters: [],
      threatIndexFields: [],
      threatIndicatorPath: DEFAULT_INDICATOR_SOURCE_PATH,
    });

    expect(signalIdToMatchedQueriesMap).toEqual(
      new Map([
        [
          'source-1',
          [
            {
              threatHit: threatHit1,
              query: {
                threatMappingIndex: 0,
                queryType: ThreatMatchQueryType.match,
              },
            },
            {
              threatHit: threatHit2,
              query: {
                threatMappingIndex: 0,
                queryType: ThreatMatchQueryType.match,
              },
            },
            {
              threatHit: threatHit3,
              query: {
                threatMappingIndex: 0,
                queryType: ThreatMatchQueryType.match,
              },
            },
          ],
        ],
        [
          'source-2',
          [
            {
              threatHit: threatHit2,
              query: {
                threatMappingIndex: 0,
                queryType: ThreatMatchQueryType.match,
              },
            },
          ],
        ],
      ])
    );
  });

  it('should return signalIdToMatchedQueriesMap for signals if threats number reaches max of MAX_NUMBER_OF_SIGNAL_MATCHES', async () => {
    getThreatListMock.mockReturnValueOnce({
      hits: {
        hits: Array.from(Array(MAX_NUMBER_OF_SIGNAL_MATCHES + 1)).map(() => threatMock),
      },
    });

    const signalIdToMatchedQueriesMap = await getSignalIdToMatchedQueriesMap({
      allowedFieldsForTermsQuery: { source: {}, threat: {} },
      pitId: 'pitId',
      reassignThreatPitId: reassignPitIdMock,
      services: ruleServices,
      sharedParams: sharedParamsMock,
      signals: [
        {
          _index: 'test-index',
          _source: { 'source.ip': ['127.0.0.1'] },
          fields: { 'source.ip': ['127.0.0.1'] },
        },
      ],
      threatFilters: [],
      threatIndexFields: [],
      threatIndicatorPath: DEFAULT_INDICATOR_SOURCE_PATH,
    });

    expect(signalIdToMatchedQueriesMap.get('source-1')).toHaveLength(MAX_NUMBER_OF_SIGNAL_MATCHES);
  });

  it('should return empty signalIdToMatchedQueriesMap for terms query if there wrong value in threat indicator', async () => {
    getThreatListMock.mockReturnValueOnce({
      hits: {
        hits: [
          {
            ...termsThreatMock,
            _source: {
              source: {
                ip: '192.168.1.1',
              },
            },
          },
        ],
      },
    });

    const signalIdToMatchedQueriesMap = await getSignalIdToMatchedQueriesMap({
      allowedFieldsForTermsQuery: { source: { 'source.ip': true }, threat: { 'source.ip': true } },
      pitId: 'pitId',
      reassignThreatPitId: reassignPitIdMock,
      services: ruleServices,
      sharedParams: sharedParamsMock,
      signals: [
        {
          _index: 'test-index',
          _source: { 'source.ip': ['127.0.0.1'] },
          fields: { 'source.ip': ['127.0.0.1'] },
        },
      ],
      threatFilters: [],
      threatIndexFields: [],
      threatIndicatorPath: DEFAULT_INDICATOR_SOURCE_PATH,
    });

    expect(signalIdToMatchedQueriesMap).toEqual(new Map());
  });

  it('should return signalIdToMatchedQueriesMap from threat indicators for termsQuery', async () => {
    const threatHit = {
      ...termsThreatMock,
      _source: {
        source: {
          ip: '127.0.0.1',
        },
      },
    };
    getThreatListMock.mockReturnValueOnce({
      hits: {
        hits: [threatHit],
      },
    });

    const sharedParams = getSharedParamsMock({
      ruleParams: getThreatRuleParams({
        threatMapping: [{ entries: [{ field: 'source.ip', type: 'mapping', value: 'source.ip' }] }],
      }),
    });

    const signalIdToMatchedQueriesMap = await getSignalIdToMatchedQueriesMap({
      allowedFieldsForTermsQuery: { source: { 'source.ip': true }, threat: { 'source.ip': true } },
      pitId: 'pitId',
      reassignThreatPitId: reassignPitIdMock,
      services: ruleServices,
      sharedParams,
      signals: [
        {
          _index: 'test-index',
          _id: 'signalId1',
          _source: { 'source.ip': ['127.0.0.1'] },
          fields: { 'source.ip': ['127.0.0.1'] },
        },
        {
          _index: 'test-index',
          _id: 'signalId2',
          _source: { 'source.ip': ['127.0.0.1'] },
          fields: { 'source.ip': ['127.0.0.1'] },
        },
      ],
      threatFilters: [],
      threatIndexFields: [],
      threatIndicatorPath: DEFAULT_INDICATOR_SOURCE_PATH,
    });

    const query = {
      threatMappingIndex: 0,
      queryType: ThreatMatchQueryType.term,
    };
    expect(signalIdToMatchedQueriesMap).toEqual(
      new Map([
        ['signalId1', [{ threatHit, query }]],
        ['signalId2', [{ threatHit, query }]],
      ])
    );
  });

  it('should return signalIdToMatchedQueriesMap from threat indicators which has array values for termsQuery', async () => {
    const threatHit = {
      ...termsThreatMock,
      _source: {
        source: {
          ip: ['127.0.0.1', '127.0.0.2'],
        },
      },
    };
    getThreatListMock.mockReturnValueOnce({
      hits: {
        hits: [threatHit],
      },
    });

    const sharedParams = getSharedParamsMock({
      ruleParams: getThreatRuleParams({
        threatMapping: [{ entries: [{ field: 'source.ip', type: 'mapping', value: 'source.ip' }] }],
      }),
    });

    const signalIdToMatchedQueriesMap = await getSignalIdToMatchedQueriesMap({
      allowedFieldsForTermsQuery: { source: { 'source.ip': true }, threat: { 'source.ip': true } },
      pitId: 'pitId',
      reassignThreatPitId: reassignPitIdMock,
      services: ruleServices,
      sharedParams,
      signals: [
        {
          _index: 'test-index',
          _id: 'signalId1',
          _source: { 'source.ip': ['127.0.0.1'] },
          fields: { 'source.ip': ['127.0.0.1'] },
        },
        {
          _index: 'test-index',
          _id: 'signalId2',
          _source: { 'source.ip': ['127.0.0.2'] },
          fields: { 'source.ip': ['127.0.0.2'] },
        },
      ],
      threatFilters: [],
      threatIndexFields: [],
      threatIndicatorPath: DEFAULT_INDICATOR_SOURCE_PATH,
    });

    const query = {
      threatMappingIndex: 0,
      queryType: ThreatMatchQueryType.term,
    };
    expect(signalIdToMatchedQueriesMap).toEqual(
      new Map([
        ['signalId1', [{ threatHit, query }]],
        ['signalId2', [{ threatHit, query }]],
      ])
    );
  });
});
