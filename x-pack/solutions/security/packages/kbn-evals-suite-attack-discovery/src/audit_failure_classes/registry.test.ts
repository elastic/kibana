/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { alertHasValue, parseAlerts } from './alert_csv';
import { toAlertId } from './define_alerts';
import {
  AUDIT_INPUT_VARIANTS,
  AUDIT_SCENARIOS,
  buildAuditExamples,
  getAuditExampleName,
} from './registry';
import { getVariantFields, renderAlert } from './render_alert';

const allGroupedIds = (scenario: (typeof AUDIT_SCENARIOS)[number]): string[] =>
  Object.values(scenario.gold.alertGroups).flat();

describe('audit failure class registry', () => {
  it('has unique scenario ids and example names', () => {
    const ids = AUDIT_SCENARIOS.map(({ id }) => id);
    expect(new Set(ids).size).toBe(ids.length);
    const names = buildAuditExamples().map(({ metadata }) => metadata?.Title);
    expect(new Set(names).size).toBe(names.length);
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
        ({ gold }) => gold.expectedDiscoveries === 'atLeastOne' && gold.confirmed
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
        expect(example?.metadata).toMatchObject({
          scenarioId: scenario.id,
          inputVariant: variant,
          provenance: 'authored',
          gold: scenario.gold,
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
  });

  it('same-display-name-cross-account: both groups share a user.name but not a user.id', () => {
    const scenario = AUDIT_SCENARIOS.find(({ id }) => id === 'same-display-name-cross-account');
    const [left, right] = scenario?.gold.forbiddenCoCitation[0] ?? ['', ''];
    const names = (group: string) =>
      new Set(
        (scenario?.alerts ?? [])
          .filter(({ id }) => scenario?.gold.alertGroups[group]?.includes(id))
          .map(({ fields }) => String(fields['user.name']))
      );
    const arns = (group: string) =>
      new Set(
        (scenario?.alerts ?? [])
          .filter(({ id }) => scenario?.gold.alertGroups[group]?.includes(id))
          .map(({ fields }) => String(fields['user.id']))
      );
    expect([...names(left)]).toEqual([...names(right)]);
    expect([...arns(left)].some((arn) => arns(right).has(arn))).toBe(false);
  });
});
