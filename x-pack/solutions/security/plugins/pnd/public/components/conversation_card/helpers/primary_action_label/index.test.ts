/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { primaryActionLabel } from '.';

describe('primaryActionLabel', () => {
  it('names the open_investigation gate with the container it opens', () => {
    expect(primaryActionLabel('open_investigation')).toEqual('Open investigation');
  });

  /**
   * The 2026-08-17 Experience/UX sync, decision 6: the label is "Open an incident". The gate *id* is
   * still `promote_incident`, which is the whole point of asserting the pair here — the copy moved
   * and the identifier did not.
   */
  it('names the promote_incident gate with the incident it opens', () => {
    expect(primaryActionLabel('promote_incident')).toEqual('Open an incident');
  });

  /** The retired verb (2026-08-17, decision 6) must not come back through any gate. */
  it('never labels a gate with the retired "Promote to incident" wording', () => {
    expect(
      ['apply_tuning', 'incident_contained', 'open_investigation', 'promote_incident'].map(
        primaryActionLabel
      )
    ).not.toContain('Promote to incident');
  });

  /**
   * The verb is what the analyst does — confirm — rather than what the agent claims: the gate asks
   * whether containment already happened, and a label reading "Contain" would promise an action
   * this decision does not take.
   */
  it('names the incident_contained gate as a confirmation, not as an act of containment', () => {
    expect(primaryActionLabel('incident_contained')).toEqual('Confirm containment');
  });

  it('names the apply_tuning gate with the tuning it applies', () => {
    expect(primaryActionLabel('apply_tuning')).toEqual('Apply tuning');
  });

  /** Fail closed like every other registry lookup: no label rather than a guess at the verb. */
  it('returns undefined for a gate id outside the registry, so the row renders no action', () => {
    expect(primaryActionLabel('not_a_gate')).toBeUndefined();
  });

  /** The registry is keyed on the short gate id; a `waitForInput` step id is not one. */
  it('returns undefined for a step id, which is not a gate id', () => {
    expect(primaryActionLabel('await_open_investigation')).toBeUndefined();
  });
});
