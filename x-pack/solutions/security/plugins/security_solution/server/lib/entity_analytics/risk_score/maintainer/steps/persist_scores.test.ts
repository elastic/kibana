/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { EntityType } from '../../../../../../common/entity_analytics/types';
import { riskScoreServiceMock } from '../../risk_score_service.mock';
import type { RiskEngineDataWriter } from '../../risk_engine_data_writer';
import { createPageStepTimings } from '../utils/page_step_timings';
import type { ScopedLogger } from '../utils/with_log_context';
import { persistScoresToRiskIndex } from './persist_scores';

const logger: ScopedLogger = {
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};

const scores = Array.from({ length: 10 }, (_, index) =>
  riskScoreServiceMock.createRiskScore({ id_value: `host:${index}` })
);

const writerReturning = () => {
  const bulk = jest.fn<
    ReturnType<RiskEngineDataWriter['bulk']>,
    Parameters<RiskEngineDataWriter['bulk']>
  >(async (params) => ({ errors: [], docs_written: params.host?.length ?? 0, took: 5 }));
  return { bulk };
};

describe('persistScoresToRiskIndex', () => {
  it('writes every score in one bulk request by default', async () => {
    const writer = writerReturning();

    const written = await persistScoresToRiskIndex({
      writer,
      entityType: EntityType.host,
      scores,
      logger,
    });

    expect(writer.bulk).toHaveBeenCalledTimes(1);
    expect(written).toBe(10);
  });

  it('splits the write into concurrent chunks and sums what they report', async () => {
    const writer = writerReturning();
    const timings = createPageStepTimings();
    const timer = timings.startPage();

    const written = await persistScoresToRiskIndex({
      writer,
      entityType: EntityType.host,
      scores,
      logger,
      timer,
      parallelChunks: 4,
    });
    timer.end();

    expect(writer.bulk.mock.calls.map(([params]) => params.host?.length)).toEqual([3, 3, 3, 1]);
    expect(written).toBe(10);
    expect(timings.summary().firstPage?.steps.riskWrite).toEqual(
      expect.objectContaining({ calls: 1, esTookMs: 20 })
    );
  });
});
