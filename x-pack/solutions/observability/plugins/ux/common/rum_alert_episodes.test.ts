/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  bucketRumAlertFires,
  collapseRumAlertEpisodes,
  lastRumAlertFiredAt,
  rumAlertEpisodeRange,
  rumAlertInvestigateTarget,
  rumFiringServiceNames,
} from './rum_alert_episodes';

const event = (
  overrides: Partial<{
    timestamp: string;
    episodeId: string;
    status: string;
    ruleId: string;
  }>
) => ({
  timestamp: '2026-08-14T12:16:50.913Z',
  episodeId: 'ep-1',
  status: 'inactive',
  ruleId: 'rule-1',
  ...overrides,
});

describe('collapseRumAlertEpisodes', () => {
  it('keeps the newest row per episode', () => {
    const collapsed = collapseRumAlertEpisodes([
      event({ timestamp: '2026-08-14T12:16:50.913Z', status: 'inactive' }),
      event({ timestamp: '2026-08-14T12:16:50.284Z', episodeId: 'ep-2', status: 'pending' }),
      event({ timestamp: '2026-08-14T12:15:50.192Z', status: 'pending' }),
    ]);
    expect(collapsed).toHaveLength(2);
    expect(collapsed[0].status).toBe('inactive');
    expect(collapsed[1].episodeId).toBe('ep-2');
  });
});

describe('lastRumAlertFiredAt', () => {
  it('returns the newest pending or active event for the rule', () => {
    expect(
      lastRumAlertFiredAt(
        [
          event({ status: 'inactive' }),
          event({ timestamp: '2026-08-14T12:15:50.192Z', status: 'pending' }),
        ],
        'rule-1'
      )
    ).toBe('2026-08-14T12:15:50.192Z');
  });
});

describe('bucketRumAlertFires', () => {
  it('counts pending and active events by hour', () => {
    const buckets = bucketRumAlertFires([
      event({ timestamp: '2026-08-14T12:16:50.000Z', status: 'pending' }),
      event({ timestamp: '2026-08-14T12:45:00.000Z', episodeId: 'ep-2', status: 'active' }),
      event({ timestamp: '2026-08-14T12:50:00.000Z', status: 'inactive' }),
      event({ timestamp: '2026-08-14T13:01:00.000Z', episodeId: 'ep-3', status: 'pending' }),
    ]);
    expect(buckets).toEqual([
      { timestamp: '2026-08-14T12:00:00.000Z', fires: 2 },
      { timestamp: '2026-08-14T13:00:00.000Z', fires: 1 },
    ]);
  });
});

describe('rumAlertInvestigateTarget', () => {
  it('routes error templates to the errors tab', () => {
    expect(rumAlertInvestigateTarget('error_spike').pathname).toBe('/errors');
    expect(rumAlertInvestigateTarget('error_rate').pathname).toBe('/errors');
  });

  it('routes frustration to rage sessions', () => {
    expect(rumAlertInvestigateTarget('frustration')).toEqual({
      pathname: '/session-replay',
      frustration: 'rage',
    });
  });

  it('routes traffic templates to sessions', () => {
    expect(rumAlertInvestigateTarget('traffic_drop').pathname).toBe('/session-replay');
    expect(rumAlertInvestigateTarget('traffic_spike').pathname).toBe('/session-replay');
    expect(rumAlertInvestigateTarget('session_traffic_drop').pathname).toBe('/session-replay');
  });

  it('routes session error and frustration templates to the session list', () => {
    expect(rumAlertInvestigateTarget('session_error_rate')).toEqual({
      pathname: '/session-replay',
      frustration: 'error',
    });
    expect(rumAlertInvestigateTarget('session_frustration')).toEqual({
      pathname: '/session-replay',
      frustration: 'rage',
    });
  });
});

describe('rumFiringServiceNames', () => {
  it('maps the latest fire status onto scoped rules', () => {
    expect(
      rumFiringServiceNames(
        [
          { id: 'rule-1', serviceName: 'shop' },
          { id: 'rule-2', serviceName: 'legacy' },
          { id: 'rule-3' },
        ],
        [
          event({ ruleId: 'rule-1', status: 'active' }),
          event({ ruleId: 'rule-2', status: 'inactive' }),
          event({ ruleId: 'rule-3', status: 'pending' }),
        ]
      )
    ).toEqual(new Set(['shop']));
  });
});

describe('rumAlertEpisodeRange', () => {
  it('windows one hour before and 15 minutes after the fire', () => {
    expect(rumAlertEpisodeRange('2026-08-14T12:00:00.000Z')).toEqual({
      rangeFrom: '2026-08-14T11:00:00.000Z',
      rangeTo: '2026-08-14T12:15:00.000Z',
    });
  });
});
