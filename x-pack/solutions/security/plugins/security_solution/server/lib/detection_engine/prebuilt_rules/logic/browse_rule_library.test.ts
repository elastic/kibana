/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { PrebuiltRuleAssetRecord } from '../model/rule_assets/prebuilt_rule_asset';
import {
  browseRuleLibrary,
  buildBrowseKql,
  buildBrowseSearchKql,
  buildBrowseTacticsKql,
  buildBrowseTagsKql,
} from './browse_rule_library';
import type { IPrebuiltRuleAssetsClient } from './rule_assets/prebuilt_rule_assets_client';
import type { RuleSummary } from './rule_objects/prebuilt_rule_objects_client';

const asset = (ruleId: string, libraryId: string, name = ruleId): PrebuiltRuleAssetRecord =>
  ({
    rule_id: ruleId,
    version: 1,
    library_id: libraryId,
    name,
    description: `${name} description`,
    severity: 'high',
    risk_score: 73,
    tags: ['Windows'],
    related_integrations: [{ package: 'windows', version: '^3.0.0' }],
  } as unknown as PrebuiltRuleAssetRecord);

const installed = (ruleId: string, libraryId?: string): RuleSummary => ({
  id: `so-${ruleId}`,
  rule_id: ruleId,
  version: 1,
  tags: [],
  ...(libraryId ? { library_id: libraryId } : {}),
});

const libraryTitles = new Map([
  ['elastic', 'Prebuilt Security Detection Rules'],
  ['elastic-community', 'Elastic Community Rules'],
]);

describe('browseRuleLibrary', () => {
  const fetchLatestVersions = jest.fn();
  const fetchAssetsByVersion = jest.fn();
  const ruleAssetsClient = {
    fetchLatestVersions,
    fetchAssetsByVersion,
  } as unknown as IPrebuiltRuleAssetsClient;

  const browse = (overrides: Partial<Parameters<typeof browseRuleLibrary>[0]> = {}) =>
    browseRuleLibrary({
      ruleAssetsClient,
      installedRuleVersions: [],
      libraryTitles,
      libraryIds: ['elastic', 'elastic-community'],
      page: 1,
      perPage: 10,
      ...overrides,
    });

  beforeEach(() => {
    jest.clearAllMocks();
    fetchLatestVersions.mockResolvedValue([]);
    fetchAssetsByVersion.mockResolvedValue({ assets: [] });
  });

  it('returns nothing, and reads nothing, when there are no libraries to browse', async () => {
    const result = await browse({ libraryIds: [] });

    expect(result).toEqual({ rules: [], total: 0, page: 1, per_page: 10 });
    expect(fetchLatestVersions).not.toHaveBeenCalled();
  });

  it('restricts the read to the requested libraries', async () => {
    await browse({ libraryIds: ['elastic-community'] });

    expect(fetchLatestVersions).toHaveBeenCalledWith(
      expect.objectContaining({ libraryIds: ['elastic-community'] })
    );
  });

  it('reads full rules for the requested page only, and reports the overall total', async () => {
    const versions = Array.from({ length: 25 }, (_, i) => ({
      rule_id: `rule-${i}`,
      version: 1,
      library_id: 'elastic',
    }));
    fetchLatestVersions.mockResolvedValue(versions);
    fetchAssetsByVersion.mockResolvedValue({
      assets: versions.slice(10, 20).map(({ rule_id: ruleId }) => asset(ruleId, 'elastic')),
    });

    const result = await browse({ page: 2, perPage: 10 });

    expect(fetchAssetsByVersion).toHaveBeenCalledWith(versions.slice(10, 20), expect.anything());
    expect(result.total).toBe(25);
    expect(result.rules).toHaveLength(10);
    expect(result.page).toBe(2);
  });

  it('asks for the library of each rule, which is needed to match results back to it', async () => {
    fetchLatestVersions.mockResolvedValue([{ rule_id: 'a', version: 1, library_id: 'elastic' }]);
    fetchAssetsByVersion.mockResolvedValue({ assets: [asset('a', 'elastic')] });

    await browse();

    expect(fetchAssetsByVersion).toHaveBeenCalledWith(
      expect.anything(),
      expect.objectContaining({ fields: expect.arrayContaining(['library_id']) })
    );
  });

  it('marks a rule installed from the same library as installed', async () => {
    fetchLatestVersions.mockResolvedValue([{ rule_id: 'a', version: 1, library_id: 'elastic' }]);
    fetchAssetsByVersion.mockResolvedValue({ assets: [asset('a', 'elastic')] });

    const { rules } = await browse({ installedRuleVersions: [installed('a', 'elastic')] });

    expect(rules[0].install_state).toBe('installed');
    expect(rules[0].installed_from_library).toBeUndefined();
  });

  it('reads an installed rule without a library as installed from the Elastic library', async () => {
    fetchLatestVersions.mockResolvedValue([{ rule_id: 'a', version: 1, library_id: 'elastic' }]);
    fetchAssetsByVersion.mockResolvedValue({ assets: [asset('a', 'elastic')] });

    const { rules } = await browse({ installedRuleVersions: [installed('a')] });

    expect(rules[0].install_state).toBe('installed');
  });

  it('names the library when the same rule is installed from another one', async () => {
    fetchLatestVersions.mockResolvedValue([
      { rule_id: 'a', version: 1, library_id: 'elastic-community' },
    ]);
    fetchAssetsByVersion.mockResolvedValue({ assets: [asset('a', 'elastic-community')] });

    const { rules } = await browse({ installedRuleVersions: [installed('a')] });

    expect(rules[0].install_state).toBe('installed_from_other_library');
    expect(rules[0].installed_from_library).toEqual({
      id: 'elastic',
      title: 'Prebuilt Security Detection Rules',
    });
  });

  it('marks a rule that is not installed as installable', async () => {
    fetchLatestVersions.mockResolvedValue([{ rule_id: 'a', version: 1, library_id: 'elastic' }]);
    fetchAssetsByVersion.mockResolvedValue({ assets: [asset('a', 'elastic')] });

    const { rules } = await browse({ installedRuleVersions: [installed('other', 'elastic')] });

    expect(rules[0].install_state).toBe('installable');
  });

  it('passes the tags on to the read', async () => {
    await browse({ tags: ['Domain: Endpoint', 'OS: Linux'] });

    const [params] = fetchLatestVersions.mock.calls[0];
    expect(params.filter).toBe('(security-rule.tags: ("Domain: Endpoint" AND "OS: Linux"))');
  });

  it('passes the tactics on to the read', async () => {
    await browse({ tactics: ['TA0002', 'TA0003'] });

    const [params] = fetchLatestVersions.mock.calls[0];
    expect(params.filter).toBe('(security-rule.threat.tactic.id: ("TA0002" or "TA0003"))');
  });

  it('passes the search and sort on to the read', async () => {
    const sort = [{ field: 'name' as const, order: 'asc' as const }];

    await browse({ search: 'powershell', sort });

    const [params] = fetchLatestVersions.mock.calls[0];
    expect(params.sort).toEqual(sort);
    expect(params.filter).toContain('powershell');
  });
});

describe('buildBrowseSearchKql', () => {
  it('has no filter without a search term', () => {
    expect(buildBrowseSearchKql(undefined)).toBeUndefined();
    expect(buildBrowseSearchKql('   ')).toBeUndefined();
  });

  it('matches the name or a tag', () => {
    const kql = buildBrowseSearchKql('Windows');
    expect(kql).toContain('security-rule.name');
    expect(kql).toContain('security-rule.tags: "Windows"');
  });

  it('escapes quotes so a search cannot break out of the query', () => {
    expect(buildBrowseSearchKql('a" OR security-rule.name: *')).toContain(
      'security-rule.tags: "a\\" OR security-rule.name: *"'
    );
  });
});

describe('buildBrowseTacticsKql', () => {
  it('has no filter without tactics', () => {
    expect(buildBrowseTacticsKql(undefined)).toBeUndefined();
    expect(buildBrowseTacticsKql([])).toBeUndefined();
  });

  it('matches a rule that has any of the tactics', () => {
    expect(buildBrowseTacticsKql(['TA0002', 'TA0003'])).toBe(
      'security-rule.threat.tactic.id: ("TA0002" or "TA0003")'
    );
  });

  it('escapes quotes so a tactic cannot break out of the query', () => {
    expect(buildBrowseTacticsKql(['TA0002" or *'])).toBe(
      'security-rule.threat.tactic.id: ("TA0002\\" or *")'
    );
  });
});

describe('buildBrowseTagsKql', () => {
  it('has no filter without tags', () => {
    expect(buildBrowseTagsKql(undefined)).toBeUndefined();
    expect(buildBrowseTagsKql([])).toBeUndefined();
  });

  it('matches a rule that has all of the tags', () => {
    expect(buildBrowseTagsKql(['Domain: Endpoint', 'OS: Linux'])).toBe(
      'security-rule.tags: ("Domain: Endpoint" AND "OS: Linux")'
    );
  });

  it('escapes quotes so a tag cannot break out of the query', () => {
    expect(buildBrowseTagsKql(['a" OR *'])).toBe('security-rule.tags: ("a\\" OR *")');
  });
});

describe('buildBrowseKql', () => {
  it('has no filter without a search or tactics', () => {
    expect(buildBrowseKql({})).toBeUndefined();
  });

  it('uses the search alone, or the tactics alone', () => {
    expect(buildBrowseKql({ search: 'powershell' })).toBe(
      `(${buildBrowseSearchKql('powershell')})`
    );
    expect(buildBrowseKql({ tactics: ['TA0002'] })).toBe(`(${buildBrowseTacticsKql(['TA0002'])})`);
  });

  it('needs the search, the tags and the tactics to match when they are given together', () => {
    expect(buildBrowseKql({ search: 'powershell', tags: ['OS: Linux'], tactics: ['TA0002'] })).toBe(
      `(${buildBrowseSearchKql('powershell')}) AND (${buildBrowseTagsKql([
        'OS: Linux',
      ])}) AND (${buildBrowseTacticsKql(['TA0002'])})`
    );
  });
});
