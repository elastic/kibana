/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { EmulationPayload } from '../payloads';
import {
  DEFAULT_VALIDATION_GATE_CONFIG,
  __resetLibraryFingerprintCacheForTests,
  buildLibraryFingerprintSet,
  checkValidationGates,
  resolveValidationGateConfig,
} from './validation_gate';

const stubLibrary: readonly EmulationPayload[] = [
  {
    techniqueId: 'T1059.001',
    name: 'PowerShell discovery',
    agentTypes: ['endpoint'],
    command: 'execute',
    parameters: { command: 'powershell.exe -NoProfile -Command "whoami"' },
    expectedSignals: ['Suspicious PowerShell'],
  },
  {
    techniqueId: 'T1057',
    name: 'Process enumeration',
    agentTypes: ['endpoint'],
    command: 'running-processes',
    parameters: null,
    expectedSignals: [],
  },
] as unknown as readonly EmulationPayload[];

beforeEach(() => {
  __resetLibraryFingerprintCacheForTests();
});

describe('validation_gate helpers', () => {
  describe('resolveValidationGateConfig', () => {
    it('returns safe defaults when the operator did not configure the namespace', () => {
      expect(resolveValidationGateConfig(undefined)).toEqual(DEFAULT_VALIDATION_GATE_CONFIG);
    });

    it('falls back per-field when only some keys are set', () => {
      expect(resolveValidationGateConfig({ curatedOnly: true })).toEqual({
        curatedOnly: true,
        allowedScriptIds: [],
        allowedExecuteCommandPatterns: [],
      });
      expect(resolveValidationGateConfig({ allowedScriptIds: ['s1'] })).toEqual({
        curatedOnly: false,
        allowedScriptIds: ['s1'],
        allowedExecuteCommandPatterns: [],
      });
    });
  });

  describe('checkValidationGates — defaults are no-op', () => {
    it('admits any command when both gates are disabled', () => {
      const result = checkValidationGates(
        {
          command: 'execute',
          parameters: { command: 'rm -rf /' },
        },
        DEFAULT_VALIDATION_GATE_CONFIG,
        stubLibrary
      );
      expect(result.allowed).toBe(true);
    });
  });

  describe('checkValidationGates — curatedOnly', () => {
    it('admits a command whose (command, parameters.command) fingerprint matches the library', () => {
      const result = checkValidationGates(
        {
          command: 'execute',
          parameters: { command: 'powershell.exe -NoProfile -Command "whoami"' },
        },
        { curatedOnly: true, allowedScriptIds: [] },
        stubLibrary
      );
      expect(result.allowed).toBe(true);
    });

    it('admits a parameter-less command whose API name matches a library entry', () => {
      const result = checkValidationGates(
        { command: 'running-processes', parameters: null },
        { curatedOnly: true, allowedScriptIds: [] },
        stubLibrary
      );
      expect(result.allowed).toBe(true);
    });

    it('rejects a command whose payload is not in the library', () => {
      const result = checkValidationGates(
        {
          command: 'execute',
          parameters: { command: 'rm -rf /' },
        },
        { curatedOnly: true, allowedScriptIds: [] },
        stubLibrary
      );
      expect(result).toEqual({
        allowed: false,
        reason: 'not_in_curated_library',
        message: expect.stringContaining('Curated-only mode is enabled'),
      });
    });

    it('rejects an API command name that is not present in the library at all', () => {
      const result = checkValidationGates(
        { command: 'kill-process', parameters: { entity_id: 'x' } },
        { curatedOnly: true, allowedScriptIds: [] },
        stubLibrary
      );
      expect(result.allowed).toBe(false);
      if (!result.allowed) expect(result.reason).toBe('not_in_curated_library');
    });

    it('matches case-sensitively (the library is the source of truth)', () => {
      const result = checkValidationGates(
        {
          command: 'execute',
          parameters: { command: 'PowerShell.exe -NoProfile -Command "whoami"' },
        },
        { curatedOnly: true, allowedScriptIds: [] },
        stubLibrary
      );
      expect(result.allowed).toBe(false);
    });
  });

  describe('checkValidationGates — allowedScriptIds', () => {
    it('admits a runscript with a scriptId on the allow-list', () => {
      const result = checkValidationGates(
        { command: 'runscript', parameters: { scriptId: 'audit-baseline-v1' } },
        { curatedOnly: false, allowedScriptIds: ['audit-baseline-v1', 'unrelated'] },
        stubLibrary
      );
      expect(result.allowed).toBe(true);
    });

    it('rejects a runscript whose scriptId is not on the allow-list', () => {
      const result = checkValidationGates(
        { command: 'runscript', parameters: { scriptId: 'rogue-script' } },
        { curatedOnly: false, allowedScriptIds: ['audit-baseline-v1'] },
        stubLibrary
      );
      expect(result).toEqual({
        allowed: false,
        reason: 'script_not_allowed',
        message: expect.stringContaining('Script ID is not in the operator-configured allow-list'),
      });
    });

    it('rejects a runscript with no scriptId at all when the allow-list is set', () => {
      const result = checkValidationGates(
        { command: 'runscript', parameters: {} },
        { curatedOnly: false, allowedScriptIds: ['audit-baseline-v1'] },
        stubLibrary
      );
      expect(result.allowed).toBe(false);
      if (!result.allowed) expect(result.reason).toBe('script_not_allowed');
    });

    it('accepts the EDR-style `script_id` snake-case variant', () => {
      const result = checkValidationGates(
        { command: 'runscript', parameters: { script_id: 'audit-baseline-v1' } },
        { curatedOnly: false, allowedScriptIds: ['audit-baseline-v1'] },
        stubLibrary
      );
      expect(result.allowed).toBe(true);
    });

    it('is a no-op for non-runscript commands even when the allow-list is populated', () => {
      const result = checkValidationGates(
        { command: 'execute', parameters: { command: 'whoami' } },
        { curatedOnly: false, allowedScriptIds: ['audit-baseline-v1'] },
        stubLibrary
      );
      expect(result.allowed).toBe(true);
    });

    it('is a no-op when the allow-list is empty even for runscript', () => {
      const result = checkValidationGates(
        { command: 'runscript', parameters: { scriptId: 'anything-goes' } },
        { curatedOnly: false, allowedScriptIds: [] },
        stubLibrary
      );
      expect(result.allowed).toBe(true);
    });
  });

  describe('checkValidationGates — allowedExecuteCommandPatterns', () => {
    it('admits an execute command that matches at least one pattern', () => {
      const result = checkValidationGates(
        { command: 'execute', parameters: { command: 'whoami' } },
        { curatedOnly: false, allowedScriptIds: [], allowedExecuteCommandPatterns: ['^whoami$'] },
        stubLibrary
      );
      expect(result.allowed).toBe(true);
    });

    it('rejects an execute command that matches none of the patterns', () => {
      const result = checkValidationGates(
        { command: 'execute', parameters: { command: 'rm -rf /' } },
        { curatedOnly: false, allowedScriptIds: [], allowedExecuteCommandPatterns: ['^whoami$'] },
        stubLibrary
      );
      expect(result).toEqual({
        allowed: false,
        reason: 'execute_command_not_allowed',
        message: expect.stringContaining('allowedExecuteCommandPatterns'),
      });
    });

    it('rejects an execute command with no parameters.command when patterns are set', () => {
      const result = checkValidationGates(
        { command: 'execute', parameters: {} },
        { curatedOnly: false, allowedScriptIds: [], allowedExecuteCommandPatterns: ['^whoami$'] },
        stubLibrary
      );
      expect(result.allowed).toBe(false);
      if (!result.allowed) expect(result.reason).toBe('execute_command_not_allowed');
    });

    it('is a no-op when the pattern list is empty even for execute', () => {
      const result = checkValidationGates(
        { command: 'execute', parameters: { command: 'rm -rf /' } },
        { curatedOnly: false, allowedScriptIds: [], allowedExecuteCommandPatterns: [] },
        stubLibrary
      );
      expect(result.allowed).toBe(true);
    });

    it('is a no-op for non-execute commands even when patterns are populated', () => {
      const result = checkValidationGates(
        { command: 'running-processes', parameters: null },
        { curatedOnly: false, allowedScriptIds: [], allowedExecuteCommandPatterns: ['^whoami$'] },
        stubLibrary
      );
      expect(result.allowed).toBe(true);
    });

    it('matches against multiple patterns (any-match semantics)', () => {
      const result = checkValidationGates(
        { command: 'execute', parameters: { command: 'ipconfig /all' } },
        {
          curatedOnly: false,
          allowedScriptIds: [],
          allowedExecuteCommandPatterns: ['^whoami$', '^ipconfig'],
        },
        stubLibrary
      );
      expect(result.allowed).toBe(true);
    });
  });

  describe('checkValidationGates — gate ordering', () => {
    it('reports curatedOnly rejection FIRST when both gates would fire', () => {
      const result = checkValidationGates(
        { command: 'runscript', parameters: { scriptId: 'rogue-script' } },
        { curatedOnly: true, allowedScriptIds: ['vetted'] },
        stubLibrary
      );
      // runscript isn't in stubLibrary at all, so curatedOnly rejects first.
      expect(result.allowed).toBe(false);
      if (!result.allowed) expect(result.reason).toBe('not_in_curated_library');
    });
  });

  describe('buildLibraryFingerprintSet', () => {
    it('builds one fingerprint per payload', () => {
      const set = buildLibraryFingerprintSet(stubLibrary);
      expect(set.size).toBe(2);
      expect(set.has('execute|powershell.exe -NoProfile -Command "whoami"')).toBe(true);
      expect(set.has('running-processes|')).toBe(true);
    });

    it('memoises the set when called with the bundled payloadLibrary reference', () => {
      const a = buildLibraryFingerprintSet();
      const b = buildLibraryFingerprintSet();
      expect(a).toBe(b);
    });
  });
});
