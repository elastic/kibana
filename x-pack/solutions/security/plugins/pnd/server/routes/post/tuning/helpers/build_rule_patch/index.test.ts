/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PND_TUNABLE_RULE_FIELDS } from '@kbn/pnd-common';

import { buildRulePatch, findDisallowedRulePatchFields } from '.';

describe('buildRulePatch', () => {
  it('flattens the approved change onto the rule identifier', () => {
    expect(
      buildRulePatch({ change: { note: '## guide' }, id: 'rule-1', rationale: 'ok' }).patch
    ).toEqual({ id: 'rule-1', note: '## guide' });
  });

  it('puts the changed field at the top level, where the detection-engine route reads it', () => {
    expect(buildRulePatch({ change: { enabled: false }, id: 'rule-1' }).patch).toEqual({
      enabled: false,
      id: 'rule-1',
    });
  });

  it('drops the audit rationale, which is not a rule field', () => {
    expect(buildRulePatch({ id: 'rule-1', rationale: 'reduces false positives' }).patch).toEqual({
      id: 'rule-1',
    });
  });

  it('identifies the rule by rule_id when that is what the caller sent', () => {
    expect(
      buildRulePatch({ change: { enabled: false }, rationale: 'ok', rule_id: 'external-1' }).patch
    ).toEqual({ enabled: false, rule_id: 'external-1' });
  });

  it('carries an investigation-guide change', () => {
    expect(
      buildRulePatch({ change: { note: 'Check the patch window.' }, id: 'rule-1' }).patch
    ).toEqual({ id: 'rule-1', note: 'Check the patch window.' });
  });

  it('carries a custom-highlighted-fields change', () => {
    expect(
      buildRulePatch({
        change: { investigation_fields: { field_names: ['host.name'] } },
        id: 'rule-1',
      }).patch
    ).toEqual({ id: 'rule-1', investigation_fields: { field_names: ['host.name'] } });
  });

  it('produces an identifier-only patch when no change was approved', () => {
    expect(buildRulePatch({ id: 'rule-1', rationale: 'ok' }).patch).toEqual({ id: 'rule-1' });
  });

  it.each(PND_TUNABLE_RULE_FIELDS)('reports %s as a changed field', (field) => {
    expect(buildRulePatch({ change: { [field]: 'value' }, id: 'rule-1' }).changedFields).toEqual([
      field,
    ]);
  });

  // The rewrite reaches the patch; whether it may be applied to *this* rule is the route's call,
  // because only the route has the rule's `type` in hand (`findQueryChangeRefusal`).
  it('carries a query rewrite, now that the review flow measures both sides of it', () => {
    expect(buildRulePatch({ change: { query: 'event.code:4688' }, id: 'rule-1' }).patch).toEqual({
      id: 'rule-1',
      query: 'event.code:4688',
    });
  });

  it('reports a query rewrite as a changed field rather than a rejected one', () => {
    const { changedFields, rejectedFields } = buildRulePatch({
      change: { query: 'event.code:4688' },
      id: 'rule-1',
    });

    expect({ changedFields, rejectedFields }).toEqual({
      changedFields: ['query'],
      rejectedFields: [],
    });
  });

  it('never patches a refused field, even alongside a permitted one', () => {
    expect(
      buildRulePatch({
        change: { alert_suppression: { group_by: ['host.name'] }, enabled: false },
        id: 'rule-1',
      }).patch
    ).toEqual({ enabled: false, id: 'rule-1' });
  });

  it('refuses exceptions_list, which a patch replaces rather than merges', () => {
    expect(
      buildRulePatch({ change: { exceptions_list: [] }, id: 'rule-1' }).rejectedFields
    ).toEqual(['exceptions_list']);
  });

  it('refuses an alert-suppression change', () => {
    expect(
      buildRulePatch({ change: { alert_suppression: { group_by: ['host.name'] } }, id: 'rule-1' })
        .rejectedFields
    ).toEqual(['alert_suppression']);
  });

  // Reported rather than dropped: an unexpected field that is quietly discarded would let the route
  // answer `200` for a patch it had emptied, which is exactly what the allow-list exists to prevent.
  it('reports an unexpected top-level field as rejected rather than dropping it silently', () => {
    const { patch, rejectedFields } = buildRulePatch({
      id: 'rule-1',
      name: 'renamed by the model',
      rationale: 'ok',
    });

    expect({ patch, rejectedFields }).toEqual({
      patch: { id: 'rule-1' },
      rejectedFields: ['name'],
    });
  });

  it('reports no changed field for an empty change, so a no-op can never look applied', () => {
    expect(buildRulePatch({ change: {}, id: 'rule-1' }).changedFields).toEqual([]);
  });

  it('reports no changed field when the caller sent no change at all', () => {
    expect(buildRulePatch({ id: 'rule-1' }).changedFields).toEqual([]);
  });

  it('ignores a field explicitly set to undefined rather than patching it away', () => {
    expect(buildRulePatch({ change: { enabled: undefined }, id: 'rule-1' }).patch).toEqual({
      id: 'rule-1',
    });
  });

  it('keeps a false value, which is the whole point of disabling a rule', () => {
    expect(buildRulePatch({ change: { enabled: false }, id: 'rule-1' }).changedFields).toEqual([
      'enabled',
    ]);
  });

  it('lets the approved change win over a same-named identifier-level field', () => {
    expect(
      buildRulePatch({ change: { enabled: true }, enabled: false, id: 'rule-1', rationale: 'ok' })
        .patch
    ).toEqual({ enabled: true, id: 'rule-1' });
  });

  it('never forwards a rationale, which is PND audit metadata and not a rule field', () => {
    expect(
      buildRulePatch({ change: { enabled: false, rationale: 'noisy' }, id: 'rule-1' }).patch
    ).toEqual({ enabled: false, id: 'rule-1' });
  });
});

describe('findDisallowedRulePatchFields', () => {
  it('allows a patch built from the tunable field set', () => {
    expect(
      findDisallowedRulePatchFields({
        enabled: true,
        id: 'rule-1',
        investigation_fields: { field_names: ['host.name'] },
        note: '## guide',
      })
    ).toEqual([]);
  });

  it('allows a rule named by rule_id', () => {
    expect(findDisallowedRulePatchFields({ note: '## guide', rule_id: 'external' })).toEqual([]);
  });

  it.each(PND_TUNABLE_RULE_FIELDS)('allows %s', (field) => {
    expect(findDisallowedRulePatchFields({ id: 'rule-1', [field]: 'value' })).toEqual([]);
  });

  // The single likeliest thing a model proposes when asked to tune a noisy rule, and now the point
  // of the review flow rather than something to refuse here. Its one precondition — the rule's
  // `type` must be `query` — is unknowable from a patch, so the route holds that half of the guard.
  it('allows a query rewrite, which the route then checks against the rule type', () => {
    expect(findDisallowedRulePatchFields({ id: 'rule-1', query: 'event.code : *' })).toEqual([]);
  });

  it.each([
    'alert_suppression',
    'threshold',
    'exceptions_list',
    'index',
    'name',
    'risk_score',
    'severity',
    'type',
  ])('rejects %s', (field) => {
    expect(findDisallowedRulePatchFields({ id: 'rule-1', [field]: 'value' })).toEqual([field]);
  });

  it('names every disallowed field, not just the first', () => {
    expect(
      findDisallowedRulePatchFields({ id: 'rule-1', name: 'renamed', threshold: { value: 1 } })
    ).toEqual(['name', 'threshold']);
  });

  it('reports nothing for an empty patch', () => {
    expect(findDisallowedRulePatchFields({})).toEqual([]);
  });
});
