/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type {
  RuleLibraryRule,
  RuleLibrarySummary,
} from '../../../../../common/api/detection_engine/prebuilt_rules';
import { toLibraryRuleRow, toRuleLibraryListItem } from './map_rule_library';

const summary = (overrides: Partial<RuleLibrarySummary>): RuleLibrarySummary => ({
  id: 'custom',
  title: 'Custom',
  provider: 'git',
  built_in: false,
  scope: 'shared',
  rule_count: 0,
  ...overrides,
});

describe('toRuleLibraryListItem', () => {
  it('groups the built-in libraries as Elastic and every other library as Custom', () => {
    expect(
      toRuleLibraryListItem(summary({ id: 'elastic', built_in: true, owner_type: 'elastic' })).group
    ).toBe('elastic');
    expect(
      toRuleLibraryListItem(
        summary({ id: 'elastic-community', built_in: true, owner_type: 'community' })
      ).group
    ).toBe('elastic');
    expect(toRuleLibraryListItem(summary({})).group).toBe('custom');
  });

  it('keeps a library the user added in Custom whatever its manifest says about its owner', () => {
    const item = toRuleLibraryListItem(summary({ owner_type: 'community' }));

    expect(item.group).toBe('custom');
    expect(item.icon).toBe('package');
  });

  it('treats a library without a sync status as never synced', () => {
    const item = toRuleLibraryListItem(summary({}));
    expect(item.syncStatus).toBe('never_synced');
    expect(item.version).toBeUndefined();
  });

  it('keeps the sync details of a synced library', () => {
    const item = toRuleLibraryListItem(
      summary({
        version: '1.2.0',
        sync_status: 'sync_failed',
        synced_at: '2026-11-19T10:00:00.000Z',
        last_error: 'Authentication failed',
        rule_count: 10,
      })
    );
    expect(item).toEqual(
      expect.objectContaining({
        version: '1.2.0',
        syncStatus: 'sync_failed',
        syncedAt: '2026-11-19T10:00:00.000Z',
        lastError: 'Authentication failed',
        ruleCount: 10,
      })
    );
  });

  it('shows the source url without its protocol', () => {
    expect(
      toRuleLibraryListItem(summary({ source_url: 'https://github.com/org/repo' })).sourceUrl
    ).toBe('github.com/org/repo');
  });
});

describe('toLibraryRuleRow', () => {
  const rule = (overrides: Partial<RuleLibraryRule> = {}): RuleLibraryRule => ({
    rule_id: 'a',
    version: 3,
    library_id: 'elastic-community',
    name: 'Rule A',
    description: 'Detects A',
    severity: 'high',
    risk_score: 73,
    tags: ['Windows'],
    related_integrations: [],
    install_state: 'installable',
    ...overrides,
  });

  it('keeps the library in the row id so the same rule in two libraries stays distinct', () => {
    const first = toLibraryRuleRow(rule({ library_id: 'elastic' }));
    const second = toLibraryRuleRow(rule({ library_id: 'elastic-community' }));

    expect(first.id).not.toBe(second.id);
    expect(second).toEqual(
      expect.objectContaining({ ruleId: 'a', version: 3, libraryId: 'elastic-community' })
    );
  });

  it('lists each related integration package once', () => {
    const row = toLibraryRuleRow(
      rule({
        related_integrations: [
          { package: 'windows', integration: 'security', version: '^3.0.0' },
          { package: 'windows', integration: 'sysmon', version: '^3.0.0' },
          { package: 'endpoint', version: '^8.0.0' },
        ],
      })
    );

    expect(row.integrations.map(({ packageName }) => packageName)).toEqual(['windows', 'endpoint']);
  });

  it('names the other library when the rule is installed from it', () => {
    const row = toLibraryRuleRow(
      rule({
        install_state: 'installed_from_other_library',
        installed_from_library: { id: 'elastic', title: 'Prebuilt Security Detection Rules' },
      })
    );

    expect(row.installState).toBe('installed_from_other_library');
    expect(row.installedFromLibraryTitle).toBe('Prebuilt Security Detection Rules');
  });
});
