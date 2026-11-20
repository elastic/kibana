/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { MappingProperty } from '@elastic/elasticsearch/lib/api/types';
import {
  SAMPLE_EVENTS_FUNNEL,
  SAMPLE_EVENTS_MAPPINGS,
  SAMPLE_EVENTS_WINDOW_MS,
  generateSampleEvents,
} from './analytics_sample_events_generator';
import type { SampleEvent } from './analytics_sample_events_generator';

const NOW = Date.parse('2026-11-19T10:00:00.000Z');
const DAY_MS = 24 * 60 * 60 * 1000;

const groupBy = (
  events: readonly SampleEvent[],
  getKey: (event: SampleEvent) => string
): Map<string, SampleEvent[]> => {
  const groups = new Map<string, SampleEvent[]>();
  for (const event of events) {
    const key = getKey(event);
    groups.set(key, [...(groups.get(key) ?? []), event]);
  }
  return groups;
};

const getTime = (event: SampleEvent): number => Date.parse(event['@timestamp']);
const getDay = (event: SampleEvent): string => event['@timestamp'].slice(0, 10);
const countDistinct = (events: readonly SampleEvent[], getKey: (event: SampleEvent) => string) =>
  new Set(events.map(getKey)).size;

const getLeafPaths = (value: object, prefix = ''): string[] =>
  Object.entries(value).flatMap(([key, child]) =>
    typeof child === 'object' && child !== null && !('lat' in child)
      ? getLeafPaths(child, `${prefix}${key}.`)
      : [`${prefix}${key}`]
  );

const getMappedPaths = (properties: Record<string, MappingProperty>, prefix = ''): string[] =>
  Object.entries(properties).flatMap(([key, property]) =>
    'properties' in property && property.properties
      ? getMappedPaths(property.properties, `${prefix}${key}.`)
      : [`${prefix}${key}`]
  );

describe('generateSampleEvents', () => {
  const events = generateSampleEvents({ now: NOW });
  const sessions = groupBy(events, ({ session }) => session.id);
  const purchases = events.filter(({ event }) => event.action === 'purchase');

  it('generates the same events for the same seed and anchor', () => {
    expect(generateSampleEvents({ now: NOW })).toEqual(events);
  });

  it('generates different events for a different seed', () => {
    expect(generateSampleEvents({ now: NOW, seed: 7 })).not.toEqual(events);
  });

  it('generates a few thousand events, the same number whatever the anchor', () => {
    expect(events).toHaveLength(8628);
    for (const anchor of [NOW + 3.4 * DAY_MS, Date.parse('2027-02-28T23:59:59.999Z')]) {
      expect(generateSampleEvents({ now: anchor })).toHaveLength(events.length);
    }
  });

  it('keeps the visitors and their funnel the same when only the anchor moves', () => {
    const withoutTime = (list: readonly SampleEvent[]) =>
      list
        .map(({ '@timestamp': _, ...event }) => JSON.stringify(event))
        .sort((a, b) => a.localeCompare(b));

    expect(withoutTime(generateSampleEvents({ now: NOW + 3.4 * DAY_MS }))).toEqual(
      withoutTime(events)
    );
  });

  it('orders the events by time, within the week that ends at the anchor', () => {
    const times = events.map(getTime);

    expect(times).toEqual([...times].sort((a, b) => a - b));
    expect(times[0]).toBeGreaterThanOrEqual(NOW - SAMPLE_EVENTS_WINDOW_MS);
    expect(times[times.length - 1]).toBeLessThanOrEqual(NOW);
    expect(times[times.length - 1]).toBeGreaterThan(NOW - 60 * 60 * 1000);
  });

  it('covers every day of the window', () => {
    const days = groupBy(events, getDay);

    expect(days.size).toBe(8);
    for (let daysAgo = 0; daysAgo < 7; daysAgo++) {
      const day = new Date(NOW - daysAgo * DAY_MS).toISOString().slice(0, 10);
      expect(days.get(day)?.length).toBeGreaterThan(200);
    }
  });

  it('follows a daily wave and quieter weekends rather than uniform noise', () => {
    const fullDays = events.filter(
      (event) =>
        getTime(event) >= Date.parse('2026-11-13') && getTime(event) < Date.parse('2026-11-19')
    );
    const byHour = groupBy(fullDays, (event) => event['@timestamp'].slice(11, 13));
    const byDay = groupBy(fullDays, getDay);
    const count = (group: Map<string, SampleEvent[]>, key: string) => group.get(key)?.length ?? 0;

    expect(count(byHour, '17')).toBeGreaterThan(2 * count(byHour, '05'));
    // 2026-11-14 is a Saturday, 2026-11-17 a Tuesday.
    expect(count(byDay, '2026-11-17')).toBeGreaterThan(1.15 * count(byDay, '2026-11-14'));
  });

  it('gives every session one user, device and channel, and time-ordered events', () => {
    expect(sessions.size).toBeGreaterThan(2000);
    const getVisitor = ({ user, device, campaign, geo, user_agent: userAgent }: SampleEvent) =>
      JSON.stringify({ user, device, campaign, geo, userAgent });
    const mixedSessions = [...sessions].filter(
      ([, sessionEvents]) => countDistinct(sessionEvents, getVisitor) !== 1
    );
    const unorderedSessions = [...sessions].filter(([, sessionEvents]) =>
      sessionEvents.some(
        (event, position) => getTime(event) < getTime(sessionEvents[position - 1] ?? event)
      )
    );

    expect(mixedSessions).toEqual([]);
    expect(unorderedSessions).toEqual([]);
  });

  it('starts every session with a page view and never skips a funnel step', () => {
    for (const sessionEvents of sessions.values()) {
      const actions = sessionEvents.map(({ event }) => event.action);
      const reached = SAMPLE_EVENTS_FUNNEL.map((step) => actions.includes(step));

      expect(actions[0]).toBe('page_view');
      expect(reached).toEqual([...reached].sort((a, b) => Number(b) - Number(a)));
      expect(actions.filter((action) => action === 'purchase').length).toBeLessThanOrEqual(1);
    }
  });

  it('loses sessions and users at every step of the funnel', () => {
    const atStep = SAMPLE_EVENTS_FUNNEL.map((step) =>
      events.filter(({ event }) => event.action === step)
    );
    const sessionsAtStep = atStep.map((list) => countDistinct(list, ({ session }) => session.id));
    const usersAtStep = atStep.map((list) => countDistinct(list, ({ user }) => user.id));

    expect(sessionsAtStep).toEqual([2572, 1753, 641, 388, 233]);
    for (const counts of [sessionsAtStep, usersAtStep]) {
      for (let step = 1; step < counts.length; step++) {
        expect(counts[step]).toBeLessThan(counts[step - 1]);
        expect(counts[step]).toBeGreaterThan(0);
      }
    }
  });

  it('has users who come back on later days, as returning users', () => {
    const users = groupBy(events, ({ user }) => user.id);
    const returningUsers = [...users.values()].filter(
      (userEvents) => countDistinct(userEvents, getDay) > 1
    );

    expect(users.size).toBe(1400);
    expect(returningUsers.length).toBeGreaterThan(users.size / 5);

    for (const userEvents of users.values()) {
      const firstSessionId = userEvents[0].session.id;
      const laterSegments = userEvents
        .filter(({ session }) => session.id !== firstSessionId)
        .map(({ user }) => user.segment);

      expect(laterSegments.filter((segment) => segment === 'new')).toEqual([]);
    }
  });

  it('only signs up new users', () => {
    const signups = events.filter(({ event }) => event.action === 'signup');

    expect(signups.length).toBeGreaterThan(50);
    expect(signups.filter(({ user }) => user.segment !== 'new')).toEqual([]);
  });

  it('puts revenue on purchases only, priced from the purchased product', () => {
    expect(events.filter(({ order }) => order !== undefined)).toEqual(purchases);
    for (const { order, product } of purchases) {
      expect(product).toBeDefined();
      expect(order?.total).toBeCloseTo((product?.price ?? 0) * (order?.quantity ?? 0), 2);
      expect(order?.currency).toBe('USD');
    }
    expect(countDistinct(purchases, ({ order }) => order?.id ?? '')).toBe(purchases.length);
  });

  it('converts campaigns at clearly different rates', () => {
    const conversionRate = (campaignName: string): number => {
      const campaignEvents = events.filter(({ campaign }) => campaign.name === campaignName);
      return (
        campaignEvents.filter(({ event }) => event.action === 'purchase').length /
        countDistinct(campaignEvents, ({ session }) => session.id)
      );
    };

    expect(conversionRate('spring_sale_email')).toBeGreaterThan(
      2 * conversionRate('summer_launch_social')
    );
    expect(conversionRate('brand_search')).toBeGreaterThan(conversionRate('creator_collab'));
  });

  it('skews devices by country and conversion by device', () => {
    const mobileShare = (isoCode: string): number => {
      const countryEvents = events.filter(({ geo }) => geo.country_iso_code === isoCode);
      return (
        countryEvents.filter(({ device }) => device.type === 'mobile').length / countryEvents.length
      );
    };
    const purchaseRate = (deviceType: string): number =>
      purchases.filter(({ device }) => device.type === deviceType).length /
      countDistinct(
        events.filter(({ device }) => device.type === deviceType),
        ({ session }) => session.id
      );

    expect(mobileShare('IN')).toBeGreaterThan(mobileShare('DE') + 0.2);
    expect(purchaseRate('desktop')).toBeGreaterThan(purchaseRate('mobile'));
    expect(countDistinct(events, ({ geo }) => geo.country_iso_code)).toBeGreaterThan(8);
  });

  it('maps every field an event carries, and nothing else', () => {
    const eventPaths = new Set(events.flatMap((event) => getLeafPaths(event)));

    expect([...eventPaths].sort()).toEqual(
      getMappedPaths(SAMPLE_EVENTS_MAPPINGS.properties ?? {}).sort()
    );
    expect(SAMPLE_EVENTS_MAPPINGS.dynamic).toBe('strict');
  });
});
