/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

jest.mock('child_process', () => ({
  execFile: jest.fn(),
}));

import { execFile } from 'child_process';
import {
  isInBuildkite,
  getCheckpointKey,
  normalizeSpecPath,
  markSpecCompleted,
  isSpecCompleted,
} from './buildkite_checkpoint';

const mockExecFile = execFile as unknown as jest.Mock;

describe('buildkite_checkpoint', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.clearAllMocks();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('isInBuildkite', () => {
    it('returns true when BUILDKITE env var is set', () => {
      process.env.BUILDKITE = 'true';
      expect(isInBuildkite()).toBe(true);
    });

    it('returns false when BUILDKITE env var is not set', () => {
      delete process.env.BUILDKITE;
      expect(isInBuildkite()).toBe(false);
    });

    it('returns false when BUILDKITE is empty string', () => {
      process.env.BUILDKITE = '';
      expect(isInBuildkite()).toBe(false);
    });
  });

  describe('normalizeSpecPath', () => {
    it('strips the agent workspace prefix from an absolute Buildkite path', () => {
      const absolute =
        '/opt/buildkite-agent/builds/bk-agent-prod-gcp-123456/elastic/kibana-pull-request/kibana/x-pack/solutions/security/test/spec.cy.ts';
      expect(normalizeSpecPath(absolute)).toBe(
        'x-pack/solutions/security/test/spec.cy.ts'
      );
    });

    it('returns the same value for the same spec on different agents', () => {
      const agent1 =
        '/opt/buildkite-agent/builds/bk-agent-prod-gcp-111/elastic/kibana-pull-request/kibana/x-pack/test/spec.cy.ts';
      const agent2 =
        '/opt/buildkite-agent/builds/bk-agent-prod-gcp-999/elastic/kibana-pull-request/kibana/x-pack/test/spec.cy.ts';
      expect(normalizeSpecPath(agent1)).toBe(normalizeSpecPath(agent2));
    });

    it('returns the path unchanged when already relative', () => {
      expect(normalizeSpecPath('cypress/e2e/alerts.cy.ts')).toBe(
        'cypress/e2e/alerts.cy.ts'
      );
    });

    it('handles paths without the /kibana/ marker', () => {
      const odd = '/some/other/path/spec.cy.ts';
      expect(normalizeSpecPath(odd)).toBe(odd);
    });
  });

  describe('getCheckpointKey', () => {
    it('generates a deterministic key for the same spec path', () => {
      process.env.BUILDKITE_STEP_ID = 'step-123';
      process.env.BUILDKITE_PARALLEL_JOB = '2';

      const key1 = getCheckpointKey('cypress/e2e/detection_engine/alerts.cy.ts');
      const key2 = getCheckpointKey('cypress/e2e/detection_engine/alerts.cy.ts');
      expect(key1).toBe(key2);
    });

    it('generates different keys for different spec paths', () => {
      process.env.BUILDKITE_STEP_ID = 'step-123';
      process.env.BUILDKITE_PARALLEL_JOB = '0';

      const key1 = getCheckpointKey('cypress/e2e/detection_engine/alerts.cy.ts');
      const key2 = getCheckpointKey('cypress/e2e/detection_engine/rules.cy.ts');
      expect(key1).not.toBe(key2);
    });

    it('uses cy_ckpt_ prefix with step and job', () => {
      process.env.BUILDKITE_STEP_ID = 'step-abc';
      process.env.BUILDKITE_PARALLEL_JOB = '3';

      const key = getCheckpointKey('spec.cy.ts');
      expect(key).toMatch(/^cy_ckpt_step-abc_3_/);
    });

    it('defaults to empty step and job 0 when env vars are missing', () => {
      delete process.env.BUILDKITE_STEP_ID;
      delete process.env.BUILDKITE_PARALLEL_JOB;

      const key = getCheckpointKey('spec.cy.ts');
      expect(key).toMatch(/^cy_ckpt__0_/);
    });

    it('generates different keys for different parallel jobs', () => {
      process.env.BUILDKITE_STEP_ID = 'step-123';

      process.env.BUILDKITE_PARALLEL_JOB = '0';
      const key0 = getCheckpointKey('spec.cy.ts');

      process.env.BUILDKITE_PARALLEL_JOB = '1';
      const key1 = getCheckpointKey('spec.cy.ts');

      expect(key0).not.toBe(key1);
    });

    it('produces the same key for the same spec on different Buildkite agents', () => {
      process.env.BUILDKITE_STEP_ID = 'step-123';
      process.env.BUILDKITE_PARALLEL_JOB = '0';

      const keyAgent1 = getCheckpointKey(
        '/opt/buildkite-agent/builds/bk-agent-prod-gcp-111/elastic/kibana-pull-request/kibana/x-pack/test/spec.cy.ts'
      );
      const keyAgent2 = getCheckpointKey(
        '/opt/buildkite-agent/builds/bk-agent-prod-gcp-999/elastic/kibana-pull-request/kibana/x-pack/test/spec.cy.ts'
      );
      expect(keyAgent1).toBe(keyAgent2);
    });
  });

  describe('markSpecCompleted', () => {
    it('calls buildkite-agent meta-data set with the checkpoint key', async () => {
      process.env.BUILDKITE_STEP_ID = 'step-1';
      process.env.BUILDKITE_PARALLEL_JOB = '0';

      mockExecFile.mockImplementation((_cmd: string, _args: string[], cb: Function) => {
        cb(null, '');
      });

      await markSpecCompleted('spec.cy.ts');

      expect(mockExecFile).toHaveBeenCalledWith(
        'buildkite-agent',
        ['meta-data', 'set', expect.stringMatching(/^cy_ckpt_/), 'done'],
        expect.any(Function)
      );
    });

    it('does not throw when buildkite-agent fails', async () => {
      mockExecFile.mockImplementation((_cmd: string, _args: string[], cb: Function) => {
        cb(new Error('agent not found'));
      });

      await expect(markSpecCompleted('spec.cy.ts')).resolves.toBeUndefined();
    });
  });

  describe('isSpecCompleted', () => {
    it('returns true when meta-data value is "done"', async () => {
      process.env.BUILDKITE_STEP_ID = 'step-1';
      process.env.BUILDKITE_PARALLEL_JOB = '0';

      mockExecFile.mockImplementation((_cmd: string, _args: string[], cb: Function) => {
        cb(null, 'done');
      });

      const result = await isSpecCompleted('spec.cy.ts');
      expect(result).toBe(true);
    });

    it('returns false when meta-data value is empty', async () => {
      mockExecFile.mockImplementation((_cmd: string, _args: string[], cb: Function) => {
        cb(null, '');
      });

      const result = await isSpecCompleted('spec.cy.ts');
      expect(result).toBe(false);
    });

    it('returns false when buildkite-agent fails', async () => {
      mockExecFile.mockImplementation((_cmd: string, _args: string[], cb: Function) => {
        cb(new Error('agent not found'));
      });

      const result = await isSpecCompleted('spec.cy.ts');
      expect(result).toBe(false);
    });

    it('passes --default empty string to handle missing keys', async () => {
      mockExecFile.mockImplementation((_cmd: string, _args: string[], cb: Function) => {
        cb(null, '');
      });

      await isSpecCompleted('spec.cy.ts');

      expect(mockExecFile).toHaveBeenCalledWith(
        'buildkite-agent',
        expect.arrayContaining(['meta-data', 'get', '--default', '']),
        expect.any(Function)
      );
    });
  });
});
