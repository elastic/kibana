/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { readFileSync } from 'fs';

jest.mock('fs', () => ({
  readFileSync: jest.fn(),
}));

const mockReadFileSync = readFileSync as jest.MockedFunction<typeof readFileSync>;

import { loggerMock } from '@kbn/logging-mocks';
import { getBundledYamlEntries, resetBundledYamlEntriesCache } from '.';

const REQUIRED_KEYS = ['default_alert_retrieval', 'generation', 'validate'] as const;
const OPTIONAL_KEYS = [
  'custom_validation_example',
  'esql_example_alert_retrieval',
  'run_example',
] as const;
const ALL_KEYS = [...REQUIRED_KEYS, ...OPTIONAL_KEYS] as const;

const allFilesImpl = (filePath: unknown): string => {
  const path = String(filePath);
  if (path.includes('attack_discovery_custom_validation_example')) {
    return 'custom_validation_example: yaml content';
  }
  if (path.includes('default_attack_discovery_alert_retrieval')) {
    return 'alert_retrieval: yaml content';
  }
  if (path.includes('attack_discovery_esql_example')) {
    return 'esql_example: yaml content';
  }
  if (path.includes('attack_discovery_generation')) {
    return 'generation: yaml content';
  }
  if (path.includes('attack_discovery_run_example')) {
    return 'run_example: yaml content';
  }
  if (path.includes('attack_discovery_validate')) {
    return 'validate: yaml content';
  }
  throw new Error(`Unexpected file: ${path}`);
};

describe('getBundledYamlEntries', () => {
  let logger: ReturnType<typeof loggerMock.create>;

  beforeEach(() => {
    logger = loggerMock.create();
    resetBundledYamlEntriesCache();
    mockReadFileSync.mockReset();
  });

  describe('happy path', () => {
    beforeEach(() => {
      mockReadFileSync.mockImplementation(allFilesImpl);
    });

    it('returns a map with exactly 6 entries (3 required + 3 optional)', () => {
      const result = getBundledYamlEntries(logger);

      expect(result.size).toBe(6);
    });

    it('returns entries for all 3 required workflow keys', () => {
      const result = getBundledYamlEntries(logger);

      for (const key of REQUIRED_KEYS) {
        expect(result.has(key)).toBe(true);
      }
    });

    it('returns entries for all 3 optional workflow keys', () => {
      const result = getBundledYamlEntries(logger);

      for (const key of OPTIONAL_KEYS) {
        expect(result.has(key)).toBe(true);
      }
    });

    it('each entry has a non-empty yaml string', () => {
      const result = getBundledYamlEntries(logger);

      for (const [, entry] of result) {
        expect(entry.yaml.length).toBeGreaterThan(0);
      }
    });

    it('each entry has a 64-char hex hash', () => {
      const result = getBundledYamlEntries(logger);

      for (const [, entry] of result) {
        expect(entry.hash).toMatch(/^[0-9a-f]{64}$/);
      }
    });

    it('each entry key matches the map key', () => {
      const result = getBundledYamlEntries(logger);

      for (const [key, entry] of result) {
        expect(entry.key).toBe(key);
      }
    });

    it('trims whitespace from yaml before computing hash', () => {
      mockReadFileSync.mockReturnValue('  trimmed content  ');

      const result = getBundledYamlEntries(logger);

      for (const [, entry] of result) {
        expect(entry.yaml).toBe('trimmed content');
      }
    });
  });

  describe('caching behavior', () => {
    it('returns the same object reference on subsequent calls', () => {
      mockReadFileSync.mockReturnValue('some yaml');

      const first = getBundledYamlEntries(logger);
      const second = getBundledYamlEntries(logger);

      expect(first).toBe(second);
    });

    it('only reads files once across multiple calls', () => {
      mockReadFileSync.mockReturnValue('some yaml');

      getBundledYamlEntries(logger);
      getBundledYamlEntries(logger);

      expect(mockReadFileSync).toHaveBeenCalledTimes(6); // once per workflow (3 required + 3 optional)
    });
  });

  describe('missing file handling', () => {
    it('omits the entry when a required file is missing and logs a warning', () => {
      mockReadFileSync.mockImplementation((filePath) => {
        if (String(filePath).includes('attack_discovery_generation')) {
          throw new Error('ENOENT: no such file or directory');
        }
        return allFilesImpl(filePath);
      });

      const result = getBundledYamlEntries(logger);

      expect(result.has('generation')).toBe(false);
      expect(result.size).toBe(5);
      expect(logger.warn).toHaveBeenCalledWith(expect.any(Function));
    });

    it('omits the entry when an optional file is missing and logs a warning', () => {
      mockReadFileSync.mockImplementation((filePath) => {
        if (String(filePath).includes('attack_discovery_custom_validation_example')) {
          throw new Error('ENOENT: no such file or directory');
        }
        return allFilesImpl(filePath);
      });

      const result = getBundledYamlEntries(logger);

      expect(result.has('custom_validation_example')).toBe(false);
      expect(result.size).toBe(5);
      expect(logger.warn).toHaveBeenCalledWith(expect.any(Function));
    });

    it('still returns entries for files that exist when one is missing', () => {
      mockReadFileSync.mockImplementation((filePath) => {
        if (String(filePath).includes('attack_discovery_generation')) {
          throw new Error('ENOENT: no such file or directory');
        }
        return allFilesImpl(filePath);
      });

      const result = getBundledYamlEntries(logger);

      expect(result.has('default_alert_retrieval')).toBe(true);
      expect(result.has('validate')).toBe(true);
    });

    it('returns an empty map when all files are missing', () => {
      mockReadFileSync.mockImplementation(() => {
        throw new Error('ENOENT: no such file or directory');
      });

      const result = getBundledYamlEntries(logger);

      expect(result.size).toBe(0);
      expect(logger.warn).toHaveBeenCalledTimes(6); // one warning per missing file
    });
  });

  describe('path resolution', () => {
    it('reads yaml files from the correct definitions directory (not helpers/definitions)', () => {
      const capturedPaths: string[] = [];
      mockReadFileSync.mockImplementation((filePath) => {
        capturedPaths.push(String(filePath));
        return 'yaml content';
      });

      getBundledYamlEntries(logger);

      // The helper is at: server/workflows/helpers/get_bundled_yaml_entries/index.ts
      // The YAML definitions are at: server/workflows/definitions/
      // With the correct '../../definitions/' path, the resolved path should NOT
      // pass through a 'helpers/definitions' directory.
      expect(capturedPaths).not.toHaveLength(0);
      for (const capturedPath of capturedPaths) {
        expect(capturedPath).not.toMatch(/helpers[/\\]definitions/);
      }
    });
  });

  describe('resetBundledYamlEntriesCache', () => {
    it('clears the cache so the next call re-reads files', () => {
      mockReadFileSync.mockReturnValue('initial yaml');
      getBundledYamlEntries(logger);

      resetBundledYamlEntriesCache();
      mockReadFileSync.mockReturnValue('updated yaml');

      const result = getBundledYamlEntries(logger);

      expect(result.get('generation')?.yaml).toBe('updated yaml');
    });

    it('returns entries for all 6 keys after reset', () => {
      mockReadFileSync.mockImplementation(allFilesImpl);
      getBundledYamlEntries(logger);
      resetBundledYamlEntriesCache();

      const result = getBundledYamlEntries(logger);

      for (const key of ALL_KEYS) {
        expect(result.has(key)).toBe(true);
      }
    });
  });
});
