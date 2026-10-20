/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { sanitizeErrorMessage } from '.';

describe('sanitizeErrorMessage', () => {
  describe('passthrough for clean messages', () => {
    it('returns a short, clean message unchanged', () => {
      const message = 'connector error: invalid API key';

      expect(sanitizeErrorMessage(message)).toBe(message);
    });
  });

  describe('truncation', () => {
    it('truncates messages longer than 500 characters', () => {
      const longMessage = 'a'.repeat(600);

      const result = sanitizeErrorMessage(longMessage);

      expect(result.length).toBeLessThanOrEqual(503); // 500 + "..." suffix
      expect(result.endsWith('...')).toBe(true);
    });

    it('does not truncate messages of exactly 500 characters', () => {
      const message = 'a'.repeat(500);

      const result = sanitizeErrorMessage(message);

      expect(result).toBe(message);
    });

    it('does not truncate messages shorter than 500 characters', () => {
      const message = 'short message';

      const result = sanitizeErrorMessage(message);

      expect(result).toBe(message);
    });
  });

  describe('file path stripping', () => {
    it('strips /Users/ paths', () => {
      const message = 'Error at /Users/john/projects/kibana/src/file.ts:42';

      const result = sanitizeErrorMessage(message);

      expect(result).not.toContain('/Users/');
    });

    it('strips /home/ paths', () => {
      const message = 'Error at /home/ubuntu/kibana/src/file.ts:42';

      const result = sanitizeErrorMessage(message);

      expect(result).not.toContain('/home/');
    });

    it('strips node_modules paths', () => {
      const message = 'Error in node_modules/some-package/dist/index.js:100';

      const result = sanitizeErrorMessage(message);

      expect(result).not.toContain('node_modules/');
    });

    it('replaces stripped path segments with [path]', () => {
      const message = 'Error at /Users/john/file.ts';

      const result = sanitizeErrorMessage(message);

      expect(result).toContain('[path]');
    });
  });

  describe('stack trace line stripping', () => {
    it('strips lines starting with "at " followed by a function name', () => {
      const message =
        'Something failed\n    at Object.foo (/Users/john/file.ts:10:5)\n    at runMicrotasks';

      const result = sanitizeErrorMessage(message);

      expect(result).not.toContain('at Object.foo');
      expect(result).not.toContain('at runMicrotasks');
    });

    it('preserves non-stack-trace content after removing stack lines', () => {
      const message = 'Connector error\n    at foo (file.ts:1:1)\nDetails: timeout';

      const result = sanitizeErrorMessage(message);

      expect(result).toContain('Connector error');
    });

    it('does not strip lines that merely contain "at " in the middle', () => {
      const message = 'Failed at connecting to endpoint';

      const result = sanitizeErrorMessage(message);

      expect(result).toContain('Failed at connecting to endpoint');
    });
  });

  describe('combination of sanitizations', () => {
    it('strips paths and stack traces from a realistic error message', () => {
      const message = [
        'Error: ENOENT: no such file or directory',
        '    at Object.openSync (/Users/john/node_modules/fs/index.js:5:3)',
        '    at Object.readFileSync (/home/ubuntu/.nvm/versions/node/v18/lib/node_modules/x.js:10:2)',
        '    at runMicrotasks (<anonymous>)',
      ].join('\n');

      const result = sanitizeErrorMessage(message);

      expect(result).toContain('ENOENT');
      expect(result).not.toContain('/Users/');
      expect(result).not.toContain('/home/');
      expect(result).not.toContain('openSync');
    });
  });
});
