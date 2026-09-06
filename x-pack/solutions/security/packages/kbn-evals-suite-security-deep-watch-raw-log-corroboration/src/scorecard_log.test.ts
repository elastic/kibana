/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { isScorecardLogEnabled, logScorecard } from './scorecard_log';

describe('isScorecardLogEnabled', () => {
  it('is off when the variable is unset', () => {
    expect(isScorecardLogEnabled({})).toBe(false);
  });

  it.each(['0', 'false', 'FALSE', '', '   '])('is off for %p', (value) => {
    expect(isScorecardLogEnabled({ EVAL_SCORECARD_LOG: value })).toBe(false);
  });

  it.each(['1', 'true', 'yes', 'on'])('is on for %p', (value) => {
    expect(isScorecardLogEnabled({ EVAL_SCORECARD_LOG: value })).toBe(true);
  });
});

describe('logScorecard', () => {
  const makeLog = () => {
    const lines: string[] = [];
    return { lines, log: { info: (message: string) => lines.push(message) } };
  };

  const entry = {
    level: 'L2',
    exampleId: 'raw-log-full-corroboration',
    scorecard: { skillInvoked: 0, groundedness: 1 },
  };

  it('emits nothing when disabled — logging is opt-in, not part of the contract', () => {
    const { lines, log } = makeLog();
    logScorecard(log, entry, {});
    expect(lines).toEqual([]);
  });

  it('emits one prefixed line when enabled', () => {
    const { lines, log } = makeLog();
    logScorecard(log, entry, { EVAL_SCORECARD_LOG: '1' });
    expect(lines).toHaveLength(1);
    expect(lines[0].startsWith('[SCORECARD] ')).toBe(true);
  });

  it('emits payload parseable back into the scorecard, so a log yields a numbers table', () => {
    const { lines, log } = makeLog();
    logScorecard(log, entry, { EVAL_SCORECARD_LOG: 'true' });
    const parsed = JSON.parse(lines[0].replace('[SCORECARD] ', ''));
    expect(parsed).toEqual(entry);
    expect(parsed.scorecard.skillInvoked).toBe(0);
  });

  it('carries optional metrics through', () => {
    const { lines, log } = makeLog();
    logScorecard(log, { ...entry, metrics: { Factuality: 1 } }, { EVAL_SCORECARD_LOG: '1' });
    const parsed = JSON.parse(lines[0].replace('[SCORECARD] ', ''));
    expect(parsed.metrics).toEqual({ Factuality: 1 });
  });
});
