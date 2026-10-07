/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  POLICY_EVENT_COLLECTION_LABELS,
  POLICY_PROTECTION_UPDATES_LABEL,
} from '../../../../../../common/endpoint/models/policy_settings_ui_labels';
import { getFieldRegistryEntry } from './derive_field_registry';
import { searchPolicyFields } from './field_search';

describe('searchPolicyFields', () => {
  it('requires every keyword to match the path or shared label', () => {
    const result = searchPolicyFields(['credential', 'hardening']);
    expect(result.results.map(({ path }) => path)).toContain(
      'windows.attack_surface_reduction.credential_hardening.enabled'
    );
    expect(searchPolicyFields(['credential', 'missing']).results).toHaveLength(0);
  });
  it('matches shared UI labels and orders writable entries first', () => {
    const result = searchPolicyFields(['api']);
    expect(result.results[0]).toMatchObject({
      path: 'windows.events.credential_access',
      writable: true,
    });
    expect(result.results[0].label).toBe('API');
  });
  it('filters by operating system and echoes the filter', () => {
    const result = searchPolicyFields(['dns'], 'windows');
    expect(result.os).toBe('windows');
    expect(result.results.every(({ path }) => path.startsWith('windows.'))).toBe(true);
  });
  it('limits results and reports truncation', () => {
    const result = searchPolicyFields(['event']);
    expect(result.results).toHaveLength(10);
    expect(result.results_total).toBeGreaterThan(10);
    expect(result.results_truncated).toBe(true);
  });
  it('links shared UI labels to registry entries', () => {
    for (const os of ['windows', 'mac', 'linux'] as const) {
      for (const { field } of POLICY_EVENT_COLLECTION_LABELS[os]) {
        expect(getFieldRegistryEntry(`${os}.events.${field}`)?.path).toBe(`${os}.events.${field}`);
      }
    }
    expect(getFieldRegistryEntry(POLICY_PROTECTION_UPDATES_LABEL.path)?.path).toBe(
      POLICY_PROTECTION_UPDATES_LABEL.path
    );
  });
});
