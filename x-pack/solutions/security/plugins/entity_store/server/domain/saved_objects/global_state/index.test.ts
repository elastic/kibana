/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { savedObjectsClientMock } from '@kbn/core/server/mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { SavedObjectsErrorHelpers } from '@kbn/core/server';
import type { SavedObjectsClientContract } from '@kbn/core/server';
import { EntityStoreGlobalStateClient } from '.';
import { EntityStoreGlobalStateTypeName } from './types';
import {
  LOG_EXTRACTION_LOOKBACK_PERIOD_DEFAULT,
  LOG_EXTRACTION_MAX_LOGS_PER_WINDOW_DEFAULT,
  type StoredEntityStoreGlobalState,
} from './constants';

const NAMESPACE = 'default';
const SO_ID = `${EntityStoreGlobalStateTypeName}-${NAMESPACE}`;

const buildFindResponse = (attributes: StoredEntityStoreGlobalState, version = 'v1') => ({
  total: 1,
  page: 1,
  per_page: 1,
  saved_objects: [
    {
      id: SO_ID,
      type: EntityStoreGlobalStateTypeName,
      references: [],
      score: 0,
      version,
      attributes,
    },
  ],
});

const emptyFindResponse = { total: 0, page: 1, per_page: 1, saved_objects: [] };

describe('EntityStoreGlobalStateClient', () => {
  let soClient: jest.Mocked<SavedObjectsClientContract>;
  let client: EntityStoreGlobalStateClient;

  beforeEach(() => {
    soClient = savedObjectsClientMock.create();
    client = new EntityStoreGlobalStateClient(soClient, NAMESPACE, loggerMock.create());
  });

  describe('find', () => {
    it('resolves sparse overrides against the current defaults', async () => {
      soClient.find.mockResolvedValue(
        buildFindResponse({
          historySnapshot: { status: 'started', frequency: '24h' },
          logsExtraction: { frequency: '5m' },
        })
      );

      const state = await client.find();

      expect(state?.logsExtraction.frequency).toBe('5m');
      expect(state?.logsExtraction.maxLogsPerWindow).toBe(
        LOG_EXTRACTION_MAX_LOGS_PER_WINDOW_DEFAULT
      );
    });

    it('returns undefined when nothing is persisted', async () => {
      soClient.find.mockResolvedValue(emptyFindResponse);
      expect(await client.find()).toBeUndefined();
    });
  });

  describe('init', () => {
    const HISTORY_SNAPSHOT = { status: 'started' as const, frequency: '24h' };

    it('creates the SO with empty overrides and writes nothing more when no params are given', async () => {
      soClient.find.mockResolvedValue(emptyFindResponse);

      await client.init({ historySnapshot: HISTORY_SNAPSHOT });

      expect(soClient.create).toHaveBeenCalledWith(
        EntityStoreGlobalStateTypeName,
        { historySnapshot: HISTORY_SNAPSHOT, logsExtraction: {} },
        { id: SO_ID, refresh: 'wait_for' }
      );
      expect(soClient.update).not.toHaveBeenCalled();
    });

    it('creates the SO then persists only the non-default overrides on fresh install with params', async () => {
      soClient.find
        .mockResolvedValueOnce(emptyFindResponse) // init: create branch
        .mockResolvedValue(
          buildFindResponse({ historySnapshot: HISTORY_SNAPSHOT, logsExtraction: {} })
        ); // writeLogsExtractionOverrides read-back

      await client.init({
        historySnapshot: HISTORY_SNAPSHOT,
        logsExtraction: {
          frequency: '5m',
          maxLogsPerWindow: LOG_EXTRACTION_MAX_LOGS_PER_WINDOW_DEFAULT, // equals default -> stripped
        },
      });

      expect(soClient.create).toHaveBeenCalledWith(
        EntityStoreGlobalStateTypeName,
        { historySnapshot: HISTORY_SNAPSHOT, logsExtraction: {} },
        { id: SO_ID, refresh: 'wait_for' }
      );
      expect(soClient.update).toHaveBeenCalledWith(
        EntityStoreGlobalStateTypeName,
        SO_ID,
        { historySnapshot: HISTORY_SNAPSHOT, logsExtraction: { frequency: '5m' } },
        expect.objectContaining({ mergeAttributes: false })
      );
    });

    it('leaves existing log extraction overrides untouched when re-installed without params', async () => {
      soClient.find.mockResolvedValue(
        buildFindResponse({
          historySnapshot: HISTORY_SNAPSHOT,
          logsExtraction: { frequency: '5m' },
        })
      );

      await client.init({ historySnapshot: HISTORY_SNAPSHOT });

      // Only the history snapshot is merge-updated; logsExtraction is never written.
      expect(soClient.create).not.toHaveBeenCalled();
      expect(soClient.update).toHaveBeenCalledTimes(1);
      expect(soClient.update).toHaveBeenCalledWith(
        EntityStoreGlobalStateTypeName,
        SO_ID,
        { historySnapshot: HISTORY_SNAPSHOT },
        expect.objectContaining({ mergeAttributes: true })
      );
    });

    it('replaces existing overrides wholesale when re-installed with params', async () => {
      soClient.find.mockResolvedValue(
        buildFindResponse({
          historySnapshot: HISTORY_SNAPSHOT,
          logsExtraction: { frequency: '5m', delay: '9m' },
        })
      );

      await client.init({ historySnapshot: HISTORY_SNAPSHOT, logsExtraction: { delay: '2m' } });

      // The prior `frequency` override is dropped by the wholesale replace.
      expect(soClient.update).toHaveBeenCalledWith(
        EntityStoreGlobalStateTypeName,
        SO_ID,
        { historySnapshot: HISTORY_SNAPSHOT, logsExtraction: { delay: '2m' } },
        expect.objectContaining({ mergeAttributes: false })
      );
    });
  });

  describe('writeLogsExtractionOverrides', () => {
    it('replaces logsExtraction wholesale, strips defaults, and preserves historySnapshot', async () => {
      const historySnapshot = {
        status: 'started' as const,
        frequency: '24h',
        lastExecutionTimestamp: '2026-01-01T00:00:00.000Z',
      };
      soClient.find.mockResolvedValue(
        buildFindResponse({ historySnapshot, logsExtraction: { frequency: '9m' } })
      );

      await client.writeLogsExtractionOverrides({
        frequency: '5m',
        lookbackPeriod: LOG_EXTRACTION_LOOKBACK_PERIOD_DEFAULT, // equals default -> stripped
      });

      expect(soClient.update).toHaveBeenCalledWith(
        EntityStoreGlobalStateTypeName,
        SO_ID,
        // lookbackPeriod was stripped as a default; historySnapshot (incl. runtime state) preserved.
        { historySnapshot, logsExtraction: { frequency: '5m' } },
        expect.objectContaining({ mergeAttributes: false, version: 'v1' })
      );
    });

    it('throws on a version conflict without retrying (the caller decides whether to retry)', async () => {
      soClient.find.mockResolvedValue(
        buildFindResponse({
          historySnapshot: { status: 'started', frequency: '24h' },
          logsExtraction: {},
        })
      );
      soClient.update.mockRejectedValue(SavedObjectsErrorHelpers.createConflictError(SO_ID, SO_ID));

      await expect(client.writeLogsExtractionOverrides({ frequency: '5m' })).rejects.toThrow();
      expect(soClient.update).toHaveBeenCalledTimes(1);
    });

    it('throws when no global state exists', async () => {
      soClient.find.mockResolvedValue(emptyFindResponse);

      await expect(client.writeLogsExtractionOverrides({ frequency: '5m' })).rejects.toThrow();
      expect(soClient.update).not.toHaveBeenCalled();
    });
  });
});
