/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import moment from 'moment';

import { i18n } from '@kbn/i18n';
import { Connector, ConnectorStatus, SyncStatus } from '@kbn/search-connectors';

export const isLastSeenOld = (connector: Connector): boolean =>
  connector.last_seen
    ? moment(connector.last_seen).isBefore(moment().subtract(30, 'minutes'))
    : false;

export const getConnectorLastSeenError = (connector: Connector): string => {
  return i18n.translate(
    'xpack.enterpriseSearch.content.searchIndices.connectorStatus.lastSeenError.label',
    {
      defaultMessage:
        'Your connector has not checked in for over 30 minutes. (last_seen: {lastSeen})',
      values: { lastSeen: connector.last_seen },
    }
  );
};

const incompleteText = i18n.translate(
  'xpack.enterpriseSearch.content.searchIndices.ingestionStatus.incomplete.label',
  { defaultMessage: 'Incomplete' }
);

export function connectorStatusToText(connector: Connector): string {
  const hasIndexName = !!connector.index_name;
  const connectorStatus = connector.status;
  if (
    connectorStatus === ConnectorStatus.CREATED ||
    connectorStatus === ConnectorStatus.NEEDS_CONFIGURATION
  ) {
    return i18n.translate(
      'xpack.enterpriseSearch.content.searchIndices.connectorStatus.needsConfig.label',
      { defaultMessage: 'Needs Configuration' }
    );
  }
  if (
    connector.last_sync_status === SyncStatus.ERROR ||
    connector.last_access_control_sync_status === SyncStatus.ERROR ||
    connector.last_sync_error != null ||
    connector.last_access_control_sync_error != null
  ) {
    return i18n.translate(
      'xpack.enterpriseSearch.content.searchIndices.connectorStatus.syncFailure.label',
      { defaultMessage: 'Sync Failure' }
    );
  }
  if (isLastSeenOld(connector) || connectorStatus === ConnectorStatus.ERROR) {
    return i18n.translate(
      'xpack.enterpriseSearch.content.searchIndices.connectorStatus.connectorFailure.label',
      { defaultMessage: 'Connector Failure' }
    );
  }
  if (!hasIndexName) {
    return incompleteText;
  }
  if (connectorStatus === ConnectorStatus.CONFIGURED) {
    return i18n.translate(
      'xpack.enterpriseSearch.content.searchIndices.ingestionStatus.configured.label',
      { defaultMessage: 'Configured' }
    );
  }
  if (connectorStatus === ConnectorStatus.CONNECTED) {
    return i18n.translate(
      'xpack.enterpriseSearch.content.searchIndices.ingestionStatus.connected.label',
      { defaultMessage: 'Connected' }
    );
  }

  return incompleteText;
}

export function connectorStatusToColor(connector: Connector): 'warning' | 'danger' | 'success' {
  const hasIndexName = !!connector.index_name;
  const connectorStatus = connector.status;
  if (!hasIndexName) {
    return 'warning';
  }
  if (
    isLastSeenOld(connector) ||
    connectorStatus === ConnectorStatus.ERROR ||
    connector.last_sync_status === SyncStatus.ERROR ||
    connector.last_access_control_sync_status === SyncStatus.ERROR ||
    connector.last_sync_error != null ||
    connector.last_access_control_sync_error != null
  ) {
    return 'danger';
  }
  if (connectorStatus === ConnectorStatus.CONNECTED) {
    return 'success';
  }
  return 'warning';
}
