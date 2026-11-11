/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { createHash } from 'crypto';
import type { estypes } from '@elastic/elasticsearch';
import { CORE_WEB_VITAL, type CoreWebVital } from '../../../common/core_web_vitals';
import { SESSIONS_JOURNEY_SIZE, toPagePath } from '../../../common/sessions';
import type { SessionAttribute } from '../../../common/session_attribute_fields';
import type { SessionDocument, WebVitalSamples } from './sessions_index';
import { attributeColumn } from './summary_queries';

export type EsqlRow = Record<string, estypes.FieldValue | estypes.FieldValue[]>;

/** The rows of an ES|QL response, keyed by column name. */
export const toEsqlRows = ({ columns, values }: estypes.EsqlEsqlResult): EsqlRow[] =>
  values.map((row) => Object.fromEntries(columns.map(({ name }, index) => [name, row[index]])));

const asString = (value: EsqlRow[string] | undefined): string | null =>
  typeof value === 'string' && value.length > 0 ? value : null;

const asNumber = (value: EsqlRow[string] | undefined): number =>
  typeof value === 'number' && Number.isFinite(value) ? value : 0;

const asNumberOrNull = (value: EsqlRow[string] | undefined): number | null =>
  typeof value === 'number' && Number.isFinite(value) ? value : null;

const asStrings = (value: EsqlRow[string] | undefined): string[] =>
  (Array.isArray(value) ? value : [value]).filter(
    (item): item is string => typeof item === 'string'
  );

const attributeOf = (row: EsqlRow, attribute: SessionAttribute): string | null =>
  asString(row[attributeColumn(attribute)]);

/** The URL of a `<time>|<url>` view key of the summary query. */
const urlOf = (view: string): string => view.substring(view.indexOf('|') + 1);

/** Pages in first-view order, without repeats, from the earliest page URLs only. */
const toJourney = (firstViews: string[]): string[] =>
  [...firstViews].sort().reduce<string[]>((journey, view) => {
    const page = toPagePath(urlOf(view));
    return page !== null && journey.length < SESSIONS_JOURNEY_SIZE && !journey.includes(page)
      ? [...journey, page]
      : journey;
  }, []);

const byVital = <T>(valueOf: (vital: CoreWebVital) => T): Record<CoreWebVital, T> => ({
  lcp: valueOf(CORE_WEB_VITAL.lcp),
  inp: valueOf(CORE_WEB_VITAL.inp),
  cls: valueOf(CORE_WEB_VITAL.cls),
  fcp: valueOf(CORE_WEB_VITAL.fcp),
  ttfb: valueOf(CORE_WEB_VITAL.ttfb),
});

const toWebVitalSamples = (row: EsqlRow, vital: CoreWebVital): WebVitalSamples => {
  const samples = asNumber(row[`${vital}_samples`]);
  const good = asNumber(row[`${vital}_good`]);
  const upToNeedsImprovement = asNumber(row[`${vital}_up_to_needs_improvement`]);
  return {
    count: samples,
    good,
    needs_improvement: upToNeedsImprovement - good,
    poor: samples - upToNeedsImprovement,
  };
};

/** The document id of a session: the same id can be reused by another application. */
export const sessionDocumentId = (serviceName: string, sessionId: string): string =>
  createHash('sha256')
    .update(JSON.stringify([serviceName, sessionId]))
    .digest('base64url');

const searchValues = (values: Array<string | null>): string[] => [
  ...new Set(values.flatMap((value) => (value ? [value.toLowerCase()] : []))),
];

/** One summary per row of the summary query, with its journey, entry and exit page. */
export const toSessionDocuments = (rows: EsqlRow[]): SessionDocument[] =>
  rows.flatMap((row) => {
    const serviceName = asString(row.service);
    const sessionId = asString(row.session);
    const startTime = asString(row.start_time);
    const endTime = asString(row.end_time);
    if (!serviceName || !sessionId || !startTime || !endTime) {
      return [];
    }
    const journey = toJourney(asStrings(row.pages));
    const [lastView] = asStrings(row.exit);
    const lastPage = lastView ? toPagePath(urlOf(lastView)) : null;
    const pageViewCount = asNumber(row.page_view_count);
    const durationMs = Math.max(0, Date.parse(endTime) - Date.parse(startTime));
    const user = attributeOf(row, 'user');
    const browser = attributeOf(row, 'browser');
    const os = attributeOf(row, 'os');
    const countryIso = attributeOf(row, 'countryIso');
    const city = attributeOf(row, 'city');
    const entryPage = journey[0] ?? lastPage;
    // The exit page is the one viewed last, journey or not.
    const exitPage = lastPage ?? journey[journey.length - 1] ?? null;

    return [
      {
        session: { id: sessionId },
        service: { name: serviceName },
        start_time: startTime,
        end_time: endTime,
        duration_ms: Number.isFinite(durationMs) ? durationMs : 0,
        event_count: asNumber(row.event_count),
        page_view_count: pageViewCount,
        page_load_count: asNumber(row.page_load_count),
        click_count: asNumber(row.click_count),
        js_error_count: asNumber(row.js_error_count),
        http_request_count: asNumber(row.http_request_count),
        http_failed_request_count: asNumber(row.http_failed_request_count),
        // A session without a captured page view isn't a bounce: there was no page to leave.
        bounced: pageViewCount === 1,
        entry_page: entryPage,
        exit_page: exitPage,
        journey,
        environment: attributeOf(row, 'environment'),
        user: { key: user },
        user_agent: {
          browser,
          browser_version: attributeOf(row, 'browserVersion'),
          os,
          device: attributeOf(row, 'device'),
        },
        geo: { country_iso: countryIso, region: attributeOf(row, 'region'), city },
        web_vitals: byVital((vital) => asNumberOrNull(row[`${vital}_p75`])),
        web_vital_samples: byVital((vital) => toWebVitalSamples(row, vital)),
        search: searchValues([
          sessionId,
          user,
          browser,
          os,
          countryIso,
          city,
          exitPage,
          ...journey,
        ]),
      },
    ];
  });
