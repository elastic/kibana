/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { LogsExtractionConfigClient } from './logs_extraction_config_client';
import type { LogExtractionOverridesClient } from '../saved_objects/log_extraction_overrides/client';
import type { EntityStoreGlobalStateClient } from '../saved_objects/global_state';
import {
  LATEST_LOG_EXTRACTION_DEFAULTS,
  LEGACY_LOG_EXTRACTION_DEFAULTS,
  type LogExtractionConfig,
} from './config';

const mockOverridesClient = (): jest.Mocked<
  Pick<LogExtractionOverridesClient, 'get' | 'upsert' | 'delete'>
> => ({
  get: jest.fn().mockResolvedValue({}),
  upsert: jest.fn().mockResolvedValue(undefined),
  delete: jest.fn().mockResolvedValue(undefined),
});

const mockGlobalStateClient = (): jest.Mocked<
  Pick<EntityStoreGlobalStateClient, 'find' | 'clearLogsExtraction'>
> => ({
  find: jest.fn().mockResolvedValue(undefined),
  clearLogsExtraction: jest.fn().mockResolvedValue(undefined),
});

const makeClient = (
  overrides: jest.Mocked<Pick<LogExtractionOverridesClient, 'get' | 'upsert' | 'delete'>>,
  globalState: jest.Mocked<Pick<EntityStoreGlobalStateClient, 'find' | 'clearLogsExtraction'>>
) =>
  new LogsExtractionConfigClient(
    overrides as unknown as LogExtractionOverridesClient,
    globalState as unknown as EntityStoreGlobalStateClient
  );

describe('LogsExtractionConfigClient', () => {
  describe('override resolution (via get())', () => {
    it('uses overrides SO directly when non-empty, skipping global state', async () => {
      const overrides = mockOverridesClient();
      const globalState = mockGlobalStateClient();
      overrides.get.mockResolvedValue({ lookbackPeriod: '6h' });

      const client = makeClient(overrides, globalState);
      const result = await client.get();

      expect(result).toEqual({ ...LATEST_LOG_EXTRACTION_DEFAULTS, lookbackPeriod: '6h' });
      expect(globalState.find).not.toHaveBeenCalled();
    });

    it('falls back to global state logsExtraction when overrides SO is empty', async () => {
      const overrides = mockOverridesClient();
      const globalState = mockGlobalStateClient();
      overrides.get.mockResolvedValue({});
      globalState.find.mockResolvedValue({
        logsExtraction: { ...LEGACY_LOG_EXTRACTION_DEFAULTS, lookbackPeriod: '12h' },
      } as unknown as ReturnType<typeof globalState.find> extends Promise<infer T> ? T : never);

      const client = makeClient(overrides, globalState);
      const result = await client.get();

      // Delta from legacy defaults is applied on top of latest defaults
      expect(result).toEqual({ ...LATEST_LOG_EXTRACTION_DEFAULTS, lookbackPeriod: '12h' });
    });

    it('returns product defaults when overrides SO is empty and global state has no logsExtraction', async () => {
      const overrides = mockOverridesClient();
      const globalState = mockGlobalStateClient();
      overrides.get.mockResolvedValue({});
      globalState.find.mockResolvedValue(undefined);

      const client = makeClient(overrides, globalState);
      const result = await client.get();

      expect(result).toEqual(LATEST_LOG_EXTRACTION_DEFAULTS);
    });

    it('returns product defaults when legacy logsExtraction matches defaults exactly', async () => {
      const overrides = mockOverridesClient();
      const globalState = mockGlobalStateClient();
      overrides.get.mockResolvedValue({});
      globalState.find.mockResolvedValue({
        logsExtraction: { ...LEGACY_LOG_EXTRACTION_DEFAULTS },
      } as unknown as ReturnType<typeof globalState.find> extends Promise<infer T> ? T : never);

      const client = makeClient(overrides, globalState);
      const result = await client.get();

      expect(result).toEqual(LATEST_LOG_EXTRACTION_DEFAULTS);
    });
  });

  describe('get()', () => {
    it('resolves full config by applying overrides onto current product defaults', async () => {
      const overrides = mockOverridesClient();
      overrides.get.mockResolvedValue({ lookbackPeriod: '6h' });

      const result = await makeClient(overrides, mockGlobalStateClient()).get();

      expect(result).toEqual<LogExtractionConfig>({
        ...LATEST_LOG_EXTRACTION_DEFAULTS,
        lookbackPeriod: '6h',
      });
    });
  });

  describe('update()', () => {
    it('merges patch onto existing overrides, drops fields equal to latest defaults', async () => {
      const overrides = mockOverridesClient();
      const globalState = mockGlobalStateClient();
      overrides.get.mockResolvedValue({ lookbackPeriod: '6h' });

      const client = makeClient(overrides, globalState);
      const result = await client.update({ docsLimit: 5_000 });

      // lookbackPeriod differs from LATEST_LOG_EXTRACTION_DEFAULTS, docsLimit also differs
      expect(overrides.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ lookbackPeriod: '6h', docsLimit: 5_000 })
      );
      expect(result).toEqual<LogExtractionConfig>({
        ...LATEST_LOG_EXTRACTION_DEFAULTS,
        lookbackPeriod: '6h',
        docsLimit: 5_000,
      });
    });

    it('sparsifies fields equal to latest defaults out of stored overrides', async () => {
      const overrides = mockOverridesClient();
      const globalState = mockGlobalStateClient();
      overrides.get.mockResolvedValue({ lookbackPeriod: '6h' });

      const client = makeClient(overrides, globalState);
      // Reset lookbackPeriod back to default
      await client.update({ lookbackPeriod: LATEST_LOG_EXTRACTION_DEFAULTS.lookbackPeriod });

      expect(overrides.upsert).toHaveBeenCalledWith({});
    });

    it('calls update with empty patch to read-merge existing overrides', async () => {
      const overrides = mockOverridesClient();
      const globalState = mockGlobalStateClient();
      overrides.get.mockResolvedValue({ lookbackPeriod: '6h' });

      const client = makeClient(overrides, globalState);
      await client.update();

      expect(overrides.upsert).toHaveBeenCalledWith({ lookbackPeriod: '6h' });
    });

    it('merges patch onto legacy global-state overrides when new SO is empty', async () => {
      const overrides = mockOverridesClient();
      const globalState = mockGlobalStateClient();
      overrides.get.mockResolvedValue({});
      globalState.find.mockResolvedValue({
        logsExtraction: { ...LEGACY_LOG_EXTRACTION_DEFAULTS, lookbackPeriod: '12h' },
      } as unknown as ReturnType<typeof globalState.find> extends Promise<infer T> ? T : never);

      const client = makeClient(overrides, globalState);
      await client.update({ docsLimit: 5_000 });

      expect(overrides.upsert).toHaveBeenCalledWith(
        expect.objectContaining({ lookbackPeriod: '12h', docsLimit: 5_000 })
      );
    });
  });

  describe('init()', () => {
    it('calls update when params are non-empty', async () => {
      const overrides = mockOverridesClient();
      const client = makeClient(overrides, mockGlobalStateClient());
      await client.init({ lookbackPeriod: '6h' });
      expect(overrides.upsert).toHaveBeenCalled();
    });

    it('calls get (no write) when params are empty or absent', async () => {
      const overrides = mockOverridesClient();
      const client = makeClient(overrides, mockGlobalStateClient());
      await client.init();
      await client.init({});
      expect(overrides.upsert).not.toHaveBeenCalled();
    });
  });

  describe('delete()', () => {
    it('delegates to overrides client', async () => {
      const overrides = mockOverridesClient();
      const client = makeClient(overrides, mockGlobalStateClient());
      await client.delete();
      expect(overrides.delete).toHaveBeenCalledTimes(1);
    });
  });
});
