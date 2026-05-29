/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MonitorTypeEnum } from '../../../../../common/runtime_types';
import { FIRST_PARTY, THIRD_PARTY } from '../../../../../common/requests/get_certs_request_body';
import { MimeType } from '../../../../../common/constants/mime_types';
import { MIME_FILTERS } from '../step_details_page/common/network_data/types';
import type { QuickFilterOption } from './cert_quick_filter';
import * as labels from './translations';

// ICMP is intentionally omitted: it performs layer-3 echo requests with no TLS
// handshake, so it never produces a certificate.
export const MONITOR_TYPE_FILTER_OPTIONS: QuickFilterOption[] = [
  { value: MonitorTypeEnum.HTTP, label: labels.MONITOR_TYPE_FILTER_HTTP },
  { value: MonitorTypeEnum.TCP, label: labels.MONITOR_TYPE_FILTER_TCP },
  { value: MonitorTypeEnum.BROWSER, label: labels.MONITOR_TYPE_FILTER_BROWSER },
];

const RESOURCE_TYPE_TOOLTIPS: Record<MimeType, string> = {
  [MimeType.Html]: labels.RESOURCE_TYPE_TOOLTIP_HTML,
  [MimeType.Stylesheet]: labels.RESOURCE_TYPE_TOOLTIP_STYLESHEET,
  [MimeType.Font]: labels.RESOURCE_TYPE_TOOLTIP_FONT,
  [MimeType.Script]: labels.RESOURCE_TYPE_TOOLTIP_SCRIPT,
  [MimeType.Image]: labels.RESOURCE_TYPE_TOOLTIP_IMAGE,
  [MimeType.Media]: labels.RESOURCE_TYPE_TOOLTIP_MEDIA,
  [MimeType.XHR]: labels.RESOURCE_TYPE_TOOLTIP_XHR,
  [MimeType.Other]: labels.RESOURCE_TYPE_TOOLTIP_OTHER,
};

// Resource categories derived from the response content type
// (`http.response.mime_type`). Reuses the step waterfall's mime taxonomy and
// ordering so both views label resources the same way.
export const BROWSER_RESOURCE_TYPE_OPTIONS: QuickFilterOption[] = MIME_FILTERS.map(
  ({ label, mimeType }) => ({
    value: mimeType,
    label,
    tooltip: RESOURCE_TYPE_TOOLTIPS[mimeType],
  })
);

// Datemath windows passed to the `notValidAfter` param (cert `not_after <= now+N`).
// These intentionally include already-expired certs, which are the most urgent.
export const EXPIRY_WITHIN_OPTIONS: QuickFilterOption[] = [
  { value: 'now+7d', label: labels.EXPIRY_WITHIN_7_DAYS },
  { value: 'now+30d', label: labels.EXPIRY_WITHIN_30_DAYS },
  { value: 'now+90d', label: labels.EXPIRY_WITHIN_90_DAYS },
  { value: 'now+1y', label: labels.EXPIRY_WITHIN_1_YEAR },
];

export const PARTY_FILTER_OPTIONS: QuickFilterOption[] = [
  {
    value: FIRST_PARTY,
    label: labels.PARTY_FILTER_FIRST,
    tooltip: labels.PARTY_FILTER_FIRST_TOOLTIP,
  },
  {
    value: THIRD_PARTY,
    label: labels.PARTY_FILTER_THIRD,
    tooltip: labels.PARTY_FILTER_THIRD_TOOLTIP,
  },
];
