/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { FallbackSignalStore } from './fallback_signal_store';
import type { DetectionSignal } from '../../../common/detection_signal';

describe('FallbackSignalStore', () => {
  it('forgets a failed installation, logs it and installs on the next write', async () => {
    const esClient = elasticsearchServiceMock.createElasticsearchClient();
    const logger = loggingSystemMock.createLogger();
    esClient.ingest.putPipeline.mockRejectedValueOnce(new Error('cluster unavailable'));
    esClient.bulk.mockResolvedValue({
      errors: false,
      took: 1,
      items: [{ create: { _index: 'signals', status: 201 } }],
    });
    const store = new FallbackSignalStore(esClient, logger);
    const signals = [
      { data: { fingerprint: 'series', strategy: 'error_rate' } },
    ] as DetectionSignal[];

    await expect(store.write(signals)).rejects.toThrow('cluster unavailable');
    expect(logger.error).toHaveBeenCalledWith(expect.stringContaining('cluster unavailable'));

    await expect(store.write(signals)).resolves.toEqual({ written: 1, failures: [] });
    expect(esClient.indices.createDataStream).toHaveBeenCalledTimes(1);
  });
});
