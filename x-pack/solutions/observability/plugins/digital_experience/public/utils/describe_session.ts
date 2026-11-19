/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { SESSIONS_JOURNEY_SIZE, type SessionSummary } from '../../common/sessions';

/** Browser, OS and device, as far as they're known, e.g. "Chrome 130 · macOS". */
export const clientOf = ({ userAgent }: Pick<SessionSummary, 'userAgent'>): string =>
  [
    [userAgent.browser, userAgent.browserVersion].filter(Boolean).join(' '),
    userAgent.os,
    userAgent.device,
  ]
    .filter(Boolean)
    .join(' · ');

/** City, region and country, as far as they're known, e.g. "Amsterdam, North Holland, NL". */
export const locationOf = ({ geo }: Pick<SessionSummary, 'geo'>): string | null =>
  [geo.city, geo.region, geo.countryIso].filter(Boolean).join(', ') || null;

/** The first characters of a session ID, as the breadcrumb shows it: enough to tell sessions apart. */
export const shortSessionId = (sessionId: string): string => sessionId.slice(0, 8);

/** Pages a journey shows before the rest are counted, e.g. "/a → /b → /c +2". */
const JOURNEY_PAGES_SHOWN = 3;

/**
 * The pages a session went through, as far as they're known, e.g. "/cart → /checkout +2"; what
 * tells anonymous sessions apart. The server caps a journey, so a full one only says there is more.
 */
export const journeyOf = ({
  journey,
  entryPage,
}: Pick<SessionSummary, 'journey' | 'entryPage'>): string | null => {
  if (journey.length === 0) {
    return entryPage;
  }
  const shown = journey.slice(0, JOURNEY_PAGES_SHOWN).join(' → ');
  const more = journey.length - JOURNEY_PAGES_SHOWN;
  if (more <= 0) {
    return shown;
  }
  return journey.length >= SESSIONS_JOURNEY_SIZE
    ? i18n.translate('xpack.digitalExperience.describeSession.journeyMoreCapped', {
        defaultMessage: '{pages} …',
        values: { pages: shown },
      })
    : i18n.translate('xpack.digitalExperience.describeSession.journeyMore', {
        defaultMessage: '{pages} +{more}',
        values: { pages: shown, more },
      });
};

/** What stands out about a session: something broke, or the user left at once. */
export type SessionSignal =
  | { id: 'jsErrors' | 'failedRequests'; count: number; color: 'danger' | 'warning' }
  | { id: 'bounced'; color: 'hollow' };

/**
 * The signals of a session, in the order every surface shows them: what broke first, then whether
 * the user left at once. Each surface writes its own labels, as long as it has room for.
 */
export const sessionSignals = ({
  jsErrorCount,
  failedRequestCount,
  bounced,
}: Pick<SessionSummary, 'jsErrorCount' | 'failedRequestCount' | 'bounced'>): SessionSignal[] => [
  ...(jsErrorCount > 0
    ? [{ id: 'jsErrors' as const, count: jsErrorCount, color: 'danger' as const }]
    : []),
  ...(failedRequestCount > 0
    ? [{ id: 'failedRequests' as const, count: failedRequestCount, color: 'warning' as const }]
    : []),
  ...(bounced ? [{ id: 'bounced' as const, color: 'hollow' as const }] : []),
];
