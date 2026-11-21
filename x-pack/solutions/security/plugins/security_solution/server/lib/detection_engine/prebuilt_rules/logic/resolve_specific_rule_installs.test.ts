/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SkipRuleInstallReason } from '../../../../../common/api/detection_engine/prebuilt_rules';
import type { BasicRuleInfo } from './basic_rule_info';
import {
  resolveAllRuleInstalls,
  resolveSpecificRuleInstalls,
} from './resolve_specific_rule_installs';

const latest = (ruleId: string, version: number, libraryId?: string): BasicRuleInfo => ({
  rule_id: ruleId,
  version,
  type: 'query',
  ...(libraryId ? { library_id: libraryId } : {}),
});

describe('resolveSpecificRuleInstalls', () => {
  const resolve = (
    overrides: Partial<Parameters<typeof resolveSpecificRuleInstalls>[0]> & {
      rules: Parameters<typeof resolveSpecificRuleInstalls>[0]['rules'];
    }
  ) =>
    resolveSpecificRuleInstalls({
      latestVersions: [],
      installedRuleIds: new Set(),
      ...overrides,
    });

  it('installs a rule from the library that was asked for when the rule_id is in two libraries', () => {
    const latestVersions = [latest('a', 1, 'elastic'), latest('a', 1, 'elastic-community')];

    const result = resolve({
      rules: [{ rule_id: 'a', version: 1, library_id: 'elastic-community' }],
      latestVersions,
      visibleLibraryIds: new Set(['elastic', 'elastic-community']),
    });

    expect(result.queue).toEqual([{ rule_id: 'a', version: 1, library_id: 'elastic-community' }]);
    expect(result.errors).toEqual([]);
  });

  it('installs the requested version of a rule that has several in one library', () => {
    const result = resolve({
      rules: [{ rule_id: 'a', version: 2, library_id: 'elastic' }],
      latestVersions: [latest('a', 2, 'elastic')],
      visibleLibraryIds: new Set(['elastic']),
    });

    expect(result.queue).toEqual([{ rule_id: 'a', version: 2, library_id: 'elastic' }]);
  });

  it('reports a rule that does not exist in the requested library', () => {
    const result = resolve({
      rules: [{ rule_id: 'a', version: 1, library_id: 'elastic-community' }],
      latestVersions: [latest('a', 1, 'elastic')],
      visibleLibraryIds: new Set(['elastic', 'elastic-community']),
    });

    expect(result.queue).toEqual([]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].error.message).toContain('Rule with ID "a"');
  });

  it('refuses a library the caller cannot see', () => {
    const result = resolve({
      rules: [{ rule_id: 'a', version: 1, library_id: 'other-space-library' }],
      latestVersions: [latest('a', 1, 'other-space-library')],
      visibleLibraryIds: new Set(['elastic']),
    });

    expect(result.queue).toEqual([]);
    expect(result.errors[0].error.message).toBe('Rule library "other-space-library" not found');
  });

  it('skips a rule that is already installed, whichever library it came from', () => {
    const result = resolve({
      rules: [{ rule_id: 'a', version: 1, library_id: 'elastic-community' }],
      latestVersions: [latest('a', 1, 'elastic-community')],
      installedRuleIds: new Set(['a']),
      visibleLibraryIds: new Set(['elastic-community']),
    });

    expect(result.queue).toEqual([]);
    expect(result.skipped).toEqual([
      { rule_id: 'a', reason: SkipRuleInstallReason.ALREADY_INSTALLED },
    ]);
  });

  it('installs a rule_id from one library only when two are requested together', () => {
    const result = resolve({
      rules: [
        { rule_id: 'a', version: 1, library_id: 'elastic' },
        { rule_id: 'a', version: 1, library_id: 'elastic-community' },
      ],
      latestVersions: [latest('a', 1, 'elastic'), latest('a', 1, 'elastic-community')],
      visibleLibraryIds: new Set(['elastic', 'elastic-community']),
    });

    expect(result.queue).toEqual([{ rule_id: 'a', version: 1, library_id: 'elastic' }]);
    expect(result.errors).toHaveLength(1);
    expect(result.errors[0].error.message).toContain('more than one library');
  });

  it('keeps working for a request that names no library', () => {
    const result = resolve({
      rules: [{ rule_id: 'a', version: 1 }],
      latestVersions: [latest('a', 1, 'elastic')],
    });

    expect(result.queue).toEqual([{ rule_id: 'a', version: 1, library_id: 'elastic' }]);
  });

  it('handles several rules in one request independently', () => {
    const result = resolve({
      rules: [
        { rule_id: 'a', version: 1, library_id: 'elastic' },
        { rule_id: 'missing', version: 1, library_id: 'elastic' },
        { rule_id: 'b', version: 1, library_id: 'elastic' },
      ],
      latestVersions: [latest('a', 1, 'elastic'), latest('b', 1, 'elastic')],
      installedRuleIds: new Set(['b']),
      visibleLibraryIds: new Set(['elastic']),
    });

    expect(result.queue.map(({ rule_id: id }) => id)).toEqual(['a']);
    expect(result.skipped.map(({ rule_id: id }) => id)).toEqual(['b']);
    expect(result.errors.map(({ item }) => item.rule_id)).toEqual(['missing']);
  });
});

describe('resolveAllRuleInstalls', () => {
  it('installs the rules that are not installed yet', () => {
    const result = resolveAllRuleInstalls({
      latestVersions: [
        latest('a', 1, 'elastic'),
        latest('b', 1, 'elastic'),
        latest('c', 1, 'elastic'),
      ],
      installedRuleIds: new Set(['b']),
    });

    expect(result.map(({ rule_id: id }) => id)).toEqual(['a', 'c']);
  });

  it('takes a rule_id that two libraries have from the first one only', () => {
    const result = resolveAllRuleInstalls({
      latestVersions: [latest('a', 1, 'elastic'), latest('a', 2, 'elastic-community')],
      installedRuleIds: new Set(),
    });

    expect(result).toEqual([latest('a', 1, 'elastic')]);
  });

  it('installs nothing when everything is installed', () => {
    expect(
      resolveAllRuleInstalls({
        latestVersions: [latest('a', 1, 'elastic')],
        installedRuleIds: new Set(['a']),
      })
    ).toEqual([]);
  });
});
