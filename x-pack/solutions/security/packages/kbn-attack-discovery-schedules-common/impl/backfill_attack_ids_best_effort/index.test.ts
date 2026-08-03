/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchClientMock } from '@kbn/core-elasticsearch-client-server-mocks';
import { loggerMock } from '@kbn/logging-mocks';
import { backfillAttackIdsBestEffort } from '.';

describe('backfillAttackIdsBestEffort', () => {
  const alertIdToAttackIdsMap = {
    'alert-id-1': ['attack-1'],
    'alert-id-2': ['attack-1', 'attack-2'],
  };
  const spaceId = 'default';

  let esClient: ReturnType<typeof elasticsearchClientMock.createElasticsearchClient>;
  let logger: ReturnType<typeof loggerMock.create>;

  beforeEach(() => {
    esClient = elasticsearchClientMock.createElasticsearchClient();
    logger = loggerMock.create();
  });

  describe('Happy path', () => {
    it('back-fills the alerts via `updateByQuery` with `refresh`', async () => {
      await backfillAttackIdsBestEffort({ alertIdToAttackIdsMap, esClient, logger, spaceId });

      expect(esClient.updateByQuery).toHaveBeenCalledWith(
        expect.objectContaining({ refresh: true })
      );
    });

    it('does not log a warning', async () => {
      await backfillAttackIdsBestEffort({ alertIdToAttackIdsMap, esClient, logger, spaceId });

      expect(logger.warn).not.toHaveBeenCalled();
    });
  });

  describe('when the back-fill throws', () => {
    beforeEach(() => {
      esClient.updateByQuery.mockRejectedValue(new Error('boom'));
    });

    it('does not rethrow (best-effort)', async () => {
      await expect(
        backfillAttackIdsBestEffort({ alertIdToAttackIdsMap, esClient, logger, spaceId })
      ).resolves.toBeUndefined();
    });

    it('logs a prominent `[kibana-dkv]` warning', async () => {
      await backfillAttackIdsBestEffort({ alertIdToAttackIdsMap, esClient, logger, spaceId });

      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('[kibana-dkv]'));
    });

    it('includes the affected alert ids in the warning', async () => {
      await backfillAttackIdsBestEffort({ alertIdToAttackIdsMap, esClient, logger, spaceId });

      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('alert-id-1, alert-id-2'));
    });

    it('includes the underlying error in the warning', async () => {
      await backfillAttackIdsBestEffort({ alertIdToAttackIdsMap, esClient, logger, spaceId });

      expect(logger.warn).toHaveBeenCalledWith(expect.stringContaining('boom'));
    });
  });
});
