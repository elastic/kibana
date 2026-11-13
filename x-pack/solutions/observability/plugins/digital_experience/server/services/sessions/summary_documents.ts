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
import { numberOr, stringOrNull, stringsOf } from '../../lib/helpers/values';
import type { SessionDocument, WebVitalSamples } from './sessions_index';
import { attributeColumn } from './summary_queries';

export type EsqlRow = Record<string, estypes.FieldValue | estypes.FieldValue[]>;

/** The rows of an ES|QL response, keyed by column name. */
export const toEsqlRows = ({ columns, values }: estypes.EsqlEsqlResult): EsqlRow[] =>
  values.map((row) => Object.fromEntries(columns.map(({ name }, index) => [name, row[index]])));

const attributeOf = (row: EsqlRow, attribute: SessionAttribute): string | null =>
  stringOrNull(row[attributeColumn(attribute)]);

/** Pages without repeats, from page URLs the summary query returns in first-view order. */
const toJourney = (urls: string[]): string[] =>
  urls.reduce<string[]>((journey, url) => {
    const page = toPagePath(url);
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
  const samples = numberOr(row[`${vital}_samples`], 0);
  const good = numberOr(row[`${vital}_good`], 0);
  const upToNeedsImprovement = numberOr(row[`${vital}_up_to_needs_improvement`], 0);
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
    const serviceName = stringOrNull(row.service);
    const sessionId = stringOrNull(row.session);
    const startTime = stringOrNull(row.start_time);
    const endTime = stringOrNull(row.end_time);
    if (!serviceName || !sessionId || !startTime || !endTime) {
      return [];
    }
    const journey = toJourney(stringsOf(row.pages));
    const [lastUrl] = stringsOf(row.exit);
    const lastPage = lastUrl ? toPagePath(lastUrl) : null;
    const pageViewCount = numberOr(row.page_view_count, 0);
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
        event_count: numberOr(row.event_count, 0),
        page_view_count: pageViewCount,
        page_load_count: numberOr(row.page_load_count, 0),
        click_count: numberOr(row.click_count, 0),
        js_error_count: numberOr(row.js_error_count, 0),
        http_request_count: numberOr(row.http_request_count, 0),
        http_failed_request_count: numberOr(row.http_failed_request_count, 0),
        // Bounced when the visit never left the page it landed on. Counted from the pages seen,
        // not the page views, as a browser can report several for one page. A session with no
        // captured page isn't a bounce: there was none to leave.
        bounced: journey.length === 1,
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
        web_vitals: byVital((vital) => numberOr(row[`${vital}_p75`], null)),
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
