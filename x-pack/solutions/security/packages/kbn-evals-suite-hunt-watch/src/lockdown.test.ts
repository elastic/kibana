/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  findForbiddenLiterals,
  listLockdownFiles,
  scanLockdown,
  stripTsComments,
  stripYamlComments,
} from './lockdown';

describe('lockdown scan', () => {
  it('returns no fixture literal in any Worker prompt or definition surface', () => {
    expect(scanLockdown()).toEqual({});
  });

  it('returns the hunt workflow definitions and the hunt services among the scanned files', () => {
    const files = listLockdownFiles();
    expect(files).toEqual(
      expect.arrayContaining([
        'src/platform/packages/shared/kbn-workflows/managed/definitions/alertzero/hunt.yaml',
        'src/platform/packages/shared/kbn-workflows/managed/definitions/alertzero/hunt_proposal_gate.yaml',
        'x-pack/solutions/security/plugins/alertzero/server/services/watches/hunt/hunt_coordinator.ts',
      ])
    );
  });

  it('returns no test files among the scanned files', () => {
    expect(listLockdownFiles().filter((file) => file.endsWith('.test.ts'))).toEqual([]);
  });
});

describe('findForbiddenLiterals', () => {
  it.each([
    ['a decoy IP', 'MATCH(source.ip, "198.51.100.40")', ['198.51.100.40']],
    ['a principal', "const who = 'dev-user@corp.example';", ['dev-user@corp.example', 'dev-user']],
    ['the actor name', 'attributed to TA-DEMO-SHADOW-ADMIN', ['TA-DEMO-SHADOW-ADMIN']],
    [
      'the report id family',
      'reportIds: ["ti-report-aws-iam-clean-historic-01"]',
      ['ti-report-aws-iam'],
    ],
  ])('returns %s', (_name, text, expected) => {
    expect(findForbiddenLiterals(text)).toEqual(expected);
  });

  it('returns nothing for text without fixture literals', () => {
    expect(findForbiddenLiterals('MATCH(event.action, "AssumeRole")')).toEqual([]);
  });
});

describe('stripTsComments', () => {
  it('returns the source without line and block comments', () => {
    expect(stripTsComments('const a = 1; // dev-user\n/* WIN-ANALYST01 */ const b = 2;')).toBe(
      'const a = 1; \n const b = 2;'
    );
  });

  it('returns string contents untouched, including slashes', () => {
    const source = "const url = 'https://example.test/dev-user'; const t = `/* keep */`;";
    expect(stripTsComments(source)).toBe(source);
  });
});

describe('stripYamlComments', () => {
  it('returns the yaml without full-line comments', () => {
    expect(stripYamlComments('name: x\n  # escalated-role\nvalue: y')).toBe('name: x\nvalue: y');
  });
});
