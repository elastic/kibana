/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { ToolingLog } from '@kbn/tooling-log';
import { exampleKeyLog, logPairedScores, type PairedScoreSink } from './run_summary';

describe('logPairedScores', () => {
  beforeEach(() => exampleKeyLog.clear());

  it('averages repetitions and only logs mappings for the current dataset', () => {
    exampleKeyLog.set('aaa', JSON.stringify({ technique: 'T1001' }));
    exampleKeyLog.set('stale', JSON.stringify({ technique: 'T9999' }));
    const pairedSink: PairedScoreSink = new Map([['MITRE Accuracy::aaa', [1, 0.5, null]]]);
    const info = jest.fn();

    logPairedScores({
      pairedSink,
      datasetName: 'hard-cases',
      log: { info } as unknown as ToolingLog,
    });

    expect(info).toHaveBeenCalledWith(
      'PAIRED_SCORES {"dataset":"hard-cases","scores":{"MITRE Accuracy::aaa":0.75}}'
    );
    expect(info).toHaveBeenCalledWith('PAIRED_KEY aaa -> T1001');
    expect(info).not.toHaveBeenCalledWith(expect.stringContaining('T9999'));
  });
});
