/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { alertHasValue, parseAlerts } from './alert_csv';
import { toAlertId } from './define_alerts';
import { DEFAULT_ALLOW_REPLACEMENT } from './default_allowlist';
import {
  AUDIT_INPUT_VARIANTS,
  AUDIT_SCENARIOS,
  buildAuditExamples,
  getAuditExampleName,
  getAuditRendering,
  getGoldForVariant,
  resolveAuditReference,
  validateGold,
} from './registry';
import { deanonymize, getVariantFields, renderAlert } from './render_alert';
import { NON_IDENTIFYING_BASELINE_FIELDS } from './scenarios/same_display_name_cross_account';
import type { AuditInputVariant, AuditScenario } from './types';

const findScenario = (id: string): AuditScenario => {
  const scenario = AUDIT_SCENARIOS.find((candidate) => candidate.id === id);
  if (!scenario) throw new Error(`unknown scenario ${id}`);
  return scenario;
};

/** Fields whose set of rendered values differs between two groups of a scenario. */
const separatingFields = (
  scenario: AuditScenario,
  variant: AuditInputVariant,
  left: string,
  right: string
): string[] => {
  const parsed = parseAlerts(getAuditRendering(scenario, variant).anonymizedAlerts);
  const valuesOf = (group: string): Map<string, Set<string>> => {
    const byField = new Map<string, Set<string>>();
    parsed
      .filter(({ id }) => scenario.gold.alertGroups[group]?.includes(id))
      .forEach(({ fields }) => {
        for (const [field, values] of Object.entries(fields)) {
          const set = byField.get(field) ?? new Set<string>();
          values.forEach((value) => set.add(value));
          byField.set(field, set);
        }
      });
    return byField;
  };
  const a = valuesOf(left);
  const b = valuesOf(right);
  return [...new Set([...a.keys(), ...b.keys()])].filter((field) => {
    const x = [...(a.get(field) ?? [])].sort().join('|');
    const y = [...(b.get(field) ?? [])].sort().join('|');
    return x !== y;
  });
};

describe('audit failure class registry', () => {
  it('has unique scenario ids and example names', () => {
    const ids = AUDIT_SCENARIOS.map(({ id }) => id);
    expect(new Set(ids).size).toBe(ids.length);
    const names = buildAuditExamples().map(({ metadata }) => metadata?.Title);
    expect(new Set(names).size).toBe(names.length);
  });

  it('gives every example a unique id of the form <scenario>.<variant>', () => {
    const examples = buildAuditExamples();
    const exampleIds = examples.map(({ id }) => id);
    expect(exampleIds.every((id) => typeof id === 'string')).toBe(true);
    expect(new Set(exampleIds).size).toBe(examples.length);
    expect([...exampleIds].sort()).toEqual(
      AUDIT_SCENARIOS.flatMap(({ id }) =>
        AUDIT_INPUT_VARIANTS.map((variant) => `${id}.${variant}`)
      ).sort()
    );
    for (const example of examples) {
      const { scenarioId, inputVariant } = example.metadata ?? {};
      expect(example.id).toBe(`${scenarioId}.${inputVariant}`);
    }
  });

  it('keeps gold out of example metadata, and resolves it from the registry by scenarioId', () => {
    for (const example of buildAuditExamples()) {
      expect(Object.keys(example.metadata ?? {}).sort()).toEqual([
        'Title',
        'inputVariant',
        'provenance',
        'scenarioId',
      ]);
      const reference = resolveAuditReference(example.metadata);
      const scenario = findScenario(String(example.metadata?.scenarioId));
      expect(reference?.gold).toEqual(
        getGoldForVariant(scenario.gold, example.metadata?.inputVariant as AuditInputVariant)
      );
    }
    expect(resolveAuditReference({ scenarioId: 'nope', inputVariant: 'baseline' })).toBeUndefined();
    expect(
      resolveAuditReference({ scenarioId: 'benign-batch', inputVariant: 'x' })
    ).toBeUndefined();
    expect(resolveAuditReference(undefined)).toBeUndefined();
  });

  describe('validateGold', () => {
    const base = findScenario('same-display-name-cross-account');
    const withGold = (gold: Partial<AuditScenario['gold']>): AuditScenario => ({
      ...base,
      gold: { ...base.gold, ...gold },
    });
    const [firstGroup, secondGroup] = Object.keys(base.gold.alertGroups);

    it('accepts every registered scenario', () => {
      AUDIT_SCENARIOS.forEach((scenario) => expect(() => validateGold(scenario)).not.toThrow());
    });

    it.each([
      [
        'a forbidden pair naming unknown groups',
        { forbiddenCoCitation: [['no-such-group', 'also-missing']] as Array<[string, string]> },
        /unknown group/,
      ],
      [
        'a group citing an alert that does not exist',
        { alertGroups: { [firstGroup]: ['not-an-alert'], [secondGroup]: ['also-not'] } },
        /not in the alerts/,
      ],
      [
        'groups that leave alerts ungrouped',
        {
          alertGroups: {
            [firstGroup]: base.gold.alertGroups[firstGroup],
            [secondGroup]: base.gold.alertGroups[secondGroup].slice(1),
          },
        },
        /every alert must belong to a group/,
      ],
      [
        'an alert in two groups',
        {
          alertGroups: {
            [firstGroup]: base.gold.alertGroups[firstGroup],
            [secondGroup]: [
              ...base.gold.alertGroups[secondGroup],
              base.gold.alertGroups[firstGroup][0],
            ],
          },
        },
        /more than one group/,
      ],
      [
        'a forbidden pair of one group',
        { forbiddenCoCitation: [[firstGroup, firstGroup]] as Array<[string, string]> },
        /two distinct groups/,
      ],
      ['an unknown confirmed group', { confirmedGroups: ['nope'] }, /unknown group/],
      ['an unknown meta-alert group', { metaAlertGroups: ['nope'] }, /unknown group/],
      ['an unknown base requiredGroup', { requiredGroup: 'nope' }, /unknown group/],
      [
        'a variant override naming an unknown group',
        { variantOverrides: { baseline: { requiredGroup: 'nope' } } },
        /unknown group/,
      ],
      [
        'a recall target missing in one variant',
        { variantOverrides: { baseline: { requiredAnyOf: [] } } },
        /must declare a recall target/,
      ],
      [
        'both requiredGroup and requiredAnyOf',
        { requiredAnyOf: [firstGroup] },
        /both requiredGroup and requiredAnyOf/,
      ],
    ])('throws for %s', (_name, gold, message) => {
      expect(() => validateGold(withGold(gold))).toThrow(message);
    });

    it('throws for an empty group', () => {
      const gold = { alertGroups: { ...base.gold.alertGroups, 'empty-group': [] } };
      expect(() => validateGold(withGold(gold))).toThrow(/group "empty-group" is empty/);
    });

    it('throws for a duplicated alert id in the alerts', () => {
      const duplicated = { ...base, alerts: [...base.alerts, base.alerts[0]] };
      expect(() => validateGold(duplicated)).toThrow(/alert ids are not unique/);
    });

    it('is applied when the dataset is built', () => {
      expect(() => buildAuditExamples([withGold({ forbiddenCoCitation: [['x', 'y']] })])).toThrow(
        /Invalid gold for scenario "same-display-name-cross-account"/
      );
    });
  });

  it('covers the five authored scenarios', () => {
    expect(AUDIT_SCENARIOS.map(({ id }) => id).sort()).toEqual([
      'benign-batch',
      'positive-chain-with-noise',
      'same-display-name-cross-account',
      'shared-ci-egress',
      'threshold-meta-alerts',
    ]);
    expect(AUDIT_SCENARIOS.every(({ provenance }) => provenance === 'authored')).toBe(true);
  });

  it('declares a recall target in every variant exactly when discoveries are expected, and has a positive control', () => {
    for (const scenario of AUDIT_SCENARIOS) {
      for (const variant of AUDIT_INPUT_VARIANTS) {
        const { requiredGroup, requiredAnyOf } = getGoldForVariant(scenario.gold, variant);
        expect(requiredGroup !== undefined || (requiredAnyOf ?? []).length > 0).toBe(
          scenario.gold.expectedDiscoveries === 'atLeastOne'
        );
      }
    }
    expect(AUDIT_SCENARIOS.some(({ gold }) => gold.expectedDiscoveries === 'atLeastOne')).toBe(
      true
    );
  });

  it('confirms no group in the cross-account scenario, in any variant', () => {
    expect(findScenario('same-display-name-cross-account').gold.confirmedGroups).toEqual([]);
  });

  describe('gold that depends on the variant', () => {
    const scenario = findScenario('same-display-name-cross-account');
    const [left, right] = scenario.gold.forbiddenCoCitation[0];

    it('accepts either group in baseline, where the input cannot tell them apart', () => {
      const gold = getGoldForVariant(scenario.gold, 'baseline');
      expect(gold.requiredGroup).toBeUndefined();
      expect([...(gold.requiredAnyOf ?? [])].sort()).toEqual([left, right].sort());
      expect(
        resolveAuditReference({ scenarioId: scenario.id, inputVariant: 'baseline' })?.gold
      ).toEqual(gold);
    });

    it('requires the production group in both enriched variants', () => {
      for (const variant of ['enriched', 'enriched_context'] as const) {
        expect(getGoldForVariant(scenario.gold, variant)).toMatchObject({
          requiredGroup: 'prod-deploy-bot',
        });
      }
    });

    it.each(AUDIT_SCENARIOS.map((candidate) => [candidate.id, candidate] as const))(
      '%s: a single required group is separable from its forbidden partner in that variant',
      (_id, candidate) => {
        const checks = AUDIT_INPUT_VARIANTS.flatMap((variant) => {
          const { requiredGroup } = getGoldForVariant(candidate.gold, variant);
          const partners = candidate.gold.forbiddenCoCitation.flatMap(([a, b]) =>
            a === requiredGroup ? [b] : b === requiredGroup ? [a] : []
          );
          return requiredGroup === undefined
            ? []
            : partners.map((partner) => ({
                variant,
                partner,
                separating:
                  separatingFields(candidate, variant, requiredGroup, partner).filter(
                    (field) => !NON_IDENTIFYING_BASELINE_FIELDS.includes(field)
                  ).length > 0,
              }));
        });
        checks.forEach((check) => expect(check).toEqual({ ...check, separating: true }));
      }
    );
  });

  describe('operator context', () => {
    const FORBIDDEN_HINTS = ['user.id', 'source.ip', 'link', 'same entity', 'malicious', 'do not'];

    it.each(AUDIT_SCENARIOS.map((scenario) => [scenario.id, scenario] as const))(
      '%s: is a non-empty environment fact that hints at no answer',
      (_id, scenario) => {
        expect(scenario.operatorContext.trim().length).toBeGreaterThan(0);
        const lower = scenario.operatorContext.toLowerCase();
        for (const hint of FORBIDDEN_HINTS) {
          expect({ hint, present: lower.includes(hint) }).toEqual({ hint, present: false });
        }
      }
    );

    it('is sent only in enriched_context; baseline and enriched carry none', () => {
      for (const scenario of AUDIT_SCENARIOS) {
        for (const variant of AUDIT_INPUT_VARIANTS) {
          const example = buildAuditExamples([scenario]).find(
            ({ id }) => id === `${scenario.id}.${variant}`
          );
          const context =
            example?.input?.mode === 'bundledAlerts' ? example.input.additionalContext : 'wrong';
          expect(context).toBe(
            variant === 'enriched_context' ? scenario.operatorContext : undefined
          );
        }
      }
    });

    it('enriched and enriched_context render the same alerts', () => {
      for (const scenario of AUDIT_SCENARIOS) {
        expect(getAuditRendering(scenario, 'enriched_context')).toEqual(
          getAuditRendering(scenario, 'enriched')
        );
      }
    });
  });

  describe('rendering cache', () => {
    const base = findScenario('same-display-name-cross-account');

    it('does not reuse a rendering for another scenario object with the same id', () => {
      const trimmed: AuditScenario = { ...base, alerts: base.alerts.slice(1) };
      expect(getAuditRendering(trimmed, 'baseline').anonymizedAlerts).not.toEqual(
        getAuditRendering(base, 'baseline').anonymizedAlerts
      );
    });

    it('returns the identical rendering for the same scenario object', () => {
      expect(getAuditRendering(base, 'enriched_context')).toBe(getAuditRendering(base, 'enriched'));
      expect(getAuditRendering(base, 'baseline')).toBe(getAuditRendering(base, 'baseline'));
    });
  });

  it('has a negative control that expects no discoveries', () => {
    expect(AUDIT_SCENARIOS.some(({ gold }) => gold.expectedDiscoveries === 'none')).toBe(true);
  });

  it('keeps benign-batch between 30 and 50 alerts', () => {
    const scenario = AUDIT_SCENARIOS.find(({ id }) => id === 'benign-batch');
    expect(scenario?.alerts.length).toBeGreaterThanOrEqual(30);
    expect(scenario?.alerts.length).toBeLessThanOrEqual(50);
  });

  it('derives opaque alert ids that do not contain group names', () => {
    for (const scenario of AUDIT_SCENARIOS) {
      for (const group of Object.keys(scenario.gold.alertGroups)) {
        for (const id of scenario.gold.alertGroups[group]) {
          expect(id).toMatch(/^[0-9a-f]{16}$/);
        }
      }
    }
    expect(toAlertId('s', 'k')).toBe(toAlertId('s', 'k'));
    expect(toAlertId('s', 'k')).not.toBe(toAlertId('s', 'other'));
  });

  it('enriched fields are a superset of baseline fields for the same alerts', () => {
    const baseline = getVariantFields('baseline');
    const enriched = getVariantFields('enriched');
    for (const field of baseline) {
      expect(enriched.has(field)).toBe(true);
    }
    expect(enriched.size).toBeGreaterThan(baseline.size);

    for (const scenario of AUDIT_SCENARIOS) {
      for (const alert of scenario.alerts) {
        const baselineFields = Object.keys(parseAlerts([renderAlert(alert, 'baseline')])[0].fields);
        const enrichedFields = Object.keys(parseAlerts([renderAlert(alert, 'enriched')])[0].fields);
        for (const field of baselineFields) {
          expect(enrichedFields).toContain(field);
        }
      }
    }
  });

  it('enriched renders carry the identity fields; baseline renders do not', () => {
    const scenario = AUDIT_SCENARIOS.find(({ id }) => id === 'same-display-name-cross-account');
    const alert = scenario?.alerts.find(({ fields }) => 'user.id' in fields);
    expect(alert).toBeDefined();
    if (!alert) return;
    const [baseline] = parseAlerts([renderAlert(alert, 'baseline')]);
    const [enriched] = parseAlerts([renderAlert(alert, 'enriched')]);
    expect(baseline.fields['user.id']).toBeUndefined();
    expect(baseline.fields['cloud.account.id']).toBeUndefined();
    expect(enriched.fields['user.id']).toBeDefined();
    expect(enriched.fields['cloud.account.id']).toBeDefined();
  });

  it('builds one bundledAlerts example per scenario x variant with metadata', () => {
    const examples = buildAuditExamples();
    expect(examples).toHaveLength(AUDIT_SCENARIOS.length * AUDIT_INPUT_VARIANTS.length);

    for (const scenario of AUDIT_SCENARIOS) {
      for (const variant of AUDIT_INPUT_VARIANTS) {
        const example = examples.find(
          ({ metadata }) => metadata?.Title === getAuditExampleName(scenario.id, variant)
        );
        expect(example?.metadata).toEqual({
          Title: getAuditExampleName(scenario.id, variant),
          scenarioId: scenario.id,
          inputVariant: variant,
          provenance: 'authored',
        });
        expect(example?.input?.mode).toBe('bundledAlerts');
        if (example?.input?.mode === 'bundledAlerts') {
          expect(example.input.anonymizedAlerts).toHaveLength(scenario.alerts.length);
          expect(example.input.additionalContext !== undefined).toBe(
            variant === 'enriched_context'
          );
        }
      }
    }
  });

  it('shared-ci-egress: every alert carries the shared source.ip, so a forbidden join is co-citable', () => {
    const scenario = AUDIT_SCENARIOS.find(({ id }) => id === 'shared-ci-egress');
    expect(scenario?.gold.forbiddenCoCitation.length).toBeGreaterThan(0);
    const parsed = parseAlerts((scenario?.alerts ?? []).map((a) => renderAlert(a, 'baseline')));
    expect(parsed.every((alert) => alertHasValue(alert, 'source.ip', '203.0.113.50'))).toBe(true);
    expect(DEFAULT_ALLOW_REPLACEMENT).not.toContain('source.ip');
  });

  it('anonymizes user.name, host.name and cloud.account.name like the product, and de-anonymizes back', () => {
    for (const scenario of AUDIT_SCENARIOS) {
      for (const variant of AUDIT_INPUT_VARIANTS) {
        const { anonymizedAlerts, replacements } = getAuditRendering(scenario, variant);
        const parsed = parseAlerts(anonymizedAlerts);
        scenario.alerts.forEach((alert, index) => {
          for (const field of DEFAULT_ALLOW_REPLACEMENT) {
            const raw = alert.fields[field];
            const rendered = parsed[index].fields[field];
            if (raw === undefined || !getVariantFields(variant).has(field)) {
              expect(rendered).toBeUndefined();
            } else {
              expect(rendered).toBeDefined();
              expect(rendered).not.toEqual([String(raw)]);
              expect(replacements[rendered?.[0] ?? '']).toBe(String(raw));
            }
          }
          const restored = parseAlerts([
            {
              pageContent: deanonymize(anonymizedAlerts[index].pageContent, replacements),
              metadata: {},
            },
          ])[0];
          for (const field of DEFAULT_ALLOW_REPLACEMENT) {
            if (alert.fields[field] !== undefined && getVariantFields(variant).has(field)) {
              expect(restored.fields[field]).toEqual([String(alert.fields[field])]);
            }
          }
        });
      }
    }
  });

  it('renders deterministically: the same scenario and variant give the same prompt text', () => {
    const scenario = AUDIT_SCENARIOS[1];
    const first = renderAlert(scenario.alerts[0], 'baseline', 'seed-a');
    expect(renderAlert(scenario.alerts[0], 'baseline', 'seed-a')).toEqual(first);
    expect(renderAlert(scenario.alerts[0], 'baseline', 'seed-b')).not.toEqual(first);
  });

  describe('same-display-name-cross-account: what separates the two groups', () => {
    const scenario = AUDIT_SCENARIOS.find(({ id }) => id === 'same-display-name-cross-account');
    const [left, right] = scenario?.gold.forbiddenCoCitation[0] ?? ['', ''];

    const separating = (variant: AuditInputVariant): string[] =>
      scenario ? separatingFields(scenario, variant, left, right) : [];

    it('shares a user.name but not a user.id between the groups', () => {
      const values = (group: string, field: string) =>
        new Set(
          (scenario?.alerts ?? [])
            .filter(({ id }) => scenario?.gold.alertGroups[group]?.includes(id))
            .map(({ fields }) => String(fields[field]))
        );
      expect([...values(left, 'user.name')]).toEqual([...values(right, 'user.name')]);
      expect([...values(left, 'user.id')].some((arn) => values(right, 'user.id').has(arn))).toBe(
        false
      );
    });

    it('baseline: no field separates the groups except the documented non-identifying ones', () => {
      const fields = separating('baseline');
      expect(fields.filter((field) => !NON_IDENTIFYING_BASELINE_FIELDS.includes(field))).toEqual(
        []
      );
    });

    it('baseline: no cloud.account.name is rendered, and source IPs, rules and messages overlap', () => {
      const parsed = parseAlerts(
        scenario ? getAuditRendering(scenario, 'baseline').anonymizedAlerts : []
      );
      expect(parsed.some(({ fields }) => fields['cloud.account.name'] !== undefined)).toBe(false);
      for (const field of [
        'source.ip',
        'kibana.alert.rule.name',
        'message',
        'kibana.alert.severity',
      ]) {
        expect(separating('baseline')).not.toContain(field);
      }
      expect(parsed.map(({ fields }) => fields.message?.[0] ?? '').join(' ')).not.toMatch(
        /pipeline/i
      );
    });

    it.each(['enriched', 'enriched_context'] as const)(
      '%s: user.id, cloud.account.id and user_agent.original separate the groups',
      (variant) => {
        expect(separating(variant)).toEqual(
          expect.arrayContaining(['user.id', 'cloud.account.id', 'user_agent.original'])
        );
      }
    );
  });

  describe('shared-ci-egress: what separates the principals', () => {
    const scenario = findScenario('shared-ci-egress');
    const groups = Object.keys(scenario.gold.alertGroups);
    const NAT_FIELDS = ['source.as.number', 'source.as.organization.name'];
    const pairs = scenario.gold.forbiddenCoCitation;

    it('baseline already separates every forbidden pair by user.name and account name', () => {
      for (const [left, right] of pairs) {
        expect(separatingFields(scenario, 'baseline', left, right)).toEqual(
          expect.arrayContaining(['user.name', 'cloud.account.name'])
        );
      }
    });

    it('baseline carries no NAT-identifying field; the enriched variants add them on every alert', () => {
      const baseline = parseAlerts(getAuditRendering(scenario, 'baseline').anonymizedAlerts);
      for (const variant of ['enriched', 'enriched_context'] as const) {
        const enriched = parseAlerts(getAuditRendering(scenario, variant).anonymizedAlerts);
        for (const field of NAT_FIELDS) {
          expect(baseline.some(({ fields }) => fields[field] !== undefined)).toBe(false);
          expect(enriched.every(({ fields }) => fields[field] !== undefined)).toBe(true);
        }
      }
    });

    it('the NAT fields are shared by all principals, so they link rather than separate them', () => {
      for (const [left, right] of pairs) {
        const separating = separatingFields(scenario, 'enriched', left, right);
        for (const field of [...NAT_FIELDS, 'source.ip']) {
          expect(separating).not.toContain(field);
        }
      }
      expect(groups.length).toBeGreaterThan(1);
    });
  });
});
