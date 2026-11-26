/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { Parser } from '@elastic/esql';
import {
  ENVIRONMENT_ALL_VALUE,
  ENVIRONMENT_NOT_DEFINED_VALUE,
  SERVICE_ENVIRONMENT,
  TELEMETRY_SDK_LANGUAGE,
} from '@kbn/apm-types';
import {
  BROWSER_SDK_LANGUAGE,
  EVENT_DEAD_CLICK,
  EVENT_ERROR_CLICK,
  EVENT_RAGE_CLICK,
  FRUSTRATION_EVENTS,
  OTEL_LOGS_INDEX,
  PAGE_VIEW_EVENTS,
} from '../../../../common/otel_data';
import {
  SOURCE_APP_VERSION_FIELDS,
  SOURCE_CSS_SELECTOR_FIELD,
  SOURCE_EXCEPTION_MESSAGE_FIELD,
  SOURCE_EVENT_NAME_FIELD,
  SOURCE_EXCEPTION_TYPE_FIELD,
  SOURCE_MOBILE_FIELDS,
  SOURCE_SERVICE_NAME_FIELD,
  SOURCE_SESSION_ID_FIELD,
  SOURCE_URL_FIELD,
  DEVICE_DESKTOP_LABEL,
  DEVICE_MOBILE_LABEL,
} from '../../../../common/otel_source_fields';
import { SESSION_ATTRIBUTE_FIELDS } from '../../../../common/session_attribute_fields';
import { SESSIONS_INDEX_PATTERN } from '../../../../common/sessions';
import {
  errorClicksQuery,
  frustratedSessionsQuery,
  frustrationBase,
  sessionsBySignalsQuery,
  signalsByBrowserQuery,
  signalsByDeviceQuery,
  signalsByVersionQuery,
  signalsOverTimeQuery,
  signalsPerPageViewQuery,
  signalsPerSessionQuery,
  topActionsQuery,
  type FrustrationQueryParams,
} from './frustration_esql';

const params: FrustrationQueryParams = {
  serviceName: 'media-portal-web',
  environment: ENVIRONMENT_ALL_VALUE,
  sessionSource: 'events',
};

const summaries: FrustrationQueryParams = { ...params, sessionSource: 'summaries' };

const builders: Array<[string, (queryParams: FrustrationQueryParams) => string]> = [
  ['frustrationBase', frustrationBase],
  ['frustratedSessionsQuery', frustratedSessionsQuery],
  ['signalsPerSessionQuery', (p) => signalsPerSessionQuery(p)],
  ['signalsPerSessionQuery (rage)', (p) => signalsPerSessionQuery(p, [EVENT_RAGE_CLICK])],
  ['signalsPerPageViewQuery (dead)', (p) => signalsPerPageViewQuery(p, EVENT_DEAD_CLICK)],
  ['sessionsBySignalsQuery', sessionsBySignalsQuery],
  ['topActionsQuery', (p) => topActionsQuery(p)],
  ['topActionsQuery (error)', (p) => topActionsQuery(p, [EVENT_ERROR_CLICK])],
  ['signalsOverTimeQuery', signalsOverTimeQuery],
  ['signalsByVersionQuery', signalsByVersionQuery],
  ['signalsByBrowserQuery', signalsByBrowserQuery],
  ['signalsByDeviceQuery', signalsByDeviceQuery],
  ['errorClicksQuery', errorClicksQuery],
];

const WIDE_STATS = `STATS rage = COUNT(*) WHERE ${SOURCE_EVENT_NAME_FIELD} == "${EVENT_RAGE_CLICK}", dead = COUNT(*) WHERE ${SOURCE_EVENT_NAME_FIELD} == "${EVENT_DEAD_CLICK}", error = COUNT(*) WHERE ${SOURCE_EVENT_NAME_FIELD} == "${EVENT_ERROR_CLICK}", signals = COUNT(*)`;

const statsOf = (query: string): string[] => query.match(/\| STATS /g) ?? [];

const withEnvironment = (environment: string): FrustrationQueryParams => ({
  ...params,
  environment,
});

describe('frustration ES|QL', () => {
  describe.each(builders)('%s', (_name, build) => {
    it.each(
      (['events', 'summaries'] as const).flatMap((sessionSource) =>
        [
          ['all environments', ENVIRONMENT_ALL_VALUE],
          ['no environment', ENVIRONMENT_NOT_DEFINED_VALUE],
          ['an environment', 'prod "eu"\\1'],
        ].map(([label, environment]) => [label, sessionSource, environment] as const)
      )
    )('parses for %s from the %s', (_label, sessionSource, environment) => {
      const { errors } = Parser.parse(build({ ...withEnvironment(environment), sessionSource }));
      expect(errors.map(({ message }) => message)).toEqual([]);
    });
  });

  describe('from the session summaries', () => {
    const sessionBuilders: Array<[string, (queryParams: FrustrationQueryParams) => string]> = [
      ['frustratedSessionsQuery', (p) => frustratedSessionsQuery(p)],
      ['signalsPerSessionQuery', (p) => signalsPerSessionQuery(p)],
      ['signalsPerPageViewQuery', (p) => signalsPerPageViewQuery(p, EVENT_RAGE_CLICK)],
      ['sessionsBySignalsQuery', sessionsBySignalsQuery],
      ['signalsByVersionQuery', signalsByVersionQuery],
      ['signalsByBrowserQuery', signalsByBrowserQuery],
      ['signalsByDeviceQuery', signalsByDeviceQuery],
    ];

    it.each(sessionBuilders)(
      '%s reads the summaries of the service that overlap the time range',
      (_name, build) => {
        const query = build(summaries);
        expect(query).toContain(`FROM ${SESSIONS_INDEX_PATTERN}\n`);
        expect(query).toContain('service.name == "media-portal-web"');
        expect(query).toContain('TO_DATETIME(start_time) <= ?_tend AND end_time >= ?_tstart');
        expect(query).not.toContain(OTEL_LOGS_INDEX);
        expect(query).not.toContain('COUNT_DISTINCT');
      }
    );

    it.each([
      ['signalsOverTimeQuery', signalsOverTimeQuery],
      ['topActionsQuery', (p: FrustrationQueryParams) => topActionsQuery(p)],
      ['errorClicksQuery', errorClicksQuery],
    ])('%s still reads the events, which summaries do not keep', (_name, build) => {
      expect(build(summaries)).toBe(build(params));
    });

    it('filters on the summary environment, which is unset for no environment', () => {
      expect(frustratedSessionsQuery({ ...summaries, environment: 'prod' })).toContain(
        '(environment == "prod")'
      );
      expect(
        frustratedSessionsQuery({ ...summaries, environment: ENVIRONMENT_NOT_DEFINED_VALUE })
      ).toContain(`(environment == "${ENVIRONMENT_NOT_DEFINED_VALUE}" OR (environment IS NULL))`);
    });

    it('counts all signals from the frustration count, and one type from its own count', () => {
      expect(signalsPerSessionQuery(summaries)).toContain(
        'STATS signals = COALESCE(SUM(frustration_count), 0),\n        sessions = COUNT(*)'
      );
      expect(signalsPerSessionQuery(summaries, [EVENT_DEAD_CLICK])).toContain(
        'SUM(dead_click_count)'
      );
      expect(frustratedSessionsQuery(summaries, [EVENT_ERROR_CLICK])).toContain(
        'frustrated = COUNT(*) WHERE error_click_count > 0'
      );
    });

    it('divides a type by the page views of the summaries', () => {
      expect(signalsPerPageViewQuery(summaries, EVENT_RAGE_CLICK)).toContain(
        'signals = COALESCE(SUM(rage_click_count), 0),\n        views = COALESCE(SUM(page_view_count), 0)'
      );
    });

    it('buckets the frustrated sessions by their frustration count', () => {
      const query = sessionsBySignalsQuery(summaries);
      expect(query).toContain('AND frustration_count > 0\n| EVAL signals = frustration_count');
      expect(query).toContain('| STATS sessions = COUNT(*) BY signals = LEAST(signals, 10)');
      expect(query.trimEnd().split('\n').pop()).toBe('| KEEP bucket, sessions');
    });

    it.each([
      ['version', signalsByVersionQuery, 'service.version'],
      ['browser', signalsByBrowserQuery, 'user_agent.browser'],
      ['device', signalsByDeviceQuery, 'user_agent.device'],
    ])(
      'breaks down by the summary %s, with the same columns as from the events',
      (column, build, field) => {
        const query = build(summaries);
        expect(query).toContain(`AND ${field} IS NOT NULL`);
        expect(query).toContain(
          'STATS rage = SUM(rage_click_count), dead = SUM(dead_click_count), error = SUM(error_click_count)'
        );
        expect(query).toContain(`BY ${column} = ${field}`);
        expect(query.trimEnd().split('\n').pop()).toBe(`| SORT per_session DESC, ${column}`);
      }
    );
  });

  describe('frustrationBase', () => {
    it('reads the OTel logs of the service, nullifying fields an index does not map', () => {
      const query = frustrationBase(params);
      expect(query).toContain('SET unmapped_fields = "NULLIFY";');
      expect(query).toContain(`FROM ${OTEL_LOGS_INDEX}`);
      expect(query).toContain(`${SOURCE_SERVICE_NAME_FIELD} == "media-portal-web"`);
    });

    it('reads browser SDK events only, as the server usage does', () => {
      expect(frustrationBase(params)).toContain(
        `${TELEMETRY_SDK_LANGUAGE} == "${BROWSER_SDK_LANGUAGE}"`
      );
    });

    it('escapes the service name', () => {
      const query = frustrationBase({ ...params, serviceName: 'a"b\\c\n' });
      expect(query).toContain(`${SOURCE_SERVICE_NAME_FIELD} == "a\\"b\\\\c\\n"`);
    });

    it('names the frustration events from the constants', () => {
      const query = frustrationBase(params);
      FRUSTRATION_EVENTS.forEach((event) => expect(query).toContain(`"${event}"`));
    });

    it('adds no environment clause for all environments', () => {
      const query = frustrationBase(params);
      SESSION_ATTRIBUTE_FIELDS.environment.forEach((field) => expect(query).not.toContain(field));
    });

    it('matches the "Not defined" value or all environment fields unset for no environment', () => {
      const [first, second] = SESSION_ATTRIBUTE_FIELDS.environment;
      expect(frustrationBase(withEnvironment(ENVIRONMENT_NOT_DEFINED_VALUE))).toContain(
        `(${SERVICE_ENVIRONMENT} == "${ENVIRONMENT_NOT_DEFINED_VALUE}" OR (${first} IS NULL AND ${second} IS NULL))`
      );
    });

    it('matches an escaped environment in any environment field', () => {
      const [first, second] = SESSION_ATTRIBUTE_FIELDS.environment;
      expect(frustrationBase(withEnvironment('prod "eu"'))).toContain(
        `(${first} == "prod \\"eu\\"" OR ${second} == "prod \\"eu\\"")`
      );
    });
  });

  describe.each([
    ['signalsOverTimeQuery', signalsOverTimeQuery],
    ['signalsByVersionQuery', signalsByVersionQuery],
    ['signalsByBrowserQuery', signalsByBrowserQuery],
    ['signalsByDeviceQuery', signalsByDeviceQuery],
  ])('%s', (_name, build) => {
    it('filters on the frustration events', () => {
      const query = build(params);
      expect(query).toContain(`"${EVENT_RAGE_CLICK}"`);
      expect(query).toContain(`"${EVENT_DEAD_CLICK}"`);
      expect(query).toContain(`"${EVENT_ERROR_CLICK}"`);
    });
  });

  describe.each([
    ['frustratedSessionsQuery', (p: FrustrationQueryParams) => frustratedSessionsQuery(p)],
    ['signalsPerSessionQuery', (p: FrustrationQueryParams) => signalsPerSessionQuery(p)],
    ['signalsByVersionQuery', signalsByVersionQuery],
    ['signalsByBrowserQuery', signalsByBrowserQuery],
    ['signalsByDeviceQuery', signalsByDeviceQuery],
  ])('%s', (_name, build) => {
    it('reads only the page views and signals of sessions with an id, which every session has', () => {
      expect(build(params)).toContain(
        `AND ${SOURCE_EVENT_NAME_FIELD} IN (${[...PAGE_VIEW_EVENTS, ...FRUSTRATION_EVENTS]
          .map((event) => `"${event}"`)
          .join(
            ', '
          )})\n  AND ${SOURCE_SESSION_ID_FIELD} IS NOT NULL AND ${SOURCE_SESSION_ID_FIELD} != ""\n| `
      );
    });
  });

  describe('frustratedSessionsQuery', () => {
    it('counts the frustrated sessions among all sessions of the service', () => {
      const query = frustratedSessionsQuery(params);
      expect(query).toContain(`${SOURCE_SERVICE_NAME_FIELD} == "media-portal-web"`);
      expect(query).toContain(
        `frustrated = COUNT_DISTINCT(${SOURCE_SESSION_ID_FIELD}, 40000) WHERE ${SOURCE_EVENT_NAME_FIELD} IN (`
      );
      expect(query).toContain(`sessions = COUNT_DISTINCT(${SOURCE_SESSION_ID_FIELD}, 40000)`);
    });

    it('guards the share against no sessions and divides as decimals', () => {
      const query = frustratedSessionsQuery(params);
      expect(query).toContain('CASE(sessions > 0, TO_DOUBLE(frustrated) / sessions, 0.0)');
    });

    it('counts only sessions with an id, as the session summaries do', () => {
      const query = frustratedSessionsQuery(params);
      expect(query).toContain(
        `AND ${SOURCE_SESSION_ID_FIELD} IS NOT NULL AND ${SOURCE_SESSION_ID_FIELD} != ""\n| STATS`
      );
    });

    it('keeps the environment in the denominator', () => {
      const [first] = SESSION_ATTRIBUTE_FIELDS.environment;
      expect(frustratedSessionsQuery(withEnvironment('prod'))).toContain(`${first} == "prod"`);
    });

    it('counts the sessions with a signal of the given types among all sessions', () => {
      const query = frustratedSessionsQuery(params, [EVENT_RAGE_CLICK]);
      expect(query).toContain(
        `frustrated = COUNT_DISTINCT(${SOURCE_SESSION_ID_FIELD}, 40000) WHERE ${SOURCE_EVENT_NAME_FIELD} IN ("${EVENT_RAGE_CLICK}"),`
      );
      expect(query).toContain(`sessions = COUNT_DISTINCT(${SOURCE_SESSION_ID_FIELD}, 40000)\n`);
    });
  });

  describe('signalsPerSessionQuery', () => {
    const sessions = `sessions = COUNT_DISTINCT(${SOURCE_SESSION_ID_FIELD}, 40000)\n`;

    it('divides the signals of sessions with an id by those sessions, as decimals', () => {
      const query = signalsPerSessionQuery(params);
      expect(query).toContain(
        `STATS signals = COUNT(*) WHERE ${SOURCE_EVENT_NAME_FIELD} IN ("${FRUSTRATION_EVENTS.join(
          '", "'
        )}")`
      );
      expect(query).toContain(sessions);
      expect(query).toContain(
        'EVAL per_session = CASE(sessions > 0, TO_DOUBLE(signals) / sessions, 0.0)'
      );
    });

    it.each(FRUSTRATION_EVENTS)('counts only %s when given', (event) => {
      const [, stats] = signalsPerSessionQuery(params, [event]).split('\n| STATS');
      expect(stats).toContain(
        `signals = COUNT(*) WHERE ${SOURCE_EVENT_NAME_FIELD} IN ("${event}")`
      );
      FRUSTRATION_EVENTS.filter((other) => other !== event).forEach((other) =>
        expect(stats).not.toContain(other)
      );
      expect(stats).toContain(sessions);
    });
  });

  describe('signalsPerPageViewQuery', () => {
    const pageViews = PAGE_VIEW_EVENTS.map((event) => `"${event}"`).join(', ');

    it('divides the signals of one type by the page views, none without views', () => {
      const query = signalsPerPageViewQuery(params, EVENT_RAGE_CLICK);
      expect(query).toContain(
        `AND ${SOURCE_EVENT_NAME_FIELD} IN ("${EVENT_RAGE_CLICK}", ${pageViews})`
      );
      expect(query).toContain(
        `STATS signals = COUNT(*) WHERE ${SOURCE_EVENT_NAME_FIELD} == "${EVENT_RAGE_CLICK}"`
      );
      expect(query).toContain(
        `views = COUNT(*) WHERE ${SOURCE_EVENT_NAME_FIELD} IN (${pageViews})`
      );
      expect(query).toContain('EVAL per_view = CASE(views > 0, TO_DOUBLE(signals) / views)');
      expect(query).not.toContain(EVENT_DEAD_CLICK);
    });
  });

  describe('sessionsBySignalsQuery', () => {
    it('counts the signals per session with an id, then the sessions per count', () => {
      const query = sessionsBySignalsQuery(params);
      expect(query.startsWith(frustrationBase(params))).toBe(true);
      expect(query).toContain(`AND ${SOURCE_SESSION_ID_FIELD} IS NOT NULL`);
      expect(query).toContain(
        `| STATS signals = COUNT(*) BY session = ${SOURCE_SESSION_ID_FIELD}\n| STATS sessions = COUNT(*) BY signals = LEAST(signals, 10)`
      );
    });

    it('labels the capped bucket "10+" and keeps the numeric order', () => {
      const query = sessionsBySignalsQuery(params);
      expect(query).toContain('bucket = CASE(signals >= 10, "10+", TO_STRING(signals))');
      expect(query.indexOf('| SORT signals\n')).toBeGreaterThan(query.indexOf('| EVAL bucket'));
      expect(query.trimEnd().split('\n').pop()).toBe('| KEEP bucket, sessions');
    });
  });

  describe('topActionsQuery', () => {
    it('counts the page views per page, then keeps only the signals', () => {
      const query = topActionsQuery(params);
      const pageViews = PAGE_VIEW_EVENTS.map((event) => `"${event}"`).join(', ');
      expect(query).toContain(
        `| INLINE STATS views = COUNT(*) WHERE ${SOURCE_EVENT_NAME_FIELD} IN (${pageViews}) BY page\n| WHERE ${SOURCE_EVENT_NAME_FIELD} IN ("${FRUSTRATION_EVENTS.join(
          '", "'
        )}")`
      );
      expect(statsOf(query)).toHaveLength(1);
    });

    it('labels the page from the URL as the Overview does: hash route, else path, no query', () => {
      const query = topActionsQuery(params);
      expect(query).toContain(`page_url = TRIM(${SOURCE_URL_FIELD})`);
      expect(query).toContain('REPLACE(SUBSTRING(page_url, page_hash + 1), "[?].*", "")');
      expect(query).toContain('REPLACE(REPLACE(page_url, "[?#].*", ""), "^.*?://[^/]*", "")');
      expect(query).toContain('page_path == "", "/", page_path)');
    });

    it('groups by labeled type, element and page, with sessions and the signals per page view', () => {
      const query = topActionsQuery(params);
      expect(query).toContain(
        `BY type = CASE(${SOURCE_EVENT_NAME_FIELD} == "${EVENT_RAGE_CLICK}", "Rage", ${SOURCE_EVENT_NAME_FIELD} == "${EVENT_DEAD_CLICK}", "Dead", ${SOURCE_EVENT_NAME_FIELD} == "${EVENT_ERROR_CLICK}", "Error"), element = ${SOURCE_CSS_SELECTOR_FIELD}, page`
      );
      expect(query).toContain(`sessions = COUNT_DISTINCT(${SOURCE_SESSION_ID_FIELD}) WHERE`);
      expect(query).toContain('views = MAX(views)');
      expect(query).toContain('EVAL per_view = CASE(views > 0, TO_DOUBLE(signals) / views)');
      expect(query).toContain('| SORT signals DESC, page, element, type\n| LIMIT 20');
    });

    it('keeps the signals of the given type only', () => {
      const query = topActionsQuery(params, [EVENT_DEAD_CLICK]);
      expect(query).toContain(`| WHERE ${SOURCE_EVENT_NAME_FIELD} IN ("${EVENT_DEAD_CLICK}")`);
      expect(query).not.toContain(`IN ("${EVENT_RAGE_CLICK}"`);
    });
  });

  describe('signalsOverTimeQuery', () => {
    it('counts each type per bucket of the dashboard time range, in one row per bucket', () => {
      const query = signalsOverTimeQuery(params);
      expect(query).toContain('BUCKET(@timestamp, 50, ?_tstart, ?_tend)');
      expect(statsOf(query)).toHaveLength(1);
      expect(query).toContain(`${WIDE_STATS} BY time = BUCKET(`);
      expect(query).toContain('SORT time');
      expect(query).not.toContain('INLINE STATS');
    });
  });

  describe('breakdown queries', () => {
    it('reads the app version from every field the Overview filter reads', () => {
      const query = signalsByVersionQuery(params);
      SOURCE_APP_VERSION_FIELDS.forEach((field) => expect(query).toContain(field));
      expect(query).toContain('COALESCE(');
    });

    it('reads the browser from every field the session summaries read', () => {
      const query = signalsByBrowserQuery(params);
      SESSION_ATTRIBUTE_FIELDS.browser.forEach((field) => expect(query).toContain(field));
    });

    it('reads the device from its fields, then from whether the browser is mobile', () => {
      const query = signalsByDeviceQuery(params);
      SESSION_ATTRIBUTE_FIELDS.device.forEach((field) => expect(query).toContain(field));
      SOURCE_MOBILE_FIELDS.forEach((field) => expect(query).toContain(field));
      expect(query).toContain(`"${DEVICE_MOBILE_LABEL}"`);
      expect(query).toContain(`"${DEVICE_DESKTOP_LABEL}"`);
    });

    it.each([
      ['version', signalsByVersionQuery, 10],
      ['browser', signalsByBrowserQuery, 5],
      ['device', signalsByDeviceQuery, 5],
    ])(
      'lists the signals per session of each type, a row per %s value of the %s with the most sessions',
      (column, build, top) => {
        const query = build(params);
        expect(statsOf(query)).toHaveLength(1);
        expect(query).not.toContain('INLINE STATS');
        expect(query).toContain(`sessions = COUNT_DISTINCT(${SOURCE_SESSION_ID_FIELD}, 40000)`);
        expect(query).toContain(`BY ${column}`);
        // Values without signals stay, as a baseline
        expect(query).not.toContain('| WHERE signals');
        expect(query.indexOf(`SORT sessions DESC, ${column}`)).toBeLessThan(
          query.indexOf(`| LIMIT ${top}`)
        );
        expect(query).toContain(
          '| EVAL rage = TO_DOUBLE(rage) / sessions, dead = TO_DOUBLE(dead) / sessions, error = TO_DOUBLE(error) / sessions'
        );
        expect(query.trimEnd().split('\n').pop()).toBe(`| SORT per_session DESC, ${column}`);
      }
    );

    it.each([
      ['version', signalsByVersionQuery],
      ['browser', signalsByBrowserQuery],
      ['device', signalsByDeviceQuery],
    ])('keeps a missing %s out of the ranking', (column, build) => {
      const query = build(params);
      const notNull = query.indexOf(`| WHERE ${column} IS NOT NULL`);
      expect(notNull).toBeGreaterThan(query.indexOf('| EVAL'));
      expect(notNull).toBeLessThan(query.indexOf('| STATS'));
    });
  });

  describe('errorClicksQuery', () => {
    it('counts error clicks only, by exception', () => {
      const query = errorClicksQuery(params);
      expect(query).toContain(`${SOURCE_EVENT_NAME_FIELD} == "${EVENT_ERROR_CLICK}"`);
      expect(query).not.toContain(EVENT_RAGE_CLICK);
      expect(query).not.toContain(EVENT_DEAD_CLICK);
      expect(query).toContain(
        `STATS signals = COUNT(*),\n        sessions = COUNT_DISTINCT(${SOURCE_SESSION_ID_FIELD}) WHERE ${SOURCE_SESSION_ID_FIELD} IS NOT NULL AND ${SOURCE_SESSION_ID_FIELD} != ""\n    BY type = COALESCE(${SOURCE_EXCEPTION_TYPE_FIELD}, "No exception"), message = ${SOURCE_EXCEPTION_MESSAGE_FIELD}`
      );
    });

    it('lists the 20 most frequent first', () => {
      const query = errorClicksQuery(params);
      expect(query).toContain('SORT signals DESC');
      expect(query).toContain('LIMIT 20');
    });

    it('carries the service and environment', () => {
      const query = errorClicksQuery(withEnvironment('prod'));
      expect(query).toContain(`${SOURCE_SERVICE_NAME_FIELD} == "media-portal-web"`);
      expect(query).toContain('== "prod"');
    });
  });
});
