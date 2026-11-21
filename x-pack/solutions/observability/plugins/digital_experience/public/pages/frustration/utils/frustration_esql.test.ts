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
} from '../../../../common/otel_data';
import {
  SOURCE_APP_VERSION_FIELDS,
  SOURCE_EXCEPTION_MESSAGE_FIELD,
  SOURCE_EVENT_NAME_FIELD,
  SOURCE_EXCEPTION_TYPE_FIELD,
  SOURCE_MOBILE_FIELDS,
  SOURCE_SERVICE_NAME_FIELD,
  SOURCE_SESSION_ID_FIELD,
  DEVICE_DESKTOP_LABEL,
  DEVICE_MOBILE_LABEL,
} from '../../../../common/otel_source_fields';
import { SESSION_ATTRIBUTE_FIELDS } from '../../../../common/session_attribute_fields';
import {
  errorClicksQuery,
  frustratedSessionsQuery,
  frustrationBase,
  signalsByBrowserQuery,
  signalsByDeviceQuery,
  signalsByVersionQuery,
  signalsOfTypeQuery,
  signalsOverTimeQuery,
  signalsQuery,
  type FrustrationQueryParams,
} from './frustration_esql';

const params: FrustrationQueryParams = {
  serviceName: 'media-portal-web',
  environment: ENVIRONMENT_ALL_VALUE,
};

const builders: Array<[string, (queryParams: FrustrationQueryParams) => string]> = [
  ['frustrationBase', frustrationBase],
  ['signalsQuery', signalsQuery],
  ['frustratedSessionsQuery', frustratedSessionsQuery],
  ['signalsOfTypeQuery (rage)', (p) => signalsOfTypeQuery(p, EVENT_RAGE_CLICK)],
  ['signalsOfTypeQuery (dead)', (p) => signalsOfTypeQuery(p, EVENT_DEAD_CLICK)],
  ['signalsOfTypeQuery (error)', (p) => signalsOfTypeQuery(p, EVENT_ERROR_CLICK)],
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
    it.each([
      ['all environments', ENVIRONMENT_ALL_VALUE],
      ['no environment', ENVIRONMENT_NOT_DEFINED_VALUE],
      ['an environment', 'prod "eu"\\1'],
    ])('parses for %s', (_label, environment) => {
      const { errors } = Parser.parse(build(withEnvironment(environment)));
      expect(errors.map(({ message }) => message)).toEqual([]);
    });
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
    ['signalsQuery', signalsQuery],
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

  describe('signalsQuery', () => {
    it('counts the signals', () => {
      expect(signalsQuery(params)).toContain('STATS signals = COUNT(*)');
    });
  });

  describe('frustratedSessionsQuery', () => {
    it('counts the frustrated sessions among all sessions of the service', () => {
      const query = frustratedSessionsQuery(params);
      expect(query).toContain(`${SOURCE_SERVICE_NAME_FIELD} == "media-portal-web"`);
      expect(query).toContain(
        `frustrated = COUNT_DISTINCT(${SOURCE_SESSION_ID_FIELD}) WHERE ${SOURCE_EVENT_NAME_FIELD} IN (`
      );
      expect(query).toContain(`sessions = COUNT_DISTINCT(${SOURCE_SESSION_ID_FIELD})`);
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
  });

  describe('signalsOfTypeQuery', () => {
    it.each(FRUSTRATION_EVENTS)('counts only %s', (event) => {
      const query = signalsOfTypeQuery(params, event);
      expect(query).toContain(`${SOURCE_EVENT_NAME_FIELD} == "${event}"`);
      FRUSTRATION_EVENTS.filter((other) => other !== event).forEach((other) =>
        expect(query).not.toContain(other)
      );
      expect(query).toContain('STATS signals = COUNT(*)');
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
    ])('lists one row per %s value, the %s most affected', (column, build, top) => {
      const query = build(params);
      expect(statsOf(query)).toHaveLength(1);
      expect(query).toContain(`${WIDE_STATS} BY ${column}`);
      expect(query).not.toContain('INLINE STATS');
      expect(query).toContain(`SORT signals DESC, ${column}`);
      expect(query.trimEnd().split('\n').pop()).toBe(`| LIMIT ${top}`);
    });

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
        `STATS signals = COUNT(*), sessions = COUNT_DISTINCT(${SOURCE_SESSION_ID_FIELD}) BY type = COALESCE(${SOURCE_EXCEPTION_TYPE_FIELD}, "No exception"), message = ${SOURCE_EXCEPTION_MESSAGE_FIELD}`
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
