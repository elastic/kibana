/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('fs', () => ({
  readFileSync: jest.fn(),
}));

import { readFileSync } from 'fs';
import type { LoadBalancerConfig } from './utils';
import { isSkipped } from './utils';

const mockReadFileSync = readFileSync as unknown as jest.Mock;

const withSource = (source: string) => {
  mockReadFileSync.mockReturnValue(source);
  return 'any_spec.cy.ts';
};

const lbConfig: LoadBalancerConfig = {
  dynamicRunnerWeights: { runTestsForEachVersion: 4 },
  filteredRunnerWeights: {},
  setupCostWeight: 0,
  perSpecOverhead: 0,
  minSpecWeight: 1,
};

describe('isSkipped', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('does not skip a file whose first suite is skipped but has a live suite after it', () => {
    // Regression test: isSkipped used to judge the file by its first expression
    // statement, so a leading `describe.skip` discarded the whole file and the
    // live suites below it never ran. See threat_intelligence/cases.cy.ts.
    const filePath = withSource(`
      describe.skip('skipped first', () => {
        it('does not run', () => {});
      });

      describe('live second', () => {
        it('must still run', () => {});
      });
    `);

    expect(isSkipped(filePath)).toBe(false);
  });

  it('skips a file where every suite is skipped', () => {
    const filePath = withSource(`
      describe.skip('one', () => {
        it('a', () => {});
      });

      describe.skip('two', () => {
        it('b', () => {});
      });
    `);

    expect(isSkipped(filePath)).toBe(true);
  });

  it('skips a file whose only suite is skipped', () => {
    const filePath = withSource(`
      describe.skip('only suite', () => {
        it('a', () => {});
      });
    `);

    expect(isSkipped(filePath)).toBe(true);
  });

  it('does not skip a file with a live suite', () => {
    const filePath = withSource(`
      describe('live', () => {
        it('a', () => {});
      });
    `);

    expect(isSkipped(filePath)).toBe(false);
  });

  it('skips a live suite in which every test is `it.skip`', () => {
    const filePath = withSource(`
      describe('live suite, dead tests', () => {
        it.skip('a', () => {});
        it.skip('b', () => {});
      });
    `);

    expect(isSkipped(filePath)).toBe(true);
  });

  it('does not skip a suite that mixes skipped and live tests', () => {
    const filePath = withSource(`
      describe('mixed', () => {
        it.skip('a', () => {});
        it('b', () => {});
      });
    `);

    expect(isSkipped(filePath)).toBe(false);
  });

  it('skips a file that declares no tests at all', () => {
    const filePath = withSource(`
      describe('empty', () => {});
    `);

    expect(isSkipped(filePath)).toBe(true);
  });

  it('does not skip a file whose tests come from a dynamic runner', () => {
    const filePath = withSource(`
      describe('generated', () => {
        runTestsForEachVersion(['1.0'], () => {});
      });
    `);

    expect(isSkipped(filePath, lbConfig)).toBe(false);
  });

  it('skips a dynamic runner nested inside a skipped suite', () => {
    const filePath = withSource(`
      describe.skip('generated but skipped', () => {
        runTestsForEachVersion(['1.0'], () => {});
      });
    `);

    expect(isSkipped(filePath, lbConfig)).toBe(true);
  });

  it('ignores a dynamic runner when no load balancer config is given', () => {
    const filePath = withSource(`
      describe('generated', () => {
        runTestsForEachVersion(['1.0'], () => {});
      });
    `);

    expect(isSkipped(filePath)).toBe(true);
  });
});
