/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { buildDiscoveryAlertIds } from '.';

describe('buildDiscoveryAlertIds', () => {
  it('maps each discovery to its constituent alert ids', () => {
    expect(
      buildDiscoveryAlertIds({
        alerts: [{ alert_ids: ['alert-1', 'alert-2'], id: 'ad-1' }],
        readableAttackDiscoveryAlertIds: new Set(['ad-1']),
      })
    ).toEqual({ 'ad-1': ['alert-1', 'alert-2'] });
  });

  it('keeps every readable discovery', () => {
    expect(
      Object.keys(
        buildDiscoveryAlertIds({
          alerts: [
            { alert_ids: ['alert-1'], id: 'ad-1' },
            { alert_ids: ['alert-2'], id: 'ad-2' },
          ],
          readableAttackDiscoveryAlertIds: new Set(['ad-1', 'ad-2']),
        })
      )
    ).toEqual(['ad-1', 'ad-2']);
  });

  /**
   * The S3 guard is the readable set: a discovery the caller cannot read must never contribute a
   * filter clause, because the clause names its constituent alert ids.
   */
  it('drops a discovery the caller cannot read', () => {
    expect(
      buildDiscoveryAlertIds({
        alerts: [
          { alert_ids: ['alert-1'], id: 'ad-1' },
          { alert_ids: ['alert-2'], id: 'ad-2' },
        ],
        readableAttackDiscoveryAlertIds: new Set(['ad-1']),
      })
    ).toEqual({ 'ad-1': ['alert-1'] });
  });

  it('drops a discovery with no constituent alerts, so it yields no context entry', () => {
    expect(
      buildDiscoveryAlertIds({
        alerts: [{ alert_ids: [], id: 'ad-1' }],
        readableAttackDiscoveryAlertIds: new Set(['ad-1']),
      })
    ).toEqual({});
  });

  it('collapses duplicate alert ids within a discovery', () => {
    expect(
      buildDiscoveryAlertIds({
        alerts: [{ alert_ids: ['alert-1', 'alert-1', 'alert-2'], id: 'ad-1' }],
        readableAttackDiscoveryAlertIds: new Set(['ad-1']),
      })
    ).toEqual({ 'ad-1': ['alert-1', 'alert-2'] });
  });

  it('returns nothing for an empty result', () => {
    expect(
      buildDiscoveryAlertIds({ alerts: [], readableAttackDiscoveryAlertIds: new Set() })
    ).toEqual({});
  });
});
