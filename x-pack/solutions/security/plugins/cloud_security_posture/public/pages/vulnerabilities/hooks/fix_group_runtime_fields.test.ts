/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import {
  FIX_GROUP_KEY_SEPARATOR,
  FIX_GROUP_NO_FIX,
  getFixGroupRuntimeMappings,
  splitFixGroupKey,
} from './fix_group_runtime_fields';
import { VULNERABILITY_GROUPING_OPTIONS } from '../../../common/constants';

describe('fix group runtime fields', () => {
  it('maps both composite keys to keyword runtime fields', () => {
    const mappings = getFixGroupRuntimeMappings();

    expect(Object.keys(mappings).sort()).toEqual(
      [
        VULNERABILITY_GROUPING_OPTIONS.FIX_GROUP_ADVISORY_PACKAGE,
        VULNERABILITY_GROUPING_OPTIONS.FIX_GROUP_PACKAGE_FIXED,
      ].sort()
    );
    for (const mapping of Object.values(mappings)) {
      expect(mapping.type).toBe('keyword');
      expect(mapping.script?.source).toBeTruthy();
    }
  });

  it('emits one key per advisory in the advisory+package script', () => {
    const source = getFixGroupRuntimeMappings()[
      VULNERABILITY_GROUPING_OPTIONS.FIX_GROUP_ADVISORY_PACKAGE
    ].script?.source as string;

    // one emit per advisory value, not a single joined key
    expect(source).toContain('for (adv in');
    expect(source).toContain('native_vuln_scanner.advisories.id');
    expect(source).not.toContain('.join(');
  });

  it('uses the no-fix placeholder when package.fixed_version is absent', () => {
    const source = getFixGroupRuntimeMappings()[
      VULNERABILITY_GROUPING_OPTIONS.FIX_GROUP_PACKAGE_FIXED
    ].script?.source as string;

    expect(source).toContain(`'${FIX_GROUP_NO_FIX}'`);
    expect(source).toContain('package.fixed_version');
    expect(source).toContain('emit(');
  });

  it('splits composite keys and leaves foreign keys whole', () => {
    expect(splitFixGroupKey(`krb5-libs${FIX_GROUP_KEY_SEPARATOR}RHSA-2026:99715`)).toEqual([
      'krb5-libs',
      'RHSA-2026:99715',
    ]);
    expect(splitFixGroupKey(`curl@NO_FIX`)).toBeUndefined();
    expect(splitFixGroupKey(undefined as unknown as string)).toBeUndefined();
  });
});
