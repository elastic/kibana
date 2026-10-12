/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { rulesClientMock } from '@kbn/alerting-plugin/server/rules_client.mock';
import type { CoverageRuleInput } from './detection_coverage';
import {
  fetchDetectionCoverage,
  reduceDetectionCoverage,
  reliesOnlyOnUninstalledIntegrations,
} from './detection_coverage';
import { createTestContext, createTestLookup } from './test_helpers';

const rule = (
  id: string,
  tactics: Array<{ id: string; techniques?: string[] }>,
  extra: Partial<CoverageRuleInput> & {
    relatedIntegrations?: Array<{ package: string }>;
  } = {}
): CoverageRuleInput => ({
  id,
  name: `rule ${id}`,
  params: {
    threat: tactics.map(({ id: tacticId, techniques = [] }) => ({
      framework: 'MITRE ATT&CK',
      tactic: { id: tacticId, name: tacticId },
      technique: techniques.map((techniqueId) => ({ id: techniqueId, name: techniqueId })),
    })),
    relatedIntegrations: extra.relatedIntegrations,
  },
  lastRun: extra.lastRun,
});

describe('reliesOnlyOnUninstalledIntegrations', () => {
  const installed = new Set(['endpoint']);

  it('is false without related integrations', () => {
    expect(reliesOnlyOnUninstalledIntegrations(undefined, installed)).toBe(false);
    expect(reliesOnlyOnUninstalledIntegrations([], installed)).toBe(false);
  });

  it('is false when any related integration is installed', () => {
    expect(
      reliesOnlyOnUninstalledIntegrations([{ package: 'okta' }, { package: 'endpoint' }], installed)
    ).toBe(false);
  });

  it('is true when none are installed', () => {
    expect(reliesOnlyOnUninstalledIntegrations([{ package: 'okta' }], installed)).toBe(true);
  });
});

describe('reduceDetectionCoverage', () => {
  const lookup = createTestLookup();

  it('computes enabled and effective per tactic id (Lateral Movement: 1 of 2 working)', () => {
    const coverage = reduceDetectionCoverage({
      rules: [
        rule('works', [{ id: 'TA0008', techniques: ['T1021.001'] }], {
          relatedIntegrations: [{ package: 'endpoint' }],
        }),
        rule('no-integration', [{ id: 'TA0008' }], { relatedIntegrations: [{ package: 'okta' }] }),
        rule('failed', [{ id: 'TA0006' }], { lastRun: { outcome: 'failed' } }),
        rule('ok', [{ id: 'TA0006' }], { lastRun: { outcome: 'succeeded' } }),
      ],
      installedPackages: new Set(['endpoint']),
      lookup,
    });
    expect(coverage.byTactic.get('TA0008')).toEqual({ enabled: 2, effective: 1 });
    expect(coverage.byTactic.get('TA0006')).toEqual({ enabled: 2, effective: 1 });
    expect(coverage.enabledRules).toBe(4);
    expect(coverage.integrationsChecked).toBe(true);
  });

  it('subtracts a rule that is both failed and missing integrations only once', () => {
    const coverage = reduceDetectionCoverage({
      rules: [
        rule('both', [{ id: 'TA0008' }], {
          relatedIntegrations: [{ package: 'okta' }],
          lastRun: { outcome: 'failed' },
        }),
      ],
      installedPackages: new Set(),
      lookup,
    });
    expect(coverage.byTactic.get('TA0008')).toEqual({ enabled: 1, effective: 0 });
  });

  it('skips the integration check when Fleet is unavailable', () => {
    const coverage = reduceDetectionCoverage({
      rules: [rule('r', [{ id: 'TA0008' }], { relatedIntegrations: [{ package: 'okta' }] })],
      installedPackages: undefined,
      lookup,
    });
    expect(coverage.byTactic.get('TA0008')).toEqual({ enabled: 1, effective: 1 });
    expect(coverage.integrationsChecked).toBe(false);
  });

  it('counts multi-tactic rules under every tactic and keeps technique pairing per tactic', () => {
    const coverage = reduceDetectionCoverage({
      rules: [
        rule('multi', [
          { id: 'TA0005', techniques: ['T1027'] },
          { id: 'TA0002', techniques: ['T1059'] },
        ]),
      ],
      installedPackages: new Set(),
      lookup,
    });
    expect(coverage.byTactic.get('TA0005')?.enabled).toBe(1);
    expect(coverage.byTactic.get('TA0002')?.enabled).toBe(1);
    const info = coverage.rulesById.get('multi');
    expect(info?.techniquesByTactic.get('TA0005')).toEqual([{ id: 'T1027', name: 'T1027' }]);
    expect(info?.techniquesByTactic.get('TA0002')).toEqual([{ id: 'T1059', name: 'T1059' }]);
  });

  it('prefers sub-techniques and counts rules with no ATT&CK mapping as unmapped', () => {
    const subtechniqueRule: CoverageRuleInput = {
      id: 'sub',
      name: 'sub',
      params: {
        threat: [
          {
            framework: 'MITRE ATT&CK',
            tactic: { id: 'TA0004' },
            technique: [
              {
                id: 'T1548',
                name: 'Abuse Elevation',
                subtechnique: [{ id: 'T1548.003', name: 'Sudo and Sudo Caching' }],
              },
            ],
          },
        ],
      },
    };
    const coverage = reduceDetectionCoverage({
      rules: [subtechniqueRule, rule('unmapped', [])],
      installedPackages: new Set(),
      lookup,
    });
    expect(coverage.rulesById.get('sub')?.techniquesByTactic.get('TA0004')).toEqual([
      { id: 'T1548.003', name: 'Sudo and Sudo Caching' },
    ]);
    expect(coverage.rulesById.get('sub')?.techniqueIds).toEqual(['T1548', 'T1548.003']);
    expect(coverage.unmappedRules).toBe(1);
  });
});

describe('fetchDetectionCoverage', () => {
  it('queries enabled rules only, with the 10k cap, and reads Fleet through the request scope', async () => {
    const rulesClient = rulesClientMock.create();
    rulesClient.find.mockResolvedValue({
      page: 1,
      perPage: 10000,
      total: 1,
      data: [
        {
          ...rule('r1', [{ id: 'TA0008' }], { relatedIntegrations: [{ package: 'okta' }] }),
          enabled: true,
        },
      ],
    } as unknown as Awaited<ReturnType<typeof rulesClient.find>>);
    const getPackages = jest.fn().mockResolvedValue([
      { name: 'endpoint', status: 'installed' },
      { name: 'okta', status: 'not_installed' },
    ]);
    const ctx = createTestContext({
      services: {
        rulesClient,
        fleetPackageService: {
          asScoped: jest.fn().mockReturnValue({ getPackages }),
          asInternalUser: { getPackages },
        } as never,
      },
    });

    const coverage = await fetchDetectionCoverage(ctx, createTestLookup());

    const options = rulesClient.find.mock.calls[0][0]?.options;
    expect(options?.filter).toContain('alert.attributes.enabled: true');
    expect(options?.perPage).toBe(10000);
    expect(options?.fields).toEqual(
      expect.arrayContaining(['params.threat', 'params.relatedIntegrations', 'lastRun'])
    );
    expect(coverage.byTactic.get('TA0008')).toEqual({ enabled: 1, effective: 0 });
  });
});
