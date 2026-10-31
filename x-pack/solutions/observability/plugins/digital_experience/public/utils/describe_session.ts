/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

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
