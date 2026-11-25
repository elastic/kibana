/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderSummaryTable } from './print_run';

describe('renderSummaryTable', () => {
  const logSpy = jest.spyOn(console, 'log').mockImplementation();

  afterEach(() => {
    logSpy.mockClear();
  });

  it('ignores missing spec results', () => {
    const result = {
      runs: new Array<CypressCommandLine.RunResult>(1),
      totalDuration: 0,
      totalFailed: 0,
      totalPassed: 0,
      totalPending: 0,
      totalSkipped: 0,
      totalTests: 0,
    };

    expect(() => renderSummaryTable([result])).not.toThrow();
  });
});
