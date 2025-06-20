/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  customIncompatibleAntivirusEvaluator,
  ExampleOutput,
  isValidExampleOutput,
} from './customIncompatibleAntivirusEvaluator';
import { EVALUATOR_ERRORS } from './constants';
import { Example, Run } from 'langsmith';

describe('customIncompatibleAntivirusEvaluator', () => {
  describe('isValidExampleOutput', () => {
    it('returns true for empty path arrays', () => {
      const validOutput = {
        results: [
          {
            name: 'Windows Defender',
            requiredPaths: [],
            optionalPaths: [],
            excludedPaths: [],
          },
        ],
      };
      expect(isValidExampleOutput(validOutput)).toBe(true);
    });

    it('returns true for valid ExampleOutput', () => {
      const validOutput = {
        results: [
          {
            name: 'Windows Defender',
            requiredPaths: ['/path/to/required'],
            optionalPaths: ['/path/to/optional'],
            excludedPaths: ['/path/to/excluded'],
          },
        ],
      };
      expect(isValidExampleOutput(validOutput)).toBe(true);
    });

    it('returns false for invalid ExampleOutput with missing name', () => {
      const invalidOutput = {
        results: [
          {
            requiredPaths: ['/path/to/required'],
            optionalPaths: ['/path/to/optional'],
            excludedPaths: ['/path/to/excluded'],
          },
        ],
      };
      expect(isValidExampleOutput(invalidOutput as unknown as ExampleOutput)).toBe(false);
    });

    it('returns false for invalid ExampleOutput with non-string name', () => {
      const invalidOutput = {
        results: [
          {
            name: 123,
            requiredPaths: ['/path/to/required'],
            optionalPaths: ['/path/to/optional'],
            excludedPaths: ['/path/to/excluded'],
          },
        ],
      };
      expect(isValidExampleOutput(invalidOutput as unknown as ExampleOutput)).toBe(false);
    });

    it('returns false for invalid ExampleOutput with non-array results', () => {
      const invalidOutput = {
        results: 'not-an-array',
      };
      expect(isValidExampleOutput(invalidOutput as unknown as ExampleOutput)).toBe(false);
    });

    it('returns false for invalid ExampleOutput with non-string array in requiredPaths', () => {
      const invalidOutput = {
        results: [
          {
            name: 'Windows Defender',
            requiredPaths: [123],
            optionalPaths: ['/path/to/optional'],
            excludedPaths: ['/path/to/excluded'],
          },
        ],
      };
      expect(isValidExampleOutput(invalidOutput as unknown as ExampleOutput)).toBe(false);
    });

    it('returns false for invalid ExampleOutput with non-string array in optionalPaths', () => {
      const invalidOutput = {
        results: [
          {
            name: 'Windows Defender',
            requiredPaths: ['/path/to/required'],
            optionalPaths: [123],
            excludedPaths: ['/path/to/excluded'],
          },
        ],
      };
      expect(isValidExampleOutput(invalidOutput as unknown as ExampleOutput)).toBe(false);
    });

    it('returns false for invalid ExampleOutput with non-string array in excludedPaths', () => {
      const invalidOutput = {
        results: [
          {
            name: 'Windows Defender',
            requiredPaths: ['/path/to/required'],
            optionalPaths: ['/path/to/optional'],
            excludedPaths: [123],
          },
        ],
      };
      expect(isValidExampleOutput(invalidOutput as unknown as ExampleOutput)).toBe(false);
    });
  });
  describe('customIncompatibleAntivirusEvaluator', () => {
    const buildRun = (insights: unknown) => ({ outputs: { insights } } as unknown as Run);

    const buildExample = (results: ExampleOutput['results']) =>
      ({ outputs: { results } } as unknown as Example);

    const evaluatorFunction = customIncompatibleAntivirusEvaluator as Function;

    it('returns INVALID_OUTPUT_STRUCTURE if output is not valid', () => {
      const run = buildRun([]);
      const example = { outputs: {} }; // Missing valid structure

      const result = evaluatorFunction(run, example);
      expect(result.score).toBe(0);
      expect(result.comment).toContain(EVALUATOR_ERRORS.INVALID_OUTPUT_STRUCTURE);
    });

    it('returns NO_RESULTS if run insights are missing or empty', () => {
      const run = buildRun([]);
      const example = buildExample([
        {
          name: 'TestAV',
          requiredPaths: ['C:/test.exe'],
          optionalPaths: [],
          excludedPaths: [],
        },
      ]);

      const result = evaluatorFunction(run, example);
      expect(result.score).toBe(0);
      expect(result.comment).toContain(EVALUATOR_ERRORS.NO_RESULTS);
    });

    it('passes all checks when everything matches', () => {
      const run = buildRun([
        {
          group: 'TestAV',
          events: [{ value: 'C:/test.exe' }, { value: 'C:/opt.log' }],
        },
      ]);

      const example = buildExample([
        {
          name: 'TestAV',
          requiredPaths: ['C:/test.exe'],
          optionalPaths: ['C:/opt.log'],
          excludedPaths: [],
        },
      ]);

      const result = evaluatorFunction(run, example);
      expect(result.score).toBe(1);
      expect(result.comment).toBe('All checks passed');
    });

    it('fails on missing required paths', () => {
      const run = buildRun([
        {
          group: 'TestAV',
          events: [{ value: 'C:/other.exe' }],
        },
      ]);

      const example = buildExample([
        {
          name: 'TestAV',
          requiredPaths: ['C:/required.exe'],
          optionalPaths: [],
          excludedPaths: [],
        },
      ]);

      const result = evaluatorFunction(run, example);
      expect(result.score).toBeCloseTo(0.5);
      expect(result.comment).toContain('missing required paths');
      expect(result.comment).toContain('contains unexpected paths');
    });

    it('fails on presence of excluded paths', () => {
      const run = buildRun([
        {
          group: 'TestAV',
          events: [{ value: 'C:/malware.exe' }],
        },
      ]);

      const example = buildExample([
        {
          name: 'TestAV',
          requiredPaths: [],
          optionalPaths: [],
          excludedPaths: ['C:/malware.exe'],
        },
      ]);

      const result = evaluatorFunction(run, example);
      expect(result.score).toBeCloseTo(0.75);
      expect(result.comment).toContain('contains excluded paths');
    });

    it('fails on unexpected paths', () => {
      const run = buildRun([
        {
          group: 'TestAV',
          events: [{ value: 'C:/weird.exe' }],
        },
      ]);

      const example = buildExample([
        {
          name: 'TestAV',
          requiredPaths: [],
          optionalPaths: [],
          excludedPaths: [],
        },
      ]);

      const result = evaluatorFunction(run, example);
      expect(result.score).toBeCloseTo(0.75);
      expect(result.comment).toContain('contains unexpected paths');
    });

    it('handles multiple failed checks with score < 1', () => {
      const run = buildRun([
        {
          group: 'TestAV',
          events: [{ value: 'C:/unexpected.exe' }, { value: 'C:/excluded.exe' }],
        },
      ]);

      const example = buildExample([
        {
          name: 'TestAV',
          requiredPaths: ['C:/required.exe'],
          optionalPaths: [],
          excludedPaths: ['C:/excluded.exe'],
        },
      ]);

      const result = evaluatorFunction(run, example);
      expect(result.score).toBeCloseTo(0.25);
      expect(result.comment).toContain('missing required paths');
      expect(result.comment).toContain('contains excluded paths');
      expect(result.comment).toContain('contains unexpected paths');
    });
    it('passes when multiple requirements are all satisfied', () => {
      const run = buildRun([
        {
          group: 'AV A',
          events: [{ value: '/a/req1' }, { value: '/a/opt1' }],
        },
        {
          group: 'AV B',
          events: [{ value: '/b/req1' }, { value: '/b/opt1' }],
        },
      ]);

      const example = buildExample([
        {
          name: 'AV A',
          requiredPaths: ['/a/req1'],
          optionalPaths: ['/a/opt1'],
          excludedPaths: ['/a/bad'],
        },
        {
          name: 'AV B',
          requiredPaths: ['/b/req1'],
          optionalPaths: ['/b/opt1'],
          excludedPaths: ['/b/bad'],
        },
      ]);

      const result = evaluatorFunction(run, example);
      expect(result.score).toBe(1);
      expect(result.comment).toBe('All checks passed');
    });
    it('fails when one requirement is missing a required path', () => {
      const run = buildRun([
        {
          group: 'AV A',
          events: [{ value: '/a/req1' }],
        },
        {
          group: 'AV B',
          events: [{ value: '/b/opt1' }],
        },
      ]);

      const example = buildExample([
        {
          name: 'AV A',
          requiredPaths: ['/a/req1'],
          optionalPaths: [],
          excludedPaths: [],
        },
        {
          name: 'AV B',
          requiredPaths: ['/b/req1'],
          optionalPaths: ['/b/opt1'],
          excludedPaths: [],
        },
      ]);

      const result = evaluatorFunction(run, example);
      expect(result.score).toBeCloseTo(0.86);
      expect(result.comment).toContain('requirement "AV B" is missing required paths');
    });
    it('fails when one requirement has an excluded path present', () => {
      const run = buildRun([
        {
          group: 'AV A',
          events: [{ value: '/a/req1' }],
        },
        {
          group: 'AV B',
          events: [{ value: '/b/bad' }],
        },
      ]);

      const example = buildExample([
        {
          name: 'AV A',
          requiredPaths: ['/a/req1'],
          optionalPaths: [],
          excludedPaths: [],
        },
        {
          name: 'AV B',
          requiredPaths: [],
          optionalPaths: [],
          excludedPaths: ['/b/bad'],
        },
      ]);

      const result = evaluatorFunction(run, example);
      expect(result.score).toBeLessThan(1);
      expect(result.comment).toContain('requirement "AV B" contains excluded paths');
    });
    it('fails when a requirement encounters unexpected paths', () => {
      const run = buildRun([
        {
          group: 'AV A',
          events: [{ value: '/a/unknown' }],
        },
        {
          group: 'AV B',
          events: [{ value: '/b/req1' }],
        },
      ]);

      const example = buildExample([
        {
          name: 'AV A',
          requiredPaths: [],
          optionalPaths: [],
          excludedPaths: [],
        },
        {
          name: 'AV B',
          requiredPaths: ['/b/req1'],
          optionalPaths: [],
          excludedPaths: [],
        },
      ]);

      const result = evaluatorFunction(run, example);
      expect(result.score).toBeLessThan(1);
      expect(result.comment).toContain('requirement "AV A" contains unexpected paths');
    });
  });
});
