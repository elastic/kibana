/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { MonitorTypeEnum } from '../../../../../common/runtime_types';
import { FIRST_PARTY, THIRD_PARTY } from '../../../../../common/requests/get_certs_request_body';
import type { QuickFilterOption } from './cert_quick_filter';
import * as labels from './translations';

// ICMP is intentionally omitted: it performs layer-3 echo requests with no TLS
// handshake, so it never produces a certificate.
export const MONITOR_TYPE_FILTER_OPTIONS: QuickFilterOption[] = [
  { value: MonitorTypeEnum.HTTP, label: labels.MONITOR_TYPE_FILTER_HTTP },
  { value: MonitorTypeEnum.TCP, label: labels.MONITOR_TYPE_FILTER_TCP },
  { value: MonitorTypeEnum.BROWSER, label: labels.MONITOR_TYPE_FILTER_BROWSER },
];

// Chrome DevTools Protocol resource types, as indexed in `synthetics.payload.type`
// on browser network events. Labels are technical proper nouns shown verbatim.
export const BROWSER_RESOURCE_TYPE_OPTIONS: QuickFilterOption[] = [
  { value: 'Document', label: 'Document', tooltip: labels.RESOURCE_TYPE_TOOLTIP_DOCUMENT },
  { value: 'Script', label: 'Script', tooltip: labels.RESOURCE_TYPE_TOOLTIP_SCRIPT },
  { value: 'Stylesheet', label: 'Stylesheet', tooltip: labels.RESOURCE_TYPE_TOOLTIP_STYLESHEET },
  { value: 'Image', label: 'Image', tooltip: labels.RESOURCE_TYPE_TOOLTIP_IMAGE },
  { value: 'Font', label: 'Font', tooltip: labels.RESOURCE_TYPE_TOOLTIP_FONT },
  { value: 'Media', label: 'Media', tooltip: labels.RESOURCE_TYPE_TOOLTIP_MEDIA },
  { value: 'XHR', label: 'XHR', tooltip: labels.RESOURCE_TYPE_TOOLTIP_XHR },
  { value: 'Fetch', label: 'Fetch', tooltip: labels.RESOURCE_TYPE_TOOLTIP_FETCH },
  { value: 'Ping', label: 'Ping', tooltip: labels.RESOURCE_TYPE_TOOLTIP_PING },
  { value: 'Other', label: 'Other', tooltip: labels.RESOURCE_TYPE_TOOLTIP_OTHER },
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
