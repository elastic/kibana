/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { OverviewFilterName } from './overview_filters';
import { SESSION_ATTRIBUTE_FIELDS } from './session_attribute_fields';
import {
  DEVICE_DESKTOP_LABEL,
  DEVICE_MOBILE_LABEL,
  SOURCE_APP_VERSION_FIELDS,
  SOURCE_MOBILE_FIELDS,
  SOURCE_URL_FIELD,
  SOURCE_URL_TEMPLATE_FIELD,
} from './otel_source_fields';

// The fields behind the Overview's filters, which the DSL searches read through runtime fields and
// the ES|QL queries (`overview_filters_esql.ts`) through `COALESCE`.

/** What a field that is not a name says, per value: the device name of `browser.mobile`. */
export const FIELD_VALUE_LABELS: Record<string, Record<string, string>> = Object.fromEntries(
  SOURCE_MOBILE_FIELDS.map((field) => [
    field,
    { true: DEVICE_MOBILE_LABEL, false: DEVICE_DESKTOP_LABEL },
  ])
);

/**
 * The fields each filter reads, in priority order. The session summaries' lists come first, so a
 * browser, OS, device or country means the same in the Overview and the Sessions where they have
 * one; the device then falls back to `browser.mobile`.
 */
export const FILTER_SOURCE_FIELDS: Record<OverviewFilterName, readonly string[]> = {
  browser: SESSION_ATTRIBUTE_FIELDS.browser,
  os: SESSION_ATTRIBUTE_FIELDS.os,
  device: [...SESSION_ATTRIBUTE_FIELDS.device, ...SOURCE_MOBILE_FIELDS],
  country: SESSION_ATTRIBUTE_FIELDS.countryIso,
  appVersion: SOURCE_APP_VERSION_FIELDS,
  // The route the app reports, like `/products/{slug}`, groups the URLs of a page; without one, as
  // with an SDK that doesn't add routes, the page is its URL
  pageUrl: [SOURCE_URL_TEMPLATE_FIELD, SOURCE_URL_FIELD],
  // The text of the URL itself, which the route doesn't have
  pageContains: [SOURCE_URL_FIELD],
};
