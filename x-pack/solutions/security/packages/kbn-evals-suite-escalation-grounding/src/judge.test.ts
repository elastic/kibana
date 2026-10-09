/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EvalConnector } from '@kbn/evals';
import type { ToolingLog } from '@kbn/tooling-log';
import { assertJudgeIsolation } from './judge';

const conn = (id: string, name = id) => ({ id, name } as unknown as EvalConnector);
const makeLog = () => ({ info: jest.fn() } as unknown as ToolingLog & { info: jest.Mock });

describe('assertJudgeIsolation', () => {
  const judge = conn('eis-google-gemini-3-1-pro');

  it('throws when the judge is the model under test', () => {
    expect(() =>
      assertJudgeIsolation({ connector: judge, evaluationConnector: judge, log: makeLog() })
    ).toThrow(/Judge isolation violated/);
  });

  it('throws when the judge is not gemini-3-1-pro', () => {
    expect(() =>
      assertJudgeIsolation({
        connector: conn('eis-anthropic-claude'),
        evaluationConnector: conn('eis-openai-gpt'),
        log: makeLog(),
      })
    ).toThrow(/must be gemini-3-1-pro/);
  });

  it('passes and logs the judge when isolated and pinned', () => {
    const log = makeLog();
    assertJudgeIsolation({
      connector: conn('eis-anthropic-claude'),
      evaluationConnector: judge,
      log,
    });
    expect(log.info).toHaveBeenCalledWith(expect.stringContaining('eis-google-gemini-3-1-pro'));
  });
});
