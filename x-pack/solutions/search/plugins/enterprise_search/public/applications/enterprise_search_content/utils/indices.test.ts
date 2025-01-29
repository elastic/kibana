/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { connectorIndex, apiIndex } from '../__mocks__/view_index.mock';

import moment from 'moment';

import {
  ConnectorStatus,
  SyncStatus,
  IngestionStatus,
  IngestionMethod,
} from '@kbn/search-connectors';

import {
  getIngestionMethod,
  getIngestionStatus,
  getLastUpdated,
  indexToViewIndex,
  isConnectorIndex,
  isApiIndex,
  isConnectorViewIndex,
  isApiViewIndex,
} from './indices';

describe('Indices util functions', () => {
  describe('getIngestionMethod', () => {
    it('should return correct ingestion method for connector', () => {
      expect(getIngestionMethod(connectorIndex)).toEqual(IngestionMethod.CONNECTOR);
    });
    it('should return correct ingestion method for API', () => {
      expect(getIngestionMethod(apiIndex)).toEqual(IngestionMethod.API);
    });
    it('should return API for undefined index', () => {
      expect(getIngestionMethod(undefined)).toEqual(IngestionMethod.API);
    });
  });
  describe('getIngestionStatus', () => {
    it('should return connected for API', () => {
      expect(getIngestionStatus(apiIndex)).toEqual(IngestionStatus.CONNECTED);
    });
    it('should return connected for undefined', () => {
      expect(getIngestionStatus(undefined)).toEqual(IngestionStatus.CONNECTED);
    });
    it('should return configured for configured connector', () => {
      expect(getIngestionStatus(connectorIndex)).toEqual(IngestionStatus.CONFIGURED);
    });
    it('should return connected for complete connector', () => {
      expect(
        getIngestionStatus({
          ...connectorIndex,
          connector: { ...connectorIndex.connector, status: ConnectorStatus.CONNECTED },
        })
      ).toEqual(IngestionStatus.CONNECTED);
    });
    it('should return incomplete for needs_configuration connector', () => {
      expect(
        getIngestionStatus({
          ...connectorIndex,
          connector: { ...connectorIndex.connector, status: ConnectorStatus.NEEDS_CONFIGURATION },
        })
      ).toEqual(IngestionStatus.INCOMPLETE);
    });
    it('should return error for connector that last checked in more than 30 minutes ago', () => {
      const lastSeen = moment().subtract(31, 'minutes').format();
      expect(
        getIngestionStatus({
          ...connectorIndex,
          connector: {
            ...connectorIndex.connector,
            last_seen: lastSeen,
            status: ConnectorStatus.CONNECTED,
          },
        })
      ).toEqual(IngestionStatus.ERROR);
    });
    it('should return sync error for complete connector with sync error', () => {
      expect(
        getIngestionStatus({
          ...connectorIndex,
          connector: {
            ...connectorIndex.connector,
            last_sync_status: SyncStatus.ERROR,
            status: ConnectorStatus.NEEDS_CONFIGURATION,
          },
        })
      ).toEqual(IngestionStatus.SYNC_ERROR);
    });
    it('should return error for connector with error', () => {
      expect(
        getIngestionStatus({
          ...connectorIndex,
          connector: {
            ...connectorIndex.connector,
            last_sync_status: SyncStatus.COMPLETED,
            status: ConnectorStatus.ERROR,
          },
        })
      ).toEqual(IngestionStatus.ERROR);
    });
  });
  describe('getLastUpdated', () => {
    it('should return never for connector with no last updated time', () => {
      expect(getLastUpdated(connectorIndex)).toEqual('never');
    });
    it('should return last_synced for connector with no last updated time', () => {
      expect(
        getLastUpdated({
          ...connectorIndex,
          connector: { ...connectorIndex.connector, last_synced: 'last_synced' },
        })
      ).toEqual('last_synced');
    });
    it('should return null for api', () => {
      expect(getLastUpdated(apiIndex)).toEqual(null);
    });
  });
  describe('indexToViewIndex', () => {
    it('should apply above transformations to viewIndex', () => {
      expect(indexToViewIndex(connectorIndex)).toEqual({
        ...connectorIndex,
        ingestionMethod: getIngestionMethod(connectorIndex),
        ingestionStatus: getIngestionStatus(connectorIndex),
        lastUpdated: getLastUpdated(connectorIndex),
      });
    });
  });
  describe('isConnectorIndex', () => {
    it('should return true for connector indices', () => {
      expect(isConnectorIndex(connectorIndex)).toEqual(true);
    });
    it('should return false for API indices', () => {
      expect(isConnectorIndex(apiIndex)).toEqual(false);
    });
  });
  describe('isApiIndex', () => {
    it('should return true for API indices', () => {
      expect(isApiIndex(apiIndex)).toEqual(true);
    });
    it('should return false for connector and API indices', () => {
      expect(isApiIndex(connectorIndex)).toEqual(false);
    });
  });
  describe('isConnectorViewIndex', () => {
    it('should return true for connector indices', () => {
      expect(isConnectorViewIndex(connectorIndex)).toEqual(true);
    });
    it('should return false for API indices', () => {
      expect(isConnectorViewIndex(apiIndex)).toEqual(false);
    });
  });
  describe('isApiViewIndex', () => {
    it('should return true for API indices', () => {
      expect(isApiViewIndex(apiIndex)).toEqual(true);
    });
    it('should return false for connector and API indices', () => {
      expect(isApiViewIndex(connectorIndex)).toEqual(false);
    });
  });
});
