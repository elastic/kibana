/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FactKind } from '../../../../../common/entity_analytics/executive_brief/evidence';
import { FACT_KIND_CAPABILITY } from '../../../../../common/entity_analytics/executive_brief/evidence';
import { BRIEF_SIGNALS } from '.';

/** The fact kinds each registered signal emits; a new signal must be added here. */
const FACT_KINDS_BY_SIGNAL: Record<string, readonly FactKind[]> = {
  attack_discoveries: ['attack_discovery'],
  alert_activity: ['alert_activity'],
  high_risk_entities: ['high_risk_entity'],
  response_status: ['alert_response', 'case'],
  relationships: ['relationship_first_seen'],
  risk_history: ['risk_jump'],
  hunting_leads: ['lead'],
};

describe('BRIEF_SIGNALS', () => {
  it('has unique ids', () => {
    const ids = BRIEF_SIGNALS.map(({ id }) => id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('lists signals in priority order, starting with the PR 1 signals', () => {
    expect(BRIEF_SIGNALS.slice(0, 3).map(({ id }) => id)).toEqual([
      'attack_discoveries',
      'alert_activity',
      'high_risk_entities',
    ]);
  });

  it('has a capability for every fact kind a signal emits', () => {
    expect(Object.keys(FACT_KINDS_BY_SIGNAL).sort()).toEqual(
      BRIEF_SIGNALS.map(({ id }) => id).sort()
    );
    Object.values(FACT_KINDS_BY_SIGNAL)
      .flat()
      .forEach((kind) => expect(FACT_KIND_CAPABILITY[kind]).toBeDefined());
  });

  it('declares a title, a known scope and a sane timeout for every signal', () => {
    BRIEF_SIGNALS.forEach((signal) => {
      expect(signal.title.length).toBeGreaterThan(0);
      expect(['tenant', 'entities']).toContain(signal.scope);
      if (signal.timeoutMs !== undefined) expect(signal.timeoutMs).toBeGreaterThan(0);
    });
  });
});
