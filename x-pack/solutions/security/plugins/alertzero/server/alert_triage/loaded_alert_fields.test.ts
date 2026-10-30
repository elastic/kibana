/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ALERT_ANALYSIS_FIELDS } from '@kbn/workflows/managed';
import { entityIdsOf } from '../step_types/alert_triage/group_proposals_step';
import { REPLAY_PARITY_SCENARIOS } from './grouping_replay_parity_fixture';
import { LOADED_ALERT_FIELDS } from './loaded_alert_fields';
import { buildPatternKeys, getDetection, getField } from './pattern_key';
import { PARITY_ALERTS } from './pattern_key_parity_fixture';
import { buildEntitySummary, buildProposalText } from './proposal_text';

type Doc = Record<string, unknown>;

// Keeps the listed paths in both shapes, flat dotted keys and nested objects, as ES `_source`
// filtering does.
const pick = (doc: Doc, path: string): Doc => {
  if (path in doc) return { [path]: doc[path] };
  const [head, ...rest] = path.split('.');
  const child = doc[head];
  if (rest.length === 0 || typeof child !== 'object' || child === null) {
    return rest.length === 0 && head in doc ? { [head]: child } : {};
  }
  const picked = pick(child as Doc, rest.join('.'));
  return Object.keys(picked).length > 0 ? { [head]: picked } : {};
};
const merge = (target: Doc, source: Doc): Doc => {
  Object.entries(source).forEach(([key, value]) => {
    const current = target[key];
    target[key] =
      typeof value === 'object' && value !== null && !Array.isArray(value) && current
        ? merge(current as Doc, value as Doc)
        : value;
  });
  return target;
};
const trim = (doc: Doc, fields: readonly string[] = LOADED_ALERT_FIELDS): Doc =>
  fields.reduce<Doc>((acc, path) => merge(acc, pick(doc, path)), {});

const docs: Doc[] = [
  ...PARITY_ALERTS.map(({ doc }) => doc),
  ...REPLAY_PARITY_SCENARIOS.flatMap(({ docs: byId }) => Object.values(byId)),
].map((doc) => ({
  ...doc,
  'process.args': ['x'],
  host: { ...(doc.host as Doc | undefined), id: 'h-1', name: 'host-1', noise: 'z' },
  user: { name: 'u-1' },
  noise: 'y',
}));

// A field that a reader of the loaded alerts reads, but the list misses, would change the keys,
// the text or the entities silently.
describe('LOADED_ALERT_FIELDS', () => {
  const trimmed = docs.map((doc) => trim(doc));

  it('gives the same pattern keys and detection as the full alerts', () => {
    expect(trimmed.map(buildPatternKeys)).toEqual(docs.map(buildPatternKeys));
    expect(trimmed.map(getDetection)).toEqual(docs.map(getDetection));
  });

  it('gives the same proposal text and entity summary as the full alerts', () => {
    const text = (alerts: Doc[]) =>
      buildProposalText({ alerts, ruleName: 'R', confidenceFloor: 0.8, kind: 'keyed' });
    expect(text(trimmed)).toEqual(text(docs));
    expect(buildEntitySummary(trimmed)).toEqual(buildEntitySummary(docs));
  });

  it('gives the same entity ids as the full alerts', () => {
    expect(trimmed.map(entityIdsOf)).toEqual(docs.map(entityIdsOf));
    expect(entityIdsOf(trimmed[0])).toEqual(['host:h-1', 'user:u-1']);
  });

  it('keeps every field Alert Analysis reads, with the same values', () => {
    const full = {
      ...docs[0],
      ...Object.fromEntries(ALERT_ANALYSIS_FIELDS.map((f) => [f, `v:${f}`])),
    };
    const cut = trim(full);
    expect(ALERT_ANALYSIS_FIELDS.map((field) => getField(cut, field))).toEqual(
      ALERT_ANALYSIS_FIELDS.map((field) => getField(full, field))
    );
  });

  it('does not load a field no reader needs', () => {
    expect(trimmed.every((doc) => !('noise' in doc) && !('process.args' in doc))).toBe(true);
  });
});
