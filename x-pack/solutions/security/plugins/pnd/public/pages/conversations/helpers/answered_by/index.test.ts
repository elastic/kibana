/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { PND_AUTO_RESPOND_RATIONALE_PREFIX } from '@kbn/pnd-common';
import { deriveAnsweredBy } from '.';

const autoRationale = `${PND_AUTO_RESPOND_RATIONALE_PREFIX}supervised (auto)`;
const dialRationale = `${PND_AUTO_RESPOND_RATIONALE_PREFIX}supervised (dial)`;

describe('deriveAnsweredBy', () => {
  it('attributes a gate with a named responder to that responder', () => {
    expect(
      deriveAnsweredBy({ rationale: 'Confirmed malicious activity.', respondedBy: 'elastic' })
        .source
    ).toBe('responder');
  });

  it('names the responder', () => {
    expect(
      deriveAnsweredBy({ rationale: 'Confirmed malicious activity.', respondedBy: 'elastic' }).label
    ).toBe('by elastic');
  });

  /**
   * The load-bearing case. `_auto_respond` resumes the gate through the same call an approval uses
   * and stamps the acting user as `respondedBy`, so an auto-respond with a named responder is
   * byte-for-byte a human approval apart from this prefix. Reading `respondedBy` first would
   * render every auto-responded gate as somebody's decision.
   */
  it('attributes a machine auto-respond to autonomy_auto even though it stamps a real user', () => {
    expect(deriveAnsweredBy({ rationale: autoRationale, respondedBy: 'elastic' }).source).toBe(
      'autonomy_auto'
    );
  });

  it('names the user the machine path ran as, without claiming they answered the gate', () => {
    expect(deriveAnsweredBy({ rationale: autoRationale, respondedBy: 'elastic' }).label).toBe(
      'automatically by AlertZero autonomy, run by elastic'
    );
  });

  it('attributes a dial auto-respond to autonomy_dial even though it stamps a real user', () => {
    expect(deriveAnsweredBy({ rationale: dialRationale, respondedBy: 'elastic' }).source).toBe(
      'autonomy_dial'
    );
  });

  it('names the user the dial path ran as, without claiming they answered the gate', () => {
    expect(deriveAnsweredBy({ rationale: dialRationale, respondedBy: 'elastic' }).label).toBe(
      'automatically after the autonomy level was raised, run by elastic'
    );
  });

  it('attributes a machine auto-respond with no stamped responder to autonomy_auto', () => {
    expect(deriveAnsweredBy({ rationale: autoRationale }).source).toBe('autonomy_auto');
  });

  it('says only that AlertZero autonomy answered it when no responder was stamped', () => {
    expect(deriveAnsweredBy({ rationale: autoRationale }).label).toBe(
      'automatically by AlertZero autonomy'
    );
  });

  it('attributes a dial auto-respond with no stamped responder to autonomy_dial', () => {
    expect(deriveAnsweredBy({ rationale: dialRationale }).source).toBe('autonomy_dial');
  });

  it('recognises an auto-respond at every autonomy level, so a level change cannot hide one', () => {
    const misread = ['manual', 'assisted', 'supervised'].filter(
      (level) =>
        deriveAnsweredBy({
          rationale: `${PND_AUTO_RESPOND_RATIONALE_PREFIX}${level} (auto)`,
        }).source !== 'autonomy_auto'
    );

    expect(misread).toEqual([]);
  });

  it('attributes a gate whose rationale is absent to its named responder', () => {
    expect(deriveAnsweredBy({ respondedBy: 'elastic' }).source).toBe('responder');
  });

  it('reports an answer with neither a responder nor a rationale as unrecorded', () => {
    expect(deriveAnsweredBy({}).source).toBe('unrecorded');
  });

  it('states an unrecorded answer rather than blanking it', () => {
    expect(deriveAnsweredBy({}).label).toBe('by an unrecorded responder');
  });

  it('treats a blank responder as unrecorded, never as an accountable actor', () => {
    expect(deriveAnsweredBy({ respondedBy: '   ' }).source).toBe('unrecorded');
  });

  /**
   * A rationale that discusses auto-respond is not an auto-respond. Only the prefix
   * `_auto_respond` itself writes counts, so the match is anchored at the start of the
   * string rather than a substring search.
   */
  it('does not read a rationale that merely mentions the prefix as an auto-respond', () => {
    expect(
      deriveAnsweredBy({
        rationale: `Overriding the earlier "${autoRationale}" accept.`,
        respondedBy: 'elastic',
      }).source
    ).toBe('responder');
  });
});
