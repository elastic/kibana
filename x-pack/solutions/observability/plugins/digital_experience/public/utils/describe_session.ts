/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import type { SessionSummary } from '../../common/sessions';

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
 * The pages a session went through, as far as they're known, e.g. "/cart → /checkout +2", without
 * repeating a page it stayed on; what tells anonymous sessions apart.
 */
export const journeyOf = ({
  journey,
  entryPage,
}: Pick<SessionSummary, 'journey' | 'entryPage'>): string | null => {
  const pages = journey.filter((page, index) => page !== journey[index - 1]);
  if (pages.length === 0) {
    return entryPage;
  }
  const shown = pages.slice(0, JOURNEY_PAGES_SHOWN).join(' → ');
  const more = pages.length - JOURNEY_PAGES_SHOWN;
  return more > 0
    ? i18n.translate('xpack.digitalExperience.describeSession.journeyMore', {
        defaultMessage: '{pages} +{more}',
        values: { pages: shown, more },
      })
    : shown;
};
