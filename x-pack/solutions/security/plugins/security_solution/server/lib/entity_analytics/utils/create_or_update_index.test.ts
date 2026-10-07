/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { createOrUpdateIndex } from './create_or_update_index';

describe('createOrUpdateIndex', () => {
  const esClient = elasticsearchServiceMock.createElasticsearchClient();
  const logger = loggingSystemMock.createLogger();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('when the index does not exist', () => {
    beforeEach(() => {
      esClient.indices.exists.mockResolvedValue(false);
    });

    it('creates the index without auto_expand_replicas, then applies it as a separate best-effort call', async () => {
      esClient.indices.create.mockResolvedValue({ acknowledged: true, index: 'my-index' } as never);
      esClient.indices.putSettings.mockResolvedValue({ acknowledged: true });

      await createOrUpdateIndex({
        esClient,
        logger,
        options: {
          index: 'my-index',
          mappings: { properties: { id: { type: 'keyword' } } },
          settings: { hidden: true, auto_expand_replicas: '0-1' },
        },
      });

      expect(esClient.indices.create).toHaveBeenCalledWith(
        expect.objectContaining({
          index: 'my-index',
          settings: { hidden: true },
        })
      );
      expect(esClient.indices.putSettings).toHaveBeenCalledWith({
        index: 'my-index',
        settings: { auto_expand_replicas: '0-1' },
      });
    });

    it('keeps static settings (e.g. index.mode) in the create call untouched', async () => {
      esClient.indices.create.mockResolvedValue({ acknowledged: true, index: 'my-index' } as never);
      esClient.indices.putSettings.mockResolvedValue({ acknowledged: true });

      await createOrUpdateIndex({
        esClient,
        logger,
        options: {
          index: 'my-index',
          settings: { mode: 'lookup', auto_expand_replicas: '0-1' },
        },
      });

      expect(esClient.indices.create).toHaveBeenCalledWith(
        expect.objectContaining({ settings: { mode: 'lookup' } })
      );
    });

    it('does not attempt the follow-up call when auto_expand_replicas was not requested', async () => {
      esClient.indices.create.mockResolvedValue({ acknowledged: true, index: 'my-index' } as never);

      await createOrUpdateIndex({
        esClient,
        logger,
        options: { index: 'my-index', settings: { hidden: true } },
      });

      expect(esClient.indices.putSettings).not.toHaveBeenCalled();
    });

    it('does not fail index creation when the cluster rejects auto_expand_replicas (e.g. Serverless)', async () => {
      esClient.indices.create.mockResolvedValue({ acknowledged: true, index: 'my-index' } as never);
      esClient.indices.putSettings.mockRejectedValue(
        new Error(
          'illegal_argument_exception: Settings [index.auto_expand_replicas] are not available when running in serverless mode'
        )
      );

      await expect(
        createOrUpdateIndex({
          esClient,
          logger,
          options: {
            index: 'my-index',
            settings: { hidden: true, auto_expand_replicas: '0-1' },
          },
        })
      ).resolves.not.toThrow();

      expect(logger.debug).toHaveBeenCalledWith(
        expect.stringContaining('Could not set auto_expand_replicas for my-index')
      );
    });

    it('still throws when index creation itself fails for a reason other than already-exists', async () => {
      esClient.indices.create.mockRejectedValue(new Error('cluster_block_exception'));

      await expect(
        createOrUpdateIndex({
          esClient,
          logger,
          options: { index: 'my-index', settings: { hidden: true } },
        })
      ).rejects.toThrow('Failed to create index: my-index');

      expect(esClient.indices.putSettings).not.toHaveBeenCalled();
    });

    it('treats resource_already_exists_exception as success and still applies auto_expand_replicas', async () => {
      esClient.indices.create.mockRejectedValue({
        meta: { body: { error: { type: 'resource_already_exists_exception' } } },
      });
      esClient.indices.putSettings.mockResolvedValue({ acknowledged: true });

      await createOrUpdateIndex({
        esClient,
        logger,
        options: {
          index: 'my-index',
          settings: { hidden: true, auto_expand_replicas: '0-1' },
        },
      });

      expect(esClient.indices.putSettings).toHaveBeenCalledWith({
        index: 'my-index',
        settings: { auto_expand_replicas: '0-1' },
      });
    });
  });

  describe('when the index already exists', () => {
    beforeEach(() => {
      esClient.indices.exists.mockResolvedValue(true);
      esClient.indices.get.mockResolvedValue({ 'my-index': {} } as never);
    });

    it('updates settings (including auto_expand_replicas) best-effort, without throwing on failure', async () => {
      esClient.indices.putSettings.mockRejectedValue(
        new Error('Settings [index.auto_expand_replicas] are not available')
      );
      esClient.indices.putMapping.mockResolvedValue({ acknowledged: true });

      await expect(
        createOrUpdateIndex({
          esClient,
          logger,
          options: {
            index: 'my-index',
            mappings: { properties: {} },
            settings: { hidden: true, auto_expand_replicas: '0-1' },
          },
        })
      ).resolves.not.toThrow();

      expect(esClient.indices.putSettings).toHaveBeenCalledWith(
        expect.objectContaining({ settings: { hidden: true, auto_expand_replicas: '0-1' } })
      );
    });
  });
});
