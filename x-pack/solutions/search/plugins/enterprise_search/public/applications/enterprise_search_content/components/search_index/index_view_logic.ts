/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { kea, MakeLogicType } from 'kea';

import { i18n } from '@kbn/i18n';

import {
  Connector,
  FeatureName,
  IngestPipelineParams,
  SyncStatus,
  IngestionStatus,
  IngestionMethod,
} from '@kbn/search-connectors';

import { Status } from '../../../../../common/types/api';
import { Actions } from '../../../shared/api_logic/create_api_logic';
import { flashSuccessToast } from '../../../shared/flash_messages';
import { KibanaLogic } from '../../../shared/kibana';

import {
  StartAccessControlSyncApiLogic,
  StartAccessControlSyncArgs,
} from '../../api/connector/start_access_control_sync_api_logic';
import {
  StartIncrementalSyncApiLogic,
  StartIncrementalSyncArgs,
} from '../../api/connector/start_incremental_sync_api_logic';
import { StartSyncApiLogic, StartSyncArgs } from '../../api/connector/start_sync_api_logic';
import {
  ConnectorConfigurationApiLogic,
  PostConnectorConfigurationActions,
} from '../../api/connector/update_connector_configuration_api_logic';
import {
  CachedFetchIndexApiLogic,
  CachedFetchIndexApiLogicActions,
} from '../../api/index/cached_fetch_index_api_logic';

import { FetchIndexApiResponse } from '../../api/index/fetch_index_api_logic';
import { ElasticsearchViewIndex } from '../../types';
import {
  hasDocumentLevelSecurityFeature,
  hasIncrementalSyncFeature,
} from '../../utils/connector_helpers';
import {
  getIngestionMethod,
  getIngestionStatus,
  getLastUpdated,
  indexToViewIndex,
  isConnectorIndex,
  isConnectorViewIndex,
} from '../../utils/indices';

import { IndexNameLogic } from './index_name_logic';

type StartSyncApiActions = Actions<StartSyncArgs, {}>;
type StartIncrementalSyncApiActions = Actions<StartIncrementalSyncArgs, {}>;
type StartAccessControlSyncApiActions = Actions<StartAccessControlSyncArgs, {}>;

export interface IndexViewActions {
  cancelSyncs(): void;
  clearFetchIndexTimeout(): void;
  createNewFetchIndexTimeout(duration: number): { duration: number };
  fetchCrawlerData: () => void;
  fetchIndex: () => void;
  fetchIndexApiSuccess: CachedFetchIndexApiLogicActions['apiSuccess'];
  makeFetchIndexRequest: CachedFetchIndexApiLogicActions['makeRequest'];
  makeStartAccessControlSyncRequest: StartAccessControlSyncApiActions['makeRequest'];
  makeStartIncrementalSyncRequest: StartIncrementalSyncApiActions['makeRequest'];
  makeStartSyncRequest: StartSyncApiActions['makeRequest'];
  recheckIndex: () => void;
  resetFetchIndexApi: CachedFetchIndexApiLogicActions['apiReset'];
  resetRecheckIndexLoading: () => void;
  startAccessControlSync(): void;
  startFetchIndexPoll: CachedFetchIndexApiLogicActions['startPolling'];
  startIncrementalSync(): void;
  startSync(): void;
  stopFetchIndexPoll(): CachedFetchIndexApiLogicActions['stopPolling'];
  stopFetchIndexPoll(): void;
  updateConfigurationApiSuccess: PostConnectorConfigurationActions['apiSuccess'];
}

export interface IndexViewValues {
  connector: Connector | undefined;
  connectorError: string | undefined;
  connectorId: string | null;
  error: string | undefined;
  fetchIndexApiData: typeof CachedFetchIndexApiLogic.values.fetchIndexApiData;
  fetchIndexApiStatus: Status;
  hasAdvancedFilteringFeature: boolean;
  hasBasicFilteringFeature: boolean;
  hasDocumentLevelSecurityFeature: boolean;
  hasFilteringFeature: boolean;
  hasIncrementalSyncFeature: boolean;
  htmlExtraction: boolean | undefined;
  index: ElasticsearchViewIndex | undefined;
  indexData: typeof CachedFetchIndexApiLogic.values.indexData;
  indexName: string;
  ingestionMethod: IngestionMethod;
  ingestionStatus: IngestionStatus;
  isCanceling: boolean;
  isHiddenIndex: boolean;
  isInitialLoading: typeof CachedFetchIndexApiLogic.values.isInitialLoading;
  isSyncing: boolean;
  isWaitingForSync: boolean;
  lastUpdated: string | null;
  pipelineData: IngestPipelineParams | undefined;
  recheckIndexLoading: boolean;
  resetFetchIndexLoading: boolean;
  syncStatus: SyncStatus | null;
  syncTriggeredLocally: boolean; // holds local value after update so UI updates correctly
}

export const IndexViewLogic = kea<MakeLogicType<IndexViewValues, IndexViewActions>>({
  actions: {
    fetchIndex: true,
    recheckIndex: true,
    resetRecheckIndexLoading: true,
    startAccessControlSync: true,
    startIncrementalSync: true,
    startSync: true,
  },
  connect: {
    actions: [
      IndexNameLogic,
      ['setIndexName'],
      CachedFetchIndexApiLogic,
      [
        'apiError as fetchIndexApiError',
        'apiReset as resetFetchIndexApi',
        'apiSuccess as fetchIndexApiSuccess',
        'makeRequest as makeFetchIndexRequest',
        'startPolling as startFetchIndexPoll',
        'stopPolling as stopFetchIndexPoll',
      ],
      ConnectorConfigurationApiLogic,
      ['apiSuccess as updateConfigurationApiSuccess'],
      StartSyncApiLogic,
      ['apiSuccess as startSyncApiSuccess', 'makeRequest as makeStartSyncRequest'],
      StartIncrementalSyncApiLogic,
      [
        'apiSuccess as startIncrementalSyncApiSuccess',
        'makeRequest as makeStartIncrementalSyncRequest',
      ],
      StartAccessControlSyncApiLogic,
      [
        'apiSuccess as startAccessControlSyncApiSuccess',
        'makeRequest as makeStartAccessControlSyncRequest',
      ],
    ],
    values: [
      IndexNameLogic,
      ['indexName'],
      CachedFetchIndexApiLogic,
      ['fetchIndexApiData', 'status as fetchIndexApiStatus', 'indexData', 'isInitialLoading'],
    ],
  },
  events: ({ actions }) => ({
    beforeUnmount: () => {
      actions.stopFetchIndexPoll();
      actions.resetFetchIndexApi();
    },
  }),
  listeners: ({ actions, values }) => ({
    fetchIndex: () => {
      const { indexName } = IndexNameLogic.values;
      actions.makeFetchIndexRequest({ indexName });
    },
    fetchIndexApiSuccess: () => {
      if (values.recheckIndexLoading) {
        actions.resetRecheckIndexLoading();
        flashSuccessToast(
          i18n.translate(
            'xpack.enterpriseSearch.content.searchIndex.index.recheckSuccess.message',
            {
              defaultMessage: 'Your connector has been rechecked.',
            }
          )
        );
      }
    },
    recheckIndex: () => actions.fetchIndex(),
    setIndexName: ({ indexName }) => {
      actions.startFetchIndexPoll(indexName);
    },
    startAccessControlSync: () => {
      if (
        isConnectorIndex(values.fetchIndexApiData) &&
        values.hasDocumentLevelSecurityFeature &&
        KibanaLogic.values.productFeatures.hasDocumentLevelSecurityEnabled
      ) {
        actions.makeStartAccessControlSyncRequest({
          connectorId: values.fetchIndexApiData.connector.id,
        });
      }
    },
    startIncrementalSync: () => {
      if (
        isConnectorIndex(values.fetchIndexApiData) &&
        values.hasIncrementalSyncFeature &&
        KibanaLogic.values.productFeatures.hasIncrementalSyncEnabled
      ) {
        actions.makeStartIncrementalSyncRequest({
          connectorId: values.fetchIndexApiData.connector.id,
        });
      }
    },
    startSync: () => {
      if (isConnectorIndex(values.fetchIndexApiData)) {
        actions.makeStartSyncRequest({ connectorId: values.fetchIndexApiData.connector.id });
      }
    },
    updateConfigurationApiSuccess: ({ configuration }) => {
      if (isConnectorIndex(values.fetchIndexApiData)) {
        actions.fetchIndexApiSuccess({
          ...values.fetchIndexApiData,
          connector: { ...values.fetchIndexApiData.connector, configuration },
        });
      }
    },
  }),
  path: ['enterprise_search', 'content', 'index_view_logic'],
  reducers: {
    recheckIndexLoading: [
      false,
      {
        recheckIndex: () => true,
        resetRecheckIndexLoading: () => false,
      },
    ],
    syncTriggeredLocally: [
      false,
      {
        fetchIndexApiSuccess: () => false,
        startAccessControlSync: () => true,
        startIncrementalSync: () => true,
        startSyncApiSuccess: () => true,
      },
    ],
  },
  selectors: ({ selectors }) => ({
    connector: [
      () => [selectors.indexData],
      (index) => (index && isConnectorViewIndex(index) ? index.connector : undefined),
    ],
    connectorError: [
      () => [selectors.connector],
      (connector: Connector | undefined) => connector?.error,
    ],
    connectorId: [
      () => [selectors.indexData],
      (index) => (isConnectorViewIndex(index) ? index.connector.id : null),
    ],
    error: [
      () => [selectors.connector],
      (connector: Connector | undefined) =>
        connector?.error ||
        connector?.last_sync_error ||
        connector?.last_access_control_sync_error ||
        null,
    ],
    hasAdvancedFilteringFeature: [
      () => [selectors.connector],
      (connector?: Connector) =>
        connector?.features
          ? connector.features[FeatureName.SYNC_RULES]?.advanced?.enabled ??
            connector.features[FeatureName.FILTERING_ADVANCED_CONFIG]
          : false,
    ],
    hasBasicFilteringFeature: [
      () => [selectors.connector],
      (connector?: Connector) =>
        connector?.features
          ? connector.features[FeatureName.SYNC_RULES]?.basic?.enabled ??
            connector.features[FeatureName.FILTERING_RULES]
          : false,
    ],
    hasDocumentLevelSecurityFeature: [
      () => [selectors.connector],
      (connector?: Connector) => hasDocumentLevelSecurityFeature(connector),
    ],
    hasFilteringFeature: [
      () => [selectors.hasAdvancedFilteringFeature, selectors.hasBasicFilteringFeature],
      (advancedFeature: boolean, basicFeature: boolean) => advancedFeature || basicFeature,
    ],
    hasIncrementalSyncFeature: [
      () => [selectors.connector],
      (connector?: Connector) => hasIncrementalSyncFeature(connector),
    ],
    htmlExtraction: [
      () => [selectors.connector],
      (connector: Connector | undefined) =>
        connector?.configuration.extract_full_html?.value ?? undefined,
    ],
    index: [
      () => [selectors.indexData],
      (data: IndexViewValues['indexData']) => (data ? indexToViewIndex(data) : undefined),
    ],
    ingestionMethod: [() => [selectors.indexData], (data) => getIngestionMethod(data)],
    ingestionStatus: [() => [selectors.indexData], (data) => getIngestionStatus(data)],
    isCanceling: [
      () => [selectors.syncStatus],
      (syncStatus: SyncStatus) => syncStatus === SyncStatus.CANCELING,
    ],
    isConnectorIndex: [
      () => [selectors.indexData],
      (data: FetchIndexApiResponse | undefined) => isConnectorIndex(data),
    ],
    isHiddenIndex: [
      () => [selectors.indexData],
      (data: FetchIndexApiResponse | undefined) =>
        data?.hidden || (data?.name ?? '').startsWith('.'),
    ],
    isSyncing: [
      () => [selectors.indexData, selectors.syncStatus],
      (indexData: FetchIndexApiResponse | null, syncStatus: SyncStatus) =>
        indexData?.has_in_progress_syncs || syncStatus === SyncStatus.IN_PROGRESS,
    ],
    isWaitingForSync: [
      () => [selectors.indexData, selectors.syncTriggeredLocally],
      (indexData: FetchIndexApiResponse | null, syncTriggeredLocally: boolean) =>
        indexData?.has_pending_syncs || syncTriggeredLocally || false,
    ],
    lastUpdated: [() => [selectors.fetchIndexApiData], (data) => getLastUpdated(data)],
    pipelineData: [
      () => [selectors.connector],
      (connector: Connector | undefined) => connector?.pipeline ?? undefined,
    ],
    syncStatus: [
      () => [selectors.fetchIndexApiData],
      (data) => data?.connector?.last_sync_status ?? null,
    ],
  }),
});
