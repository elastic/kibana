/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  LogicMounter,
  mockFlashMessageHelpers,
  mockHttpValues,
} from '../../../__mocks__/kea_logic';
import { apiIndex, connectorIndex } from '../../__mocks__/view_index.mock';

import { SyncStatus, IngestionMethod, IngestionStatus } from '@kbn/search-connectors';
import { nextTick } from '@kbn/test-jest-helpers';

import { Status } from '../../../../../common/types/api';

import { StartSyncApiLogic } from '../../api/connector/start_sync_api_logic';
import { CachedFetchIndexApiLogic } from '../../api/index/cached_fetch_index_api_logic';

import { indexToViewIndex } from '../../utils/indices';

import { IndexNameLogic } from './index_name_logic';
import { IndexViewLogic } from './index_view_logic';

jest.mock('../../../shared/kibana/kibana_logic', () => ({
  KibanaLogic: { values: { productAccess: { hasDocumentLevelSecurityEnabled: true } } },
}));

// We can't test fetchTimeOutId because this will get set whenever the logic is created
// And the timeoutId is non-deterministic. We use expect.object.containing throughout this test file
const DEFAULT_VALUES = {
  connector: undefined,
  connectorError: undefined,
  connectorId: null,
  error: null,
  fetchIndexApiData: {},
  fetchIndexApiStatus: Status.SUCCESS,
  hasAdvancedFilteringFeature: false,
  hasBasicFilteringFeature: false,
  hasDocumentLevelSecurityFeature: false,
  hasFilteringFeature: false,
  hasIncrementalSyncFeature: false,
  htmlExtraction: undefined,
  index: {
    ingestionMethod: IngestionMethod.API,
    ingestionStatus: IngestionStatus.CONNECTED,
    lastUpdated: null,
  },
  indexData: {},
  indexName: 'index-name',
  ingestionMethod: IngestionMethod.API,
  ingestionStatus: IngestionStatus.CONNECTED,
  isCanceling: false,
  isConnectorIndex: false,
  isHiddenIndex: false,
  isInitialLoading: false,
  isSyncing: false,
  isWaitingForSync: false,
  lastUpdated: null,
  pipelineData: undefined,
  recheckIndexLoading: false,
  syncStatus: null,
  syncTriggeredLocally: false,
};

const CONNECTOR_VALUES = {
  ...DEFAULT_VALUES,
  connectorId: connectorIndex.connector.id,
  index: indexToViewIndex(connectorIndex),
  indexData: connectorIndex,
  ingestionMethod: IngestionMethod.CONNECTOR,
  ingestionStatus: IngestionStatus.CONFIGURED,
  lastUpdated: 'never',
};

describe('IndexViewLogic', () => {
  const { mount: apiLogicMount } = new LogicMounter(StartSyncApiLogic);
  const { mount: fetchIndexMount } = new LogicMounter(CachedFetchIndexApiLogic);
  const { mount: indexNameMount } = new LogicMounter(IndexNameLogic);
  const { mount } = new LogicMounter(IndexViewLogic);
  const { flashSuccessToast } = mockFlashMessageHelpers;
  const { http } = mockHttpValues;

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useRealTimers();
    http.get.mockReturnValueOnce(Promise.resolve({}));
    const indexNameLogic = indexNameMount();
    apiLogicMount();
    fetchIndexMount();
    mount();
    indexNameLogic.actions.setIndexName('index-name');
  });

  it('has expected default values', () => {
    expect(IndexViewLogic.values).toEqual(DEFAULT_VALUES);
  });

  describe('actions', () => {
    describe('FetchIndexApiWrapperLogic.apiSuccess', () => {
      it('should update values', () => {
        CachedFetchIndexApiLogic.actions.apiSuccess({
          ...CONNECTOR_VALUES.index,
          has_pending_syncs: true,
        });

        expect(IndexViewLogic.values).toEqual(
          expect.objectContaining({
            ingestionMethod: CONNECTOR_VALUES.ingestionMethod,
            ingestionStatus: CONNECTOR_VALUES.ingestionStatus,
            isCanceling: false,
            isConnectorIndex: true,
            isWaitingForSync: true,
            lastUpdated: CONNECTOR_VALUES.lastUpdated,
            pipelineData: undefined,
            syncStatus: SyncStatus.COMPLETED,
          })
        );
      });

      it('should update values with no connector', () => {
        CachedFetchIndexApiLogic.actions.apiSuccess(apiIndex);

        expect(IndexViewLogic.values).toEqual(
          expect.objectContaining({
            ...DEFAULT_VALUES,
            fetchIndexApiData: { ...apiIndex },
            fetchIndexApiStatus: Status.SUCCESS,
            index: apiIndex,
            indexData: apiIndex,
            isInitialLoading: false,
          })
        );
      });
      it('should flash success if recheckFetchIndexLoading', () => {
        IndexViewLogic.actions.resetRecheckIndexLoading = jest.fn();
        IndexNameLogic.actions.setIndexName('api');
        IndexViewLogic.actions.recheckIndex();
        CachedFetchIndexApiLogic.actions.apiSuccess(apiIndex);

        expect(flashSuccessToast).toHaveBeenCalled();
      });
    });

    describe('startSync', () => {
      it('should call makeStartSyncRequest', async () => {
        // TODO: replace with mounting connectorIndex to FetchIndexApiDirectly to avoid
        // needing to mock out actions unrelated to test called by listeners
        CachedFetchIndexApiLogic.actions.apiSuccess(connectorIndex);
        IndexViewLogic.actions.makeStartSyncRequest = jest.fn();

        IndexViewLogic.actions.startSync();
        await nextTick();

        expect(IndexViewLogic.actions.makeStartSyncRequest).toHaveBeenCalledWith({
          connectorId: '2',
        });
      });
    });

    describe('StartSyncApiLogic.apiSuccess', () => {
      it('should set localSyncNow to true', async () => {
        StartSyncApiLogic.actions.apiSuccess({});
        expect(IndexViewLogic.values).toEqual(
          expect.objectContaining({
            ...DEFAULT_VALUES,
            isWaitingForSync: true,
            syncTriggeredLocally: true,
          })
        );
      });
    });
  });

  describe('recheckIndexLoading', () => {
    it('should be set to true on recheckIndex', () => {
      IndexViewLogic.actions.recheckIndex();
      expect(IndexViewLogic.values).toEqual(
        expect.objectContaining({
          ...DEFAULT_VALUES,
          fetchIndexApiStatus: Status.LOADING,
          recheckIndexLoading: true,
        })
      );
    });
    it('should be set to false on resetRecheckIndexLoading', () => {
      IndexViewLogic.actions.recheckIndex();
      IndexViewLogic.actions.resetRecheckIndexLoading();
      expect(IndexViewLogic.values).toEqual(
        expect.objectContaining({
          ...DEFAULT_VALUES,
          fetchIndexApiStatus: Status.LOADING,
          recheckIndexLoading: false,
        })
      );
    });
  });

  describe('listeners', () => {
    it('calls makeFetchIndexRequest on fetchIndex', () => {
      IndexViewLogic.actions.makeFetchIndexRequest = jest.fn();
      IndexNameLogic.actions.setIndexName('indexName');
      IndexViewLogic.actions.fetchIndex();
      expect(IndexViewLogic.actions.makeFetchIndexRequest).toHaveBeenCalledWith({
        indexName: 'indexName',
      });
    });
  });

  describe('selectors', () => {
    describe('error', () => {
      it('should return connector error if available', () => {
        IndexViewLogic.actions.fetchIndexApiSuccess({
          ...CONNECTOR_VALUES.index,
          connector: { ...connectorIndex.connector, error: 'error' },
        });
        expect(IndexViewLogic.values.error).toEqual('error');
      });
      it('should return connector last sync error if available and error is undefined', () => {
        IndexViewLogic.actions.fetchIndexApiSuccess({
          ...CONNECTOR_VALUES.index,
          connector: { ...connectorIndex.connector, last_sync_error: 'last sync error' },
        });
        expect(IndexViewLogic.values.error).toEqual('last sync error');
      });
    });
  });
});
