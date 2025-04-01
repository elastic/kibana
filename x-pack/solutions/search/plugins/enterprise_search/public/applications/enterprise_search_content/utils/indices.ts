/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

import { i18n } from '@kbn/i18n';

import {
  SyncStatus,
  ConnectorStatus,
  ConnectorViewIndex,
  ConnectorIndex,
  ElasticsearchIndex,
  IngestionStatus,
  IngestionMethod,
} from '@kbn/search-connectors';

import { ENTERPRISE_SEARCH_CONNECTOR_CRAWLER_SERVICE_TYPE } from '../../../../common/constants';
import { ElasticsearchIndexWithIngestion } from '../../../../common/types/indices';

import { ApiViewIndex, ElasticsearchViewIndex } from '../types';

export function isConnectorIndex(
  index: ElasticsearchIndexWithIngestion | null | undefined
): index is ConnectorIndex {
  const connectorIndex = index as ConnectorIndex;
  return (
    !!connectorIndex?.connector &&
    connectorIndex.connector.service_type !== ENTERPRISE_SEARCH_CONNECTOR_CRAWLER_SERVICE_TYPE
  );
}

export function isApiIndex(index: ElasticsearchIndexWithIngestion | null | undefined): boolean {
  if (!index) {
    return false;
  }
  return !isConnectorIndex(index);
}

export function isConnectorViewIndex(index: ElasticsearchViewIndex): index is ConnectorViewIndex {
  const connectorViewIndex = index as ConnectorViewIndex;
  return (
    !!connectorViewIndex?.connector &&
    connectorViewIndex.connector.service_type !== ENTERPRISE_SEARCH_CONNECTOR_CRAWLER_SERVICE_TYPE
  );
}

export function isApiViewIndex(index: ElasticsearchViewIndex): index is ApiViewIndex {
  return !!index && !isConnectorViewIndex(index);
}

export function getIngestionMethod(index?: ElasticsearchIndexWithIngestion): IngestionMethod {
  if (!index) return IngestionMethod.API;
  if (isConnectorIndex(index)) {
    return IngestionMethod.CONNECTOR;
  }
  return IngestionMethod.API;
}

export function getIngestionStatus(index?: ElasticsearchIndexWithIngestion): IngestionStatus {
  if (!index || isApiIndex(index)) {
    return IngestionStatus.CONNECTED;
  }
  if (isConnectorIndex(index)) {
    if (
      index.connector.last_seen &&
      moment(index.connector.last_seen).isBefore(moment().subtract(30, 'minutes'))
    ) {
      return IngestionStatus.ERROR;
    }
    if (index.connector.last_sync_status === SyncStatus.ERROR) {
      return IngestionStatus.SYNC_ERROR;
    }
    if (index.connector.status === ConnectorStatus.CONNECTED) {
      return IngestionStatus.CONNECTED;
    }
    if (index.connector.status === ConnectorStatus.ERROR) {
      return IngestionStatus.ERROR;
    }
    if (index.connector.status === ConnectorStatus.CONFIGURED) {
      return IngestionStatus.CONFIGURED;
    }
  }
  return IngestionStatus.INCOMPLETE;
}

export function getLastUpdated(index?: ElasticsearchIndexWithIngestion): string | null {
  return isConnectorIndex(index) ? index.connector.last_synced ?? 'never' : null;
}

export function getContentExtractionDisabled(index?: ElasticsearchIndexWithIngestion): boolean {
  if (!index) return false;
  if (isConnectorIndex(index)) {
    const contentExtractionDisabled =
      index.connector.configuration?.use_text_extraction_service?.value;
    return !!contentExtractionDisabled;
  }

  return false;
}

export function indexToViewIndex(index: ElasticsearchIndex): ConnectorViewIndex;
export function indexToViewIndex(index: ElasticsearchIndex): ApiViewIndex {
  const extraFields = {
    ingestionMethod: getIngestionMethod(index),
    ingestionStatus: getIngestionStatus(index),
    lastUpdated: getLastUpdated(index),
  };
  if (isConnectorIndex(index)) {
    const connectorResult: ConnectorViewIndex = { ...index, ...extraFields };
    return connectorResult;
  }
  const apiResult: ApiViewIndex = { ...index, ...extraFields };
  return apiResult;
}

export function ingestionMethodToText(ingestionMethod: IngestionMethod) {
  switch (ingestionMethod) {
    case IngestionMethod.CONNECTOR:
      return i18n.translate(
        'xpack.enterpriseSearch.content.searchIndices.ingestionMethod.connector',
        {
          defaultMessage: 'Connector',
        }
      );
    case IngestionMethod.CRAWLER:
      return i18n.translate(
        'xpack.enterpriseSearch.content.searchIndices.ingestionMethod.crawler',
        {
          defaultMessage: 'Crawler',
        }
      );
    case IngestionMethod.API:
      return i18n.translate('xpack.enterpriseSearch.content.searchIndices.ingestionMethod.api', {
        defaultMessage: 'API',
      });
    default:
      return ingestionMethod;
  }
}
