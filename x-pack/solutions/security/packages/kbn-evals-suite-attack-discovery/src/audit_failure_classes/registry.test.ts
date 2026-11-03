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
  resolveAuditReference,
} from './registry';
import { deanonymize, getVariantFields, renderAlert } from './render_alert';
import { NON_IDENTIFYING_BASELINE_FIELDS } from './scenarios/same_display_name_cross_account';
import type { AuditInputVariant, AuditScenario } from './types';

const allGroupedIds = (scenario: (typeof AUDIT_SCENARIOS)[number]): string[] =>
  Object.values(scenario.gold.alertGroups).flat();

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
      const scenario = AUDIT_SCENARIOS.find(({ id }) => id === example.metadata?.scenarioId);
      expect(reference?.gold).toBe(scenario?.gold);
    }
    expect(resolveAuditReference({ scenarioId: 'nope', inputVariant: 'baseline' })).toBeUndefined();
    expect(
      resolveAuditReference({ scenarioId: 'benign-batch', inputVariant: 'x' })
    ).toBeUndefined();
    expect(resolveAuditReference(undefined)).toBeUndefined();
  });

  describe.each(AUDIT_SCENARIOS.map((scenario) => [scenario.id, scenario] as const))(
    'gold validation: %s',
    (_id, scenario) => {
      const alertIds = new Set(scenario.alerts.map(({ id }) => id));
      const groups = Object.keys(scenario.gold.alertGroups);

      it('declares each forbidden pair as a tuple of two distinct existing group ids', () => {
        for (const pair of scenario.gold.forbiddenCoCitation) {
          expect(Array.isArray(pair)).toBe(true);
          expect(pair).toHaveLength(2);
          for (const group of pair) {
            expect(groups).toContain(group);
          }
          expect(pair[0]).not.toBe(pair[1]);
        }
      });

      it('cites only alert ids that exist in the scenario alerts', () => {
        for (const group of groups) {
          expect(scenario.gold.alertGroups[group].length).toBeGreaterThan(0);
          for (const id of scenario.gold.alertGroups[group]) {
            expect(alertIds).toContain(id);
          }
        }
      });

      it('references only existing groups from requiredGroup, confirmedGroups and metaAlertGroups', () => {
        const referenced = [
          ...(scenario.gold.requiredGroup ? [scenario.gold.requiredGroup] : []),
          ...scenario.gold.confirmedGroups,
          ...(scenario.gold.metaAlertGroups ?? []),
        ];
        for (const group of referenced) {
          expect(groups).toContain(group);
        }
      });
    }
  );

  it('rejects malformed gold in a scenario the way the checks above would see it', () => {
    const broken: AuditScenario = {
      ...AUDIT_SCENARIOS[0],
      gold: {
        ...AUDIT_SCENARIOS[0].gold,
        forbiddenCoCitation: [['no-such-group', 'also-missing']],
        alertGroups: { only: ['not-an-alert'] },
      },
    };
    const groups = Object.keys(broken.gold.alertGroups);
    const alertIds = new Set(broken.alerts.map(({ id }) => id));
    expect(
      broken.gold.forbiddenCoCitation.every((pair) => pair.every((g) => groups.includes(g)))
    ).toBe(false);
    expect(broken.gold.alertGroups.only.every((id) => alertIds.has(id))).toBe(false);
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

  it.each(AUDIT_SCENARIOS.map((scenario) => [scenario.id, scenario] as const))(
    '%s: alert ids are unique and every gold group references existing alerts',
    (_id, scenario) => {
      const alertIds = scenario.alerts.map(({ id }) => id);
      expect(new Set(alertIds).size).toBe(alertIds.length);
      const grouped = allGroupedIds(scenario);
      expect(grouped.length).toBeGreaterThan(0);
      for (const id of grouped) {
        expect(alertIds).toContain(id);
      }
    }
  );

  it.each(AUDIT_SCENARIOS.map((scenario) => [scenario.id, scenario] as const))(
    '%s: gold groups partition the alerts and reference declared groups',
    (_id, scenario) => {
      const grouped = allGroupedIds(scenario);
      expect(new Set(grouped).size).toBe(grouped.length);
      expect(grouped.length).toBe(scenario.alerts.length);

      const groups = Object.keys(scenario.gold.alertGroups);
      for (const [left, right] of scenario.gold.forbiddenCoCitation) {
        expect(groups).toContain(left);
        expect(groups).toContain(right);
        expect(left).not.toBe(right);
      }
      for (const group of [
        ...scenario.gold.confirmedGroups,
        ...(scenario.gold.metaAlertGroups ?? []),
      ]) {
        expect(groups).toContain(group);
      }
      if (scenario.gold.requiredGroup) {
        expect(groups).toContain(scenario.gold.requiredGroup);
      }
    }
  );

  it('declares a required group exactly when discoveries are expected, and has a positive control', () => {
    for (const scenario of AUDIT_SCENARIOS) {
      expect(scenario.gold.requiredGroup !== undefined).toBe(
        scenario.gold.expectedDiscoveries === 'atLeastOne'
      );
    }
    expect(
      AUDIT_SCENARIOS.some(
        ({ gold }) => gold.expectedDiscoveries === 'atLeastOne' && gold.confirmedGroups.length > 0
      )
    ).toBe(true);
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
          expect(example.input.additionalContext !== undefined).toBe(variant === 'enriched');
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

    /** Fields whose set of values differs between the two groups in the rendered alerts. */
    const separatingFields = (variant: AuditInputVariant): string[] => {
      if (!scenario) return [];
      const { anonymizedAlerts } = getAuditRendering(scenario, variant);
      const parsed = parseAlerts(anonymizedAlerts);
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
      const separating = separatingFields('baseline');
      expect(
        separating.filter((field) => !NON_IDENTIFYING_BASELINE_FIELDS.includes(field))
      ).toEqual([]);
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
        expect(separatingFields('baseline')).not.toContain(field);
      }
      expect(parsed.map(({ fields }) => fields.message?.[0] ?? '').join(' ')).not.toMatch(
        /pipeline/i
      );
    });

    it('enriched: user.id, cloud.account.id and user_agent.original separate the groups', () => {
      expect(separatingFields('enriched')).toEqual(
        expect.arrayContaining(['user.id', 'cloud.account.id', 'user_agent.original'])
      );
    });
  });
});
