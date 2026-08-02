/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { SYSTEM_SECURITY_WATCH_IDS, SYSTEM_SECURITY_WATCH_DEEP_ID } from '@kbn/pnd-common';
import { PND_RULE_TUNING_WORKFLOW_ID } from '@kbn/workflows/managed';

import { isManagedWatchId } from '.';

describe('isManagedWatchId', () => {
  it.each([...SYSTEM_SECURITY_WATCH_IDS])('accepts the managed watch id %s', (watchId) => {
    expect(isManagedWatchId(watchId)).toBe(true);
  });

  it('rejects a custom watch id, because the autonomy routes 400 on anything outside the allow-list', () => {
    expect(isManagedWatchId('custom-watch-abc')).toBe(false);
  });

  // A managed PND workflow is not automatically a dialable watch: `system-security-rule-tuning` is
  // installed by this plugin, yet an autonomy key for it would sit behind `pnd_manage_autonomy` for
  // a workflow that PATCHes detection rules. This is the guard the retired lifecycle stub used to
  // stand in for here (kibana-phf4.12).
  it('rejects a managed PND workflow that is not a watch', () => {
    expect(isManagedWatchId(PND_RULE_TUNING_WORKFLOW_ID)).toBe(false);
  });

  it('rejects undefined, so a route param that has not resolved yet never fetches', () => {
    expect(isManagedWatchId(undefined)).toBe(false);
  });

  it('rejects an empty string', () => {
    expect(isManagedWatchId('')).toBe(false);
  });

  it('rejects a managed id with surrounding whitespace, since the key is built verbatim', () => {
    expect(isManagedWatchId(` ${SYSTEM_SECURITY_WATCH_DEEP_ID} `)).toBe(false);
  });
});
