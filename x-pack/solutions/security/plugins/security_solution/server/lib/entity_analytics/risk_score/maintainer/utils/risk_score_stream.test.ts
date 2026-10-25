/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { elasticsearchServiceMock, loggingSystemMock } from '@kbn/core/server/mocks';
import { EntityType } from '../../../../../../common/entity_analytics/types';
import type { EntityRiskScoreRecord } from '../../../../../../common/api/entity_analytics/common';
import { RiskEngineDataWriter } from '../../risk_engine_data_writer';
import { riskScoreServiceMock } from '../../risk_score_service.mock';
import { createRiskScoreStream } from './risk_score_stream';

const gate = () => {
  let open = () => {};
  const promise = new Promise<void>((resolve) => {
    open = resolve;
  });
  return { promise, open: () => open() };
};

const stats = {
  total: 3,
  successful: 3,
  failed: 0,
  retry: 0,
  noop: 0,
  time: 1,
  bytes: 100,
  aborted: false,
};
const options = { flushBytes: 5_000_000, flushInterval: 1_000, concurrency: 8 };
const logger = loggingSystemMock.createLogger();
const createWriter = () =>
  new RiskEngineDataWriter({
    esClient: elasticsearchServiceMock.createScopedClusterClient().asCurrentUser,
    logger,
    index: 'risk-score.risk-score-default',
    namespace: 'default',
  });

describe('risk score stream', () => {
  it('bounds pending pages and waits for the final acknowledgement', async () => {
    const reading = gate();
    const consumed = gate();
    const acknowledged = gate();
    const writer = createWriter();
    const received: EntityRiskScoreRecord[] = [];
    jest.spyOn(writer, 'stream').mockImplementation(async ({ scores }) => {
      await reading.promise;
      for await (const score of scores) {
        received.push(score);
      }
      consumed.open();
      await acknowledged.promise;
      return stats;
    });
    const stream = createRiskScoreStream({
      writer,
      entityType: EntityType.host,
      options,
      logger,
      stage: 'base',
    });
    const pages = ['first', 'second', 'third'].map((id_value) => [
      riskScoreServiceMock.createRiskScore({ id_value }),
    ]);
    let produced = false;
    const production = Promise.all(pages.map((page) => stream.write(page))).then(() => {
      produced = true;
    });
    await new Promise<void>((resolve) => setImmediate(resolve));
    expect(produced).toBe(false);
    reading.open();
    await production;
    let finished = false;
    const completion = stream.finish().then((result) => {
      finished = true;
      return result;
    });
    await consumed.promise;
    expect(received).toEqual(pages.flat());
    expect(finished).toBe(false);
    acknowledged.open();
    await expect(completion).resolves.toEqual(stats);
  });

  it('releases a blocked producer when the writer fails', async () => {
    const failing = gate();
    const writer = createWriter();
    jest.spyOn(writer, 'stream').mockImplementation(async () => {
      await failing.promise;
      throw new Error('bulk failed');
    });
    const stream = createRiskScoreStream({
      writer,
      entityType: EntityType.host,
      options,
      logger,
      stage: 'base',
    });
    const writes = Promise.allSettled([
      stream.write([riskScoreServiceMock.createRiskScore()]),
      stream.write([riskScoreServiceMock.createRiskScore()]),
    ]);
    failing.open();
    await expect(writes).resolves.toEqual([
      expect.objectContaining({ status: 'rejected' }),
      expect.objectContaining({ status: 'rejected' }),
    ]);
    await expect(stream.finish()).rejects.toThrow('bulk failed');
  });
});
